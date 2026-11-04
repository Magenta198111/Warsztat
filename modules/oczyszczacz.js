(() => {
  Hub.register({
    id: "oczyszczacz",
    title: "Oczyszczacz Tekstu",
    desc: "Usuwanie formatowania, gwiazdek, myślników i zbędnych spacji",

    async mount(container, signal) {
      let currentCaseMode = "sentence";

      const caseNames = {
        "sentence": "Zdania (Duża po kropce)",
        "upper": "Wszystko WIELKIMI literami",
        "lower": "wszystko małymi literami",
        "title": "Każde Słowo Z Dużej Litery"
      };

      container.innerHTML = `
        <style>
          .o-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .o-flat-section { margin-bottom: 28px; }
          .o-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          .o-textarea {
            width: 100%; padding: 12px 0; background: transparent; border: none;
            border-bottom: 1px solid var(--line); color: var(--ink); font-size: 16px; 
            font-family: inherit; 
            resize: vertical; /* Przywrócona rączka do zmiany rozmiaru */
            outline: none; 
            min-height: 100px; 
            max-height: 1200px; /* Limit ok. 50 linii */
            overflow-y: auto; 
            transition: border-color 0.2s; 
            line-height: 1.5;
            box-sizing: border-box;
            touch-action: pan-y; /* Pozwala na płynne przewijanie strony palcem */
          }
          .o-textarea:focus { border-bottom-color: var(--accent); }
          .o-textarea::placeholder { color: var(--muted); font-size: 15px; }
          .o-output-textarea { color: var(--accent); font-weight: 500; }

          .o-trigger { 
            display: flex; justify-content: space-between; align-items: center; 
            background: transparent; border: none; border-bottom: 1px solid var(--line); 
            padding: 16px 0; color: var(--ink); font-size: 16px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s;
          }
          .o-trigger:active { color: var(--accent); }
          .o-trigger .icon { color: var(--muted); font-family: monospace; font-size: 20px; font-weight: 300; line-height: 1; }
          
          .o-accordion { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
          .o-accordion.open { max-height: 400px; }
          
          .o-option-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--line); }
          .o-option-row:last-child { border-bottom: none; }
          .o-option-title { font-size: 15px; font-weight: 500; color: var(--ink); }
          .o-option-desc { font-size: 12px; color: var(--muted); margin-top: 4px; }
          
          .o-stats { display: flex; justify-content: space-between; font-family: monospace; font-size: 13px; color: var(--muted); padding: 16px 0 0 0; }
          .o-action-row { display: flex; gap: 12px; margin-top: 16px; }
        </style>

        ${Hub.backButtonHtml}

        <div class="o-flat-section" style="margin-top: 16px;">
          <label class="o-label">Tekst źródłowy</label>
          <textarea id="o-input" class="o-textarea" placeholder="Wklej tekst..."></textarea>
        </div>

        <div class="o-flat-section">
          <label class="o-label">Wielkość liter</label>
          <div id="o-case-trigger" class="o-trigger">
            <span id="o-case-text">${caseNames[currentCaseMode]}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--muted);"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        <div class="o-flat-section">
          <div id="o-clean-trigger" class="o-trigger">
            <span>Inteligentne czyszczenie</span>
            <span id="o-clean-icon" class="icon">+</span>
          </div>
          
          <div id="o-clean-accordion" class="o-accordion">
            <div class="o-option-row"><div><div class="o-option-title">Usuwaj linki</div><div class="o-option-desc">Usuwa adresy URL (także www.)</div></div><label class="switch"><input type="checkbox" id="o-clean-url"><span class="switch-slider"></span></label></div>
            <div class="o-option-row"><div><div class="o-option-title">Usuwaj znaki Markdown</div><div class="o-option-desc">np. #, **, _, ></div></div><label class="switch"><input type="checkbox" id="o-clean-md"><span class="switch-slider"></span></label></div>
            <div class="o-option-row"><div><div class="o-option-title">Popraw interpunkcję</div><div class="o-option-desc">Usuwa spacje przed . , ! ?</div></div><label class="switch"><input type="checkbox" id="o-clean-space" checked><span class="switch-slider"></span></label></div>
            <div class="o-option-row"><div><div class="o-option-title">Usuwaj nawiasy</div><div class="o-option-desc">Usuwa [], {}, "", ''</div></div><label class="switch"><input type="checkbox" id="o-clean-brackets"><span class="switch-slider"></span></label></div>
            <div class="o-option-row"><div><div class="o-option-title">Zostaw jeden myślnik</div><div class="o-option-desc">Zamienia -- na -, wyłącz by usunąć</div></div><label class="switch"><input type="checkbox" id="o-dash-toggle" checked><span class="switch-slider"></span></label></div>
          </div>
        </div>

        <div class="o-divider"></div>

        <div class="o-flat-section">
          <label class="o-label">Wynik (na żywo)</label>
          <textarea id="o-output" class="o-textarea o-output-textarea" readonly placeholder="Tutaj pojawi się czysty tekst..."></textarea>
          <div class="o-stats"><span id="o-stat-chars">Znaki: 0</span><span id="o-stat-words">Słowa: 0</span></div>
        </div>

        <div class="o-action-row">
          <button id="o-undo" class="n-btn n-btn-outline" style="flex: 1; opacity: 0.4;" disabled>Cofnij</button>
          <button id="o-clear" class="n-btn" style="flex: 1; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">Wyczyść</button>
          <button id="o-copy" class="n-btn n-btn-outline" style="flex: 2;">Kopiuj wynik</button>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("o-input");
      const outputEl = $("o-output");
      const caseTrigger = $("o-case-trigger"), caseText = $("o-case-text");
      
      const cleanTrigger = $("o-clean-trigger"), cleanAccordion = $("o-clean-accordion"), cleanIcon = $("o-clean-icon");
      const cleanUrl = $("o-clean-url"), cleanMd = $("o-clean-md"), 
            cleanSpace = $("o-clean-space"), cleanBrackets = $("o-clean-brackets"), 
            dashToggle = $("o-dash-toggle");

      const statChars = $("o-stat-chars"), statWords = $("o-stat-words");
      const undoBtn = $("o-undo");

      let history = [];

      // --- AUTOMATYCZNE DOPASOWANIE WYSOKOŚCI ---
      function autoResize(el) {
        if (!el) return;
        // Zapisujemy obecną wysokość (jeśli użytkownik ją ręcznie zmienił)
        const currentHeight = el.style.height;
        el.style.height = 'auto';
        // Ustawiamy nową wysokość, ale nie większą niż max-height
        const newHeight = Math.min(el.scrollHeight, 1200);
        el.style.height = newHeight + 'px';
      }

      // Inicjalne dopasowanie obu pól
      setTimeout(() => { autoResize(inputEl); autoResize(outputEl); }, 50);

      cleanTrigger.addEventListener("click", () => {
        Hub.haptic('light');
        cleanAccordion.classList.toggle("open");
        cleanIcon.textContent = cleanAccordion.classList.contains("open") ? "−" : "+";
      }, { signal });

      function saveHistory() {
        if (inputEl.value !== history[history.length - 1]) {
          history.push(inputEl.value);
          if (history.length > 20) history.shift();
          undoBtn.disabled = false;
          undoBtn.style.opacity = "1";
        }
      }

      function updateStats(text) {
        if (!text) { statChars.textContent = "Znaki: 0"; statWords.textContent = "Słowa: 0"; return; }
        const chars = text.length;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        statChars.textContent = `Znaki: ${chars}`;
        statWords.textContent = `Słowa: ${words}`;
      }

      function processText() {
        let text = inputEl.value;
        if (!text) { 
          outputEl.value = ""; 
          updateStats(""); 
          autoResize(outputEl);
          return; 
        }

        let lines = text.split(/\r?\n/);

        lines = lines.map(line => {
          let l = line;
          if (cleanUrl.checked) l = l.replace(/(?:https?:\/\/|www\.)[^\s]+/gi, "");
          if (cleanMd.checked) l = l.replace(/[#*_>]/g, "");
          if (cleanBrackets.checked) l = l.replace(/[\[\]{}""'']/g, "");
          if (cleanSpace.checked) l = l.replace(/\s+([.,!?;:])/g, "$1");
          if (dashToggle.checked) l = l.replace(/-{2,}/g, "-");
          else l = l.replace(/-{2,}/g, "");
          
          l = l.replace(/\s+/g, " ").trim();
          return l;
        });

        text = lines.join("\n");
        text = text.replace(/\n{3,}/g, "\n\n").trim();

        if (currentCaseMode === "sentence") {
          text = text.replace(/(^\s*|[.!?]\s+)([a-ząćęłńóśźż])/gm, (m, p, letter) => p + letter.toUpperCase());
        } else if (currentCaseMode === "upper") {
          text = text.toUpperCase();
        } else if (currentCaseMode === "lower") {
          text = text.toLowerCase();
        } else if (currentCaseMode === "title") {
          text = text.replace(/\b\w/g, l => l.toUpperCase());
        }

        outputEl.value = text;
        updateStats(outputEl.value);
        autoResize(outputEl);
      }

      inputEl.addEventListener("input", () => {
        processText();
        autoResize(inputEl);
        clearTimeout(inputEl._historyTimer);
        inputEl._historyTimer = setTimeout(saveHistory, 1000);
      }, { signal });

      [cleanUrl, cleanMd, cleanSpace, cleanBrackets, dashToggle].forEach(toggle => {
        toggle.addEventListener("change", () => { Hub.haptic('light'); processText(); }, { signal });
      });

      caseTrigger.addEventListener("click", async () => {
        const opts = Object.keys(caseNames).map(k => ({ id: k, label: caseNames[k] }));
        const choice = await Hub.showSelect({ title: "Wielkość liter", options: opts, current: currentCaseMode, anchor: caseTrigger, signal });
        if (choice && choice !== currentCaseMode) {
          currentCaseMode = choice;
          caseText.textContent = caseNames[currentCaseMode];
          processText();
        }
      }, { signal });

      undoBtn.addEventListener("click", () => {
        if (history.length > 1) {
          history.pop();
          inputEl.value = history[history.length - 1];
          processText();
          autoResize(inputEl);
          Hub.haptic('light');
          if (history.length <= 1) { undoBtn.disabled = true; undoBtn.style.opacity = "0.4"; }
        }
      }, { signal });

      $("o-copy").addEventListener("click", () => {
        if (!outputEl.value) return showToast("Brak tekstu do skopiowania");
        const textToCopy = outputEl.value;
        const btn = $("o-copy");

        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        
        let success = false;
        try { success = document.execCommand('copy'); } catch(e) {}

        document.body.removeChild(ta);

        if (success) {
          Hub.haptic('success');
          const orig = btn.innerHTML;
          btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => { btn.innerHTML = orig; }, 1500);
        } else {
          Hub.copy(textToCopy, btn);
        }
      }, { signal });

      $("o-clear").addEventListener("click", () => {
        Hub.haptic('medium'); saveHistory();
        inputEl.value = ""; outputEl.value = ""; updateStats(""); 
        autoResize(inputEl); autoResize(outputEl);
        inputEl.focus();
      }, { signal });

      processText();
    },
    unmount() {}
  });
})();