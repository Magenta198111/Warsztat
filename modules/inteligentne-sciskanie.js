(() => {
  Hub.register({
    id: "inteligentne-sciskanie",
    title: "Inteligentne Ściskanie",
    desc: "Zmniejsz szerokość zdjęcia bez zniekształcania ludzi i obiektów (Seam Carving)",

    async mount(container, signal) {
      let isProcessing = false;
      let currentImg = null;
      let originalWidth = 0, originalHeight = 0;
      let currentImgUrl = null;
      let originalPreviewUrl = null;
      let activeWorker = null;

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

          /* Style dla modala porównawczego */
          .sc-compare-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 8px;
          }
          .sc-compare-item {
            display: flex; flex-direction: column; gap: 6px;
          }
          .sc-compare-label {
            font-size: 11px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.5px; color: var(--muted); text-align: center;
          }
          .sc-compare-img {
            width: 100%; background: #000; border-radius: 6px;
            border: 1px solid var(--line); display: block;
            max-height: 40vh; object-fit: contain;
          }
          .sc-compare-info {
            font-size: 11px; color: var(--muted); text-align: center; font-family: monospace;
          }
          @media (max-width: 400px) {
            .sc-compare-grid { grid-template-columns: 1fr; }
            .sc-compare-img { max-height: 30vh; }
          }
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
                <strong>Wskazówka:</strong> Algorytm działa w tle, więc możesz swobodnie korzystać z aplikacji. Im większy procent usunięcia, tym dłużej potrwa przetwarzanie. Zostaw aplikację otwartą do końca.
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
              <input type="range" id="sc-slider" class="sc-range" min="30" max="99" value="80" step="1">
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
              <button id="sc-process-btn" class="n-btn n-btn-outline" style="padding: 14px;">Przetwórz i pokaż podgląd</button>
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
        const targetW = Math.round(originalWidth * (percent / 100));
        widthVal.textContent = `${targetW} px (${percent}%)`;
        updateSliderFill(slider);
      }

      function resetAfterProcess() {
        progressWrapper.style.display = "none";
        processBtn.disabled = false;
        processBtn.textContent = "Przetwórz i pokaż podgląd";
        isProcessing = false;
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

          // Tworzymy przeskalowany podgląd oryginału dla modala
          const previewCanvas = document.createElement('canvas');
          const maxPreview = 600;
          let pw = originalWidth, ph = originalHeight;
          if (pw > maxPreview) {
            ph = Math.round(ph * (maxPreview / pw));
            pw = maxPreview;
          }
          previewCanvas.width = pw;
          previewCanvas.height = ph;
          previewCanvas.getContext('2d').drawImage(img, 0, 0, pw, ph);
          originalPreviewUrl = previewCanvas.toDataURL("image/jpeg", 0.85);

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

      function createSeamCarvingWorker() {
        const workerCode = `
          self.onmessage = function(e) {
            const { data: imgData, w, h, targetW } = e.data;
            let currentData = new Uint8ClampedArray(imgData);
            let currentW = w;
            const seamsToRemove = w - targetW;
            
            function getPixel(data, w, x, y) {
              if (x < 0) x = 0;
              if (x >= w) x = w - 1;
              if (y < 0) y = 0;
              if (y >= h) y = h - 1;
              const idx = (y * w + x) * 4;
              return [data[idx], data[idx+1], data[idx+2]];
            }
            
            function calculateEnergy(data, w, h) {
              const energy = new Float32Array(w * h);
              for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                  const [r, g, b] = getPixel(data, w, x, y);
                  const [rL, gL, bL] = getPixel(data, w, x - 1, y);
                  const [rR, gR, bR] = getPixel(data, w, x + 1, y);
                  const [rU, gU, bU] = getPixel(data, w, x, y - 1);
                  const [rD, gD, bD] = getPixel(data, w, x, y + 1);
                  
                  const dX = Math.abs(rR - rL) + Math.abs(gR - gL) + Math.abs(bR - bL);
                  const dY = Math.abs(rD - rU) + Math.abs(gD - gU) + Math.abs(bD - bU);
                  
                  let fwdCost = 0;
                  if (y > 0) {
                    const dLeft = Math.abs(r - rU) + Math.abs(g - gU) + Math.abs(b - bU);
                    const dRight = Math.abs(rR - rU) + Math.abs(gR - gU) + Math.abs(bR - bU);
                    fwdCost = Math.min(dLeft, dRight);
                  }
                  
                  energy[y * w + x] = dX + dY + fwdCost * 0.5;
                }
              }
              return energy;
            }
            
            function findSeam(energy, w, h) {
              const dp = new Float32Array(w * h);
              const parent = new Int8Array(w * h);
              
              for (let x = 0; x < w; x++) dp[x] = energy[x];
              
              for (let y = 1; y < h; y++) {
                for (let x = 0; x < w; x++) {
                  let minVal = dp[(y - 1) * w + x];
                  let minIdx = 1;
                  if (x > 0 && dp[(y - 1) * w + (x - 1)] < minVal) { minVal = dp[(y - 1) * w + (x - 1)]; minIdx = 0; }
                  if (x < w - 1 && dp[(y - 1) * w + (x + 1)] < minVal) { minVal = dp[(y - 1) * w + (x + 1)]; minIdx = 2; }
                  dp[y * w + x] = energy[y * w + x] + minVal;
                  parent[y * w + x] = minIdx;
                }
              }
              
              let minEndX = 0;
              let minEndVal = dp[(h - 1) * w];
              for (let x = 1; x < w; x++) {
                if (dp[(h - 1) * w + x] < minEndVal) { minEndVal = dp[(h - 1) * w + x]; minEndX = x; }
              }
              
              const seam = new Int32Array(h);
              let currX = minEndX;
              for (let y = h - 1; y >= 0; y--) {
                seam[y] = currX;
                const dir = parent[y * w + currX];
                if (dir === 0) currX--;
                else if (dir === 2) currX++;
              }
              return seam;
            }
            
            function removeSeam(data, w, h, seam) {
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
            
            function shrinkEnergy(energy, w, h, seam) {
              const newEnergy = new Float32Array((w - 1) * h);
              for (let y = 0; y < h; y++) {
                const seamX = seam[y];
                for (let x = 0; x < w; x++) {
                  if (x === seamX) continue;
                  const newX = x < seamX ? x : x - 1;
                  newEnergy[y * (w - 1) + newX] = energy[y * w + x];
                }
              }
              return newEnergy;
            }
            
            function updateEnergyLocally(energy, data, w_new, h, seam) {
              for (let y = 0; y < h; y++) {
                const oldSeamX = seam[y];
                const affectedX = [];
                if (oldSeamX - 1 >= 0) affectedX.push(oldSeamX - 1);
                if (oldSeamX < w_new) affectedX.push(oldSeamX);
                
                for (const x of affectedX) {
                  const idx = y * w_new + x;
                  const idxC = idx * 4;
                  const idxL = (y * w_new + Math.max(0, x - 1)) * 4;
                  const idxR = (y * w_new + Math.min(w_new - 1, x + 1)) * 4;
                  const idxU = (Math.max(0, y - 1) * w_new + x) * 4;
                  const idxD = (Math.min(h - 1, y + 1) * w_new + x) * 4;
                  
                  const dX = Math.abs(data[idxR] - data[idxL]) + Math.abs(data[idxR+1] - data[idxL+1]) + Math.abs(data[idxR+2] - data[idxL+2]);
                  const dY = Math.abs(data[idxD] - data[idxU]) + Math.abs(data[idxD+1] - data[idxU+1]) + Math.abs(data[idxD+2] - data[idxU+2]);
                  
                  let fwdCost = 0;
                  if (y > 0) {
                    const dLeft = Math.abs(data[idxC] - data[idxU]) + Math.abs(data[idxC+1] - data[idxU+1]) + Math.abs(data[idxC+2] - data[idxU+2]);
                    const dRight = Math.abs(data[idxR] - data[idxU]) + Math.abs(data[idxR+1] - data[idxU+1]) + Math.abs(data[idxR+2] - data[idxU+2]);
                    fwdCost = Math.min(dLeft, dRight);
                  }
                  
                  energy[idx] = dX + dY + fwdCost * 0.5;
                }
              }
            }
            
            let energy = calculateEnergy(currentData, currentW, h);
            
            for (let i = 0; i < seamsToRemove; i++) {
              const seam = findSeam(energy, currentW, h);
              currentData = removeSeam(currentData, currentW, h, seam);
              energy = shrinkEnergy(energy, currentW, h, seam);
              currentW--;
              updateEnergyLocally(energy, currentData, currentW, h, seam);
              
              self.postMessage({ type: 'progress', current: i + 1, total: seamsToRemove });
            }
            
            self.postMessage({ type: 'done', data: currentData.buffer, finalW: currentW, h: h }, [currentData.buffer]);
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
      }

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
          const MAX_DIM = 1200;
          let w = originalWidth;
          let h = originalHeight;

          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.round(h * (MAX_DIM / w));
              w = MAX_DIM;
            } else {
              w = Math.round(w * (MAX_DIM / h));
              h = MAX_DIM;
            }
          }

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = w;
          tempCanvas.height = h;
          const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(currentImg, 0, 0, w, h);

          const imgData = ctx.getImageData(0, 0, w, h);
          const targetW = Math.round(w * (parseInt(slider.value) / 100));

          activeWorker = createSeamCarvingWorker();

          activeWorker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'progress') {
              const percent = Math.round((msg.current / msg.total) * 100);
              progressFill.style.width = percent + "%";
              progressText.textContent = `Usuwanie szwów: ${msg.current}/${msg.total} (${percent}%)`;
            } else if (msg.type === 'done') {
              const finalW = msg.finalW;
              const finalData = new Uint8ClampedArray(msg.data);

              const resultCanvas = document.createElement('canvas');
              resultCanvas.width = finalW;
              resultCanvas.height = h;
              const resultCtx = resultCanvas.getContext('2d');
              const resultImgData = resultCtx.createImageData(finalW, h);
              resultImgData.data.set(finalData);
              resultCtx.putImageData(resultImgData, 0, 0);

              canvas.width = finalW;
              canvas.height = h;
              canvas.getContext('2d').drawImage(resultCanvas, 0, 0);

              progressText.textContent = "Gotowe!";
              progressFill.style.width = "100%";
              Hub.haptic('success');

              activeWorker.terminate();
              activeWorker = null;

              setTimeout(() => {
                resultCanvas.toBlob((blob) => {
                  const filename = `scisniete_${finalW}x${h}.jpg`;
                  const resultPreviewUrl = canvas.toDataURL("image/jpeg", 0.85);

                  // Budowa modala z porównaniem przed / po
                  const modalContent = `
                    <div style="width: 100%; max-width: 700px; display: flex; flex-direction: column; gap: 12px;">
                      <div style="text-align: center; margin-bottom: 4px;">
                        <div style="font-size: 18px; font-weight: 600; color: var(--ink);">Porównanie</div>
                        <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">
                          Oryginał: ${w} × ${h} px &nbsp;→&nbsp; Wynik: ${finalW} × ${h} px
                        </div>
                      </div>
                      <div class="sc-compare-grid">
                        <div class="sc-compare-item">
                          <div class="sc-compare-label">Przed</div>
                          <img src="${originalPreviewUrl}" class="sc-compare-img">
                          <div class="sc-compare-info">${w} × ${h} px</div>
                        </div>
                        <div class="sc-compare-item">
                          <div class="sc-compare-label" style="color: var(--accent);">Po</div>
                          <img src="${resultPreviewUrl}" class="sc-compare-img">
                          <div class="sc-compare-info">${finalW} × ${h} px</div>
                        </div>
                      </div>
                      <div style="display: flex; gap: 8px; margin-top: 4px;">
                        <button id="sc-modal-cancel" class="n-btn" style="flex: 1;">Zamknij</button>
                        <button id="sc-modal-download" class="n-btn n-btn-outline" style="flex: 2;">Pobierz zdjęcie</button>
                      </div>
                    </div>
                  `;

                  const modal = Hub.showModal({ content: modalContent });

                  modal.element.querySelector('#sc-modal-cancel').onclick = () => {
                    Hub.haptic('light');
                    modal.close();
                  };

                  modal.element.querySelector('#sc-modal-download').onclick = () => {
                    Hub.haptic('success');
                    Hub.download(blob, filename);
                    modal.close();
                  };

                  const observer = new MutationObserver(() => {
                    if (!document.body.contains(modal.element)) {
                      observer.disconnect();
                      resetAfterProcess();
                    }
                  });
                  observer.observe(document.body, { childList: true });

                }, 'image/jpeg', 0.9);
              }, 300);
            }
          };

          activeWorker.onerror = (err) => {
            console.error("Worker error:", err);
            showToast("Błąd algorytmu. Spróbuj z mniejszym zdjęciem.");
            if (activeWorker) { activeWorker.terminate(); activeWorker = null; }
            resetAfterProcess();
          };

          activeWorker.postMessage({
            data: imgData.data.buffer,
            w: w,
            h: h,
            targetW: targetW
          }, [imgData.data.buffer]);

        } catch (err) {
          console.error(err);
          showToast("Błąd: " + err.message);
          if (activeWorker) { activeWorker.terminate(); activeWorker = null; }
          resetAfterProcess();
        }
      }

      processBtn.onclick = processImage;

      signal.addEventListener('abort', () => {
        if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
        if (activeWorker) { activeWorker.terminate(); activeWorker = null; }
      });
    },

    unmount() {}
  });
})();