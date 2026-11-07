(() => {
  Hub.register({
    id: "kalkulator-zdrowia",
    title: "Kalkulator Zdrowia",
    desc: "Oblicz swoje BMI, zapotrzebowanie kaloryczne (BMR) i TDEE",

    async mount(container, signal) {
      let savedData = await Hub.db.get("health_data", {
        gender: "male",
        age: 25,
        weight: 70,
        height: 175,
        activity: "moderate"
      });

      const activityLevels = {
        "sedentary": { label: "Siedzący (brak ćwiczeń)", multiplier: 1.2 },
        "light": { label: "Lekka aktywność (1-3 dni/tyg.)", multiplier: 1.375 },
        "moderate": { label: "Średnia aktywność (3-5 dni/tyg.)", multiplier: 1.55 },
        "active": { label: "Duża aktywność (6-7 dni/tyg.)", multiplier: 1.725 },
        "very_active": { label: "Bardzo duża (praca fizyczna + treningi)", multiplier: 1.9 }
      };

      container.innerHTML = `
        <style>
          .h-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .h-gender-row {
            display: flex; align-items: center; justify-content: space-between;
            padding-bottom: 20px; border-bottom: 1px solid var(--line); margin-bottom: 24px;
          }
          .h-gender-label { font-size: 14px; font-weight: 600; color: var(--ink); }
          .h-gender-pills { display: flex; gap: 6px; }
          .h-gender-btn {
            padding: 8px 16px; background: transparent; border: 1px solid var(--line);
            border-radius: 20px; color: var(--muted); font-size: 13px; font-weight: 500;
            cursor: pointer; transition: all 0.2s; outline: none; font-family: inherit;
          }
          .h-gender-btn.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; }
          
          .h-hero {
            display: flex; flex-direction: column; align-items: center;
            padding: 8px 0 28px 0; border-bottom: 1px solid var(--line); margin-bottom: 24px;
          }
          .h-hero-input {
            width: 100%; background: transparent; border: none;
            color: var(--ink); font-size: 64px; font-weight: 800;
            text-align: center; outline: none; font-family: monospace;
            letter-spacing: -0.04em; padding: 0; line-height: 1;
          }
          .h-hero-unit {
            font-size: 14px; color: var(--muted); font-weight: 600;
            margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px;
          }
          
          .h-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
          .h-field-row {
            display: flex; align-items: baseline; justify-content: space-between;
            border-bottom: 1px solid var(--line); padding-bottom: 8px; transition: border-color 0.2s;
          }
          .h-field-row:focus-within { border-bottom-color: var(--accent); }
          .h-field-input {
            width: 100%; background: transparent; border: none;
            color: var(--ink); font-size: 24px; font-weight: 700;
            outline: none; font-family: monospace;
          }
          .h-field-unit { font-size: 12px; color: var(--muted); font-weight: 500; margin-left: 6px; }
          
          .h-trigger {
            display: flex; justify-content: space-between; align-items: center;
            background: transparent; border: none; border-bottom: 1px solid var(--line);
            padding: 14px 0; color: var(--ink); font-size: 15px; font-weight: 500;
            cursor: pointer; user-select: none; margin-bottom: 32px; transition: color 0.2s;
          }
          .h-trigger:active { color: var(--accent); }
          .h-trigger svg { color: var(--muted); flex-shrink: 0; width: 16px; height: 16px; }
          
          .h-results-header {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 1.5px; color: var(--accent);
            padding-bottom: 20px; display: flex; align-items: center; gap: 12px;
          }
          .h-results-header::after { content: ''; flex: 1; height: 1px; background: var(--line); }
          
          .h-bmi-card { padding: 8px 0 24px 0; border-bottom: 1px solid var(--line); }
          .h-bmi-top { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 16px; }
          .h-bmi-label { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
          .h-bmi-number { font-size: 52px; font-weight: 800; font-family: monospace; color: var(--ink); line-height: 1; }
          .h-bmi-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 12px; border-radius: 4px; color: #000; margin-bottom: 8px; }
          
          .h-bmi-bar-wrap { padding: 8px 0 4px 0; }
          .h-bmi-bar {
            width: 100%; height: 8px; border-radius: 4px; position: relative;
            background: linear-gradient(to right,
              #3b82f6 0%, #3b82f6 10.4%, #34d399 10.4%, #34d399 37.5%,
              #fbbf24 37.5%, #fbbf24 58.3%, #ef4444 58.3%, #ef4444 100%
            );
          }
          .h-bmi-marker {
            position: absolute; top: 50%; width: 14px; height: 14px;
            background: #ffffff; border: 2px solid var(--bg); border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.6); transform: translate(-50%, -50%);
            transition: left 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          .h-bmi-scale { display: flex; justify-content: space-between; font-size: 10px; color: var(--muted); font-family: monospace; margin-top: 8px; }
          .h-bmi-desc { font-size: 13px; color: var(--muted); line-height: 1.5; margin-top: 12px; }
          
          .h-cal-list { padding: 4px 0; }
          .h-cal-row {
            display: flex; align-items: flex-start; justify-content: space-between;
            padding: 20px 0; border-bottom: 1px solid var(--line);
          }
          .h-cal-row:last-child { border-bottom: none; }
          .h-cal-info { display: flex; flex-direction: column; gap: 6px; padding-right: 16px; }
          .h-cal-label { font-size: 16px; font-weight: 600; color: var(--ink); }
          .h-cal-sub { font-size: 12px; color: var(--muted); line-height: 1.4; }
          .h-cal-val { font-size: 26px; font-weight: 800; font-family: monospace; color: var(--ink); white-space: nowrap; padding-top: 2px; }
          .h-cal-val small { font-size: 12px; font-weight: 500; color: var(--muted); font-family: -apple-system, sans-serif; margin-left: 4px; }
          
          .h-goals { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 24px; }
          .h-goal { padding: 20px 16px; border: 1px solid var(--accent); border-radius: 8px; text-align: center; display: flex; flex-direction: column; }
          .h-goal-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent); margin-bottom: 12px; }
          .h-goal-val { font-size: 24px; font-weight: 800; font-family: monospace; color: var(--ink); margin-bottom: 12px; }
          .h-goal-val small { font-size: 10px; font-weight: 500; color: var(--muted); font-family: -apple-system, sans-serif; margin-left: 2px; }
          .h-goal-desc { font-size: 11px; color: var(--muted); line-height: 1.4; margin-top: auto; }
          
          .h-disclaimer {
            display: flex; align-items: flex-start; gap: 10px;
            background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.3);
            border-radius: 8px; padding: 16px; margin-top: 32px; margin-bottom: 40px;
            font-size: 12px; color: #fbbf24; line-height: 1.5;
          }
          .h-disclaimer svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          
          <div class="h-gender-row">
            <div class="h-gender-label">Płeć</div>
            <div class="h-gender-pills">
              <button class="h-gender-btn" data-gender="male">Mężczyzna</button>
              <button class="h-gender-btn" data-gender="female">Kobieta</button>
            </div>
          </div>

          <div class="h-hero">
            <label class="h-label">Waga</label>
            <input type="number" id="h-weight" class="h-hero-input" value="${savedData.weight}" min="30" max="300" inputmode="decimal">
            <span class="h-hero-unit">kg</span>
          </div>

          <div class="h-row-2">
            <div>
              <label class="h-label">Wzrost</label>
              <div class="h-field-row">
                <input type="number" id="h-height" class="h-field-input" value="${savedData.height}" min="100" max="250" inputmode="decimal">
                <span class="h-field-unit">cm</span>
              </div>
            </div>
            <div>
              <label class="h-label">Wiek</label>
              <div class="h-field-row">
                <input type="number" id="h-age" class="h-field-input" value="${savedData.age}" min="10" max="120" inputmode="decimal">
                <span class="h-field-unit">lat</span>
              </div>
            </div>
          </div>

          <label class="h-label">Aktywność</label>
          <div id="h-activity-trigger" class="h-trigger">
            <span id="h-activity-text">${activityLevels[savedData.activity].label}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>

          <div class="h-results-header">Wyniki</div>

          <div class="h-bmi-card">
            <div class="h-bmi-top">
              <div>
                <div class="h-bmi-label">Twoje BMI</div>
                <div class="h-bmi-number" id="h-bmi-val">0.0</div>
              </div>
              <div id="h-bmi-status" class="h-bmi-badge">-</div>
            </div>
            <div class="h-bmi-bar-wrap">
              <div class="h-bmi-bar">
                <div class="h-bmi-marker" id="h-bmi-marker" style="left: 0%;"></div>
              </div>
              <div class="h-bmi-scale">
                <span>16</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
              </div>
            </div>
            <div class="h-bmi-desc" id="h-bmi-desc">-</div>
          </div>

          <div class="h-cal-list">
            <div class="h-cal-row">
              <div class="h-cal-info">
                <div class="h-cal-label">Całkowite zapotrzebowanie</div>
                <div class="h-cal-sub">TDEE – szacowana ilość kalorii, którą powinieneś spożywać dziennie, aby utrzymać obecną wagę. Uwzględnia Twoją aktywność.</div>
              </div>
              <div class="h-cal-val" id="h-tdee-val">0 <small>kcal</small></div>
            </div>
            <div class="h-cal-row">
              <div class="h-cal-info">
                <div class="h-cal-label">Podstawowa przemiana</div>
                <div class="h-cal-sub">BMR – energia, jaką organizm zużywa w spoczynku (np. podczas snu) na samo podtrzymanie funkcji życiowych.</div>
              </div>
              <div class="h-cal-val" id="h-bmr-val">0 <small>kcal</small></div>
            </div>
          </div>

          <div class="h-goals">
            <div class="h-goal">
              <div class="h-goal-title">Aby schudnąć</div>
              <div class="h-goal-val" id="h-lose-val">0 <small>kcal</small></div>
              <div class="h-goal-desc">Deficyt 500 kcal dziennie to ok. 0,5 kg mniej na tydzień.</div>
            </div>
            <div class="h-goal">
              <div class="h-goal-title">Aby przytyć</div>
              <div class="h-goal-val" id="h-gain-val">0 <small>kcal</small></div>
              <div class="h-goal-desc">Nadwyżka 300 kcal to najzdrowsza opcja na przyrost masy.</div>
            </div>
          </div>

          <div class="h-disclaimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <div>
              <strong>Wyniki są orientacyjne.</strong> Kalkulator opiera się na uśrednionych wzorach. Aby uzyskać precyzyjne i rzeczywiste wyniki, skontaktuj się z dietetykiem lub lekarzem.
            </div>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const ageInput = $("h-age");
      const heightInput = $("h-height");
      const weightInput = $("h-weight");
      const activityTrigger = $("h-activity-trigger");
      const activityText = $("h-activity-text");
      const genderBtns = container.querySelectorAll(".h-gender-btn");
      const bmiMarker = $("h-bmi-marker");

      let currentGender = savedData.gender;
      let currentActivity = savedData.activity;

      function updateGenderUI() {
        genderBtns.forEach(btn => {
          if (btn.dataset.gender === currentGender) btn.classList.add("active");
          else btn.classList.remove("active");
        });
      }

      function saveData() {
        Hub.db.set("health_data", {
          gender: currentGender,
          age: parseInt(ageInput.value) || 0,
          weight: parseFloat(weightInput.value) || 0,
          height: parseFloat(heightInput.value) || 0,
          activity: currentActivity
        });
      }

      function bmiToPercent(bmi) {
        const min = 16, max = 40;
        if (bmi <= min) return 0;
        if (bmi >= max) return 100;
        return ((bmi - min) / (max - min)) * 100;
      }

      function calculate() {
        const age = parseInt(ageInput.value) || 0;
        const weight = parseFloat(weightInput.value) || 0;
        const height = parseFloat(heightInput.value) || 0;

        if (age <= 0 || weight <= 0 || height <= 0) return;

        const heightM = height / 100;
        const bmi = weight / (heightM * heightM);
        
        $("h-bmi-val").textContent = bmi.toFixed(1);
        
        let bmiStatus = "";
        let bmiColor = "";
        let bmiDesc = "";

        if (bmi < 16) {
          bmiStatus = "Wygłodzenie";
          bmiColor = "#3b82f6";
          bmiDesc = "Twoja waga jest zdecydowanie za niska. Skonsultuj się z lekarzem.";
        } else if (bmi < 18.5) {
          bmiStatus = "Niedowaga";
          bmiColor = "#3b82f6";
          bmiDesc = "Twoja waga jest nieco za niska. Warto zadbać o zdrową dietę.";
        } else if (bmi < 25) {
          bmiStatus = "Waga prawidłowa";
          bmiColor = "#34d399";
          bmiDesc = "Świetnie! Twoja waga jest w normie. Kontynuuj zdrowe nawyki.";
        } else if (bmi < 30) {
          bmiStatus = "Nadwaga";
          bmiColor = "#fbbf24";
          bmiDesc = "Masz lekką nadwagę. Warto zwiększyć aktywność fizyczną.";
        } else {
          bmiStatus = "Otyłość";
          bmiColor = "#ef4444";
          bmiDesc = "Twoja waga jest zbyt wysoka. Rozważ konsultację z dietetykiem.";
        }

        const statusEl = $("h-bmi-status");
        statusEl.textContent = bmiStatus;
        statusEl.style.backgroundColor = bmiColor;
        $("h-bmi-desc").textContent = bmiDesc;
        
        bmiMarker.style.left = bmiToPercent(bmi) + "%";

        let bmr = (10 * weight) + (6.25 * height) - (5 * age);
        if (currentGender === "male") bmr += 5;
        else bmr -= 161;

        $("h-bmr-val").innerHTML = Math.round(bmr) + ' <small>kcal</small>';

        const multiplier = activityLevels[currentActivity].multiplier;
        const tdee = bmr * multiplier;

        $("h-tdee-val").innerHTML = Math.round(tdee) + ' <small>kcal</small>';

        $("h-lose-val").innerHTML = Math.round(tdee - 500) + ' <small>kcal</small>';
        $("h-gain-val").innerHTML = Math.round(tdee + 300) + ' <small>kcal</small>';
      }

      genderBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          Hub.haptic('light');
          currentGender = btn.dataset.gender;
          updateGenderUI();
          saveData();
          calculate();
        }, { signal });
      });

      activityTrigger.addEventListener("click", async () => {
        const opts = Object.keys(activityLevels).map(k => ({ id: k, label: activityLevels[k].label }));
        const choice = await Hub.showSelect({ title: "Poziom aktywności", options: opts, current: currentActivity, anchor: activityTrigger, signal });
        
        if (choice) {
          currentActivity = choice;
          activityText.textContent = activityLevels[currentActivity].label;
          saveData();
          calculate();
        }
      }, { signal });

      [ageInput, heightInput, weightInput].forEach(input => {
        input.addEventListener("input", () => {
          saveData();
          calculate();
        }, { signal });
      });

      updateGenderUI();
      calculate();
    },

    unmount() {}
  });
})();