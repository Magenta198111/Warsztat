(() => {
  Hub.register({
    id: "czytnik-tekstu",
    title: "Czytnik tekstu",
    desc: "Czyta wpisany tekst na głos, także offline",

    async mount(container, signal) {
      const synth = window.speechSynthesis;
      let voices = [];
      let currentUtterance = null;
      let isPlaying = false;
      let isPaused = false;
      let textChunks = [];
      let currentChunkIndex = 0;

      // Pobieranie zapisanych ustawień
      let savedRate = await Hub.db.get("tts_rate", 1);
      let savedPitch = await Hub.db.get("tts_pitch", 1);
      let savedVoiceURI = await Hub.db.get("tts_voice", "");

      container.innerHTML = `
        <style>
          .tts-label { display: block; font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 8px; margin-top: 16px; }
          
          .tts-textarea {
            width: 100%; background: var(--surface); border: 1px solid var(--line);
            border-radius: var(--r); padding: 16px; color: var(--ink);
            font-size: 16px; font-family: inherit; line-height: 1.5;
            resize: vertical; min-height: 180px; max-height: 400px;
            outline: none; transition: border-color 0.2s; box-sizing: border-box;
          }
          .tts-textarea:focus { border-color: var(--accent); }
          .tts-textarea::placeholder { color: var(--muted); }

          .tts-controls-panel {
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 12px; padding: 20px; margin-top: 24px;
            display: flex; flex-direction: column; align-items: center; gap: 20px;
          }

          .tts-main-btn {
            width: 72px; height: 72px; border-radius: 50%;
            background: var(--accent); color: var(--accent-ink);
            border: none; display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: transform 0.1s, background 0.2s;
            box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 30%, transparent);
          }
          .tts-main-btn:active { transform: scale(0.92); }
          .tts-main-btn svg { width: 32px; height: 32px; }
          .tts-main-btn:disabled { background: var(--surface-hover); color: var(--muted); box-shadow: none; cursor: not-allowed; }

          .tts-aux-btns {
            display: flex; gap: 12px; width: 100%;
            justify-content: center;
          }
          .tts-aux-btn {
            flex: 1; padding: 12px; border-radius: var(--r);
            background: transparent; border: 1px solid var(--line);
            color: var(--ink); font-weight: 500; font-size: 14px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            cursor: pointer; transition: background 0.2s, border-color 0.2s;
            outline: none;
          }
          .tts-aux-btn:active { background: var(--surface-hover); }
          .tts-aux-btn:disabled { opacity: 0.4; cursor: not-allowed; }
          .tts-aux-btn svg { width: 18px; height: 18px; }

          .tts-slider-group { width: 100%; display: flex; flex-direction: column; gap: 8px; }
          .tts-slider-header { display: flex; justify-content: space-between; align-items: center; }
          .tts-slider-val { font-family: inherit; font-variant-numeric: tabular-nums; font-size: 14px; color: var(--accent); font-weight: 600; }
          
          .tts-range { 
            -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; 
            outline: none; width: 100%; 
            background: linear-gradient(to right, var(--accent) var(--percent, 50%), var(--line) var(--percent, 50%)); 
            touch-action: pan-y; 
          }
          .tts-range::-webkit-slider-thumb { 
            -webkit-appearance: none; appearance: none; width: 20px; height: 20px; 
            border-radius: 50%; background: var(--accent); cursor: pointer; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.4); margin-top: -2px; 
          }

          .tts-voice-trigger { 
            display: flex; justify-content: space-between; align-items: center; 
            background: transparent; border: 1px solid var(--line); 
            border-radius: var(--r); padding: 12px 16px; color: var(--ink); font-size: 14px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s; width: 100%;
          }
          .tts-voice-trigger:active { background: var(--surface-hover); }
          .tts-voice-trigger svg { color: var(--muted); flex-shrink: 0; width: 16px; height: 16px; }
          .tts-voice-trigger span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; flex: 1; margin-right: 12px; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <label class="tts-label">Tekst do przeczytania</label>
          <textarea id="tts-input" class="tts-textarea" placeholder="Wklej tutaj tekst, artykuł lub notatki..."></textarea>

          <div class="tts-controls-panel">
            
            <div style="display: flex; gap: 16px; align-items: center;">
              <button id="tts-play-btn" class="tts-main-btn" disabled>
                <svg id="tts-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                <svg id="tts-pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              </button>
            </div>

            <div class="tts-aux-btns">
              <button id="tts-stop-btn" class="tts-aux-btn" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="6" width="12" height="12"></rect></svg>
                Stop
              </button>
              <button id="tts-clear-btn" class="tts-aux-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Wyczyść
              </button>
            </div>

            <div style="width: 100%; height: 1px; background: var(--line); margin: 4px 0;"></div>

            <div class="tts-slider-group">
              <div class="tts-slider-header">
                <span class="tts-label" style="margin:0;">Prędkość</span>
                <span id="tts-rate-val" class="tts-slider-val">1.0x</span>
              </div>
              <input type="range" id="tts-rate" min="0.5" max="2" step="0.1" value="${savedRate}" class="tts-range">
            </div>

            <div class="tts-slider-group">
              <div class="tts-slider-header">
                <span class="tts-label" style="margin:0;">Wysokość głosu (Ton)</span>
                <span id="tts-pitch-val" class="tts-slider-val">1.0</span>
              </div>
              <input type="range" id="tts-pitch" min="0.5" max="2" step="0.1" value="${savedPitch}" class="tts-range">
            </div>

            <div class="tts-slider-group">
              <span class="tts-label" style="margin:0;">Głos (Lektor)</span>
              <div id="tts-voice-trigger" class="tts-voice-trigger">
                <span id="tts-voice-text">Wczytywanie głosów...</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>

          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("tts-input");
      const playBtn = $("tts-play-btn");
      const playIcon = $("tts-play-icon");
      const pauseIcon = $("tts-pause-icon");
      const stopBtn = $("tts-stop-btn");
      const clearBtn = $("tts-clear-btn");
      const rateSlider = $("tts-rate");
      const rateVal = $("tts-rate-val");
      const pitchSlider = $("tts-pitch");
      const pitchVal = $("tts-pitch-val");
      const voiceTrigger = $("tts-voice-trigger");
      const voiceText = $("tts-voice-text");

      let currentVoice = null;

      function updateSliderFill(el) {
        const percent = ((el.value - el.min) / (el.max - el.min)) * 100;
        el.style.setProperty('--percent', `${percent}%`);
      }
      updateSliderFill(rateSlider);
      updateSliderFill(pitchSlider);
      rateVal.textContent = parseFloat(savedRate).toFixed(1) + "x";
      pitchVal.textContent = parseFloat(savedPitch).toFixed(1);

      function loadVoices() {
        voices = synth.getVoices();
        if (voices.length === 0) {
          voiceText.textContent = "Brak dostępnych głosów w systemie";
          playBtn.disabled = true;
          return;
        }

        let selected = null;
        
        // Próbujemy znaleźć zapisany głos
        if (savedVoiceURI) {
          selected = voices.find(v => v.voiceURI === savedVoiceURI);
        }

        // Jeśli nie ma zapisanego, szukamy polskiego
        if (!selected) {
          selected = voices.find(v => v.lang === 'pl-PL' || v.lang.startsWith('pl'));
        }

        // Jeśli nie ma polskiego, bierzemy domyślny
        if (!selected) {
          selected = voices.find(v => v.default) || voices[0];
        }

        currentVoice = selected;
        voiceText.textContent = `${currentVoice.name} (${currentVoice.lang})`;
        updatePlayState();
      }

      function updatePlayState() {
        if (inputEl.value.trim().length === 0) {
          playBtn.disabled = true;
          stopBtn.disabled = true;
          return;
        }
        playBtn.disabled = false;
        if (isPlaying || isPaused) {
          stopBtn.disabled = false;
        } else {
          stopBtn.disabled = true;
        }
      }

      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }
      loadVoices();

      function splitTextIntoChunks(text) {
        // Dzielimy tekst na zdania (po kropce, pytajniku, wykrzykniku)
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const chunks = [];
        let currentChunk = "";
        
        // Łączymy krótkie zdania w większe bloki (do ~200 znaków), 
        // aby uniknąć zbyt częstego przerywania w niektórych przeglądarkach
        sentences.forEach(sentence => {
          if ((currentChunk + sentence).length < 200) {
            currentChunk += sentence;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
          }
        });
        if (currentChunk) chunks.push(currentChunk);
        return chunks;
      }

      function speakNextChunk() {
        if (currentChunkIndex >= textChunks.length) {
          resetPlayback();
          return;
        }

        const chunk = textChunks[currentChunkIndex];
        currentUtterance = new SpeechSynthesisUtterance(chunk);
        
        if (currentVoice) currentUtterance.voice = currentVoice;
        currentUtterance.rate = parseFloat(rateSlider.value);
        currentUtterance.pitch = parseFloat(pitchSlider.value);
        currentUtterance.lang = currentVoice ? currentVoice.lang : 'pl-PL';

        currentUtterance.onend = () => {
          currentChunkIndex++;
          if (isPlaying && !isPaused) {
            speakNextChunk();
          }
        };

        currentUtterance.onerror = (e) => {
          if (e.error === 'interrupted') return; // ignorujemy przerwanie
          console.error("TTS error", e);
          resetPlayback();
        };

        synth.speak(currentUtterance);
      }

      function startPlayback() {
        if (isPaused) {
          synth.resume();
          isPaused = false;
          playIcon.style.display = "none";
          pauseIcon.style.display = "block";
          return;
        }

        if (isPlaying) return;

        const text = inputEl.value.trim();
        if (!text) return;

        synth.cancel(); // reset
        
        textChunks = splitTextIntoChunks(text);
        currentChunkIndex = 0;
        isPlaying = true;
        isPaused = false;

        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
        stopBtn.disabled = false;
        Hub.haptic('medium');

        speakNextChunk();
      }

      function pausePlayback() {
        if (!isPlaying || isPaused) return;
        synth.pause();
        isPaused = true;
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
        Hub.haptic('light');
      }

      function stopPlayback() {
        synth.cancel();
        resetPlayback();
        Hub.haptic('light');
      }

      function resetPlayback() {
        isPlaying = false;
        isPaused = false;
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
        stopBtn.disabled = true;
        currentChunkIndex = 0;
      }

      playBtn.onclick = () => {
        if (isPlaying && !isPaused) {
          pausePlayback();
        } else {
          startPlayback();
        }
      };

      stopBtn.onclick = stopPlayback;

      clearBtn.onclick = () => {
        Hub.haptic('light');
        stopPlayback();
        inputEl.value = "";
        updatePlayState();
        Hub.resizeTextarea(inputEl);
        inputEl.focus();
      };

      inputEl.addEventListener("input", () => {
        updatePlayState();
        Hub.resizeTextarea(inputEl);
        if (isPlaying) stopPlayback(); // Przerwanie przy edycji
      }, { signal });

      rateSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        rateVal.textContent = val.toFixed(1) + "x";
        updateSliderFill(e.target);
        Hub.db.set("tts_rate", val);
        if (isPlaying && !isPaused) {
          // Wymusza restart z nową prędkością (API nie pozwala zmienić w locie)
          synth.cancel();
          isPlaying = true;
          speakNextChunk();
        }
      }, { signal });

      pitchSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        pitchVal.textContent = val.toFixed(1);
        updateSliderFill(e.target);
        Hub.db.set("tts_pitch", val);
        if (isPlaying && !isPaused) {
          synth.cancel();
          isPlaying = true;
          speakNextChunk();
        }
      }, { signal });

      voiceTrigger.addEventListener("click", async () => {
        if (voices.length === 0) return;
        
        const opts = voices.map(v => ({
          id: v.voiceURI,
          label: `${v.name} (${v.lang})`
        }));

        const choice = await Hub.showSelect({ 
          title: "Wybierz głos", 
          options: opts, 
          current: currentVoice ? currentVoice.voiceURI : "", 
          anchor: voiceTrigger, 
          signal 
        });

        if (choice) {
          currentVoice = voices.find(v => v.voiceURI === choice);
          voiceText.textContent = `${currentVoice.name} (${currentVoice.lang})`;
          Hub.db.set("tts_voice", choice);
          if (isPlaying && !isPaused) {
            synth.cancel();
            isPlaying = true;
            speakNextChunk();
          }
        }
      }, { signal });

      updatePlayState();
      
      // Zatrzymanie mowy przy wyjściu z modułu
      signal.addEventListener('abort', () => {
        synth.cancel();
      });
    },

    unmount() {
      window.speechSynthesis.cancel();
    }
  });
})();