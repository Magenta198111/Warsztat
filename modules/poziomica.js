(() => {
  Hub.register({
    id: "poziomica",
    title: "Poziomica i kątomierz",
    desc: "Mierzy nachylenie i kąt czujnikami telefonu",

    async mount(container, signal) {
      let isListening = false;
      let offsetBeta = 0;
      let offsetGamma = 0;
      let smoothedBeta = 0;
      let smoothedGamma = 0;
      let hasData = false;

      container.innerHTML = `
        <style>
          .lv-label { display: block; font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
          
          .lv-intro-box {
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 12px; padding: 24px 20px; text-align: center;
            margin-top: 16px; margin-bottom: 24px;
            display: flex; flex-direction: column; align-items: center; gap: 16px;
          }

          .lv-icon-wrapper {
            width: 64px; height: 64px; border-radius: 50%;
            background: var(--bg); border: 1px solid var(--line);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent);
          }

          .lv-workspace { display: none; flex-direction: column; align-items: center; }
          .lv-workspace.active { display: flex; }

          /* Główny wskaźnik (bańka) */
          .lv-level-container {
            width: 260px; height: 260px;
            border-radius: 50%;
            border: 2px solid var(--line);
            background: var(--surface);
            position: relative;
            overflow: hidden;
            margin-bottom: 32px;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
            transition: border-color 0.3s;
          }
          .lv-level-container.ok { border-color: var(--ok); }

          .lv-crosshair-h, .lv-crosshair-v {
            position: absolute; background: var(--line); pointer-events: none;
          }
          .lv-crosshair-h { top: 50%; left: 10%; right: 10%; height: 1px; transform: translateY(-50%); }
          .lv-crosshair-v { left: 50%; top: 10%; bottom: 10%; width: 1px; transform: translateX(-50%); }
          
          .lv-center-circle {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 40px; height: 40px; border-radius: 50%;
            border: 1px dashed var(--muted); pointer-events: none; opacity: 0.5;
          }
          .lv-center-circle.ok { border-color: var(--ok); opacity: 1; border-style: solid; }

          .lv-bubble {
            position: absolute; top: 50%; left: 50%;
            width: 36px; height: 36px; border-radius: 50%;
            background: var(--accent);
            box-shadow: 0 4px 12px rgba(0,0,0,0.4), inset -4px -4px 8px rgba(0,0,0,0.3);
            transform: translate(-50%, -50%);
            transition: background 0.3s;
            pointer-events: none;
          }
          .lv-bubble.ok { background: var(--ok); box-shadow: 0 0 15px var(--ok); }

          /* Odczyt cyfrowy */
          .lv-readings {
            display: flex; gap: 16px; margin-bottom: 32px; width: 100%;
          }
          .lv-reading-box {
            flex: 1; background: var(--surface); border: 1px solid var(--line);
            border-radius: var(--r); padding: 16px; text-align: center;
          }
          .lv-reading-title {
            font-size: 14px; font-weight: 600;
            color: var(--muted); margin-bottom: 8px;
          }
          .lv-reading-val {
            font-size: 28px; font-weight: 700; font-family: inherit; font-variant-numeric: tabular-nums;
            color: var(--ink); transition: color 0.3s;
          }
          .lv-reading-val.ok { color: var(--ok); }

          .lv-calib-btn {
            width: 100%; padding: 16px; margin-bottom: 40px; font-size: 15px;
          }

          .lv-error {
            color: var(--danger); font-size: 14px; text-align: center;
            margin-top: 16px; line-height: 1.5;
          }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          
          <div id="lv-intro" class="lv-intro-box">
            <div class="lv-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line></svg>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 600; color: var(--ink); margin-bottom: 8px;">Poziomica</div>
              <div style="font-size: 14px; color: var(--muted); line-height: 1.5;">Aby odczytać kąt nachylenia, musisz udostępnić aplikacji dostęp do czujników ruchu telefonu.</div>
            </div>
            <button id="lv-start-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px; margin-top: 8px;">Włącz czujniki</button>
            <div id="lv-error-msg" class="lv-error hidden"></div>
          </div>

          <div id="lv-workspace" class="lv-workspace">
            <div id="lv-level" class="lv-level-container">
              <div class="lv-crosshair-h"></div>
              <div class="lv-crosshair-v"></div>
              <div class="lv-center-circle"></div>
              <div id="lv-bubble" class="lv-bubble"></div>
            </div>

            <div class="lv-readings">
              <div class="lv-reading-box">
                <div class="lv-reading-title">Oś X (przód-tył)</div>
                <div id="lv-val-x" class="lv-reading-val">0.0°</div>
              </div>
              <div class="lv-reading-box">
                <div class="lv-reading-title">Oś Y (lewo-prawo)</div>
                <div id="lv-val-y" class="lv-reading-val">0.0°</div>
              </div>
            </div>

            <button id="lv-calib-btn" class="n-btn n-btn-outline lv-calib-btn">Wyzeruj (Kalibracja)</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const introCard = $("lv-intro");
      const workspace = $("lv-workspace");
      const startBtn = $("lv-start-btn");
      const errorMsg = $("lv-error-msg");
      const bubble = $("lv-bubble");
      const levelContainer = $("lv-level");
      const centerCircle = container.querySelector(".lv-center-circle");
      const valX = $("lv-val-x");
      const valY = $("lv-val-y");
      const calibBtn = $("lv-calib-btn");

      let currentBeta = 0;
      let currentGamma = 0;

      function handleOrientation(event) {
        if (event.beta === null || event.gamma === null) return;
        hasData = true;

        // Filtracja (wygładzanie) - zapobiega drganiu bańki
        smoothedBeta = smoothedBeta * 0.7 + event.beta * 0.3;
        smoothedGamma = smoothedGamma * 0.7 + event.gamma * 0.3;

        // Zastosowanie kalibracji
        currentBeta = smoothedBeta - offsetBeta;
        currentGamma = smoothedGamma - offsetGamma;

        updateUI();
      }

      function updateUI() {
        // Ograniczenie kąta do -90 / 90 stopni
        let betaClamped = Math.max(-90, Math.min(90, currentBeta));
        let gammaClamped = Math.max(-90, Math.min(90, currentGamma));

        // Mapowanie kąta na pozycję bańki (czułość: 1 stopień = 5 pikseli)
        const sensitivity = 5;
        let x = gammaClamped * sensitivity;
        let y = betaClamped * sensitivity;

        // Ograniczenie promienia, żeby bańka nie uciekała poza okrąg
        const maxRadius = 100; // promień kontenera to 130
        const distance = Math.sqrt(x * x + y * y);
        if (distance > maxRadius) {
          const ratio = maxRadius / distance;
          x *= ratio;
          y *= ratio;
        }

        bubble.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

        valX.textContent = `${currentBeta.toFixed(1)}°`;
        valY.textContent = `${currentGamma.toFixed(1)}°`;

        // Sprawdzenie, czy poziomica jest "idealnie" w poziomie
        const isLevel = Math.abs(currentBeta) < 0.5 && Math.abs(currentGamma) < 0.5;

        if (isLevel) {
          bubble.classList.add("ok");
          levelContainer.classList.add("ok");
          centerCircle.classList.add("ok");
          valX.classList.add("ok");
          valY.classList.add("ok");
        } else {
          bubble.classList.remove("ok");
          levelContainer.classList.remove("ok");
          centerCircle.classList.remove("ok");
          valX.classList.remove("ok");
          valY.classList.remove("ok");
        }
      }

      async function requestSensors() {
        try {
          if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
              throw new Error("Odmówiono dostępu do czujników.");
            }
          }

          if (window.DeviceOrientationEvent) {
            window.addEventListener("deviceorientation", handleOrientation, { signal });
            isListening = true;

            setTimeout(() => {
              if (!hasData) {
                errorMsg.textContent = "Twoje urządzenie nie posiada akcelerometru lub czujniki są zablokowane w przeglądarce.";
                errorMsg.classList.remove("hidden");
                startBtn.textContent = "Spróbuj ponownie";
              } else {
                introCard.style.display = "none";
                workspace.classList.add("active");
                Hub.haptic('success');
              }
            }, 1000);
            
          } else {
            throw new Error("Twoja przeglądarka nie obsługuje API czujników ruchu.");
          }
        } catch (err) {
          errorMsg.textContent = err.message;
          errorMsg.classList.remove("hidden");
          Hub.haptic('error');
        }
      }

      startBtn.onclick = requestSensors;

      calibBtn.onclick = () => {
        Hub.haptic('medium');
        offsetBeta = smoothedBeta;
        offsetGamma = smoothedGamma;
        currentBeta = 0;
        currentGamma = 0;
        updateUI();
        showToast("Zkalibrowano do obecnego nachylenia.");
      };

      signal.addEventListener('abort', () => {
        if (isListening) {
          window.removeEventListener("deviceorientation", handleOrientation);
        }
      });
    },

    unmount() {}
  });
})();