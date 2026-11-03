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
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"></line></svg>`,
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
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
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
          <div id="u-cat-trigger" class="uc-top-trigger">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="uc-top-icon">${data[currentCat].icon}</div>
              <span>${data[currentCat].name}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div id="u-modal" class="uc-modal-overlay bottom-mode">
            <div class="uc-modal-sheet">
              <div class="uc-modal-title">Kategoria</div>
              ${Object.keys(data).map(key => `
                <div class="uc-modal-item ${key === currentCat ? 'active' : ''}" data-cat="${key}">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:18px;height:18px;opacity:0.7;">${data[key].icon}</div>
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
          <div style="position: relative;">
            <div id="u-cat-trigger" class="uc-top-trigger">
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="uc-top-icon">${data[currentCat].icon}</div>
                <span>${data[currentCat].name}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div id="u-dropdown" class="uc-dropdown">
              ${Object.keys(data).map(key => `
                <div class="uc-dropdown-item ${key === currentCat ? 'active' : ''}" data-cat="${key}">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:18px;height:18px;opacity:0.7;">${data[key].icon}</div>
                    <span>${data[key].name}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <style>
          .uc-top-trigger {
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 0; border-bottom: 1px solid var(--line);
            font-size: 14px; font-weight: 600; color: var(--ink);
            cursor: pointer; margin-bottom: 24px;
          }
          .uc-top-icon { width: 20px; height: 20px; color: var(--accent); }
          
          .uc-input-container {
            display: flex; flex-direction: column; align-items: center;
            padding: 20px 0 32px 0; border-bottom: 1px solid var(--line);
            margin-bottom: 24px;
          }
          
          .uc-big-input {
            width: 100%; background: transparent; border: none;
            color: var(--ink); font-size: 48px; font-weight: 700;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
            text-align: center; outline: none; padding: 0;
            letter-spacing: -0.03em;
          }
          .uc-big-input::-webkit-outer-spin-button,
          .uc-big-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          
          .uc-select-trigger {
            display: flex; align-items: center; gap: 6px;
            background: transparent; border: none;
            color: var(--accent); font-size: 16px; font-weight: 600;
            cursor: pointer; margin-top: 8px; padding: 4px 8px; border-radius: 4px;
          }
          .uc-select-trigger:active { background: rgba(129, 140, 248, 0.1); }
          
          .uc-list { display: flex; flex-direction: column; }
          .uc-row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 15px; }
          .uc-row:last-child { border-bottom: none; }
          .uc-row-name { color: var(--muted); font-weight: 500; }
          .uc-row-val { color: var(--ink); font-family: monospace; font-size: 16px; font-weight: 600; }
          
          .uc-dropdown { position: absolute; top: calc(100% + 4px); left: 0; width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); z-index: 100; overflow: hidden; opacity: 0; transform: translateY(-5px); pointer-events: none; transition: opacity 0.15s, transform 0.15s; }
          .uc-dropdown.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
          .uc-dropdown-item { padding: 14px 16px; font-size: 14px; color: var(--ink); display: flex; align-items: center; cursor: pointer; border-bottom: 1px solid var(--line); }
          .uc-dropdown-item:last-child { border-bottom: none; }
          .uc-dropdown-item.active { color: var(--accent); font-weight: 600; background: rgba(129, 140, 248, 0.05); }
          
          .uc-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
          .uc-modal-overlay.open { opacity: 1; pointer-events: auto; }
          .uc-modal-sheet { background: var(--surface); width: 100%; max-width: 600px; border: 1px solid var(--line); padding: 24px 16px; }
          .uc-modal-overlay.bottom-mode { align-items: flex-end; }
          .uc-modal-overlay.bottom-mode .uc-modal-sheet { border-top-left-radius: 16px; border-top-right-radius: 16px; border-bottom: none; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); max-height: 80vh; overflow-y: auto; }
          .uc-modal-overlay.bottom-mode.open .uc-modal-sheet { transform: translateY(0); }
          .uc-modal-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--muted); text-align: center; margin-bottom: 16px; letter-spacing: 0.5px; }
          .uc-modal-item { padding: 16px; border-radius: 6px; margin-bottom: 4px; font-size: 15px; color: var(--ink); display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: var(--bg); }
          .uc-modal-item:active { background: var(--line); }
          .uc-modal-item.active { color: var(--accent); font-weight: 600; }
          .uc-modal-item .check { opacity: 0; color: var(--accent); }
          .uc-modal-item.active .check { opacity: 1; }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:8px;">
          <button id="u-back" style="width:auto; padding:8px 12px 8px 0; border:none; background:transparent; color:var(--muted); display:flex; align-items:center; justify-content:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        ${selectorHtml}

        <div class="uc-input-container">
          <input type="number" id="u-input" class="uc-big-input" placeholder="0" value="1" inputmode="decimal">
          <div id="u-unit-trigger" class="uc-select-trigger">
            <span id="u-unit-text">Metry</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; letter-spacing: 0.5px;">Przeliczenia</div>
          <div id="u-all-list" class="uc-list"></div>
        </div>

        <div id="u-unit-modal" class="uc-modal-overlay ${menuStyle === 'bottom' ? 'bottom-mode' : ''}">
          <div class="uc-modal-sheet">
            <div class="uc-modal-title">Wybierz jednostkę</div>
            <div id="u-unit-options"></div>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("u-input");
      const allList = $("u-all-list");
      const unitText = $("u-unit-text");
      const unitTrigger = $("u-unit-trigger");
      const unitModal = $("u-unit-modal");
      const unitOptionsContainer = $("u-unit-options");
      
      const catTrigger = $("u-cat-trigger");
      const catTitle = catTrigger.querySelector('span');
      const catIcon = catTrigger.querySelector('.uc-top-icon');
      const options = container.querySelectorAll(".uc-modal-item, .uc-dropdown-item");

      let currentUnit = Object.keys(data[currentCat].units)[0];

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
        let str = Number(num.toPrecision(7)).toLocaleString('pl-PL', { maximumFractionDigits: 6 });
        return str.replace(/,/g, '<span style="color: var(--accent);">,</span>');
      }

      function calculate() {
        const val = parseFloat(inputEl.value);
        if (isNaN(val)) { allList.innerHTML = ""; return; }

        allList.innerHTML = "";
        const catData = data[currentCat];
        const keys = currentCat === 'temp' ? catData.units : Object.keys(catData.units);

        keys.forEach(k => {
          if (k === currentUnit) return;
          let r = 0;
          if (currentCat === 'temp') {
            r = convertTemp(val, currentUnit, k);
          } else {
            r = val * catData.units[currentUnit] / catData.units[k];
          }
          allList.innerHTML += `
            <div class="uc-row">
              <span class="uc-row-name">${catData.names[k]}</span>
              <span class="uc-row-val">${formatNumber(r)}</span>
            </div>
          `;
        });
      }

      function updateUnitList() {
        const catData = data[currentCat];
        const keys = currentCat === 'temp' ? catData.units : Object.keys(catData.units);
        
        currentUnit = keys[0];
        unitText.textContent = catData.names[currentUnit];

        unitOptionsContainer.innerHTML = keys.map(k => `
          <div class="uc-modal-item ${k === currentUnit ? 'active' : ''}" data-unit="${k}">
            <span>${catData.names[k]}</span>
            <span class="check">✓</span>
          </div>
        `).join('');

        unitOptionsContainer.querySelectorAll('.uc-modal-item').forEach(opt => {
          opt.addEventListener('click', () => {
            currentUnit = opt.dataset.unit;
            unitText.textContent = catData.names[currentUnit];
            
            unitOptionsContainer.querySelectorAll('.uc-modal-item').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            unitModal.classList.remove('open');
            calculate();
          }, { signal });
        });

        calculate();
      }

      $("u-back").addEventListener("click", () => history.back(), { signal });

      unitTrigger.addEventListener("click", () => unitModal.classList.add("open"), { signal });
      unitModal.addEventListener("click", (e) => { if (e.target === unitModal) unitModal.classList.remove("open"); }, { signal });

      if (menuStyle === "bottom") {
        catTrigger.addEventListener("click", () => $("u-modal").classList.add("open"), { signal });
        $("u-modal").addEventListener("click", (e) => { if (e.target === $("u-modal")) $("u-modal").classList.remove("open"); }, { signal });
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
          updateUnitList();
        }, { signal });
      });

      inputEl.addEventListener("input", calculate, { signal });
      updateUnitList();
    },
    unmount() {}
  });
})();