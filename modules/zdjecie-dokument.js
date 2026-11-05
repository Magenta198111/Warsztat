(() => {
  Hub.register({
    id: "zdjecie-dokument",
    title: "Zdjęcie do Dokumentów",
    desc: "Kadrowanie i kompresja zdjęć do dowodu, paszportu i wiz",

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

      container.innerHTML = `
        <style>
          .zd-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          .zd-flat-section { margin-bottom: 28px; }
          .zd-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          .zd-input-row { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
          .zd-input {
            flex: 1; background: transparent; border: none; border-bottom: 1px solid var(--line);
            color: var(--ink); font-size: 16px; padding: 8px 0; outline: none;
            text-align: center; transition: border-color 0.2s; font-family: monospace;
          }
          .zd-input:focus { border-bottom-color: var(--accent); }
          
          .zd-trigger {
            display: flex; justify-content: center; align-items: center; 
            background: transparent; border-bottom: 1px solid var(--line); 
            padding: 8px 0; color: var(--accent); font-size: 16px; font-weight: 600;
            cursor: pointer; user-select: none; width: 60px; flex-shrink: 0;
          }
          
          #zd-crop-container {
            position: relative; overflow: hidden; background: #000;
            border-radius: 8px; border: 1px solid var(--line);
            touch-action: none; cursor: grab; margin: 0 auto;
          }
          
          .zd-range { 
            -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; 
            outline: none; margin: 10px 0 20px 0; width: 100%; 
            background: linear-gradient(to right, var(--accent) var(--percent, 100%), var(--line) var(--percent, 100%)); 
            touch-action: pan-y; 
          }
          .zd-range::-webkit-slider-thumb { 
            -webkit-appearance: none; appearance: none; width: 22px; height: 22px; 
            border-radius: 50%; background: var(--accent); cursor: pointer; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.4); margin-top: -2px; 
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
            <label class="zd-label">Wymiary zdjęcia</label>
            <div class="zd-input-row">
              <input type="number" id="zd-w" value="3.5" step="0.1" class="zd-input" inputmode="decimal">
              <span style="color:var(--muted);">×</span>
              <input type="number" id="zd-h" value="4.5" step="0.1" class="zd-input" inputmode="decimal">
              <div id="zd-unit-trigger" class="zd-trigger">cm</div>
            </div>
          </div>

          <div class="zd-flat-section">
            <label class="zd-label">Maksymalny rozmiar pliku (KB)</label>
            <input type="number" id="zd-size" value="100" min="10" step="10" class="zd-input" style="width: 100%;" inputmode="numeric">
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
            <input type="range" id="zd-zoom" min="1" max="3" step="0.01" value="1" class="zd-range">
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
      const zoomSlider = $("zd-zoom");
      const wInput = $("zd-w");
      const hInput = $("zd-h");
      const unitTrigger = $("zd-unit-trigger");
      const sizeInput = $("zd-size");

      pickBtn = $("zd-pick-btn");
      pickBtn.addEventListener("click", () => fileInput.click(), { signal });
      
      unitTrigger.addEventListener("click", async () => {
        const opts = [{ id: "cm", label: "Centymetry (cm)" }, { id: "px", label: "Piksele (px)" }];
        const choice = await Hub.showSelect({ title: "Jednostka", options: opts, current: currentUnit, anchor: unitTrigger, signal });
        if (choice) {
          currentUnit = choice;
          unitTrigger.textContent = currentUnit;
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
        
        // Automatyczne wyśrodkowanie obrazu
        translateX = (displayW - previewImg.clientWidth) / 2;
        translateY = (displayH - previewImg.clientHeight) / 2;
        scale = 1;
        
        updateImageTransform();
      }

      function updateImageTransform() {
        previewImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      }

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            previewImg.src = img.src;
            setupCard.classList.add("hidden");
            editorDiv.classList.remove("hidden");
            resultDiv.classList.add("hidden");
            isLoaded = true;
            
            setTimeout(initCropper, 50);
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
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
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateImageTransform();
      }, { signal });

      cropContainer.addEventListener("pointerup", (e) => {
        isDragging = false;
        cropContainer.releasePointerCapture(e.pointerId);
      }, { signal });

      zoomSlider.addEventListener("input", (e) => {
        scale = parseFloat(e.target.value);
        updateImageTransform();
        const percent = ((e.target.value - e.target.min) / (e.target.max - e.target.min)) * 100;
        e.target.style.setProperty('--percent', `${percent}%`);
      }, { signal });

      $("zd-cancel").addEventListener("click", () => {
        Hub.haptic('light');
        editorDiv.classList.add("hidden");
        setupCard.classList.remove("hidden");
      }, { signal });

      $("zd-reset").addEventListener("click", () => {
        Hub.haptic('light');
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
              showToast("Nie udało się zmieścić w limicie. Spróbuj mniejszego wymiaru.");
              btn.disabled = false;
              btn.textContent = "Zapisz zdjęcie";
              return;
            }
            
            const url = URL.createObjectURL(blob);
            $("zd-final-img").src = url;
            $("zd-final-info").textContent = `Wymiary: ${targetW} × ${targetH} px | Rozmiar: ${(blob.size / 1024).toFixed(1)} KB`;
            
            const dl = $("zd-dl");
            dl.href = url;
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
        if (img.src) URL.revokeObjectURL(img.src);
      });
    },

    unmount() {}
  });
})();