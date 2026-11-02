(() => {
  Hub.register({
    id: "jednostki",
    title: "Konwerter Jednostek",
    icon: "⚖️",
    desc: "Błyskawiczne przeliczanie długości, masy, temperatury i objętości",

    async mount(container, signal) {
      const data = {
        length: {
          base: 'm',
          units: { m: 1, cm: 0.01, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.34 },
          names: { m: 'Metry', cm: 'Centymetry', km: 'Kilometry', in: 'Cale', ft: 'Stopy', mi: 'Mile' }
        },
        mass: {
          base: 'kg',
          units: { kg: 1, g: 0.001, t: 1000, lb: 0.453592, oz: 0.0283495 },
          names: { kg: 'Kilogramy', g: 'Gramy', t: 'Tony', lb: 'Funty', oz: 'Uncje' }
        },
        temp: {
          units: ['C', 'F', 'K'],
          names: { C: 'Celsjusz', F: 'Fahrenheit', K: 'Kelwin' }
        },
        volume: {
          base: 'l',
          units: { l: 1, ml: 0.001, gal: 3.78541, pt: 0.473176 },
          names: { l: 'Litry', ml: 'Mililitry', gal: 'Galony (US)', pt: 'Pinty (US)' }
        }
      };

      let currentCat = 'length';

      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <button id="u-back" style="width:auto; padding:10px 16px; border-radius:14px;">Wróć</button>
          <h2 style="margin:0; font-size:18px;">Konwerter Jednostek</h2>
          <div style="width:68px;"></div>
        </div>

        <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom:16px; -webkit-overflow-scrolling:touch;">
          <button class="pill p" data-cat="length" style="width:auto; padding:8px 16px; border-radius:20px; white-space:nowrap; margin:0;">Długość</button>
          <button class="pill" data-cat="mass" style="width:auto; padding:8px 16px; border-radius:20px; white-space:nowrap; margin:0;">Masa</button>
          <button class="pill" data-cat="temp" style="width:auto; padding:8px 16px; border-radius:20px; white-space:nowrap; margin:0;">Temperatura</button>
          <button class="pill" data-cat="volume" style="width:auto; padding:8px 16px; border-radius:20px; white-space:nowrap; margin:0;">Objętość</button>
        </div>

        <div class="card" style="padding-bottom:20px;">
          <div style="display:flex; gap:8px;">
            <input type="number" id="u-input" placeholder="Wpisz wartość..." style="flex:1; padding:12px 14px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; font-size:16px; outline:none;">
            <select id="u-from" style="flex:1; padding:12px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--ink); font:inherit;"></select>
          </div>
        </div>

        <div class="card hidden" id="u-all-card" style="padding-bottom:8px;">
          <h3 style="margin:0 0 12px; font-size:16px; color:var(--muted);">Wszystkie jednostki</h3>
          <div id="u-all-list" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("u-input");
      const fromSel = $("u-from");
      const allCard = $("u-all-card");
      const allList = $("u-all-list");
      const pills = container.querySelectorAll(".pill");

      function formatNumber(num) {
        if (num === 0) return "0";
        if (isNaN(num)) return "";
        return Number(num.toPrecision(7)).toLocaleString('pl-PL', { maximumFractionDigits: 6 });
      }

      function convertTemp(val, from, to) {
        let c;
        if (from === 'C') c = val;
        if (from === 'F') c = (val - 32) * 5/9;
        if (from === 'K') c = val - 273.15;

        if (to === 'C') return c;
        if (to === 'F') return (c * 9/5) + 32;
        if (to === 'K') return c + 273.15;
      }

      function calculate() {
        const val = parseFloat(inputEl.value);
        const from = fromSel.value;

        if (isNaN(val)) {
          allCard.classList.add("hidden");
          return;
        }

        allCard.classList.remove("hidden");
        allList.innerHTML = "";

        const catData = data[currentCat];
        const keys = currentCat === 'temp' ? catData.units : Object.keys(catData.units);

        keys.forEach(k => {
          if (k === from) return;
          
          let res = 0;
          if (currentCat === 'temp') {
            res = convertTemp(val, from, k);
          } else {
            res = val * catData.units[from] / catData.units[k];
          }

          allList.innerHTML += `
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:8px; padding-top:4px;">
              <span style="color:var(--muted);">${catData.names[k]}</span>
              <span style="font-weight:bold;">${formatNumber(res)}</span>
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

      pills.forEach(pill => {
        pill.addEventListener("click", () => {
          pills.forEach(p => { p.classList.remove("p"); });
          pill.classList.add("p");
          currentCat = pill.dataset.cat;
          inputEl.value = "";
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