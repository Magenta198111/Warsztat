(() => {
  Hub.register({
    id: "jednostki",
    title: "Konwerter Jednostek",
    desc: "Błyskawiczne przeliczanie długości, masy, temperatury, objętości, prędkości, czasu i powierzchni",

    async mount(container, signal) {
      let menuStyle = "bottom";
      try { menuStyle = await Hub.db.get("menu_style", "bottom"); } catch(e) {}

      const data = {
        length: {
          name: "Długość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"></line></svg>`,
          units: { m: 1, cm: 0.01, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.34 },
          names: { m: 'Metry', cm: 'Centymetry', km: 'Kilometry', in: 'Cale', ft: 'Stopy', mi: 'Mile' }
        },
        mass: {
          name: "Masa",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><path d="M3 7h18"></path><path d="M6 7l-3 7h6l-3-7z"></path><path d="M18 7l-3 7h6l-3-7z"></path></svg>`,
          units: { kg: 1, g: 0.001, t: 1000, lb: 0.453592, oz: 0.0283495 },
          names: { kg: 'Kilogramy', g: 'Gramy', t: 'Tony', lb: 'Funty', oz: 'Uncje' }
        },
        temp: {
          name: "Temperatura",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>`,
          units: ['C', 'F', 'K'],
          names: { C: 'Celsjusz', F: 'Fahrenheit', K: 'Kelwin' }
        },
        volume: {
          name: "Objętość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12"></path><path d="M6 22h12"></path><path d="M6 2l1.5 18h9L18 2"></path><path d="M7 14h10"></path></svg>`,
          units: { l: 1, ml: 0.001, gal: 3.78541, pt: 0.473176 },
          names: { l: 'Litry', ml: 'Mililitry', gal: 'Galony (US)', pt: 'Pinty (US)' }
        },
        speed: {
          name: "Prędkość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M12 12l4-4"></path><path d="M12 12l-4-4"></path></svg>`,
          units: { ms: 1, kmh: 0.277778, mph: 0.44704, knot: 0.514444 },
          names: { ms: 'Metry na sekundę', kmh: 'Kilometry na godzinę', mph: 'Mile na godzinę', knot: 'Węzły' }
        },
        time: {
          name: "Czas",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
          units: { s: 1, min: 60, h: 3600, d: 86400, w: 604800, mo: 2629800, y: 31557600 },
          names: { s: 'Sekundy', min: 'Minuty', h: 'Godziny', d: 'Dni', w: 'Tygodnie', mo: 'Miesiące', y: 'Lata' }
        },
        area: {
          name: "Powierzchnia",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`,
          units: { m2: 1, km2: 1000000, cm2: 0.0001, ha: 10000, a: 100, ft2: 0.092903, in2: 0.00064516 },
          names: { m2: 'Metry kwadratowe', km2: 'Kilometry kwadratowe', cm2: 'Centymetry kwadratowe', ha: 'Hektary', a: 'Ary', ft2: 'Stopy kwadratowe', in2: 'Cale kwadratowe' }
        }
      };

      let currentCat = 'length';

      let selectorHtml = "";
      if (menuStyle === "bottom") {
        selectorHtml = `
          <div id="u-cat-trigger" class="cat-selector">
            <div class="cat-icon-box" id="u-cat-icon">${data[currentCat].icon}</div>
            <div class="cat-title" id="u-cat-title">${data[currentCat].name}</div>
            <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div id="u-modal" class="n-modal-overlay bottom-mode">
            <div class="n-modal-sheet">
              <div class="n-modal-title">Wybierz kategorię</div>
              ${Object.keys(data).map(key => `
                <div class="n-option ${key === currentCat ? 'active' : ''}" data-cat="${key}">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:20px;height:20px;">${data[key].icon}</div>
                    <span>${data[key].name}</span>
                  </div>
                  <span class="check">✓</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        selectorHtml = `
          <div style="position: relative; margin-bottom: 16px;">
            <div id="u-cat-trigger" class="cat-selector">
              <div class="cat-icon-box" id="u-cat-icon">${data[currentCat].icon}</div>
              <div class="cat-title" id="u-cat-title">${data[currentCat].name}</div>
              <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div id="u-dropdown" class="n-dropdown">
              ${Object.keys(data).map(key => `
                <div class="n-dropdown-item ${key === currentCat ? 'active' : ''}" data-cat="${key}">
                  <div style="width:20px;height:20px;">${data[key].icon}</div>
                  <span>${data[key].name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <style>
          .n-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; margin-top: 0; }
          .n-block { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
          
          .cat-selector { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 16px; cursor: pointer; transition: border-color 0.2s; }
          .cat-selector:active { border-color: var(--muted); }
          .cat-icon-box { width: 36px; height: 36px; background: var(--bg); border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--line); color: var(--accent); }
          .cat-icon-box svg { width: 20px; height: 20px; }
          .cat-title { flex: 1; font-size: 16px; font-weight: 600; color: var(--ink); }
          .cat-selector svg.chevron { color: var(--muted); width: 20px; height: 20px; }
          
          .n-dropdown { position: absolute; top: calc(100% + 6px); left: 0; width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); z-index: 100; overflow: hidden; opacity: 0; transform: translateY(-10px) scaleY(0.95); transform-origin: top center; pointer-events: none; transition: opacity 0.2s, transform 0.2s; }
          .n-dropdown.open { opacity: 1; transform: translateY(0) scaleY(1); pointer-events: auto; }
          .n-dropdown-item { padding: 16px; font-size: 15px; color: var(--ink); cursor: pointer; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 12px; transition: background 0.15s; }
          .n-dropdown-item:last-child { border-bottom: none; }
          .n-dropdown-item:active { background: var(--surface-hover); }
          .n-dropdown-item.active { color: var(--accent); font-weight: 600; background: rgba(129, 140, 248, 0.05); }

          .n-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
          .n-modal-overlay.open { opacity: 1; pointer-events: auto; }
          .n-modal-sheet { background: var(--surface); width: 100%; max-width: 600px; border: 1px solid var(--line); padding: 20px 16px 30px; }
          .n-modal-overlay.bottom-mode { align-items: flex-end; }
          .n-modal-overlay.bottom-mode .n-modal-sheet { border-top-left-radius: 16px; border-top-right-radius: 16px; border-bottom: none; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); max-height: 80vh; overflow-y: auto; }
          .n-modal-overlay.bottom-mode.open .n-modal-sheet { transform: translateY(0); }
          
          .n-modal-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; color: var(--ink); }
          .n-option { padding: 16px; border-radius: 8px; margin-bottom: 8px; background: var(--bg); border: 1px solid transparent; font-size: 15px; color: var(--ink); display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
          .n-option:active { background: var(--line); }
          .n-option.active { border-color: var(--accent); color: var(--accent); font-weight: 600; }
          .n-option .check { opacity: 0; color: var(--accent); }
          .n-option.active .check { opacity: 1; }

          .conv-row { display: flex; gap: 12px; align-items: flex-start; }
          .conv-col { flex: 1; display: flex; flex-direction: column; }
          .conv-input { width: 100%; padding: 14px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font-size: 18px; font-family: monospace; outline: none; text-align: center; }
          .conv-input:focus { border-color: var(--muted); }
          .conv-select { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid var(--line); background: var(--surface-hover); color: var(--ink); font-size: 14px; outline: none; margin-top: 8px; appearance: none; text-align: center; font-weight: 500; }

          .all-units-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
          .unit-row { display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--line); font-size: 14px; }
          .unit-row:last-child { border-bottom: none; }
          .unit-name { color: var(--muted); }
          .unit-val { font-family: monospace; font-weight: 600; }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="u-back" style="width:auto; padding:10px 12px; border-radius:6px; margin:0; border:1px solid var(--line); background:var(--surface); color:var(--ink); display:flex; align-items:center; justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        ${selectorHtml}

        <div class="n-block">
          <span class="n-label">Wprowadź wartość</span>
          <div class="conv-row">
            <div class="conv-col">
              <input type="number" id="u-input" class="conv-input" placeholder="0" value="1">
              <select id="u-from" class="conv-select"></select>
            </div>
          </div>
        </div>

        <div class="n-block">
          <span class="n-label">Wszystkie jednostki</span>
          <div id="u-all-list" class="all-units-list"></div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("u-input");
      const fromSel = $("u-from");
      const allList = $("u-all-list");
      
      const catTrigger = $("u-cat-trigger");
      const catTitle = $("u-cat-title");
      const catIcon = $("u-cat-icon");
      const options = container.querySelectorAll(".n-option, .n-dropdown-item");

      function convertTemp(val, from, to) {
        let c;
        if (from === 'C') c = val;
        if (from === 'F') c = (val - 32) * 5/9;
        if (from === 'K') c = val - 273.15;
        if (to === 'C') return c;
        if (to === 'F') return (c * 9/5) + 32;
        if (to === 'K') return c + 273.15;
      }

      function formatNumber(num) {
        if (num === 0) return "0";
        if (isNaN(num)) return "";
        return Number(num.toPrecision(7)).toLocaleString('pl-PL', { maximumFractionDigits: 6 });
      }

      function calculate() {
        const val = parseFloat(inputEl.value);
        const from = fromSel.value;
        
        if (isNaN(val)) {
          allList.innerHTML = "";
          return;
        }

        allList.innerHTML = "";
        const catData = data[currentCat];
        const keys = currentCat === 'temp' ? catData.units : Object.keys(catData.units);

        keys.forEach(k => {
          if (k === from) return;
          let r = 0;
          if (currentCat === 'temp') {
            r = convertTemp(val, from, k);
          } else {
            r = val * catData.units[from] / catData.units[k];
          }
          allList.innerHTML += `
            <div class="unit-row">
              <span class="unit-name">${catData.names[k]}</span>
              <span class="unit-val">${formatNumber(r)}</span>
            </div>
          `;
        });
      }

      function updateSelects() {
        fromSel.innerHTML = "";
        const catData = data[currentCat];
        const keys = currentCat === 'temp' ? catData.units : Object.keys(catData.units);

        keys.forEach(k => {
          fromSel.innerHTML += `<option value="${k}">${catData.names[k]}</option>`;
        });

        calculate();
      }

      $("u-back").addEventListener("click", () => history.back(), { signal });

      if (menuStyle === "bottom") {
        const modal = $("u-modal");
        catTrigger.addEventListener("click", () => modal.classList.add("open"), { signal });
        modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); }, { signal });
      } else {
        const dropdown = $("u-dropdown");
        catTrigger.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.classList.toggle("open");
        }, { signal });
        document.addEventListener("click", (e) => {
          if (!catTrigger.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove("open");
        }, { signal });
      }

      options.forEach(opt => {
        opt.addEventListener("click", () => {
          currentCat = opt.dataset.cat;
          catTitle.textContent = data[currentCat].name;
          catIcon.innerHTML = data[currentCat].icon;
          
          options.forEach(o => o.classList.remove("active"));
          opt.classList.add("active");
          
          if (menuStyle === "bottom") $("u-modal").classList.remove("open");
          else $("u-dropdown").classList.remove("open");
          
          inputEl.value = "1";
          updateSelects();
        }, { signal });
      });

      inputEl.addEventListener("input", calculate, { signal });
      fromSel.addEventListener("change", calculate, { signal });

      updateSelects();
    },
    unmount() {}
  });
})();