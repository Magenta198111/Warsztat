(() => {
  Hub.register({
    id: "inteligentne-sciskanie",
    title: "Inteligentne Ściskanie",
    desc: "Zmniejsz szerokość zdjęcia bez zniekształcania ludzi i obiektów (Seam Carving)",

    async mount(container, signal) {
      let isProcessing = false;
      let currentImg = null;
      let originalWidth = 0, originalHeight = 0;
      let targetWidth = 0;
      let currentImgUrl = null;

      container.innerHTML = `
        <style>
          .sc-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .sc-intro-box {
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 12px; padding: 24px 20px; text-align: center;
            margin-top: 16px; margin-bottom: 24px;
            display: flex; flex-direction: column; align-items: center; gap: 16px;
          }

          .sc-icon-wrapper {
            width: 64px; height: 64px; border-radius: 50%;
            background: var(--bg); border: 1px solid var(--line);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent);
          }

          .sc-canvas-container {
            width: 100%; background: #000; border-radius: 8px; overflow: hidden;
            margin-bottom: 16px; display: flex; justify-content: center; border: 1px solid var(--line);
          }
          .sc-canvas-container canvas { max-width: 100%; height: auto; display: block; }

          .sc-slider-group { margin-bottom: 24px; }
          .sc-slider-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .sc-slider-val { font-family: monospace; font-size: 14px; color: var(--accent); font-weight: 600; }
          
          .sc-range { 
            -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; 
            outline: none; width: 100%; 
            background: linear-gradient(to right, var(--accent) var(--percent, 50%), var(--line) var(--percent, 50%)); 
            touch-action: pan-y; 
          }
          .sc-range::-webkit-slider-thumb { 
            -webkit-appearance: none; appearance: none; width: 22px; height: 22px; 
            border-radius: 50%; background: var(--accent); cursor: pointer; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.4); margin-top: -2px; 
          }

          .sc-progress-wrapper { width: 100%; display: none; flex-direction: column; gap: 8px; margin-top: 12px; }
          .sc-progress-bar { width: 100%; height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; }
          .sc-progress-fill { height: 100%; width: 0%; background: var(--accent); transition: width 0.1s linear; }
          .sc-progress-text { font-size: 12px; color: var(--muted); font-family: monospace; text-align: center; }

          .sc-warning {
            display: flex; align-items: flex-start; gap: 10px;
            background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.3);
            border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;
            font-size: 12px; color: #fbbf24; line-height: 1.5;
          }
          .sc-warning svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <input type="file" id="sc-file" accept="image/*" style="display:none;">
          
          <div id="sc-intro" class="sc-intro-box">
            <div class="sc-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 600; color: var(--ink); margin-bottom: 8px;">Inteligentne Ściskanie</div>
              <div style="font-size: 14px; color: var(--muted); line-height: 1.5;">Zmniejsz szerokość zdjęcia, usuwając jednolite tło, a nie ludzi.</div>
            </div>
            <button id="sc-pick-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px; margin-top: 8px;">Wybierz zdjęcie</button>
          </div>

          <div id="sc-workspace" class="hidden">
            <div class="sc-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <div>
                <strong>Uwaga:</strong> Algorytm jest bardzo wymagający dla procesora. Na słabszych telefonach przetwarzanie dużych zdjęć może zająć nawet kilkanaście sekund. Nie zamykaj aplikacji w trakcie.
              </div>
            </div>

            <div class="sc-canvas-container">
              <canvas id="sc-canvas"></canvas>
            </div>

            <div class="sc-slider-group">
              <div class="sc-slider-header">
                <span class="sc-label" style="margin:0;">Docelowa szerokość</span>
                <span id="sc-width-val" class="sc-slider-val">0 px</span>
              </div>
              <input type="range" id="sc-slider" class="sc-range" min="50" max="100" value="80" step="1">
              <div style="font-size: 11px; color: var(--muted); margin-top: 8px; text-align: center;">
                Suwak określa, jaki procent oryginalnej szerokości zostanie zachowany (np. 80% = usunięcie 20% szerokości).
              </div>
            </div>

            <div class="sc-progress-wrapper" id="sc-progress">
              <div class="sc-progress-bar"><div id="sc-progress-fill" class="sc-progress-fill"></div></div>
              <div id="sc-progress-text" class="sc-progress-text">Przygotowywanie...</div>
            </div>

            <div style="display:flex; gap:12px; flex-direction: column;">
              <button id="sc-reset-btn" class="n-btn" style="padding: 14px;">Wybierz inne zdjęcie</button>
              <button id="sc-process-btn" class="n-btn n-btn-outline" style="padding: 14px;">Przetwórz i pobierz</button>
            </div>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("sc-file");
      const pickBtn = $("sc-pick-btn");
      const introCard = $("sc-intro");
      const workspace = $("sc-workspace");
      const canvas = $("sc-canvas");
      const slider = $("sc-slider");
      const widthVal = $("sc-width-val");
      const processBtn = $("sc-process-btn");
      const resetBtn = $("sc-reset-btn");
      const progressWrapper = $("sc-progress");
      const progressFill = $("sc-progress-fill");
      const progressText = $("sc-progress-text");

      function updateSliderFill(el) {
        const percent = ((el.value - el.min) / (el.max - el.min)) * 100;
        el.style.setProperty('--percent', `${percent}%`);
      }

      function updateWidthLabel() {
        const percent = parseInt(slider.value);
        targetWidth = Math.round(originalWidth * (percent / 100));
        widthVal.textContent = `${targetWidth} px (${percent}%)`;
        updateSliderFill(slider);
      }

      pickBtn.onclick = () => fileInput.click();
      resetBtn.onclick = () => {
        workspace.classList.add("hidden");
        introCard.classList.remove("hidden");
        if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
      };

      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
        currentImgUrl = URL.createObjectURL(file);

        const img = new Image();
        img.onload = () => {
          currentImg = img;
          originalWidth = img.width;
          originalHeight = img.height;
          
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);

          introCard.classList.add("hidden");
          workspace.classList.remove("hidden");
          
          slider.min = 30; 
          slider.max = 99;
          slider.value = 80;
          updateWidthLabel();
        };
        img.src = currentImgUrl;
        fileInput.value = "";
      };

      slider.oninput = updateWidthLabel;

      // === ALGORYTM SEAM CARVING ===
      async function processImage() {
        if (isProcessing) return;
        isProcessing = true;

        processBtn.disabled = true;
        processBtn.textContent = "Przetwarzanie...";
        progressWrapper.style.display = "flex";
        progressFill.style.width = "0%";
        progressText.textContent = "Analizowanie...";
        Hub.haptic('medium');

        await new Promise(r => setTimeout(r, 100));

        try {
          const MAX_DIM = 800; // Ograniczenie dla wydajności
          let w = originalWidth;
          let h = originalHeight;
          let scale = 1;

          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              scale = MAX_DIM / w;
              h = Math.round(h * scale);
              w = MAX_DIM;
            } else {
              scale = MAX_DIM / h;
              w = Math.round(w * scale);
              h = MAX_DIM;
            }
          }

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = w;
          tempCanvas.height = h;
          const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(currentImg, 0, 0, w, h);

          let imgData = ctx.getImageData(0, 0, w, h);
          let data = imgData.data;

          const targetW = Math.round(w * (parseInt(slider.value) / 100));
          const seamsToRemove = w - targetW;

          let currentW = w;

          // Funkcja obliczająca energię (kontrast) pikseli
          function calculateEnergy(data, w, h) {
            const energy = new Float32Array(w * h);
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                // Gradient poziomy
                let dx = 0;
                if (x > 0 && x < w - 1) {
                  const idxL = (y * w + (x - 1)) * 4;
                  const idxR = (y * w + (x + 1)) * 4;
                  dx = Math.abs(data[idxR] - data[idxL]) + Math.abs(data[idxR+1] - data[idxL+1]) + Math.abs(data[idxR+2] - data[idxL+2]);
                }
                // Gradient pionowy
                let dy = 0;
                if (y > 0 && y < h - 1) {
                  const idxT = ((y - 1) * w + x) * 4;
                  const idxB = ((y + 1) * w + x) * 4;
                  dy = Math.abs(data[idxB] - data[idxT]) + Math.abs(data[idxB+1] - data[idxT+1]) + Math.abs(data[idxB+2] - data[idxT+2]);
                }
                energy[y * w + x] = dx + dy;
              }
            }
            return energy;
          }

          // Znajdowanie i usuwanie szwu
          function removeSeam(data, w, h) {
            const energy = calculateEnergy(data, w, h);
            const dp = new Float32Array(w * h);
            const parent = new Int8Array(w * h); // 0: lewo, 1: prosto, 2: prawo

            // Inicjalizacja pierwszego rzędu
            for (let x = 0; x < w; x++) {
              dp[x] = energy[x];
            }

            // Wypełnianie DP
            for (let y = 1; y < h; y++) {
              for (let x = 0; x < w; x++) {
                let minVal = dp[(y - 1) * w + x];
                let minIdx = 1;

                if (x > 0 && dp[(y - 1) * w + (x - 1)] < minVal) {
                  minVal = dp[(y - 1) * w + (x - 1)];
                  minIdx = 0;
                }
                if (x < w - 1 && dp[(y - 1) * w + (x + 1)] < minVal) {
                  minVal = dp[(y - 1) * w + (x + 1)];
                  minIdx = 2;
                }

                dp[y * w + x] = energy[y * w + x] + minVal;
                parent[y * w + x] = minIdx;
              }
            }

            // Znalezienie końca szwu
            let minEndX = 0;
            let minEndVal = dp[(h - 1) * w];
            for (let x = 1; x < w; x++) {
              if (dp[(h - 1) * w + x] < minEndVal) {
                minEndVal = dp[(h - 1) * w + x];
                minEndX = x;
              }
            }

            // Odtworzenie ścieżki szwu
            const seam = new Int32Array(h);
            let currX = minEndX;
            for (let y = h - 1; y >= 0; y--) {
              seam[y] = currX;
              const dir = parent[y * w + currX];
              if (dir === 0) currX--;
              else if (dir === 2) currX++;
            }

            // Usunięcie szwu i przesunięcie pikseli
            const newData = new Uint8ClampedArray((w - 1) * h * 4);
            for (let y = 0; y < h; y++) {
              const seamX = seam[y];
              for (let x = 0; x < w; x++) {
                if (x === seamX) continue;
                const srcIdx = (y * w + x) * 4;
                const dstX = x < seamX ? x : x - 1;
                const dstIdx = (y * (w - 1) + dstX) * 4;
                
                newData[dstIdx] = data[srcIdx];
                newData[dstIdx+1] = data[srcIdx+1];
                newData[dstIdx+2] = data[srcIdx+2];
                newData[dstIdx+3] = data[srcIdx+3];
              }
            }
            return newData;
          }

          // Główna pętla usuwania szwów
          for (let i = 0; i < seamsToRemove; i++) {
            data = removeSeam(data, currentW, h);
            currentW--;

            // Aktualizacja postępu (co jakiś czas, żeby nie zamulać UI)
            if (i % 2 === 0 || i === seamsToRemove - 1) {
              const percent = Math.round(((i + 1) / seamsToRemove) * 100);
              progressFill.style.width = percent + "%";
              progressText.textContent = `Usuwanie szwów: ${i + 1}/${seamsToRemove} (${percent}%)`;
              
              // Pozwalamy przeglądarce odetchnąć
              await new Promise(r => setTimeout(r, 0));
            }
          }

          // Rysowanie wyniku końcowego
          const resultCanvas = document.createElement('canvas');
          resultCanvas.width = currentW;
          resultCanvas.height = h;
          const resultCtx = resultCanvas.getContext('2d');
          const resultImgData = resultCtx.createImageData(currentW, h);
          resultImgData.data.set(data);
          resultCtx.putImageData(resultImgData, 0, 0);

          canvas.width = currentW;
          canvas.height = h;
          canvas.getContext('2d').drawImage(resultCanvas, 0, 0);

          progressText.textContent = "Gotowe!";
          progressFill.style.width = "100%";
          Hub.haptic('success');

          // Pobieranie
          setTimeout(() => {
            resultCanvas.toBlob((blob) => {
              Hub.download(blob, `scisniete_${currentW}x${h}.jpg`);
              progressWrapper.style.display = "none";
              processBtn.disabled = false;
              processBtn.textContent = "Przetwórz i pobierz";
              isProcessing = false;
            }, 'image/jpeg', 0.9);
          }, 500);

        } catch (err) {
          console.error(err);
          showToast("Błąd podczas przetwarzania zdjęcia.");
          progressWrapper.style.display = "none";
          processBtn.disabled = false;
          processBtn.textContent = "Przetwórz i pobierz";
          isProcessing = false;
        }
      }

      processBtn.onclick = processImage;

      signal.addEventListener('abort', () => {
        if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
      });
    },

    unmount() {}
  });
})();