(() => {
  Hub.register({
    id: "generator-hasel",
    title: "Generator Haseł",
    desc: "Twórz bezpieczne i silne hasła kryptograficzne",

    async mount(container, signal) {
      let savedLength = 16;
      let savedOptions = {
        upper: true,
        lower: true,
        numbers: true,
        symbols: true,
        excludeSimilar: false
      };

      try {
        savedLength = await Hub.db.get("pass_length", 16);
        const dbOpts = await Hub.db.get("pass_options", null);
        if (dbOpts) savedOptions = { ...savedOptions, ...dbOpts };
      } catch (e) {}

      container.innerHTML = `
        <style>
          .gh-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; margin-top: 0; }
          .gh-flat-section { margin-bottom: 28px; }
          
          /* Płaski wygląd hasła - bez ramki i tła */
          .gh-display-area {
            padding: 20px 0;
            border-bottom: 1px solid var(--line);
            margin-bottom: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }
          
          .gh-password-text {
            font-family: monospace; font-size: 22px; font-weight: 600; color: var(--ink);
            text-align: center; line-height: 1.4; user-select: all;
            white-space: nowrap; overflow-x: auto; overflow-y: hidden;
            width: 100%; padding-bottom: 8px;
            scrollbar-width: none; -ms-overflow-style: none;
            touch-action: pan-x; /* Pozwala na przewijanie palcem w bok */
            -webkit-overflow-scrolling: touch;
          }
          .gh-password-text::-webkit-scrollbar { display: none; }
          
          .gh-strength-bar {
            width: 100%; height: 4px; border-radius: 2px; background: var(--line);
            position: relative; overflow: hidden;
          }
          .gh-strength-fill {
            position: absolute; top: 0; left: 0; bottom: 0; width: 0%; 
            transition: width 0.3s ease, background-color 0.3s ease;
          }
          
          .gh-strength-text {
            font-size: 12px; text-align: center; color: var(--muted); font-weight: 500;
          }

          .gh-action-row { display: flex; gap: 12px; margin-bottom: 32px; }
          .gh-btn { flex: 1; padding: 14px; font-size: 15px; }
          
          .gh-slider-wrapper {
            display: flex; align-items: center; height: 40px;
            touch-action: none; cursor: pointer; margin-bottom: 8px;
          }
          .gh-slider-value { font-family: monospace; font-size: 18px; font-weight: 600; color: var(--accent); min-width: 30px; text-align: right; margin-left: 16px; }
          
          .gh-range-track {
            position: relative; width: 100%; height: 6px; border-radius: 3px; flex: 1;
            background: linear-gradient(to right, var(--accent) var(--percent, 0%), var(--line) var(--percent, 0%));
          }
          
          .gh-range-thumb {
            position: absolute; top: 50%; transform: translate(-50%, -50%);
            width: 24px; height: 24px; border-radius: 50%; background: var(--accent);
            box-shadow: 0 4px 8px rgba(0,0,0,0.4); pointer-events: none;
            transition: transform 0.1s;
          }

          /* Styl akordeonu zgodny z resztą aplikacji */
          .gh-trigger { 
            display: flex; justify-content: space-between; align-items: center; 
            background: transparent; border: none; border-bottom: 1px solid var(--line); 
            padding: 16px 0; color: var(--ink); font-size: 16px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s;
          }
          .gh-trigger:active { color: var(--accent); }
          .gh-trigger .icon { color: var(--muted); font-family: monospace; font-size: 20px; font-weight: 300; line-height: 1; }
          
          .gh-accordion { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
          .gh-accordion.open { max-height: 500px; }
          
          .gh-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); }
          .gh-row:last-child { border-bottom: none; }
          .gh-row-title { font-size: 15px; color: var(--ink); font-weight: 500; }
        </style>

        ${Hub.backButtonHtml}

        <div class="gh-display-area">
          <div id="gh-password" class="gh-password-text">...</div>
          <div style="width: 100%;">
            <div class="gh-strength-bar"><div id="gh-strength-fill" class="gh-strength-fill"></div></div>
            <div id="gh-strength-text" class="gh-strength-text" style="margin-top: 8px;">Siła: -</div>
          </div>
        </div>

        <div class="gh-action-row">
          <button id="gh-btn-gen" class="n-btn n-btn-outline gh-btn">Generuj</button>
          <button id="gh-btn-copy" class="n-btn gh-btn">Kopiuj</button>
        </div>

        <div class="gh-flat-section">
          <label class="gh-label">Długość hasła</label>
          <div class="gh-slider-wrapper">
            <div id="gh-slider-track" class="gh-range-track">
              <div id="gh-slider-thumb" class="gh-range-thumb"></div>
            </div>
            <div id="gh-length-val" class="gh-slider-value">${savedLength}</div>
          </div>
        </div>

        <div class="gh-flat-section">
          <div id="gh-acc-trigger" class="gh-trigger">
            <span>Uwzględnij znaki</span>
            <span id="gh-acc-icon" class="icon">+</span>
          </div>
          
          <div id="gh-accordion" class="gh-accordion">
            <div class="gh-row">
              <div class="gh-row-title">Wielkie litery (A-Z)</div>
              <label class="switch"><input type="checkbox" id="gh-upper" ${savedOptions.upper ? 'checked' : ''}><span class="switch-slider"></span></label>
            </div>
            
            <div class="gh-row">
              <div class="gh-row-title">Małe litery (a-z)</div>
              <label class="switch"><input type="checkbox" id="gh-lower" ${savedOptions.lower ? 'checked' : ''}><span class="switch-slider"></span></label>
            </div>
            
            <div class="gh-row">
              <div class="gh-row-title">Cyfry (0-9)</div>
              <label class="switch"><input type="checkbox" id="gh-numbers" ${savedOptions.numbers ? 'checked' : ''}><span class="switch-slider"></span></label>
            </div>
            
            <div class="gh-row">
              <div class="gh-row-title">Znaki specjalne (!@#$...)</div>
              <label class="switch"><input type="checkbox" id="gh-symbols" ${savedOptions.symbols ? 'checked' : ''}><span class="switch-slider"></span></label>
            </div>
            
            <div class="gh-row" style="margin-top: 8px; border-top: 1px solid var(--line);">
              <div class="gh-row-title">Wyklucz podobne (np. O, 0, l, 1)</div>
              <label class="switch"><input type="checkbox" id="gh-exclude" ${savedOptions.excludeSimilar ? 'checked' : ''}><span class="switch-slider"></span></label>
            </div>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const passEl = $("gh-password");
      const btnGen = $("gh-btn-gen");
      const btnCopy = $("gh-btn-copy");
      const sliderTrack = $("gh-slider-track");
      const sliderThumb = $("gh-slider-thumb");
      const lengthVal = $("gh-length-val");
      const strengthFill = $("gh-strength-fill");
      const strengthText = $("gh-strength-text");

      const accTrigger = $("gh-acc-trigger");
      const accIcon = $("gh-acc-icon");
      const accordion = $("gh-accordion");

      const chkUpper = $("gh-upper");
      const chkLower = $("gh-lower");
      const chkNumbers = $("gh-numbers");
      const chkSymbols = $("gh-symbols");
      const chkExclude = $("gh-exclude");

      let currentLength = savedLength;

      function updateSliderUI() {
        const min = 4;
        const max = 64;
        const percent = ((currentLength - min) / (max - min)) * 100;
        sliderThumb.style.left = percent + "%";
        sliderTrack.style.setProperty('--percent', `${percent}%`);
        lengthVal.textContent = currentLength;
      }
      updateSliderUI();

      function updateLengthFromX(clientX) {
        const rect = sliderTrack.getBoundingClientRect();
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        const percent = x / rect.width;
        
        let newLength = Math.round(4 + percent * (64 - 4));
        
        if (newLength !== currentLength) {
          currentLength = newLength;
          updateSliderUI();
          saveOptions();
          generatePassword();
        }
      }

      sliderTrack.parentElement.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        sliderTrack.parentElement.setPointerCapture(e.pointerId);
        updateLengthFromX(e.clientX);
      }, { signal });

      sliderTrack.parentElement.addEventListener("pointermove", (e) => {
        if (sliderTrack.parentElement.hasPointerCapture(e.pointerId)) {
          updateLengthFromX(e.clientX);
        }
      }, { signal });

      sliderTrack.parentElement.addEventListener("pointerup", (e) => {
        sliderTrack.parentElement.releasePointerCapture(e.pointerId);
      }, { signal });

      accTrigger.addEventListener("click", () => {
        Hub.haptic('light');
        accordion.classList.toggle("open");
        accIcon.textContent = accordion.classList.contains("open") ? "−" : "+";
      }, { signal });

      function getActiveOptions() {
        return {
          upper: chkUpper.checked,
          lower: chkLower.checked,
          numbers: chkNumbers.checked,
          symbols: chkSymbols.checked,
          excludeSimilar: chkExclude.checked
        };
      }

      function saveOptions() {
        const opts = getActiveOptions();
        Hub.db.set("pass_length", currentLength).catch(()=>{});
        Hub.db.set("pass_options", opts).catch(()=>{});
      }

      function calculateStrength(length, poolSize) {
        if (poolSize === 0) return { percent: 0, text: "Brak znaków", color: "var(--danger)" };
        
        const entropy = length * Math.log2(poolSize);
        
        if (entropy < 40) return { percent: 25, text: "Słabe", color: "var(--danger)" };
        if (entropy < 60) return { percent: 50, text: "Średnie", color: "#fbbf24" };
        if (entropy < 80) return { percent: 75, text: "Silne", color: "#34d399" };
        return { percent: 100, text: "Bardzo silne", color: "var(--accent)" };
      }

      function generatePassword() {
        const opts = getActiveOptions();
        let chars = "";
        
        const upperStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowerStr = "abcdefghijklmnopqrstuvwxyz";
        const numberStr = "0123456789";
        const symbolStr = "!@#$%^&*()_+-=[]{}|;:,.<>?";

        if (opts.upper) chars += upperStr;
        if (opts.lower) chars += lowerStr;
        if (opts.numbers) chars += numberStr;
        if (opts.symbols) chars += symbolStr;

        if (opts.excludeSimilar) {
          chars = chars.replace(/[il1Lo0O]/g, "");
        }

        if (chars.length === 0) {
          passEl.textContent = "Wybierz co najmniej jedną opcję";
          strengthFill.style.width = "0%";
          strengthText.textContent = "Siła: -";
          return;
        }

        const length = currentLength;
        let password = "";
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);

        for (let i = 0; i < length; i++) {
          password += chars[randomValues[i] % chars.length];
        }

        passEl.textContent = password;
        passEl.scrollLeft = 0; // Przewija do początku przy nowym haśle
        
        const strength = calculateStrength(length, chars.length);
        strengthFill.style.width = strength.percent + "%";
        strengthFill.style.backgroundColor = strength.color;
        strengthText.textContent = "Siła: " + strength.text;
        strengthText.style.color = strength.color;

        Hub.haptic('light');
      }

      [chkUpper, chkLower, chkNumbers, chkSymbols, chkExclude].forEach(chk => {
        chk.addEventListener("change", () => {
          Hub.haptic('light');
          saveOptions();
          generatePassword();
        }, { signal });
      });

      btnGen.addEventListener("click", () => {
        Hub.haptic('medium');
        generatePassword();
      }, { signal });

      btnCopy.addEventListener("click", () => {
        const txt = passEl.textContent;
        if (txt && txt !== "..." && txt !== "Wybierz co najmniej jedną opcję") {
          Hub.copy(txt, btnCopy);
        } else {
          showToast("Brak hasła do skopiowania");
        }
      }, { signal });

      generatePassword();
    },

    unmount() {}
  });
})();
