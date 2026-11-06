(() => {
  Hub.register({
    id: "generator-czcionek",
    title: "Generator Czcionek",
    desc: "Zamień zwykły tekst na ozdobne czcionki i symbole",

    async mount(container, signal) {
      container.innerHTML = `
        <style>
          .font-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .font-input-group { margin-bottom: 24px; margin-top: 16px; }
          .font-input {
            width: 100%; background: transparent; border: none; border-bottom: 2px solid var(--line);
            color: var(--ink); font-size: 20px; font-weight: 500; padding: 12px 0;
            outline: none; transition: border-color 0.2s; font-family: inherit;
          }
          .font-input:focus { border-bottom-color: var(--accent); }
          .font-input::placeholder { color: var(--line); font-size: 16px; font-weight: 400; }

          .font-tabs {
            display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 16px;
            scrollbar-width: none; -ms-overflow-style: none;
          }
          .font-tabs::-webkit-scrollbar { display: none; }
          
          .font-tab {
            padding: 8px 16px; border-radius: 20px; background: var(--surface); border: 1px solid var(--line);
            color: var(--muted); font-size: 13px; font-weight: 500; white-space: nowrap; cursor: pointer;
            transition: all 0.2s; outline: none;
          }
          .font-tab.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; }

          .font-result-list { display: flex; flex-direction: column; gap: 8px; padding-bottom: 40px; }
          
          .font-row {
            display: flex; align-items: center; background: var(--surface); border: 1px solid var(--line);
            border-radius: 6px; padding: 12px 16px; gap: 12px; overflow: hidden;
          }
          
          .font-text {
            flex: 1; font-size: 18px; color: var(--ink); white-space: nowrap; overflow-x: auto;
            scrollbar-width: none; -ms-overflow-style: none; padding: 4px 0;
          }
          .font-text::-webkit-scrollbar { display: none; }

          .font-copy-btn {
            background: transparent; border: none; color: var(--muted); padding: 8px; flex-shrink: 0;
            cursor: pointer; outline: none; transition: color 0.2s, transform 0.1s;
          }
          .font-copy-btn:active { transform: scale(0.9); }
          .font-copy-btn svg { width: 18px; height: 18px; }
          
          .font-empty {
            text-align: center; padding: 40px 20px; color: var(--muted); font-size: 14px;
          }
        </style>

        ${Hub.backButtonHtml}

        <div class="font-input-group" style="margin-top: 24px;">
          <label class="font-label">Wpisz swój tekst</label>
          <input type="text" id="font-input" class="font-input" placeholder="Np. Witaj w Workspace!" autocomplete="off" autocorrect="off" spellcheck="false">
        </div>

        <div class="font-tabs" id="font-tabs">
          <button class="font-tab active" data-cat="math">Matematyczne</button>
          <button class="font-tab" data-cat="deco">Ozdobne</button>
          <button class="font-tab" data-cat="other">Inne</button>
          <button class="font-tab" data-cat="zalgo">Zalgo</button>
        </div>

        <div id="font-results" class="font-result-list">
          <div class="font-empty">Wpisz tekst, aby zobaczyć dostępne style.</div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("font-input");
      const resultsContainer = $("font-results");
      const tabs = container.querySelectorAll(".font-tab");
      
      let currentCategory = "math";

      // Bazy znaków (offset w Unicode lub bezpośrednie mapowanie)
      // Zapis [wielkie litery, małe litery, cyfry]
      const mathStyles = {
        "Pogrubienie": [0x1D400, 0x1D41A, 0x1D7CE],
        "Kursywa": [0x1D434, 0x1D44E, 0],
        "Pogrubiona kursywa": [0x1D468, 0x1D482, 0],
        "Pismo odręczne": [0x1D49C, 0x1D4B6, 0],
        "Gotyckie": [0x1D504, 0x1D51E, 0],
        "Podwójna linia": [0x1D538, 0x1D552, 0x1D7D8],
        "Bezszeryfowe": [0x1D5A0, 0x1D5BA, 0x1D7E2],
        "Bezszeryfowe pogrubione": [0x1D5D4, 0x1D5EE, 0x1D7EC],
        "Monospace": [0x1D670, 0x1D68A, 0x1D7F6]
      };

      const decoStyles = {
        "Kółeczka": [0x24B6, 0x24D0, 0],
        "Kółeczka ciemne": [0x1F150, 0, 0],
        "Kwadraty": [0x1F130, 0, 0],
        "Małe kapitaliki": ["ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ", "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ", ""],
        "Odwrócony": ["ɐqɔpǝɟƃɥıɾʞlɯuodbɹsʇnʌʍxʎz", "ɐqɔpǝɟƃɥıɾʞlɯuodbɹsʇnʌʍxʎz", ""],
        "Nakrapiane": [0, 0, 0] // Obsługa niżej w kodzie
      };

      const otherStyles = {
        "Greckie": ["ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ", "αβγδεζηθικλμνξοπρστυφχψω", ""],
        "Cyrylica": ["АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ", "абвгдежзийклмнопрстуфхцчшщъыьэюя", ""],
        "Symbole": ["♔♕♖♗♘♙♚♛♜♝♞♟", "♔♕♖♗♘♙♚♛♜♝♞♟", "⓪①②③④⑤⑥⑦⑧⑨"]
      };

      function generateMath(char, baseCode) {
        const code = char.charCodeAt(0);
        if (char === ' ') return ' ';
        
        if (code >= 65 && code <= 90) { // A-Z
          return String.fromCodePoint(baseCode + (code - 65));
        }
        if (code >= 97 && code <= 122) { // a-z
          if (baseCode === 0) return char; // Jeśli brak dla małych
          return String.fromCodePoint(baseCode + (code - 97));
        }
        if (code >= 48 && code <= 57 && baseCode > 0 && arguments[2]) { // 0-9
          const digitCode = arguments[2];
          return String.fromCodePoint(digitCode + (code - 48));
        }
        return char;
      }

      function transformText(text, styleName, styleData, category) {
        if (!text) return "";
        
        // Specjalne przypadki
        if (styleName === "Nakrapiane") {
          return text.split('').map(c => c + '\u0336').join('');
        }
        if (category === "zalgo") {
          const zalgoUp = ['\u030d', '\u030e', '\u0304', '\u0305', '\u033f', '\u0311', '\u0306', '\u0310', '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030a', '\u0342', '\u0343', '\u0344', '\u034a', '\u034b', '\u034c', '\u0350', '\u0353', '\u0354', '\u0355', '\u0356', '\u0357', '\u0358', '\u0359'];
          const zalgoDown = ['\u0316', '\u0317', '\u0318', '\u0319', '\u031c', '\u031d', '\u031e', '\u031f', '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f', '\u0330', '\u0331', '\u0332', '\u0333', '\u0339', '\u033a', '\u033b', '\u033c', '\u0345', '\u0347', '\u0348', '\u0349', '\u034d', '\u034e'];
          
          return text.split('').map(c => {
            if (c === ' ') return c;
            let res = c;
            if (styleName === "Lekki") {
              res += zalgoUp[Math.floor(Math.random() * zalgoUp.length)];
            } else if (styleName === "Średni") {
              res += zalgoUp[Math.floor(Math.random() * zalgoUp.length)];
              res += zalgoDown[Math.floor(Math.random() * zalgoDown.length)];
            } else if (styleName === "Mocny") {
              for(let i=0; i<3; i++) res += zalgoUp[Math.floor(Math.random() * zalgoUp.length)];
              for(let i=0; i<3; i++) res += zalgoDown[Math.floor(Math.random() * zalgoDown.length)];
            }
            return res;
          }).join('');
        }

        // Standardowe mapowanie
        let result = "";
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const code = char.charCodeAt(0);
          
          if (char === ' ') {
            result += ' ';
            continue;
          }

          if (category === "math") {
            let base = styleData[0];
            let baseLower = styleData[1];
            let baseDigit = styleData[2];
            
            if (code >= 65 && code <= 90) result += String.fromCodePoint(base + (code - 65));
            else if (code >= 97 && code <= 122) result += baseLower ? String.fromCodePoint(baseLower + (code - 97)) : char;
            else if (code >= 48 && code <= 57 && baseDigit) result += String.fromCodePoint(baseDigit + (code - 48));
            else result += char;
          } 
          else if (category === "deco") {
            if (styleName === "Kółeczka" || styleName === "Kwadraty" || styleName === "Kółeczka ciemne") {
              if (code >= 65 && code <= 90) result += String.fromCodePoint(styleData[0] + (code - 65));
              else if (code >= 97 && code <= 122 && styleData[1]) result += String.fromCodePoint(styleData[1] + (code - 97));
              else result += char;
            } else {
              // Mapowanie stringowe
              if (code >= 65 && code <= 90) result += styleData[0][code - 65] || char;
              else if (code >= 97 && code <= 122) result += styleData[1][code - 97] || char;
              else result += char;
            }
          }
          else if (category === "other") {
            if (code >= 65 && code <= 90) result += styleData[0][code - 65] || char;
            else if (code >= 97 && code <= 122) result += styleData[1][code - 97] || char;
            else if (code >= 48 && code <= 57 && styleData[2]) result += styleData[2][code - 48] || char;
            else result += char;
          }
        }
        return result;
      }

      function renderResults() {
        const text = inputEl.value;
        resultsContainer.innerHTML = "";

        if (!text.trim()) {
          resultsContainer.innerHTML = '<div class="font-empty">Wpisz tekst, aby zobaczyć dostępne style.</div>';
          return;
        }

        let stylesToRender = {};

        if (currentCategory === "math") stylesToRender = mathStyles;
        else if (currentCategory === "deco") stylesToRender = decoStyles;
        else if (currentCategory === "other") stylesToRender = otherStyles;
        else if (currentCategory === "zalgo") stylesToRender = { "Lekki": null, "Średni": null, "Mocny": null };

        for (let [name, data] of Object.entries(stylesToRender)) {
          const transformed = transformText(text, name, data, currentCategory);
          
          const row = document.createElement("div");
          row.className = "font-row";
          row.innerHTML = `
            <div class="font-text">${transformed}</div>
            <button class="font-copy-btn" title="Kopiuj">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          `;
          
          const btn = row.querySelector(".font-copy-btn");
          btn.onclick = () => {
            Hub.copy(transformed, btn);
          };
          
          resultsContainer.appendChild(row);
        }
      }

      inputEl.addEventListener("input", renderResults, { signal });

      tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          Hub.haptic('light');
          tabs.forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          currentCategory = tab.dataset.cat;
          renderResults();
        }, { signal });
      });

    },

    unmount() {}
  });
})();