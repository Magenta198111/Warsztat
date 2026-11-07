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
          .h-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; margin-top: 16px; }
          
          .h-input-group {
            display: flex; gap: 12px; margin-bottom: 16px;
          }
          .h-input-wrapper {
            flex: 1; display: flex; align-items: center; justify-content: space-between;
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 8px; padding: 12px 16px;
            transition: border-color 0.2s;
          }
          .h-input-wrapper:focus-within { border-color: var(--accent); }
          .h-input {
            width: 100%; background: transparent; border: none;
            color: var(--ink); font-size: 18px; font-weight: 600;
            outline: none; font-family: monospace; text-align: right;
          }
          .h-unit { font-size: 13px; color: var(--muted); font-weight: 500; margin-left: 8px; }

          .h-gender-segment {
            display: flex; background: var(--surface); border: 1px solid var(--line);
            border-radius: 8px; overflow: hidden; margin-bottom: 16px;
          }
          .h-gender-btn {
            flex: 1; padding: 14px; background: transparent; border: none;
            color: var(--muted); font-size: 15px; font-weight: 600; cursor: pointer;
            transition: background 0.2s, color 0.2s; outline: none; font-family: inherit;
          }
          .h-gender-btn.active { background: var(--surface-hover); color: var(--accent); }

          .h-trigger { 
            display: flex; justify-content: space-between; align-items: center; 
            background: var(--surface); border: 1px solid var(--line); 
            border-radius: 8px; padding: 14px 16px; color: var(--ink); font-size: 15px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s; margin-bottom: 24px;
          }
          .h-trigger:active { background: var(--surface-hover); }
          .h-trigger svg { color: var(--muted); flex-shrink: 0; width: 16px; height: 16px; }

          .h-results { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
          
          .h-card {
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
          }
          .h-card-title { font-size: 13px; font-weight: 600; text-transform: uppercase; color: var(--muted); letter-spacing: 0.5px; }
          .h-card-value { font-size: 32px; font-weight: 700; color: var(--ink); font-family: monospace; }
          .h-card-value span { font-size: 16px; font-weight: 500; color: var(--muted); font-family: -apple-system, sans-serif; margin-left: 4px; }
          .h-card-desc { font-size: 13px; color: var(--muted); line-height: 1.4; }

          .h-bmi-bar { width: 100%; height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; position: relative; margin-top: 8px; }
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
            padding: 16px; margin-top: 8px; margin-bottom: 40px;
            border-top: 1px dashed var(--line);
          }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <label class="h-label" style="margin-top:0;">Płeć</label>
          <div class="h-gender-segment">
            <button class="h-gender-btn" data-gender="male">Mężczyzna</button>
            <button class="h-gender-btn" data-gender="female">Kobieta</button>
          </div>

          <div class="h-input-group">
            <div style="flex: 1;">
              <label class="h-label">Wiek</label>
              <div class="h-input-wrapper">
                <input type="number" id="h-age" class="h-input" value="${savedData.age}" min="10" max="120">
                <span class="h-unit">lat</span>
              </div>
            </div>
          </div>

          <div class="h-input-group">
            <div style="flex: 1;">
              <label class="h-label">Wzrost</label>
              <div class="h-input-wrapper">
                <input type="number" id="h-height" class="h-input" value="${savedData.height}" min="100" max="250">
                <span class="h-unit">cm</span>
              </div>
            </div>
            <div style="flex: 1;">
              <label class="h-label">Waga</label>
              <div class="h-input-wrapper">
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
            <div class="h-card">
              <div class="h-card-title">Wskaźnik BMI</div>
              <div style="display: flex; align-items: baseline; gap: 8px;">
                <div id="h-bmi-val" class="h-card-value">0.0</div>
                <div id="h-bmi-status" style="font-weight: 600; font-size: 15px;">-</div>
              </div>
              <div class="h-bmi-bar"><div id="h-bmi-fill" class="h-bmi-fill"></div></div>
              <div class="h-bmi-labels"><span>16</span><span>18.5</span><span>25</span><span>30</span><span>40</span></div>
              <div id="h-bmi-desc" class="h-card-desc">-</div>
            </div>

            <div class="h-card">
              <div class="h-card-title">BMR (Podstawowa przemiana materii)</div>
              <div id="h-bmr-val" class="h-card-value">0 <span>kcal / dzień</span></div>
              <div class="h-card-desc">Ilość kalorii, którą Twoje ciało spala w ciągu doby w spoczynku, aby utrzymać podstawowe funkcje życiowe.</div>
            </div>

            <div class="h-card">
              <div class="h-card-title">TDEE (Całkowite zapotrzebowanie)</div>
              <div id="h-tdee-val" class="h-card-value">0 <span>kcal / dzień</span></div>
              <div class="h-card-desc">Szacowana ilość kalorii, którą powinieneś spożywać dziennie, aby utrzymać obecną wagę.</div>
            </div>

            <div class="h-card" style="border-color: var(--accent);">
              <div class="h-card-title" style="color: var(--accent);">Cel wagowy</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 13px; color: var(--muted); margin-bottom: 4px;">Aby schudnąć</div>
                  <div id="h-lose-val" style="font-size: 20px; font-weight: 700; font-family: monospace;">0 <span style="font-size:14px; font-family:-apple-system,sans-serif; color:var(--muted); font-weight:400;">kcal / dzień</span></div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 13px; color: var(--muted); margin-bottom: 4px;">Aby przytyć</div>
                  <div id="h-gain-val" style="font-size: 20px; font-weight: 700; font-family: monospace;">0 <span style="font-size:14px; font-family:-apple-system,sans-serif; color:var(--muted); font-weight:400;">kcal / dzień</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="h-disclaimer">
            ⚠️ Wyniki mają charakter wyłącznie orientacyjny. Kalkulator opiera się na uśrednionych wzorach matematycznych i nie uwzględnia indywidualnego składu ciała, stanu zdrowia ani genetyki. W przypadku wątpliwości lub planowania diety, skonsultuj się z lekarzem lub wykwalifikowanym dietetykiem.
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

        $("h-bmr-val").innerHTML = Math.round(bmr) + ' <span>kcal / dzień</span>';

        const multiplier = activityLevels[currentActivity].multiplier;
        const tdee = bmr * multiplier;

        $("h-tdee-val").innerHTML = Math.round(tdee) + ' <span>kcal / dzień</span>';

        $("h-lose-val").innerHTML = Math.round(tdee - 500) + ' <span style="font-size:14px; font-family:-apple-system,sans-serif; color:var(--muted); font-weight:400;">kcal / dzień</span>';
        $("h-gain-val").innerHTML = Math.round(tdee + 300) + ' <span style="font-size:14px; font-family:-apple-system,sans-serif; color:var(--muted); font-weight:400;">kcal / dzień</span>';
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