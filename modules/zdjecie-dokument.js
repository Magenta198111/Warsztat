(() => {
  Hub.register({
    id: "zdjecie-dokument",
    title: "Przycinanie Zdjęć",
    desc: "Kadruj, przycinaj i kompresuj zdjęcia do dowolnych formatów i limitów rozmiaru",

    async mount(container, signal) {
      let img = new Image();
      let scale = 1;
      let translateX = 0;
      let translateY = 0;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let isLoaded = false;
      let currentUnit = "cm";
      let resultUrl = null;
      let currentImgUrl = null;

      const docPresets = [
        { id: "dokumenty", label: "Dokumenty urzędowe (3.5 × 4.5 cm)", w: 3.5, h: 4.5, unit: "cm" },
        { id: "wiza_us", label: "Wiza USA (5 × 5 cm)", w: 5, h: 5, unit: "cm" },
        { id: "social", label: "Post / Instagram (10 × 10 cm)", w: 10, h: 10, unit: "cm" },
        { id: "print", label: "Odbitka zdjęciowa (10 × 15 cm)", w: 10, h: 15, unit: "cm" },
        { id: "custom", label: "Własne wymiary", w: null, h: null, unit: "cm" }
      ];

      const sizePresets = [
        { id: "20", label: "20 KB" },
        { id: "50", label: "50 KB" },
        { id: "100", label: "100 KB" },
        { id: "200", label: "200 KB" },
        { id: "500", label: "500 KB" },
        { id: "1000", label: "1 MB (1024 KB)" },
        { id: "custom", label: "Inny (wpisz ręcznie)" }
      ];

      container.innerHTML = `
        <style>
          .zd-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          .zd-flat-section { margin-bottom: 28px; }
          .zd-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          .zd-trigger-btn {
            display: flex; justify-content: space-between; align-items: center;
            background: transparent; border: none; border-bottom: 1px solid var(--line);
            padding: 16px 0; color: var(--ink); font-size: 16px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s; margin-bottom: 16px;
          }
          .zd-trigger-btn:active { color: var(--accent); }
          .zd-trigger-btn svg { color: var(--muted); flex-shrink: 0; }
          .zd-trigger-btn span { flex: 1; text-align: left; line-height: 1.4; }

          .zd-input-row { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; width: 100%; }
          .zd-input {
            flex: 1; min-width: 0; background: transparent; border: none; border-bottom: 1px solid var(--line);
            color: var(--ink); font-size: 16px; padding: 8px 0; outline: none;
            text-align: center; transition: border-color 0.2s; font-family: monospace;
          }
          .zd-input:focus { border-bottom-color: var(--accent); }
          
          .zd-unit-trigger {
            flex-shrink: 0; width: 50px; display: flex; justify-content: center; align-items: center; 
            background: transparent; border-bottom: 1px solid var(--line); 
            padding: 8px 0; color: var(--accent); font-size: 16px; font-weight: 600;
            cursor: pointer; user-select: none;
          }
          
          #zd-crop-container {
            position: relative; overflow: hidden; background: #000;
            border-radius: 8px; border: 1px solid var(--line);
            touch-action: none; cursor: grab; margin: 0 auto;
          }
          
          .zd-range-wrapper {
            display: flex; align-items: center; height: 40px;
            touch-action: none; cursor: pointer;
          }

          .zd-range-track {
            position: relative; width: 100%; height: 6px; border-radius: 3px;
            background: linear-gradient(to right, var(--accent) var(--percent, 100%), var(--line) var(--percent, 100%));
          }

          .zd-range-thumb {
            position: absolute; top: 50%; transform: translate(-50%, -50%);
            width: 24px; height: 24px; border-radius: 50%; background: var(--accent);
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            pointer-events: none;
            transition: transform 0.1s;
          }

          .zd-drop-zone { 
            border: 2px dashed var(--line); border-radius: 8px; padding: 30px 20px; 
            text-align: center; color: var(--muted); cursor: pointer; 
            transition: border-color 0.2s; margin-bottom: 16px; 
          }
          .zd-drop-zone:active { border-color: var(--accent); }
        </style>

        ${Hub.backButtonHtml}

        <div id="zd-setup-card" style="margin-top: 16px;">
          
          <div class="zd-flat-section">
            <label class="zd-label">Format zdjęcia</label>
            <div id="zd-preset-trigger" class="zd-trigger-btn">
              <span id="zd-preset-text">Dokumenty urzędowe (3.5 × 4.5 cm)</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>

            <label class="zd-label">Wymiary</label>
            <div class="zd-input-row">
              <input type="number" id="zd-w" value="3.5" step="0.1" class="zd-input" inputmode="decimal">
              <span style="color:var(--muted); flex-shrink: 0;">×</span>
              <input type="number" id="zd-h" value="4.5" step="0.1" class="zd-input" inputmode="decimal">
              <div id="zd-unit-trigger" class="zd-unit-trigger">cm</div>
            </div>
          </div>

          <div class="zd-flat-section">
            <label class="zd-label">Limit rozmiaru pliku</label>
            <div id="zd-size-trigger" class="zd-trigger-btn">
              <span id="zd-size-text">100 KB</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div id="zd-custom-size-wrapper" class="hidden">
              <label class="zd-label" style="margin-top: 12px;">Wpisz własny limit (KB)</label>
              <input type="number" id="zd-size" value="100" min="10" step="10" class="zd-input" style="width: 100%;" inputmode="numeric">
            </div>
          </div>

          <div class="zd-divider"></div>

          <input type="file" id="zd-file" accept="image/*" style="display:none;">
          <div id="zd-pick-btn" class="zd-drop-zone">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px; opacity:0.5;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            <div style="font-size: 14px; font-weight: 500;">Kliknij, aby wybrać zdjęcie</div>
          </div>
        </div>

        <div id="zd-editor" class="hidden">
          <div style="display:flex; justify-content:center; margin: 24px 0;">
            <div id="zd-crop-container">
              <img id="zd-preview-img" style="position:absolute; transform-origin:top left; user-select:none; pointer-events:none;">
              <div style="position:absolute; inset:0; border: 2px dashed var(--line); pointer-events:none; box-sizing:border-box;"></div>
            </div>
          </div>
          
          <div class="zd-flat-section">
            <label class="zd-label">Powiązanie (Zoom)</label>
            <div id="zd-zoom-wrapper" class="zd-range-wrapper">
              <div class="zd-range-track" id="zd-zoom-track">
                <div class="zd-range-thumb" id="zd-zoom-thumb"></div>
              </div>
            </div>
          </div>
          
          <div style="display:flex; gap:12px;">
            <button id="zd-cancel" class="n-btn" style="flex:1; padding: 14px;">Anuluj</button>
            <button class="n-btn n-btn-outline" id="zd-save-btn" style="flex:2; padding: 14px;">Zapisz zdjęcie</button>
          </div>
        </div>
        
        <div id="zd-result" class="hidden" style="text-align:center; padding-top: 24px;">
          <h3 style="color: var(--accent); margin-top:0;">Gotowe!</h3>
          <img id="zd-final-img" style="max-width:100%; border-radius:8px; border:1px solid var(--line); margin-bottom:16px;">
          <div id="zd-final-info" style="color:var(--muted); font-size:14px; margin-bottom:24px; font-family: monospace;"></div>
          
          <a id="zd-dl" class="n-btn n-btn-outline" style="display:flex; text-decoration:none; padding:14px; margin-bottom:12px;">Pobierz zdjęcie</a>
          <button id="zd-reset" class="n-btn" style="width:100%; padding:14px;">Zrób kolejne</button>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const setupCard = $("zd-setup-card");
      const editorDiv = $("zd-editor");
      const resultDiv = $("zd-result");
      const fileInput = $("zd-file");
      const cropContainer = $("zd-crop-container");
      const previewImg = $("zd-preview-img");
      
      const zoomWrapper = $("zd-zoom-wrapper");
      const zoomTrack = $("zd-zoom-track");
      const zoomThumb = $("zd-zoom-thumb");
      
      const wInput = $("zd-w");
      const hInput = $("zd-h");
      const unitTrigger = $("zd-unit-trigger");
      const sizeInput = $("zd-size");
      
      const presetTrigger = $("zd-preset-trigger");
      const presetText = $("zd-preset-text");
      const sizeTrigger = $("zd-size-trigger");
      const sizeText = $("zd-size-text");
      const customSizeWrapper = $("zd-custom-size-wrapper");

      $("zd-pick-btn").addEventListener("click", () => fileInput.click(), { signal });

      presetTrigger.addEventListener("click", async () => {
        const opts = docPresets.map(p => ({ id: p.id, label: p.label }));
        const choice = await Hub.showSelect({ title: "Wybierz format", options: opts, current: "dokumenty", anchor: presetTrigger, signal });
        
        if (choice) {
          const preset = docPresets.find(p => p.id === choice);
          if (preset) {
            presetText.textContent = preset.label;
            if (preset.w !== null) {
              wInput.value = preset.w;
              hInput.value = preset.h;
              currentUnit = preset.unit;
              unitTrigger.textContent = currentUnit;
              handleDimChange();
            }
          }
        }
      }, { signal });

      sizeTrigger.addEventListener("click", async () => {
        const opts = sizePresets.map(s => ({ id: s.id, label: s.label }));
        const choice = await Hub.showSelect({ title: "Wybierz limit", options: opts, current: "100", anchor: sizeTrigger, signal });
        
        if (choice) {
          const preset = sizePresets.find(s => s.id === choice);
          if (preset) {
            sizeText.textContent = preset.label;
            if (preset.id === "custom") {
              customSizeWrapper.classList.remove("hidden");
            } else {
              customSizeWrapper.classList.add("hidden");
              sizeInput.value = preset.id;
            }
          }
        }
      }, { signal });

      unitTrigger.addEventListener("click", async () => {
        const opts = [{ id: "cm", label: "Centymetry (cm)" }, { id: "px", label: "Piksele (px)" }];
        const choice = await Hub.showSelect({ title: "Jednostka", options: opts, current: currentUnit, anchor: unitTrigger, signal });
        if (choice) {
          currentUnit = choice;
          unitTrigger.textContent = currentUnit;
          handleDimChange();
        }
      }, { signal });

      function getTargetDimensions() {
        let w = parseFloat(wInput.value) || 3.5;
        let h = parseFloat(hInput.value) || 4.5;
        
        if (currentUnit === 'cm') {
          w = Math.round(w * 118.11);
          h = Math.round(h * 118.11);
        } else {
          w = Math.round(w);
          h = Math.round(h);
        }
        
        if (w < 50) w = 50;
        if (h < 50) h = 50;
        
        return { w, h };
      }

      function constrainTransform() {
        const imgW = previewImg.clientWidth * scale;
        const imgH = previewImg.clientHeight * scale;
        const contW = cropContainer.clientWidth;
        const contH = cropContainer.clientHeight;
        
        if (imgW <= contW) {
          translateX = (contW - imgW) / 2;
        } else {
          translateX = Math.min(0, Math.max(translateX, contW - imgW));
        }
        
        if (imgH <= contH) {
          translateY = (contH - imgH) / 2;
        } else {
          translateY = Math.min(0, Math.max(translateY, contH - imgH));
        }
        updateImageTransform();
      }

      function initCropper() {
        const dims = getTargetDimensions();
        const maxWidth = container.clientWidth - 32;
        const maxHeight = 400;
        
        let displayW = dims.w;
        let displayH = dims.h;
        const ratio = dims.w / dims.h;
        
        if (displayW > maxWidth) {
          displayW = maxWidth;
          displayH = displayW / ratio;
        }
        if (displayH > maxHeight) {
          displayH = maxHeight;
          displayW = displayH * ratio;
        }
        
        cropContainer.style.width = displayW + "px";
        cropContainer.style.height = displayH + "px";
        
        previewImg.style.width = "100%";
        previewImg.style.height = "auto";
        
        translateX = (displayW - previewImg.clientWidth) / 2;
        translateY = (displayH - previewImg.clientHeight) / 2;
        scale = 1;
        
        constrainTransform();
        updateZoomUI(0);
      }

      function handleDimChange() {
        if (!isLoaded) return;
        const dims = getTargetDimensions();
        const maxWidth = container.clientWidth - 32;
        const maxHeight = 400;
        
        let displayW = dims.w;
        let displayH = dims.h;
        const ratio = dims.w / dims.h;
        
        if (displayW > maxWidth) {
          displayW = maxWidth;
          displayH = displayW / ratio;
        }
        if (displayH > maxHeight) {
          displayH = maxHeight;
          displayW = displayH * ratio;
        }
        
        cropContainer.style.width = displayW + "px";
        cropContainer.style.height = displayH + "px";
        
        constrainTransform();
      }

      wInput.addEventListener('input', handleDimChange, { signal });
      hInput.addEventListener('input', handleDimChange, { signal });

      function updateImageTransform() {
        previewImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      }

      function updateZoomFromX(clientX) {
        const rect = zoomTrack.getBoundingClientRect();
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        const percent = x / rect.width;
        
        scale = 1 + percent * 2;
        constrainTransform();
        updateZoomUI(percent);
      }

      function updateZoomUI(percent) {
        zoomThumb.style.left = (percent * 100) + "%";
        zoomTrack.style.setProperty('--percent', `${percent * 100}%`);
      }

      zoomWrapper.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        zoomWrapper.setPointerCapture(e.pointerId);
        updateZoomFromX(e.clientX);
      }, { signal });

      zoomWrapper.addEventListener("pointermove", (e) => {
        if (zoomWrapper.hasPointerCapture(e.pointerId)) {
          updateZoomFromX(e.clientX);
        }
      }, { signal });

      zoomWrapper.addEventListener("pointerup", (e) => {
        zoomWrapper.releasePointerCapture(e.pointerId);
      }, { signal });

      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d').drawImage(bitmap, 0, 0);
          
          canvas.toBlob((blob) => {
            if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
            currentImgUrl = URL.createObjectURL(blob);
            img.src = currentImgUrl;
            
            img.onload = () => {
              previewImg.src = img.src;
              setupCard.classList.add("hidden");
              editorDiv.classList.remove("hidden");
              resultDiv.classList.add("hidden");
              isLoaded = true;
              
              setTimeout(initCropper, 50);
            };
          }, 'image/jpeg', 0.95);
        } catch (err) {
          showToast("Błąd podczas odczytu zdjęcia.");
        }
        fileInput.value = "";
      }, { signal });

      cropContainer.addEventListener("pointerdown", (e) => {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        cropContainer.setPointerCapture(e.pointerId);
      }, { signal });

      cropContainer.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        
        let newX = e.clientX - startX;
        let newY = e.clientY - startY;
        
        const imgW = previewImg.clientWidth * scale;
        const imgH = previewImg.clientHeight * scale;
        const contW = cropContainer.clientWidth;
        const contH = cropContainer.clientHeight;
        
        if (imgW > contW) {
          newX = Math.min(0, Math.max(newX, contW - imgW));
        } else {
          newX = (contW - imgW) / 2;
        }
        
        if (imgH > contH) {
          newY = Math.min(0, Math.max(newY, contH - imgH));
        } else {
          newY = (contH - imgH) / 2;
        }
        
        translateX = newX;
        translateY = newY;
        updateImageTransform();
      }, { signal });

      cropContainer.addEventListener("pointerup", (e) => {
        isDragging = false;
        cropContainer.releasePointerCapture(e.pointerId);
      }, { signal });

      $("zd-cancel").addEventListener("click", () => {
        Hub.haptic('light');
        editorDiv.classList.add("hidden");
        setupCard.classList.remove("hidden");
      }, { signal });

      $("zd-reset").addEventListener("click", () => {
        Hub.haptic('light');
        if (resultUrl) {
          URL.revokeObjectURL(resultUrl);
          resultUrl = null;
        }
        resultDiv.classList.add("hidden");
        setupCard.classList.remove("hidden");
      }, { signal });

      $("zd-save-btn").addEventListener("click", async () => {
        if (!isLoaded) return;
        const btn = $("zd-save-btn");
        btn.disabled = true;
        btn.textContent = "Przetwarzanie...";
        Hub.haptic('medium');
        
        setTimeout(async () => {
          try {
            const dims = getTargetDimensions();
            const targetW = dims.w;
            const targetH = dims.h;
            const maxSize = (parseFloat(sizeInput.value) || 100) * 1024;
            
            const canvas = document.createElement("canvas");
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext("2d");
            
            const containerW = cropContainer.clientWidth;
            const ratio = targetW / containerW;
            
            const drawW = targetW * scale;
            const drawH = (img.naturalHeight / img.naturalWidth) * drawW;
            
            const offsetX = translateX * ratio;
            const offsetY = translateY * ratio;
            
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetW, targetH);
            
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            
            let quality = 0.95;
            let blob = null;
            
            while (quality > 0.1) {
              blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
              if (blob && blob.size <= maxSize) break;
              quality -= 0.05;
            }
            
            if (blob.size > maxSize) {
              showToast(`Nie udało się zmieścić w limicie ${Math.round(maxSize/1024)} KB. Spróbuj mniejszego wymiaru.`);
              btn.disabled = false;
              btn.textContent = "Zapisz zdjęcie";
              return;
            }
            
            if (resultUrl) URL.revokeObjectURL(resultUrl);
            resultUrl = URL.createObjectURL(blob);
            
            $("zd-final-img").src = resultUrl;
            $("zd-final-info").textContent = `Wymiary: ${targetW} × ${targetH} px | Rozmiar: ${(blob.size / 1024).toFixed(1)} KB`;
            
            const dl = $("zd-dl");
            dl.href = resultUrl;
            dl.download = `zdjecie_dokument_${targetW}x${targetH}.jpg`;
            
            editorDiv.classList.add("hidden");
            resultDiv.classList.remove("hidden");
            Hub.haptic('success');
            
          } catch(err) {
            showToast("Błąd: " + err.message);
          } finally {
            btn.disabled = false;
            btn.textContent = "Zapisz zdjęcie";
          }
        }, 50);
      }, { signal });

      signal.addEventListener('abort', () => {
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        if (currentImgUrl) URL.revokeObjectURL(currentImgUrl);
      });
    },

    unmount() {}
  });
})();