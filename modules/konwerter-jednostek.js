(() => {
  Hub.register({
    id: "jednostki",
    title: "Konwerter Jednostek",
    desc: "Błyskawiczne przeliczanie długości, masy, temperatury i objętości",

    async mount(container, signal) {
      const data = {
        length: {
          name: "Długość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><path d="M3 7h18"></path><path d="M6 7l-3 7h6l-3-7z"></path><path d="M18 7l-3 7h6l-3-7z"></path></svg>`,
          units: { m: 1, cm: 0.01, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.34 },
          names: { m: 'Metry', cm: 'Centymetry', km: 'Kilometry', in: 'Cale', ft: 'Stopy', mi: 'Mile' }
        },
        mass: {
          name: "Masa",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M8 6h8"></path><path d="M4 22h16"></path><circle cx="12" cy="6" r="2"></circle></svg>`,
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
        }
      };

      let currentCat = 'length';

      container.innerHTML = `
        <style>
          .n-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; margin-top: 0; }
          .n-block { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
          
          .cat-selector {
            display: flex; align-items: center; gap: 12px;
            background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
            padding: 16px; cursor: pointer; margin-bottom: 16px; transition: border-color 0.2s;
          }
          .cat-selector:active { border-color: var(--muted); }
          .cat-icon-box { width: 36px; height: 36px; background: var(--bg); border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--line); color: var(--accent); }
          .cat-icon-box svg { width: 20px; height: 20px; }
          .cat-title { flex: 1; font-size: 16px; font-weight: 600; color: var(--ink); }
          .cat-selector svg.chevron { color: var(--muted); width: 20px; height: 20px; }
          
          .n-dropdown { position: absolute; top: calc(100% + 6px); left: 0; width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); z-index: 100; overflow: hidden; opacity: 0; transform: translateY(-10px) scaleY(0.95); transform-origin: top center; pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; }
          .n-dropdown.open { opacity: 1; transform: translateY(0) scaleY(1); pointer-events: auto; }
          .n-dropdown-item { padding: 16px; font-size: 15px; color: var(--ink); cursor: pointer; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 12px; transition: background 0.15s; }
          .n-dropdown-item:last-child { border-bottom: none; }
          .n-dropdown-item:active { background: var(--surface-hover); }
          .n-dropdown-item.active { color: var(--accent); font-weight: 600; background: rgba(129, 140, 248, 0.05); }

          .conv-row { display: flex; gap: 10px; align-items: stretch; margin-bottom: 12px; }
          .conv-col { flex: 1; display: flex; flex-direction: column; }
          .conv-input { width: 100%; padding: 14px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font-size: 18px; font-family: monospace; outline: none; text-align: center; }
          .conv-input:focus { border-color: var(--muted); }
          .conv-select { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid var(--line); background: var(--surface-hover); color: var(--ink); font-size: 14px; outline: none; margin-top: 8px; appearance: none; text-align: center; font-weight: 500; }
          
          .swap-btn { display: flex; align-items: center; justify-content: center; padding: 0 10px; background: var(--surface); border: none; border-radius: 6px; color: var(--muted); cursor: pointer; transition: color 0.2s; }
          .swap-btn:active { color: var(--accent); }

          .result-box { background: var(--bg); border: 1px dashed var(--line); border-radius: 6px; padding: 16px; text-align: center; margin-top: 8px; }
          .result-val { font-family: monospace; font-size: 24px; font-weight: bold; color: var(--accent); }
          
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

        <div style="position: relative;">
          <div id="u-cat-trigger" class="cat-selector">
            <div class="cat-icon-box" id="u-cat-icon">${data[currentCat].icon}</div>
            <div class="cat-title" id="u-cat-title">${data[currentCat].name}</div>
            <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div id="u-cat-dropdown" class="n-dropdown">
            ${Object.keys(data).map(key => `
              <div class="n-dropdown-item ${key === currentCat ? 'active' : ''}" data-cat="${key}">
                <div style="width:24px;height:24px;">${data[key].icon}</div>
                <span>${data[key].name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="n-block">
          <span class="n-label">Wprowadź wartość</span>
          
          <div class="conv-row">
            <div class="conv-col">
              <input type="number" id="u-input" class="conv-input" placeholder="0" value="1">
              <select id="u-from" class="conv-select"></select>
            </div>
            
            <button id="u-swap" class="swap-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
            </button>

            <div class="conv-col">
              <div class="conv-input" style="opacity: 0.8; pointer-events: none; background: var(--surface-hover); display: flex; align-items: center; justify-content: center;" id="u-result">1</div>
              <select id="u-to" class="conv-select"></select>
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
      const resultEl = $("u-result");
      const fromSel = $("u-from");
      const toSel = $("u-to");
      const allList = $("u-all-list");
      
      const catTrigger = $("u-cat-trigger");
      const catDropdown = $("u-cat-dropdown");
      const catTitle = $("u-cat-title");
      const catIcon = $("u-cat-icon");
      const catOptions = container.querySelectorAll(".n-dropdown-item");

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
        const to = toSel.value;
        
        if (isNaN(val)) {
          resultEl.textContent = "";
          allList.innerHTML = "";
          return;
        }

        let result = 0;
        const catData = data[currentCat];
        
        if (currentCat === 'temp') {
          result = convertTemp(val, from, to);
        } else {
          result = val * catData.units[from] / catData.units[to];
        }

        resultEl.textContent = formatNumber(result);

        allList.innerHTML = "";
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
        toSel.innerHTML = "";
        
        const catData = data[currentCat];
        const keys = currentCat === 'temp' ? catData.units : Object.keys(catData.units);

        keys.forEach(k => {
          fromSel.innerHTML += `<option value="${k}">${catData.names[k]}</option>`;
          toSel.innerHTML += `<option value="${k}">${catData.names[k]}</option>`;
        });

        if (keys.length > 1) {
          fromSel.selectedIndex = 0;
          toSel.selectedIndex = 1;
        }
        calculate();
      }

      $("u-back").addEventListener("click", () => history.back(), { signal });

      catTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        catDropdown.classList.toggle("open");
      }, { signal });

      document.addEventListener("click", (e) => {
        if (!catTrigger.contains(e.target) && !catDropdown.contains(e.target)) {
          catDropdown.classList.remove("open");
        }
      }, { signal });

      catOptions.forEach(opt => {
        opt.addEventListener("click", () => {
          currentCat = opt.dataset.cat;
          catTitle.textContent = data[currentCat].name;
          catIcon.innerHTML = data[currentCat].icon;
          
          catOptions.forEach(o => o.classList.remove("active"));
          opt.classList.add("active");
          catDropdown.classList.remove("open");
          
          inputEl.value = "1";
          updateSelects();
        }, { signal });
      });

      inputEl.addEventListener("input", calculate, { signal });
      fromSel.addEventListener("change", calculate, { signal });
      toSel.addEventListener("change", calculate, { signal });

      $("u-swap").addEventListener("click", () => {
        const temp = fromSel.value;
        fromSel.value = toSel.value;
        toSel.value = temp;
        calculate();
      }, { signal });

      updateSelects();
    },
    unmount() {}
  });
})();