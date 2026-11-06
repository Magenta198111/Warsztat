(() => {
  Hub.register({
    id: "wyciagacz-kolorow",
    title: "Wyciągacz Kolorów",
    desc: "Wyodrębnij dominujące kolory ze zdjęcia",

    async mount(container, signal) {
      let targetColorCount = 6;
      let currentImgUrl = null;
      let isProcessing = false;

      container.innerHTML = `
        <style>
          .pal-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          .pal-flat-section { margin-bottom: 24px; }
          
          .pal-intro-box {
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 12px; padding: 24px 20px; text-align: center;
            margin-top: 16px; margin-bottom: 24px;
            display: flex; flex-direction: column; align-items: center; gap: 16px;
          }

          .pal-icon-wrapper {
            width: 64px; height: 64px; border-radius: 50%;
            background: var(--bg); border: 1px solid var(--line);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent);
          }

          .pal-preview-img {
            width: 100%; border-radius: 8px; border: 1px solid var(--line);
            display: block; object-fit: contain; max-height: 250px; background: var(--surface);
            margin-bottom: 24px;
          }

          .pal-grid { 
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; 
            margin-bottom: 16px;
          }
          
          .pal-swatch {
            aspect-ratio: 1; border-radius: 8px; display: flex; flex-direction: column;
            align-items: center; justify-content: center; cursor: pointer;
            transition: transform 0.1s, opacity 0.2s; border: 1px solid var(--line);
            position: relative; overflow: hidden;
          }
          .pal-swatch:active { transform: scale(0.95); opacity: 0.9; }
          
          .pal-hex-text {
            font-family: monospace; font-size: 14px; font-weight: 700;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2); pointer-events: none;
          }

          .pal-warning-text {
            text-align: center; font-size: 12px; color: #fbbf24;
            margin-bottom: 24px; min-height: 16px; line-height: 1.4;
          }
          
          .pal-action-row { display: flex; gap: 12px; margin-bottom: 24px; }
          .pal-btn { flex: 1; padding: 14px; font-size: 15px; }

          .pal-slider-wrapper {
            display: flex; align-items: center; height: 40px;
            touch-action: none; cursor: pointer; margin-bottom: 8px;
          }
          .pal-slider-value { font-family: monospace; font-size: 16px; font-weight: 600; color: var(--accent); min-width: 40px; text-align: right; margin-left: 16px; }
          
          .pal-range-track {
            position: relative; width: 100%; height: 6px; border-radius: 3px; flex: 1;
            background: linear-gradient(to right, var(--accent) var(--percent, 0%), var(--line) var(--percent, 0%));
          }
          
          .pal-range-thumb {
            position: absolute; top: 50%; transform: translate(-50%, -50%);
            width: 24px; height: 24px; border-radius: 50%; background: var(--accent);
            box-shadow: 0 4px 8px rgba(0,0,0,0.4); pointer-events: none;
            transition: transform 0.1s;
          }

          .pal-progress-wrapper {
            width: 100%; display: none; flex-direction: column; gap: 8px; margin-top: 12px;
          }
          .pal-progress-bar {
            width: 100%; height: 6px; background: var(--line); border-radius: 3px; overflow: hidden;
          }
          .pal-progress-fill {
            height: 100%; width: 0%; background: var(--accent); transition: width 0.1s linear;
          }
          .pal-progress-text {
            font-size: 12px; color: var(--muted); font-family: monospace; text-align: center;
          }
        </style>

        ${Hub.backButtonHtml}

        <div id="pal-setup-card" style="margin-top: 16px;">
          <input type="file" id="pal-file" accept="image/*" style="display:none;">
          
          <div class="pal-intro-box">
            <div class="pal-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 600; color: var(--ink); margin-bottom: 8px;">Wyciągnij paletę barw</div>
              <div style="font-size: 14px; color: var(--muted); line-height: 1.5;">Wybierz zdjęcie, a my znajdziemy jego dominujące kolory.</div>
            </div>
            <button id="pal-pick-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px; margin-top: 8px;">Wybierz zdjęcie</button>
            
            <div id="pal-progress" class="pal-progress-wrapper">
              <div class="pal-progress-bar"><div id="pal-progress-fill" class="pal-progress-fill"></div></div>
              <div id="pal-progress-text" class="pal-progress-text">Analizowanie: 0%</div>
            </div>
          </div>

          <div class="pal-flat-section">
            <label class="pal-label">Liczba kolorów</label>
            <div class="pal-slider-wrapper">
              <div id="pal-count-track" class="pal-range-track">
                <div id="pal-count-thumb" class="pal-range-thumb"></div>
              </div>
              <div id="pal-count-val" class="pal-slider-value">6</div>
            </div>
          </div>
        </div>

        <div id="pal-result-card" class="hidden">
          <label class="pal-label">Dominujące kolory (kliknij, aby skopiować)</label>
          <img id="pal-preview" class="pal-preview-img">
          <div id="pal-swatches" class="pal-grid"></div>
          <div id="pal-warning" class="pal-warning-text"></div>
          
          <div class="pal-action-row">
            <button id="pal-btn-reset" class="n-btn pal-btn">Wybierz inne zdjęcie</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("pal-file");
      const pickBtn = $("pal-pick-btn");
      const setupCard = $("pal-setup-card");
      const resultCard = $("pal-result-card");
      const previewImg = $("pal-preview");
      const swatchesContainer = $("pal-swatches");
      const warningText = $("pal-warning");
      const btnReset = $("pal-btn-reset");
      
      const progressWrapper = $("pal-progress");
      const progressFill = $("pal-progress-fill");
      const progressText = $("pal-progress-text");

      const countTrack = $("pal-count-track");
      const countThumb = $("pal-count-thumb");
      const countVal = $("pal-count-val");

      function updateSliderUI(track, thumb, valEl, value, min, max) {
        const percent = ((value - min) / (max - min)) * 100;
        thumb.style.left = percent + "%";
        track.style.setProperty('--percent', `${percent}%`);
        valEl.textContent = value;
      }

      function setupSlider(wrapper, track, thumb, valEl, min, max, getVal, setVal) {
        let currentValue = getVal();
        updateSliderUI(track, thumb, valEl, currentValue, min, max);

        wrapper.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          wrapper.setPointerCapture(e.pointerId);
          updateFromX(e.clientX);
        });

        wrapper.addEventListener("pointermove", (e) => {
          if (wrapper.hasPointerCapture(e.pointerId)) {
            updateFromX(e.clientX);
          }
        });

        wrapper.addEventListener("pointerup", (e) => {
          wrapper.releasePointerCapture(e.pointerId);
        });

        function updateFromX(clientX) {
          const rect = track.getBoundingClientRect();
          let x = clientX - rect.left;
          x = Math.max(0, Math.min(x, rect.width));
          const percent = x / rect.width;
          let newValue = Math.round(min + percent * (max - min));
          
          if (newValue !== currentValue) {
            currentValue = newValue;
            updateSliderUI(track, thumb, valEl, currentValue, min, max);
            setVal(currentValue);
          }
        }
      }

      setupSlider(countTrack.parentElement, countTrack, countThumb, countVal, 3, 12, () => targetColorCount, (v) => { targetColorCount = v; });

      function getContrastColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
      }

      function rgbToLab(r, g, b) {
        let r_ = r / 255, g_ = g / 255, b_ = b / 255;
        r_ = r_ > 0.04045 ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92;
        g_ = g_ > 0.04045 ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92;
        b_ = b_ > 0.04045 ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92;

        let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) / 0.95047;
        let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) / 1.00000;
        let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) / 1.08883;

        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

        return {
          L: (116 * y) - 16,
          a: 500 * (x - y),
          b: 200 * (y - z)
        };
      }

      function deltaE(lab1, lab2) {
        const dL = lab1.L - lab2.L;
        const da = lab1.a - lab2.a;
        const db = lab1.b - lab2.b;
        return Math.sqrt(dL * dL + da * da + db * db);
      }

      function labToRgb(lab) {
        let y = (lab.L + 16) / 116;
        let x = lab.a / 500 + y;
        let z = y - lab.b / 200;

        let x3 = x * x * x, y3 = y * y * y, z3 = z * z * z;
        x = x3 > 0.008856 ? x3 : (x - 16/116) / 7.787;
        y = y3 > 0.008856 ? y3 : (y - 16/116) / 7.787;
        z = z3 > 0.008856 ? z3 : (z - 16/116) / 7.787;

        x *= 0.95047;
        y *= 1.00000;
        z *= 1.08883;

        let r = x *  3.2406 + y * -1.5372 + z * -0.4986;
        let g = x * -0.9689 + y *  1.8758 + z *  0.0415;
        let b = x *  0.0557 + y * -0.2040 + z *  1.0570;

        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
        b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;

        return {
          r: Math.max(0, Math.min(255, Math.round(r * 255))),
          g: Math.max(0, Math.min(255, Math.round(g * 255))),
          b: Math.max(0, Math.min(255, Math.round(b * 255)))
        };
      }

      function rgbToHex(r, g, b) {
        return "#" + 
          Math.round(r).toString(16).padStart(2, '0') + 
          Math.round(g).toString(16).padStart(2, '0') + 
          Math.round(b).toString(16).padStart(2, '0');
      }

      async function extractColors(file) {
        if (isProcessing) return;
        if (!file || !file.type.startsWith('image/')) return showToast("Wybierz prawidłowy plik graficzny.");

        isProcessing = true;
        pickBtn.disabled = true;
        pickBtn.style.opacity = "0.5";
        progressWrapper.style.display = "flex";
        progressFill.style.width = "0%";
        progressText.textContent = "Wczytywanie zdjęcia...";

        if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
        currentImgUrl = URL.createObjectURL(file);
        previewImg.src = currentImgUrl;

        try {
          const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
          
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          ctx.drawImage(bitmap, 0, 0, 256, 256);
          const imgData = ctx.getImageData(0, 0, 256, 256).data;
          
          const pixels = [];
          for (let i = 0; i < imgData.length; i += 4) {
            const a = imgData[i + 3];
            if (a < 128) continue;
            pixels.push({
              r: imgData[i],
              g: imgData[i + 1],
              b: imgData[i + 2]
            });
          }

          progressText.textContent = "Konwersja przestrzeni kolorów...";
          await new Promise(r => setTimeout(r, 50));

          const labPixels = pixels.map(p => {
            const lab = rgbToLab(p.r, p.g, p.b);
            return { ...lab, original: p };
          });

          const numClusters = targetColorCount;
          let centroids = [];

          for (let i = 0; i < numClusters; i++) {
            centroids.push(labPixels[Math.floor(Math.random() * labPixels.length)]);
          }

          const maxIterations = 15;
          for (let iter = 0; iter < maxIterations; iter++) {
            const clusters = Array.from({ length: numClusters }, () => []);
            
            for (const pixel of labPixels) {
              let minDist = Infinity;
              let bestCluster = 0;
              for (let k = 0; k < numClusters; k++) {
                const dist = deltaE(pixel, centroids[k]);
                if (dist < minDist) {
                  minDist = dist;
                  bestCluster = k;
                }
              }
              clusters[bestCluster].push(pixel);
            }

            for (let k = 0; k < numClusters; k++) {
              if (clusters[k].length > 0) {
                let sumL = 0, sumA = 0, sumB = 0;
                for (const p of clusters[k]) {
                  sumL += p.L; sumA += p.a; sumB += p.b;
                }
                centroids[k] = {
                  L: sumL / clusters[k].length,
                  a: sumA / clusters[k].length,
                  b: sumB / clusters[k].length
                };
              }
            }

            const progressPercent = Math.round(((iter + 1) / maxIterations) * 100);
            progressFill.style.width = progressPercent + "%";
            progressText.textContent = `Grupowanie kolorów: ${progressPercent}%`;
            
            await new Promise(r => setTimeout(r, 10));
          }

          progressText.textContent = "Generowanie palety...";
          await new Promise(r => setTimeout(r, 100));

          const finalColors = [];
          for (const centroid of centroids) {
            const rgb = labToRgb(centroid);
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            
            const isDuplicate = finalColors.some(c => {
              const cLab = rgbToLab(c.r, c.g, c.b);
              return deltaE(cLab, centroid) < 5;
            });

            if (!isDuplicate) {
              finalColors.push({ ...rgb, hex });
            }
          }

          finalColors.sort((a, b) => {
            const labA = rgbToLab(a.r, a.g, a.b);
            const labB = rgbToLab(b.r, b.g, b.b);
            return labA.L - labB.L;
          });

          swatchesContainer.innerHTML = "";
          warningText.textContent = "";

          finalColors.forEach((colorObj) => {
            const textColor = getContrastColor(colorObj.hex);
            const swatch = document.createElement("div");
            swatch.className = "pal-swatch";
            swatch.style.backgroundColor = colorObj.hex;
            swatch.innerHTML = `<span class="pal-hex-text" style="color: ${textColor}">${colorObj.hex.toUpperCase()}</span>`;
            
            swatch.addEventListener("click", () => {
              navigator.clipboard.writeText(colorObj.hex.toUpperCase()).then(() => {
                Hub.haptic('success');
                const originalHTML = swatch.innerHTML;
                swatch.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => { swatch.innerHTML = originalHTML; }, 1500);
              }).catch(() => showToast("Błąd kopiowania"));
            });
            
            swatchesContainer.appendChild(swatch);
          });

          if (finalColors.length < targetColorCount) {
            warningText.textContent = `Znaleziono ${finalColors.length} wyrazistych kolorów. Reszta zlała się w tło.`;
            warningText.style.color = "#fbbf24";
          } else {
            warningText.textContent = `Znaleziono ${finalColors.length} dominujących kolorów.`;
            warningText.style.color = "var(--muted)";
          }

          setupCard.classList.add("hidden");
          resultCard.classList.remove("hidden");
          Hub.haptic('success');

        } catch (err) {
          console.error(err);
          showToast("Błąd podczas analizy zdjęcia.");
        } finally {
          isProcessing = false;
          pickBtn.disabled = false;
          pickBtn.style.opacity = "1";
          progressWrapper.style.display = "none";
        }
      }

      pickBtn.addEventListener("click", () => fileInput.click(), { signal });
      
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) extractColors(file);
        fileInput.value = "";
      }, { signal });

      btnReset.addEventListener("click", () => {
        Hub.haptic('light');
        resultCard.classList.add("hidden");
        setupCard.classList.remove("hidden");
        if (currentImgUrl) {
          URL.revokeObjectURL(currentImgUrl);
          currentImgUrl = null;
        }
      }, { signal });

      signal.addEventListener('abort', () => {
        if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
        isProcessing = false;
      });
    },

    unmount() {}
  });
})();