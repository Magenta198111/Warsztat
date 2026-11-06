(() => {
  Hub.register({
    id: "generator-czcionek",
    title: "Generator Czcionek",
    desc: "Zamień zwykły tekst na ozdobne czcionki i symbole",

    async mount(container, signal) {
      let currentCategory = "math";

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

          .font-trigger { 
            display: flex; justify-content: space-between; align-items: center; 
            background: transparent; border: none; border-bottom: 1px solid var(--line); 
            padding: 16px 0; color: var(--ink); font-size: 16px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s; margin-bottom: 24px;
          }
          .font-trigger:active { color: var(--accent); }
          .font-trigger svg { color: var(--muted); flex-shrink: 0; }

          .font-result-list { display: flex; flex-direction: column; gap: 10px; padding-bottom: 40px; }
          
          .font-row {
            display: flex; align-items: center; background: var(--surface); border: 1px solid var(--line);
            border-radius: 6px; padding: 14px 16px; gap: 12px; overflow: hidden;
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
          .font-copy-btn svg { width: 20px; height: 20px; }
          
          .font-empty {
            text-align: center; padding: 40px 20px; color: var(--muted); font-size: 14px;
            border: 1px dashed var(--line); border-radius: 6px; background: var(--surface);
          }
        </style>

        ${Hub.backButtonHtml}

        <div class="font-input-group" style="margin-top: 24px;">
          <label class="font-label">Wpisz swój tekst</label>
          <input type="text" id="font-input" class="font-input" placeholder="Np. Witaj w Workspace!" autocomplete="off" autocorrect="off" spellcheck="false">
        </div>

        <label class="font-label">Kategoria stylów</label>
        <div id="font-cat-trigger" class="font-trigger">
          <span id="font-cat-text">Stylowe (Matematyczne)</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div id="font-results" class="font-result-list">
          <div class="font-empty">Wpisz tekst, aby zobaczyć dostępne style.</div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("font-input");
      const resultsContainer = $("font-results");
      const catTrigger = $("font-cat-trigger");
      const catText = $("font-cat-text");

      const categories = {
        "math": "Stylowe (Matematyczne)",
        "deco": "Ozdobne (Kształty)",
        "effects": "Efekty (Linie, kropki)",
        "frames": "Ramki i Ozdobniki",
        "scripts": "Inne alfabety",
        "zalgo": "Zalgo (Zniekształcone)",
        "weird": "Dziwne i Kreatywne"
      };

      // Bazy dla znaków matematycznych [Wielkie, Małe, Cyfry]
      const mathBases = {
        "Pogrubienie": [0x1D400, 0x1D41A, 0x1D7CE],
        "Kursywa": [0x1D434, 0x1D44E, 0],
        "Pogrubiona kursywa": [0x1D468, 0x1D482, 0],
        "Pismo odręczne": [0x1D49C, 0x1D4B6, 0],
        "Pogrubione odręczne": [0x1D4D0, 0x1D4EA, 0],
        "Gotyckie": [0x1D504, 0x1D51E, 0],
        "Pogrubione gotyckie": [0x1D56C, 0x1D586, 0],
        "Podwójna linia": [0x1D538, 0x1D552, 0x1D7D8],
        "Bezszeryfowe": [0x1D5A0, 0x1D5BA, 0x1D7E2],
        "Bezszeryfowe pogrubione": [0x1D5D4, 0x1D5EE, 0x1D7EC],
        "Bezszeryfowe kursywa": [0x1D608, 0x1D622, 0],
        "Bezszeryfowe pogrubione kursywa": [0x1D63C, 0x1D656, 0],
        "Monospace": [0x1D670, 0x1D68A, 0x1D7F6]
      };

      // Wyjątki, gdzie Unicode ma "dziury" i użycza znaków z innych bloków
      const mathExceptions = {
        0x1D455: 0x210E,
        0x1D49D: 0x212C, 0x1D4A0: 0x2130, 0x1D4A1: 0x2131, 0x1D4A3: 0x210B, 0x1D4A4: 0x2110, 0x1D4A7: 0x2112, 0x1D4A8: 0x2133, 0x1D4AD: 0x211B, 0x1D4BA: 0x212F, 0x1D4BC: 0x210A, 0x1D4C4: 0x2134,
        0x1D506: 0x212D, 0x1D50B: 0x210C, 0x1D50C: 0x2111, 0x1D515: 0x211C, 0x1D51D: 0x2128,
        0x1D53A: 0x2102, 0x1D53F: 0x210D, 0x1D545: 0x2115, 0x1D547: 0x2119, 0x1D548: 0x211A, 0x1D549: 0x211D, 0x1D551: 0x2124
      };

      const decoBases = {
        "Kółeczka": [0x24B6, 0x24D0, 0],
        "Kółeczka ciemne": [0x1F150, 0, 0],
        "Kwadraty": [0x1F130, 0, 0],
        "Kwadraty ciemne": [0x1F170, 0, 0],
        "Pełna szerokość": [0xFF21, 0xFF41, 0xFF10],
        "Małe kapitaliki": ["ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀꜱᴛᴜᴠᴡxʏᴢ", "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀꜱᴛᴜᴠᴡxʏᴢ", ""]
      };

      const effects = {
        "Przekreślenie": '\u0336',
        "Podkreślenie": '\u0332',
        "Podwójne podkreślenie": '\u0333',
        "Ukośnik": '\u0338',
        "Fala": '\u0334',
        "Kropka nad": '\u0307',
        "Kropka pod": '\u0323',
        "Kreska nad": '\u0304',
        "Ptaszek nad": '\u030C',
        "Ogonek": '\u0328',
        "Cedilla": '\u0327',
        "Umlaut": '\u0308',
        "Akcent ostry": '\u0301',
        "Akcent ciężki": '\u0300',
        "Daszek": '\u0302'
      };

      const frames = {
        "Nawiasy ostrokątne": ["《", "》"],
        "Nawiasy klamrowe": ["【", "】"],
        "Podwójne klamry": ["『", "』"],
        "Gwiazdki": ["★", "★"],
        "Puste gwiazdki": ["☆", "☆"],
        "Kwiatki": ["✿", "✿"],
        "Iskierki": ["✧", "✧"],
        "Błyskawice": ["⚡", "⚡"],
        "Kotwice": ["⚓", "⚓"],
        "Koniczyny": ["♣", "♣"],
        "Piki": ["♠", "♠"],
        "Kier": ["♥", "♥"],
        "Karo": ["♦", "♦"],
        "Słońca": ["☀", "☀"],
        "Księżyce": ["☾", "☽"],
        "Chmurki": ["☁", "☁"],
        "Serduszka": ["❤", "❤"],
        "Pioruny": ["ϟ", "ϟ"],
        "Falbanki": ["༺", "༻"],
        "Ozdobne kropki": ["•", "•"],
        "Klamry": ["⦑", "⦒"],
        "Strzałki": ["»", "«"],
        "Kreski": ["⫷", "⫸"],
        "Kratki": ["░", "░"],
        "Pełne kratki": ["█", "█"],
        "Szachownica": ["▒", "▒"]
      };

      const otherScripts = {
        "Greckie": ["ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ", "αβγδεζηθικλμνξοπρστυφχψω", ""],
        "Cyrylica": ["АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ", "абвгдежзийклмнопрстуфхцчшщъыьэюя", ""],
        "Runy": ["ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ", "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ", ""],
        "Gruzińskie": ["აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ", "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ", ""],
        "Symbole": ["♔♕♖♗♘♙♚♛♜♝♞♟", "♔♕♖♗♘♙♚♛♜♝♞♟", "⓪①②③④⑤⑥⑦⑧⑨"]
      };

      const zalgoLevels = {
        "Lekki (Góra)": { up: 1, down: 0, mid: 0 },
        "Lekki (Dół)": { up: 0, down: 1, mid: 0 },
        "Lekki (Środek)": { up: 0, down: 0, mid: 1 },
        "Średni (Góra)": { up: 2, down: 0, mid: 0 },
        "Średni (Dół)": { up: 0, down: 2, mid: 0 },
        "Średni (Mieszany)": { up: 1, down: 1, mid: 1 },
        "Mocny (Góra)": { up: 3, down: 0, mid: 0 },
        "Mocny (Dół)": { up: 0, down: 3, mid: 0 },
        "Mocny (Mieszany)": { up: 2, down: 2, mid: 1 },
        "Bardzo mocny": { up: 5, down: 5, mid: 0 },
        "Ekstremalny": { up: 8, down: 8, mid: 2 },
        "Chaos": { up: 10, down: 10, mid: 5 },
        "Glitch": { up: 2, down: 2, mid: 8 }
      };

      const zalgoUp = ['\u030d', '\u030e', '\u0304', '\u0305', '\u033f', '\u0311', '\u0306', '\u0310', '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030a', '\u0342', '\u0343', '\u0344', '\u034a', '\u034b', '\u034c', '\u0350', '\u0353', '\u0354', '\u0355', '\u0356', '\u0357', '\u0358', '\u0359'];
      const zalgoDown = ['\u0316', '\u0317', '\u0318', '\u0319', '\u031c', '\u031d', '\u031e', '\u031f', '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f', '\u0330', '\u0331', '\u0332', '\u0333', '\u0339', '\u033a', '\u033b', '\u033c', '\u0345', '\u0347', '\u0348', '\u0349', '\u034d', '\u034e'];
      const zalgoMid = ['\u0315', '\u031b', '\u0340', '\u0341', '\u0358', '\u0321', '\u0322', '\u0327', '\u0328', '\u0334', '\u0335', '\u0336', '\u034f', '\u035c', '\u035d', '\u035e', '\u035f', '\u0360', '\u0362', '\u0338', '\u0337', '\u0361', '\u0489'];

      function transformText(text, type, data) {
        if (!text) return "";

        if (type === "math") {
          let result = "";
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const code = char.charCodeAt(0);
            if (char === ' ') { result += ' '; continue; }
            
            let target = 0;
            if (code >= 65 && code <= 90) target = data[0] + (code - 65);
            else if (code >= 97 && code <= 122 && data[1] > 0) target = data[1] + (code - 97);
            else if (code >= 48 && code <= 57 && data[2] > 0) target = data[2] + (code - 48);
            else { result += char; continue; }

            if (mathExceptions[target]) target = mathExceptions[target];
            try { result += String.fromCodePoint(target); } catch { result += char; }
          }
          return result;
        }

        if (type === "deco") {
          let result = "";
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const code = char.charCodeAt(0);
            if (char === ' ') { result += ' '; continue; }
            
            if (typeof data[0] === 'number') {
              let target = 0;
              if (code >= 65 && code <= 90) target = data[0] + (code - 65);
              else if (code >= 97 && code <= 122 && data[1] > 0) target = data[1] + (code - 97);
              else if (code >= 48 && code <= 57 && data[2] > 0) target = data[2] + (code - 48);
              else { result += char; continue; }
              try { result += String.fromCodePoint(target); } catch { result += char; }
            } else {
              if (code >= 65 && code <= 90) result += data[0][code - 65] || char;
              else if (code >= 97 && code <= 122) result += data[1][code - 97] || char;
              else result += char;
            }
          }
          return result;
        }

        if (type === "effect") {
          return text.split('').map(c => c === ' ' ? c : c + data).join('');
        }

        if (type === "frame") {
          return data[0] + " " + text + " " + data[1];
        }

        if (type === "script") {
          let result = "";
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const code = char.charCodeAt(0);
            if (code >= 65 && code <= 90) result += data[0][code - 65] || char;
            else if (code >= 97 && code <= 122) result += data[1][code - 97] || char;
            else if (code >= 48 && code <= 57 && data[2]) result += data[2][code - 48] || char;
            else result += char;
          }
          return result;
        }

        if (type === "zalgo") {
          return text.split('').map(c => {
            if (c === ' ') return c;
            let res = c;
            for (let i=0; i<data.up; i++) res += zalgoUp[Math.floor(Math.random() * zalgoUp.length)];
            for (let i=0; i<data.down; i++) res += zalgoDown[Math.floor(Math.random() * zalgoDown.length)];
            for (let i=0; i<data.mid; i++) res += zalgoMid[Math.floor(Math.random() * zalgoMid.length)];
            return res;
          }).join('');
        }

        if (type === "weird") {
          if (data === "spaced") return text.split('').join(' ');
          if (data === "reverse") return text.split('').reverse().join('');
          if (data === "upside_down") {
            const map = {"a":"ɐ","b":"q","c":"ɔ","d":"p","e":"ǝ","f":"ɟ","g":"ƃ","h":"ɥ","i":"ᴉ","j":"ɾ","k":"ʞ","l":"l","m":"ɯ","n":"u","o":"o","p":"d","q":"b","r":"ɹ","s":"s","t":"ʇ","u":"n","v":"ʌ","w":"ʍ","x":"x","y":"ʎ","z":"z","A":"∀","B":"𐐒","C":"Ɔ","D":"◖","E":"Ǝ","F":"Ⅎ","G":"פ","H":"H","I":"I","J":"ſ","K":"K","L":"˥","M":"W","N":"N","O":"O","P":"Ԁ","Q":"Q","R":"ᴚ","S":"S","T":"⊥","U":"∩","V":"Λ","W":"M","X":"X","Y":"⅄","Z":"Z","0":"0","1":"Ɩ","2":"ᄅ","3":"Ɛ","4":"ㄣ","5":"ϛ","6":"9","7":"ㄥ","8":"8","9":"6",",":"'",".":"˙","?":"¿","!":"¡","'":",","\"":"„","(":")",")":"(","[":"]","]":"[","{":"}","}":"{","<":">",">":"<","&":"⅋","_":"‾"};
            return text.split('').reverse().map(c => map[c] || c).join('');
          }
          return text;
        }
        return text;
      }

      function renderResults() {
        const text = inputEl.value;
        resultsContainer.innerHTML = "";

        if (!text.trim()) {
          resultsContainer.innerHTML = '<div class="font-empty">Wpisz tekst, aby zobaczyć dostępne style.</div>';
          return;
        }

        let stylesToRender = [];

        if (currentCategory === "math") {
          for (let [name, data] of Object.entries(mathBases)) stylesToRender.push({ name, type: "math", data });
        } else if (currentCategory === "deco") {
          for (let [name, data] of Object.entries(decoBases)) stylesToRender.push({ name, type: "deco", data });
        } else if (currentCategory === "effects") {
          for (let [name, data] of Object.entries(effects)) stylesToRender.push({ name, type: "effect", data });
        } else if (currentCategory === "frames") {
          for (let [name, data] of Object.entries(frames)) stylesToRender.push({ name, type: "frame", data });
        } else if (currentCategory === "scripts") {
          for (let [name, data] of Object.entries(otherScripts)) stylesToRender.push({ name, type: "script", data });
        } else if (currentCategory === "zalgo") {
          for (let [name, data] of Object.entries(zalgoLevels)) stylesToRender.push({ name, type: "zalgo", data });
        } else if (currentCategory === "weird") {
          stylesToRender.push({ name: "Spacje", type: "weird", data: "spaced" });
          stylesToRender.push({ name: "Odwrócony", type: "weird", data: "reverse" });
          stylesToRender.push({ name: "Do góry nogami", type: "weird", data: "upside_down" });
        }

        // Specjalne łączenia (np. przekreślenie + podkreślenie)
        if (currentCategory === "effects") {
          stylesToRender.push({ name: "Przekreślenie + Podkreślenie", type: "effect", data: '\u0336\u0332' });
          stylesToRender.push({ name: "Podkreślenie + Kropka", type: "effect", data: '\u0332\u0307' });
        }

        stylesToRender.forEach(style => {
          const transformed = transformText(text, style.type, style.data);
          
          const row = document.createElement("div");
          row.className = "font-row";
          row.innerHTML = `
            <div class="font-text">${transformed}</div>
            <button class="font-copy-btn" title="Kopiuj">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          `;
          
          const btn = row.querySelector(".font-copy-btn");
          btn.onclick = () => Hub.copy(transformed, btn);
          
          resultsContainer.appendChild(row);
        });
      }

      inputEl.addEventListener("input", renderResults, { signal });

      catTrigger.addEventListener("click", async () => {
        const opts = Object.keys(categories).map(k => ({ id: k, label: categories[k] }));
        const choice = await Hub.showSelect({ title: "Wybierz kategorię", options: opts, current: currentCategory, anchor: catTrigger, signal });
        
        if (choice) {
          currentCategory = choice;
          catText.textContent = categories[currentCategory];
          renderResults();
        }
      }, { signal });

    },

    unmount() {}
  });
})();