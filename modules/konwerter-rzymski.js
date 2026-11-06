(() => {
  Hub.register({
    id: "konwerter-rzymski",
    title: "Konwerter Liczb Rzymskich",
    desc: "Błyskawiczna zamiana liczb arabskich na rzymskie i odwrotnie",

    async mount(container, signal) {
      container.innerHTML = `
        <style>
          .rom-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .rom-input-group { margin-bottom: 32px; margin-top: 16px; }
          .rom-input {
            width: 100%; background: transparent; border: none; border-bottom: 2px solid var(--line);
            color: var(--ink); font-size: 32px; font-weight: 700; padding: 12px 0;
            text-align: center; outline: none; transition: border-color 0.2s; font-family: monospace;
          }
          .rom-input:focus { border-bottom-color: var(--accent); }
          .rom-input::placeholder { color: var(--line); font-size: 24px; font-weight: 500; }

          .rom-result-group { margin-bottom: 32px; text-align: center; }
          .rom-result {
            font-size: 32px; font-weight: 700; font-family: monospace;
            color: var(--accent); min-height: 48px; display: flex; align-items: center; justify-content: center;
            word-break: break-all; line-height: 1.2;
          }
          .rom-result.error { color: var(--danger); font-size: 16px; font-weight: 500; }
          .rom-result.empty { color: var(--muted); font-size: 24px; font-weight: 500; }

          .rom-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }

          .rom-keypad {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
            margin-bottom: 24px;
          }
          .rom-key {
            padding: 12px 0; text-align: center; font-family: monospace; font-size: 20px; font-weight: 600;
            background: var(--surface); border: 1px solid var(--line); border-radius: 6px;
            color: var(--ink); cursor: pointer; user-select: none; transition: background 0.1s, transform 0.1s;
          }
          .rom-key:active { background: var(--surface-hover); transform: scale(0.95); }
          .rom-key.del { background: transparent; color: var(--danger); border-color: transparent; }
          .rom-key.del:active { background: rgba(239, 68, 68, 0.1); }
          .rom-key.clear { background: transparent; color: var(--muted); border-color: transparent; }
          .rom-key.clear:active { background: var(--surface); }

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
        <div class="rom-keypad">
          <div class="rom-key" data-val="I">I</div>
          <div class="rom-key" data-val="V">V</div>
          <div class="rom-key" data-val="X">X</div>
          <div class="rom-key" data-val="L">L</div>
          <div class="rom-key" data-val="C">C</div>
          <div class="rom-key" data-val="D">D</div>
          <div class="rom-key" data-val="M">M</div>
          <div class="rom-key del" data-action="del">DEL</div>
          <div class="rom-key" data-val="1">1</div>
          <div class="rom-key" data-val="2">2</div>
          <div class="rom-key" data-val="3">3</div>
          <div class="rom-key" data-val="4">4</div>
          <div class="rom-key" data-val="5">5</div>
          <div class="rom-key" data-val="6">6</div>
          <div class="rom-key" data-val="7">7</div>
          <div class="rom-key" data-val="8">8</div>
          <div class="rom-key" data-val="9">9</div>
          <div class="rom-key" data-val="0">0</div>
          <div class="rom-key clear" data-action="clear">CLR</div>
        </div>

        <div class="rom-action-row">
          <button id="rom-copy-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px;" disabled>Kopiuj wynik</button>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("rom-input");
      const resultEl = $("rom-result");
      const copyBtn = $("rom-copy-btn");

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

      container.querySelectorAll(".rom-key").forEach(key => {
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