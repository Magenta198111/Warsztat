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
          
          .gh-display-box {
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px;
            margin-top: 16px; margin-bottom: 24px;
          }
          
          .gh-password-text {
            font-family: monospace; font-size: 20px; font-weight: 600; color: var(--ink);
            text-align: center; word-break: break-all; line-height: 1.4; user-select: all;
          }
          
          .gh-strength-bar {
            width: 100%; height: 4px; border-radius: 2px; background: var(--line);
            position: relative; overflow: hidden; margin-top: 8px;
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
          
          .gh-slider-wrapper { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
          .gh-slider-value { font-family: monospace; font-size: 18px; font-weight: 600; color: var(--accent); min-width: 30px; text-align: right; }
          
          .gh-range { 
            -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; 
            outline: none; width: 100%; flex: 1;
            background: linear-gradient(to right, var(--accent) var(--percent, 50%), var(--line) var(--percent, 50%)); 
            touch-action: pan-y; 
          }
          .gh-range::-webkit-slider-thumb { 
            -webkit-appearance: none; appearance: none; width: 22px; height: 22px; 
            border-radius: 50%; background: var(--accent); cursor: pointer; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.4); margin-top: -2px; 
          }
          
          .gh-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); }
          .gh-row:last-child { border-bottom: none; }
          .gh-row-title { font-size: 15px; color: var(--ink); font-weight: 500; }
        </style>

        ${Hub.backButtonHtml}

        <div class="gh-display-box">
          <div id="gh-password" class="gh-password-text">...</div>
          <div>
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
            <input type="range" id="gh-length" min="4" max="64" value="${savedLength}" class="gh-range">
            <div id="gh-length-val" class="gh-slider-value">${savedLength}</div>
          </div>
        </div>

        <div class="gh-flat-section">
          <label class="gh-label">Uwzględnij znaki</label>
          
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
      `;

      const $ = id => container.querySelector("#" + id);
      const passEl = $("gh-password");
      const btnGen = $("gh-btn-gen");
      const btnCopy = $("gh-btn-copy");
      const lengthSlider = $("gh-length");
      const lengthVal = $("gh-length-val");
      const strengthFill = $("gh-strength-fill");
      const strengthText = $("gh-strength-text");

      const chkUpper = $("gh-upper");
      const chkLower = $("gh-lower");
      const chkNumbers = $("gh-numbers");
      const chkSymbols = $("gh-symbols");
      const chkExclude = $("gh-exclude");

      function updateSliderFill(el) {
        const percent = ((el.value - el.min) / (el.max - el.min)) * 100;
        el.style.setProperty('--percent', `${percent}%`);
      }
      updateSliderFill(lengthSlider);

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
        Hub.db.set("pass_length", Number(lengthSlider.value)).catch(()=>{});
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

        const length = Number(lengthSlider.value);
        let password = "";
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);

        for (let i = 0; i < length; i++) {
          password += chars[randomValues[i] % chars.length];
        }

        passEl.textContent = password;
        
        const strength = calculateStrength(length, chars.length);
        strengthFill.style.width = strength.percent + "%";
        strengthFill.style.backgroundColor = strength.color;
        strengthText.textContent = "Siła: " + strength.text;
        strengthText.style.color = strength.color;

        Hub.haptic('light');
      }

      lengthSlider.addEventListener("input", (e) => {
        lengthVal.textContent = e.target.value;
        updateSliderFill(e.target);
        saveOptions();
        generatePassword();
      }, { signal });

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