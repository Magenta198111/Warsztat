(() => {
  Hub.register({
    id: "wyciagacz-kolorow",
    title: "Wyciągacz Kolorów",
    desc: "Wyodrębnij dominujące kolory ze zdjęcia",

    async mount(container, signal) {
      container.innerHTML = `
        <style>
          .pal-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 12px; }
          
          .pal-intro-box {
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 32px 20px;
            text-align: center;
            margin-top: 16px;
            margin-bottom: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }

          .pal-icon-wrapper {
            width: 72px; height: 72px; border-radius: 50%;
            background: var(--bg); border: 1px solid var(--line);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent);
          }

          .pal-preview-img {
            width: 100%; border-radius: 8px; border: 1px solid var(--line);
            display: block; object-fit: contain; max-height: 300px; background: var(--surface);
            margin-bottom: 24px;
          }

          .pal-grid { 
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; 
            margin-bottom: 32px;
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
          
          .pal-action-row { display: flex; gap: 12px; margin-bottom: 24px; }
          .pal-btn { flex: 1; padding: 14px; font-size: 15px; }
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
              <div style="font-size: 14px; color: var(--muted); line-height: 1.5;">Wybierz zdjęcie, a my znajdziemy jego dominujące kolory i podamy ich kody HEX.</div>
            </div>
            <button id="pal-pick-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px; margin-top: 8px;">Wybierz zdjęcie</button>
          </div>
        </div>

        <div id="pal-result-card" class="hidden">
          <label class="pal-label">Dominujące kolory (kliknij, aby skopiować)</label>
          <img id="pal-preview" class="pal-preview-img">
          <div id="pal-swatches" class="pal-grid"></div>
          
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
      const btnReset = $("pal-btn-reset");

      let currentImgUrl = null;

      function getContrastColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
      }

      function colorDistance(c1, c2) {
        const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
        const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
        return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
      }

      async function extractColors(file) {
        if (!file || !file.type.startsWith('image/')) return showToast("Wybierz prawidłowy plik graficzny.");

        if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
        currentImgUrl = URL.createObjectURL(file);
        previewImg.src = currentImgUrl;

        try {
          const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
          
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          ctx.drawImage(bitmap, 0, 0, 100, 100);
          const imgData = ctx.getImageData(0, 0, 100, 100).data;
          
          const colorCounts = {};
          
          for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];
            
            if (a < 128) continue;
            
            const qr = Math.round(r / 16) * 16;
            const qg = Math.round(g / 16) * 16;
            const qb = Math.round(b / 16) * 16;
            
            const hex = "#" + 
              Math.min(255, qr).toString(16).padStart(2, '0') + 
              Math.min(255, qg).toString(16).padStart(2, '0') + 
              Math.min(255, qb).toString(16).padStart(2, '0');
              
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          }

          const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
          
          const finalColors = [];
          const MIN_DISTANCE = 40;

          for (const color of sortedColors) {
            if (finalColors.length >= 6) break;
            
            let isDistinct = true;
            for (const selected of finalColors) {
              if (colorDistance(color, selected) < MIN_DISTANCE) {
                isDistinct = false;
                break;
              }
            }
            
            if (isDistinct) {
              finalColors.push(color);
            }
          }

          swatchesContainer.innerHTML = "";
          
          if (finalColors.length === 0) {
            swatchesContainer.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--muted); padding: 20px;">Nie udało się wyodrębnić kolorów.</div>';
          } else {
            finalColors.forEach((hex) => {
              const textColor = getContrastColor(hex);
              const swatch = document.createElement("div");
              swatch.className = "pal-swatch";
              swatch.style.backgroundColor = hex;
              swatch.innerHTML = `<span class="pal-hex-text" style="color: ${textColor}">${hex.toUpperCase()}</span>`;
              
              swatch.addEventListener("click", () => {
                navigator.clipboard.writeText(hex.toUpperCase()).then(() => {
                  Hub.haptic('success');
                  const originalHTML = swatch.innerHTML;
                  swatch.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                  setTimeout(() => { swatch.innerHTML = originalHTML; }, 1500);
                }).catch(() => showToast("Błąd kopiowania"));
              });
              
              swatchesContainer.appendChild(swatch);
            });
          }

          setupCard.classList.add("hidden");
          resultCard.classList.remove("hidden");
          Hub.haptic('success');

        } catch (err) {
          showToast("Błąd podczas analizy zdjęcia.");
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
      });
    },

    unmount() {}
  });
})();