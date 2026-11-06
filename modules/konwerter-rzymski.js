(() => {
  Hub.register({
    id: "konwerter-rzymski",
    title: "Konwerter Liczb Rzymskich",
    desc: "Błyskawiczna zamiana liczb arabskich na rzymskie i odwrotnie",

    async mount(container, signal) {
      container.innerHTML = `
        <style>
          .rom-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .rom-input-group { margin-bottom: 24px; margin-top: 16px; }
          .rom-input {
            width: 100%; background: transparent; border: none; border-bottom: 2px solid var(--line);
            color: var(--ink); font-size: 28px; font-weight: 700; padding: 12px 0;
            text-align: center; outline: none; transition: border-color 0.2s; font-family: monospace;
          }
          .rom-input:focus { border-bottom-color: var(--accent); }
          .rom-input::placeholder { color: var(--line); font-size: 16px; font-weight: 500; font-family: -apple-system, sans-serif; }

          .rom-result-group { margin-bottom: 24px; text-align: center; }
          .rom-result {
            font-size: 28px; font-weight: 700; font-family: monospace;
            color: var(--accent); min-height: 42px; display: flex; align-items: center; justify-content: center;
            word-break: break-all; line-height: 1.2; padding: 0 12px;
          }
          .rom-result.error { color: var(--danger); font-size: 14px; font-weight: 500; font-family: -apple-system, sans-serif; }
          .rom-result.empty { color: var(--muted); font-size: 24px; font-weight: 500; }

          .rom-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }

          .rom-tabs {
            display: flex; 
            background: var(--bg);
            border: 1px solid var(--line);
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 12px;
          }
          .rom-tab {
            flex: 1;
            padding: 10px 8px;
            background: transparent;
            border: none;
            color: var(--muted);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s, color 0.2s;
            outline: none;
            font-family: inherit;
          }
          .rom-tab.active {
            background: var(--surface-hover);
            color: var(--accent);
            font-weight: 600;
          }

          .rom-keypad {
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 8px;
            margin-bottom: 24px;
          }
          .rom-key {
            padding: 16px 0; text-align: center; font-family: monospace; font-size: 22px; font-weight: 600;
            background: var(--surface); border: 1px solid var(--line); border-radius: 6px;
            color: var(--ink); cursor: pointer; user-select: none; 
            transition: background 0.1s, transform 0.1s;
          }
          .rom-key:active { background: var(--surface-hover); transform: scale(0.95); }
          .rom-key.del { background: transparent; color: var(--danger); border-color: transparent; font-size: 16px; }
          .rom-key.del:active { background: rgba(239, 68, 68, 0.1); }
          .rom-key.clear { background: transparent; color: var(--muted); border-color: transparent; font-size: 16px; }
          .rom-key.clear:active { background: var(--surface); }
          .rom-key.empty { background: transparent; border: none; pointer-events: none; }

          .rom-action-row { display: flex; gap: 12px; }
        </style>

        ${Hub.backButtonHtml}

        <div class="rom-input-group" style="margin-top: 24px;">
          <label class="rom-label">Wpisz liczbę (arabską lub rzymską)</label>
          <input type="text" id="rom-input" class="rom-input" placeholder="np. 1999 lub MCMXCIX" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">
        </div>

        <div class="rom-result-group">
          <label class="rom-label">Wynik</label>
          <div id="rom-result" class="rom-result empty">...</div>
        </div>

        <div class="rom-divider"></div>

        <label class="rom-label">Klawiatura pomocnicza</label>
        
        <div class="rom-tabs">
          <button class="rom-tab active" data-tab="arabic">Cyfry (0-9)</button>
          <button class="rom-tab" data-tab="roman">Liczby rzymskie</button>
        </div>

        <div id="rom-pad-arabic" class="rom-keypad">
          <div class="rom-key" data-val="1">1</div>
          <div class="rom-key" data-val="2">2</div>
          <div class="rom-key" data-val="3">3</div>
          <div class="rom-key" data-val="4">4</div>
          <div class="rom-key" data-val="5">5</div>
          <div class="rom-key" data-val="6">6</div>
          <div class="rom-key" data-val="7">7</div>
          <div class="rom-key" data-val="8">8</div>
          <div class="rom-key" data-val="9">9</div>
          <div class="rom-key clear" data-action="clear">CLR</div>
          <div class="rom-key" data-val="0">0</div>
          <div class="rom-key del" data-action="del">DEL</div>
        </div>

        <div id="rom-pad-roman" class="rom-keypad hidden">
          <div class="rom-key" data-val="I">I</div>
          <div class="rom-key" data-val="V">V</div>
          <div class="rom-key" data-val="X">X</div>
          <div class="rom-key" data-val="L">L</div>
          <div class="rom-key" data-val="C">C</div>
          <div class="rom-key" data-val="D">D</div>
          <div class="rom-key" data-val="M">M</div>
          <div class="rom-key clear" data-action="clear">CLR</div>
          <div class="rom-key del" data-action="del">DEL</div>
        </div>

        <div class="rom-action-row">
          <button id="rom-copy-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px;" disabled>Kopiuj wynik</button>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("rom-input");
      const resultEl = $("rom-result");
      const copyBtn = $("rom-copy-btn");
      const padArabic = $("rom-pad-arabic");
      const padRoman = $("rom-pad-roman");

      const romanMap = {
        'M': 1000, 'CM': 900, 'D': 500, 'CD': 400,
        'C': 100, 'XC': 90, 'L': 50, 'XL': 40,
        'X': 10, 'IX': 9, 'V': 5, 'IV': 4, 'I': 1
      };

      function toRoman(num) {
        if (num <= 0 || num > 3999) return null;
        let result = "";
        for (let key in romanMap) {
          while (num >= romanMap[key]) {
            result += key;
            num -= romanMap[key];
          }
        }
        return result;
      }

      function fromRoman(str) {
        if (!str) return null;
        str = str.toUpperCase();
        if (!/^[IVXLCDM]+$/.test(str)) return null;

        let result = 0;
        for (let i = 0; i < str.length; i++) {
          const current = romanMap[str[i]];
          const next = romanMap[str[i + 1]];
          
          if (next && current < next) {
            result += (next - current);
            i++;
          } else {
            result += current;
          }
        }
        
        if (toRoman(result) !== str) return null;
        return result;
      }

      function switchTab(tab) {
        document.querySelectorAll(".rom-tab").forEach(t => t.classList.remove("active"));
        document.querySelector(`.rom-tab[data-tab="${tab}"]`).classList.add("active");
        
        if (tab === "arabic") {
          padArabic.classList.remove("hidden");
          padRoman.classList.add("hidden");
        } else {
          padRoman.classList.remove("hidden");
          padArabic.classList.add("hidden");
        }
      }

      function processInput() {
        let val = inputEl.value.trim().toUpperCase();
        inputEl.value = val;
        
        resultEl.className = "rom-result";
        
        if (!val) {
          resultEl.textContent = "...";
          resultEl.classList.add("empty");
          copyBtn.disabled = true;
          return;
        }

        if (/^[0-9]+$/.test(val)) {
          const num = parseInt(val, 10);
          const roman = toRoman(num);
          
          if (!roman) {
            resultEl.textContent = "Błąd: liczba musi być z zakresu 1-3999";
            resultEl.classList.add("error");
            copyBtn.disabled = true;
          } else {
            resultEl.textContent = roman;
            copyBtn.disabled = false;
          }
        } 
        else if (/^[IVXLCDM]+$/.test(val)) {
          const arabic = fromRoman(val);
          
          if (arabic === null) {
            resultEl.textContent = "Błąd: nieprawidłowy zapis rzymski";
            resultEl.classList.add("error");
            copyBtn.disabled = true;
          } else {
            resultEl.textContent = arabic.toString();
            copyBtn.disabled = false;
          }
        } 
        else {
          resultEl.textContent = "Błąd: wpisz tylko cyfry lub litery I, V, X, L, C, D, M";
          resultEl.classList.add("error");
          copyBtn.disabled = true;
        }
      }

      inputEl.addEventListener("input", processInput, { signal });

      document.querySelectorAll(".rom-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          Hub.haptic('light');
          switchTab(tab.dataset.tab);
        }, { signal });
      });

      container.querySelectorAll(".rom-key[data-val], .rom-key[data-action]").forEach(key => {
        key.addEventListener("click", (e) => {
          Hub.haptic('light');
          const action = e.currentTarget.dataset.action;
          const val = e.currentTarget.dataset.val;

          if (action === "del") {
            inputEl.value = inputEl.value.slice(0, -1);
          } else if (action === "clear") {
            inputEl.value = "";
          } else if (val) {
            inputEl.value += val;
          }
          processInput();
        }, { signal });
      });

      copyBtn.addEventListener("click", () => {
        const txt = resultEl.textContent;
        if (txt && !resultEl.classList.contains("error") && !resultEl.classList.contains("empty")) {
          Hub.copy(txt, copyBtn);
        }
      }, { signal });
    },

    unmount() {}
  });
})();