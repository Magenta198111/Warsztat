(() => {
  Hub.register({
    id: "zdjecie-dokument",
    title: "Zdjęcie do Dokumentów",
    icon: "🪪",
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

      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="zd-back" style="width:auto; padding:10px 16px; border-radius:14px; margin:0;">Wróć</button>
        </div>

        <div class="card" id="zd-setup-card" style="width:100%; box-sizing:border-box; overflow:hidden;">
          <label>Wymiary zdjęcia</label>
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px; width:100%;">
            <input type="number" id="zd-w" value="3.5" step="0.1" style="flex:1 1 0; min-width:0; padding:12px 4px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; text-align:center;">
            <span style="color:var(--muted); flex:0 0 auto;">×</span>
            <input type="number" id="zd-h" value="4.5" step="0.1" style="flex:1 1 0; min-width:0; padding:12px 4px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; text-align:center;">
            <select id="zd-unit" style="flex:0 0 75px; max-width:75px; padding:12px 4px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; text-align:center;">
              <option value="cm">cm</option>
              <option value="px">px</option>
            </select>
          </div>

          <label>Maksymalny rozmiar pliku (KB)</label>
          <input type="number" id="zd-size" value="100" min="10" step="10" style="width:100%; box-sizing:border-box; padding:12px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; margin-bottom:16px;">

          <input type="file" id="zd-file" accept="image/*" style="display:none;">
          <button id="zd-pick-btn" class="p" style="margin:0; display:flex; justify-content:center; align-items:center; gap:8px;">
            📁 Wybierz zdjęcie
          </button>
        </div>

        <div id="zd-editor" class="hidden">
          <div style="display:flex; justify-content:center; margin:16px 0;">
            <div id="zd-crop-container" style="position:relative; overflow:hidden; background:#000; border-radius:14px; border:1.5px solid var(--line); touch-action:none; cursor:grab;">
              <img id="zd-preview-img" style="position:absolute; transform-origin:top left; user-select:none; pointer-events:none;">
              <div style="position:absolute; inset:0; border: 2px dashed rgba(255,255,255,0.3); pointer-events:none; box-sizing:border-box;"></div>
            </div>
          </div>
          
          <div class="card">
            <label>Powiększenie</label>
            <input type="range" id="zd-zoom" min="1" max="3" step="0.01" value="1">
            
            <div style="display:flex; gap:10px; margin-top:14px;">
              <button id="zd-cancel" style="flex:1; margin:0; padding:14px; background:var(--bg);">Anuluj</button>
              <button class="p" id="zd-save-btn" style="flex:2; margin:0; padding:14px;">Zapisz zdjęcie</button>
            </div>
          </div>
        </div>
        
        <div id="zd-result" class="card hidden" style="text-align:center;">
          <h3 style="color:var(--ok); margin-top:0;">Gotowe!</h3>
          <img id="zd-final-img" style="max-width:100%; border-radius:14px; border:1.5px solid var(--line); margin-bottom:14px;">
          <div id="zd-final-info" style="color:var(--muted); font-size:14px; margin-bottom:14px;"></div>
          <a id="zd-dl" class="p" style="display:block; text-decoration:none; padding:14px; border-radius:14px; background:var(--accent); color:var(--accent-ink); font-weight:600;">⬇️ Pobierz zdjęcie</a>
          <button id="zd-reset" style="width:100%; margin-top:10px; padding:14px; background:var(--bg);">Zrób kolejne</button>
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
      const unitSelect = $("zd-unit");
      const sizeInput = $("zd-size");

      $("zd-back").addEventListener("click", () => history.back(), { signal });
      $("zd-pick-btn").addEventListener("click", () => fileInput.click(), { signal });

      function getTargetDimensions() {
        let w = parseFloat(wInput.value) || 3.5;
        let h = parseFloat(hInput.value) || 4.5;
        const u = unitSelect.value;
        
        if (u === 'cm') {
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
        previewImg.style.left = "0";
        previewImg.style.top = "0";
        
        scale = 1;
        translateX = 0;
        translateY = 0;
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
      }, { signal });

      $("zd-cancel").addEventListener("click", () => {
        editorDiv.classList.add("hidden");
        setupCard.classList.remove("hidden");
        fileInput.value = "";
      }, { signal });

      $("zd-reset").addEventListener("click", () => {
        resultDiv.classList.add("hidden");
        setupCard.classList.remove("hidden");
        fileInput.value = "";
      }, { signal });

      $("zd-save-btn").addEventListener("click", async () => {
        if (!isLoaded) return;
        const btn = $("zd-save-btn");
        btn.disabled = true;
        btn.textContent = "Przetwarzanie...";
        
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
            const containerH = cropContainer.clientHeight;
            const ratio = targetW / containerW;
            
            const offsetX = -translateX * (targetW / containerW);
            const offsetY = -translateY * (targetH / containerH);
            
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetW, targetH);
            
            const drawW = previewImg.naturalWidth * ratio * scale;
            const drawH = previewImg.naturalHeight * ratio * scale;
            
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            
            let quality = 0.95;
            let blob = null;
            
            while (quality > 0.1) {
              blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
              if (blob && blob.size <= maxSize) break;
              quality -= 0.05;
            }
            
            if (blob.size > maxSize) {
              alert("Nie udało się zmieścić w limicie. Spróbuj mniejszego wymiaru.");
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
            
          } catch(err) {
            alert("Błąd: " + err.message);
          } finally {
            btn.disabled = false;
            btn.textContent = "Zapisz zdjęcie";
          }
        }, 50);
      }, { signal });
    },

    unmount() {}
  });
})();