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
          
          /* Układ dwukolumnowy dla pól */
          .h-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;
          }
          
          /* Zgrabne pola z dolną linią */
          .h-field { display: flex; flex-direction: column; }
          .h-input-row { 
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid var(--line); padding-bottom: 8px;
            transition: border-color 0.2s;
          }
          .h-input-row:focus-within { border-bottom-color: var(--accent); }
          
          .h-input {
            width: 100%; background: transparent; border: none;
            color: var(--ink); font-size: 20px; font-weight: 600;
            outline: none; font-family: monospace;
          }
          .h-unit { font-size: 13px; color: var(--muted); font-weight: 500; margin-left: 8px; flex-shrink: 0; }

          /* Przełącznik płci */
          .h-gender-segment {
            display: flex; background: var(--bg); border: 1px solid var(--line);
            border-radius: 6px; overflow: hidden; margin-bottom: 24px;
          }
          .h-gender-btn {
            flex: 1; padding: 10px; background: transparent; border: none;
            color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer;
            transition: background 0.2s, color 0.2s; outline: none; font-family: inherit;
          }
          .h-gender-btn.active { background: var(--surface-hover); color: var(--accent); font-weight: 600; }

          /* Standardowy trigger */
          .h-trigger { 
            display: flex; justify-content: space-between; align-items: center; 
            background: transparent; border: none; border-bottom: 1px solid var(--line); 
            padding: 14px 0; color: var(--ink); font-size: 15px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s; margin-bottom: 32px;
          }
          .h-trigger:active { color: var(--accent); }
          .h-trigger svg { color: var(--muted); flex-shrink: 0; width: 16px; height: 16px; }

          /* Lista wyników (jak w konwerterze) */
          .h-results { display: flex; flex-direction: column; }
          
          .h-result-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 0; border-bottom: 1px solid var(--line);
          }
          .h-result-row:last-child { border-bottom: none; }
          
          .h-result-left { display: flex; flex-direction: column; gap: 4px; padding-right: 16px; }
          .h-result-title { font-size: 15px; font-weight: 500; color: var(--ink); }
          .h-result-desc { font-size: 12px; color: var(--muted); line-height: 1.3; }
          
          .h-result-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
          .h-result-value { 
            font-size: 22px; font-weight: 700; font-family: monospace; 
            color: var(--ink); white-space: nowrap;
          }
          .h-result-value span { font-size: 12px; font-weight: 400; color: var(--muted); font-family: -apple-system, sans-serif; }

          /* Specyficzne dla BMI */
          .h-bmi-header { display: flex; justify-content: space-between; align-items: baseline; width: 100%; margin-bottom: 8px; }
          .h-bmi-wrapper { width: 100%; margin-top: 4px; }
          .h-bmi-bar { width: 100%; height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; position: relative; }
          .h-bmi-fill { height: 100%; width: 0%; transition: width 0.5s ease, background-color 0.5s ease; }
          .h-bmi-labels { position: relative; height: 16px; margin-top: 4px; font-size: 10px; color: var(--muted); font-family: monospace; }
          .h-bmi-labels span { position: absolute; transform: translateX(-50%); }
          .h-bmi-labels span:nth-child(1) { left: 0%; transform: none; }
          .h-bmi-labels span:nth-child(2) { left: 10.4%; }
          .h-bmi-labels span:nth-child(3) { left: 37.5%; }
          .h-bmi-labels span:nth-child(4) { left: 58.3%; }
          .h-bmi-labels span:nth-child(5) { left: 100%; transform: translateX(-100%); }

          .h-disclaimer {
            font-size: 11px; color: var(--muted); text-align: center; line-height: 1.5;
            padding: 24px 0 40px 0; border-top: 1px dashed var(--line); margin-top: 16px;
          }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 24px;">
          
          <label class="h-label">Płeć</label>
          <div class="h-gender-segment">
            <button class="h-gender-btn" data-gender="male">Mężczyzna</button>
            <button class="h-gender-btn" data-gender="female">Kobieta</button>
          </div>

          <div class="h-grid-2">
            <div class="h-field">
              <label class="h-label">Wiek</label>
              <div class="h-input-row">
                <input type="number" id="h-age" class="h-input" value="${savedData.age}" min="10" max="120">
                <span class="h-unit">lat</span>
              </div>
            </div>
            <div></div> <!-- Pusty div dla zachowania siatki -->
          </div>

          <div class="h-grid-2">
            <div class="h-field">
              <label class="h-label">Wzrost</label>
              <div class="h-input-row">
                <input type="number" id="h-height" class="h-input" value="${savedData.height}" min="100" max="250">
                <span class="h-unit">cm</span>
              </div>
            </div>
            <div class="h-field">
              <label class="h-label">Waga</label>
              <div class="h-input-row">
                <input type="number" id="h-weight" class="h-input" value="${savedData.weight}" min="30" max="300">
                <span class="h-unit">kg</span>
              </div>
            </div>
          </div>

          <label class="h-label">Poziom aktywności</label>
          <div id="h-activity-trigger" class="h-trigger">
            <span id="h-activity-text">${activityLevels[savedData.activity].label}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>

          <div class="h-results">
            
            <div class="h-result-row" style="flex-direction: column; align-items: flex-start;">
              <div class="h-bmi-header">
                <div class="h-result-title">Wskaźnik BMI</div>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                  <div id="h-bmi-val" class="h-result-value">0.0</div>
                  <div id="h-bmi-status" style="font-weight: 600; font-size: 13px;">-</div>
                </div>
              </div>
              <div class="h-bmi-wrapper">
                <div class="h-bmi-bar"><div id="h-bmi-fill" class="h-bmi-fill"></div></div>
                <div class="h-bmi-labels"><span>16</span><span>18.5</span><span>25</span><span>30</span><span>40</span></div>
              </div>
              <div id="h-bmi-desc" class="h-result-desc" style="margin-top: 8px;">-</div>
            </div>

            <div class="h-result-row">
              <div class="h-result-left">
                <div class="h-result-title">BMR</div>
                <div class="h-result-desc">Podstawowa przemiana materii.</div>
              </div>
              <div class="h-result-right">
                <div id="h-bmr-val" class="h-result-value">0 <span>kcal</span></div>
              </div>
            </div>

            <div class="h-result-row">
              <div class="h-result-left">
                <div class="h-result-title">TDEE</div>
                <div class="h-result-desc">Całkowite dzienne zapotrzebowanie.</div>
              </div>
              <div class="h-result-right">
                <div id="h-tdee-val" class="h-result-value">0 <span>kcal</span></div>
              </div>
            </div>

            <div class="h-result-row" style="border-top: 1px solid var(--accent); margin-top: 8px;">
              <div class="h-result-left">
                <div class="h-result-title" style="color: var(--accent);">Aby schudnąć</div>
                <div class="h-result-desc">Deficyt 500 kcal.</div>
              </div>
              <div class="h-result-right">
                <div id="h-lose-val" class="h-result-value">0 <span>kcal</span></div>
              </div>
            </div>

            <div class="h-result-row">
              <div class="h-result-left">
                <div class="h-result-title" style="color: var(--accent);">Aby przytyć</div>
                <div class="h-result-desc">Nadwyżka 300 kcal.</div>
              </div>
              <div class="h-result-right">
                <div id="h-gain-val" class="h-result-value">0 <span>kcal</span></div>
              </div>
            </div>

          </div>

          <div class="h-disclaimer">
            ⚠️ Wyniki mają charakter orientacyjny. Kalkulator opiera się na uśrednionych wzorach. Skonsultuj się z lekarzem lub dietetykiem przed rozpoczęciem diety.
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
          bmiColor = "#ef4444";
          bmiDesc = "Twoja waga jest zdecydowanie za niska. Skonsultuj się z lekarzem.";
        } else if (bmi < 18.5) {
          bmiStatus = "Niedowaga";
          bmiColor = "#fbbf24";
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

        $("h-bmi-status").textContent = bmiStatus;
        $("h-bmi-status").style.color = bmiColor;
        $("h-bmi-desc").textContent = bmiDesc;
        
        const percent = bmiToPercent(bmi);
        $("h-bmi-fill").style.width = percent + "%";
        $("h-bmi-fill").style.backgroundColor = bmiColor;

        let bmr = (10 * weight) + (6.25 * height) - (5 * age);
        if (currentGender === "male") bmr += 5;
        else bmr -= 161;

        $("h-bmr-val").innerHTML = Math.round(bmr) + ' <span>kcal</span>';

        const multiplier = activityLevels[currentActivity].multiplier;
        const tdee = bmr * multiplier;

        $("h-tdee-val").innerHTML = Math.round(tdee) + ' <span>kcal</span>';

        $("h-lose-val").innerHTML = Math.round(tdee - 500) + ' <span>kcal</span>';
        $("h-gain-val").innerHTML = Math.round(tdee + 300) + ' <span>kcal</span>';
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