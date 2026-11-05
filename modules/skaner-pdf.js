(() => {
  Hub.register({
    id: "skaner-pdf",
    title: "Skaner do PDF",
    desc: "Skanowanie dokumentów z prostowaniem perspektywy i PDF",
    
    async mount(container, signal) {
      let img = new Image();
      let originalCanvas = document.createElement("canvas");
      let displayCanvas = document.createElement("canvas");
      let isLoaded = false;
      let isColor = true;
      let originalFileName = "skan";

      container.innerHTML = `
        <style>
          .sk-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          .sk-flat-section { margin-bottom: 28px; }
          .sk-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          .sk-handle {
            position: absolute; width: 64px; height: 64px; margin: -32px 0 0 -32px;
            z-index: 10; pointer-events: none; display: none;
          }
          .sk-handle::before, .sk-handle::after {
            content: ''; position: absolute; background-color: var(--accent);
            box-shadow: 0 0 4px rgba(0,0,0,0.8); border-radius: 1px;
            top: 50%; left: 50%; transform: translate(-50%, -50%);
            opacity: 0.6;
          }
          .sk-handle::before { width: 32px; height: 2px; }
          .sk-handle::after { width: 2px; height: 32px; }

          #sk-crop-area {
            position: absolute; inset: 0; pointer-events: none; display: none;
            z-index: 5; transition: all 0.05s linear;
          }
          #sk-crop-area svg { width: 100%; height: 100%; overflow: visible; }
          #sk-crop-area path { stroke: var(--danger); stroke-width: 2; stroke-dasharray: 8 4; fill: rgba(239, 68, 68, 0.1); }

          /* Lupa */
          #sk-loupe {
            position: absolute; width: 120px; height: 120px; border-radius: 50%;
            border: 2px solid var(--accent); overflow: hidden; pointer-events: none;
            z-index: 20; display: none; background: #000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            transform: translate(-50%, -50%);
          }

          .sk-drop-zone { 
            width: 100%; aspect-ratio: 4 / 3;
            border: 2px dashed var(--line); border-radius: 8px; 
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-align: center; color: var(--muted); cursor: pointer; 
            transition: border-color 0.2s; 
          }
          .sk-drop-zone:active { border-color: var(--accent); }

          .sk-range { 
            -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; 
            outline: none; margin: 10px 0 20px 0; width: 100%; 
            background: linear-gradient(to right, var(--accent) var(--percent, 100%), var(--line) var(--percent, 100%)); 
            touch-action: pan-y; 
          }
          .sk-range::-webkit-slider-thumb { 
            -webkit-appearance: none; appearance: none; width: 22px; height: 22px; 
            border-radius: 50%; background: var(--accent); cursor: pointer; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.4); margin-top: -2px; 
            transition: transform 0.1s; 
          }
          
          .sk-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          
          <button id="sk-change-btn" class="n-btn sk-btn" disabled style="width: 100%; padding: 12px; margin-bottom: 16px;">Zmień zdjęcie</button>

          <label class="sk-label">Plik źródłowy</label>
          <input type="file" id="sk-file" accept="image/*" style="display:none;">
          
          <div id="sk-wrapper" style="position:relative; width: 80%; margin: 0 auto; margin-bottom: 24px;">
            
            <div id="sk-pick-btn" class="sk-drop-zone">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px; opacity:0.5;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <div style="font-size: 14px; font-weight: 500;">Kliknij, aby wybrać zdjęcie</div>
            </div>

            <div id="sk-canvas-container" style="display:none; width: 100%; border-radius: 8px; border: 1px solid var(--line); background:#000; overflow:hidden; touch-action: none;">
              <canvas id="sk-display" style="display:block; width:100%; height:auto; transition: filter 0.1s;"></canvas>
              <div id="sk-crop-area">
                <svg preserveAspectRatio="none">
                  <path d="" />
                </svg>
              </div>
            </div>

            <div id="sk-loupe">
              <canvas id="sk-loupe-canvas" width="120" height="120"></canvas>
            </div>

            <div class="sk-handle" data-id="0"></div>
            <div class="sk-handle" data-id="1"></div>
            <div class="sk-handle" data-id="2"></div>
            <div class="sk-handle" data-id="3"></div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px;">
            <button id="sk-rotate-btn" class="n-btn sk-btn" disabled style="padding: 12px; font-size: 13px;">Obróć zdjęcie</button>
            <button id="sk-reset-btn" class="n-btn sk-btn" disabled style="padding: 12px; font-size: 13px;">Resetuj rogi</button>
          </div>

          <label class="sk-label">Popraw kontrast</label>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <input type="range" id="sk-contrast" min="0" max="200" value="100" class="sk-range sk-btn" style="flex: 1; margin-bottom: 0;" disabled>
            <button id="sk-reset-contrast" class="n-btn sk-btn" disabled style="padding: 8px; border-radius: 50%; width: 36px; height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-color: var(--line); background: transparent;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            </button>
          </div>
          
          <div class="settings-row" style="padding: 12px 0; border-bottom: none; margin-bottom: 24px;">
            <div style="flex: 1; padding-right: 12px;">
              <div class="settings-label" style="font-size: 15px; opacity: 0.4;" id="sk-color-label">Tryb skanu (CZ-B)</div>
              <div class="settings-desc">Zamienia kolory na odcienie szarości</div>
            </div>
            <label class="switch"><input type="checkbox" id="sk-color-toggle" class="sk-btn" disabled><span class="switch-slider"></span></label>
          </div>
          
          <div class="sk-divider"></div>

          <label class="sk-label">Nazwa pliku PDF</label>
          <input type="text" id="sk-pdf-name" class="n-input" placeholder="Nazwa pliku..." style="margin-bottom: 16px;" disabled>

          <button class="n-btn n-btn-outline sk-btn" id="sk-pdf-btn" disabled style="width:100%; padding: 14px; font-size: 15px;">Pobierz PDF</button>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("sk-file");
      const pickBtn = $("sk-pick-btn");
      const canvasContainer = $("sk-canvas-container");
      const displayCanvasEl = $("sk-display");
      const handles = container.querySelectorAll(".sk-handle");
      const contrastSlider = $("sk-contrast");
      const pdfBtn = $("sk-pdf-btn");
      const rotateBtn = $("sk-rotate-btn");
      const resetBtn = $("sk-reset-btn");
      const changeBtn = $("sk-change-btn");
      const colorToggle = $("sk-color-toggle");
      const cropArea = $("sk-crop-area");
      const cropPath = cropArea.querySelector("path");
      const loupe = $("sk-loupe");
      const loupeCanvas = $("sk-loupe-canvas");
      const loupeCtx = loupeCanvas.getContext("2d");
      const pdfNameInput = $("sk-pdf-name");

      const actionBtns = [rotateBtn, resetBtn, changeBtn, contrastSlider, $("sk-reset-contrast"), colorToggle, pdfBtn, pdfNameInput];

      let activeHandle = null;
      let dragStartHandleX = 0, dragStartHandleY = 0;
      let dragStartTouchX = 0, dragStartTouchY = 0;
      let moveCounter = 0;

      function updateCropPath() {
        if (!isLoaded) return;
        const rect = displayCanvasEl.getBoundingClientRect();
        const pts = [];
        handles.forEach(h => {
          const x = parseFloat(h.style.left) / 100 * rect.width;
          const y = parseFloat(h.style.top) / 100 * rect.height;
          pts.push(`${x},${y}`);
        });
        cropPath.setAttribute('d', `M${pts.join(' L')} Z`);
        cropArea.style.display = "block";
      }

      function updateLoupe() {
        if (!activeHandle) return;
        const zoom = 4;
        const w = loupeCanvas.width;
        const h = loupeCanvas.height;
        const viewW = w / zoom;
        const viewH = h / zoom;

        const rect = displayCanvasEl.getBoundingClientRect();
        const handleX = parseFloat(activeHandle.style.left) / 100 * rect.width;
        const handleY = parseFloat(activeHandle.style.top) / 100 * rect.height;

        const srcX = (handleX / rect.width) * originalCanvas.width;
        const srcY = (handleY / rect.height) * originalCanvas.height;

        loupeCtx.fillStyle = "#000";
        loupeCtx.fillRect(0, 0, w, h);
        
        loupeCtx.filter = `contrast(${contrastSlider.value}%)`;
        if (!isColor) loupeCtx.filter += ` grayscale(100%)`;
        loupeCtx.drawImage(originalCanvas, srcX - viewW/2, srcY - viewH/2, viewW, viewH, 0, 0, w, h);

        loupeCtx.filter = "none";
        loupeCtx.strokeStyle = "var(--accent)";
        loupeCtx.lineWidth = 2;
        loupeCtx.beginPath();
        loupeCtx.moveTo(w/2, 0); loupeCtx.lineTo(w/2, h);
        loupeCtx.moveTo(0, h/2); loupeCtx.lineTo(w, h/2);
        loupeCtx.stroke();
      }

      function updateSliderFill(el) {
        const percent = ((el.value - el.min) / (el.max - el.min)) * 100;
        el.style.setProperty('--percent', `${percent}%`);
      }
      updateSliderFill(contrastSlider);

      function applyLiveFilter() {
        const contrast = contrastSlider.value;
        let filter = `contrast(${contrast}%)`;
        if (!isColor) filter += ` grayscale(100%)`;
        displayCanvasEl.style.filter = filter;
        updateSliderFill(contrastSlider);
      }

      function resetHandles() {
        const pos = [
          { left: '0%', top: '0%' },
          { left: '100%', top: '0%' },
          { left: '100%', top: '100%' },
          { left: '0%', top: '100%' }
        ];
        handles.forEach((h, i) => {
          h.style.left = pos[i].left;
          h.style.top = pos[i].top;
          h.dataset.lastMoved = 0;
        });
        moveCounter = 0;
        updateCropPath();
      }

      function updateDisplay() {
        const maxW = 800;
        const displayW = originalCanvas.width > maxW ? maxW : originalCanvas.width;
        const displayH = (originalCanvas.height / originalCanvas.width) * displayW;

        displayCanvasEl.width = displayW;
        displayCanvasEl.height = displayH;
        displayCanvasEl.getContext("2d").drawImage(originalCanvas, 0, 0, displayW, displayH);

        applyLiveFilter();
        updateCropPath();
      }

      function setLoadedState(loaded) {
        isLoaded = loaded;
        
        actionBtns.forEach(btn => btn.disabled = !loaded);
        $("sk-color-label").style.opacity = loaded ? "1" : "0.4";
        
        if (loaded) {
          pickBtn.style.display = "none";
          canvasContainer.style.display = "block";
          handles.forEach(h => h.style.display = "block");
          cropArea.style.display = "block";
          updateCropPath();
        } else {
          pickBtn.style.display = "flex";
          canvasContainer.style.display = "none";
          handles.forEach(h => h.style.display = "none");
          cropArea.style.display = "none";
          loupe.style.display = "none";
        }
      }

      pickBtn.addEventListener("click", () => fileInput.click(), { signal });
      changeBtn.addEventListener("click", () => fileInput.click(), { signal });

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        originalFileName = file.name.replace(/\.[^.]+$/, "");
        pdfNameInput.value = originalFileName;

        Hub.haptic('light');
        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            const ctx = originalCanvas.getContext("2d");
            
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, originalCanvas.width, originalCanvas.height);
            ctx.drawImage(img, 0, 0);

            updateDisplay();
            resetHandles();
            setLoadedState(true);
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = ""; 
      }, { signal });

      contrastSlider.addEventListener("input", applyLiveFilter, { signal });

      $("sk-reset-contrast").addEventListener("click", () => {
        Hub.haptic('light');
        contrastSlider.value = 100;
        applyLiveFilter();
      }, { signal });

      colorToggle.addEventListener("change", (e) => {
        Hub.haptic('light');
        isColor = !e.target.checked;
        applyLiveFilter();
      }, { signal });

      rotateBtn.addEventListener("click", () => {
        if (!isLoaded) return;
        Hub.haptic('medium');
        
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = originalCanvas.height;
        tempCanvas.height = originalCanvas.width;
        const tempCtx = tempCanvas.getContext("2d");
        
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(Math.PI / 2);
        tempCtx.drawImage(originalCanvas, -originalCanvas.width / 2, -originalCanvas.height / 2);
        
        originalCanvas.width = tempCanvas.width;
        originalCanvas.height = tempCanvas.height;
        originalCanvas.getContext("2d").drawImage(tempCanvas, 0, 0);
        
        updateDisplay();
        resetHandles();
      }, { signal });

      resetBtn.addEventListener("click", () => {
        Hub.haptic('medium');
        resetHandles();
      }, { signal });

      displayCanvasEl.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        
        const rect = displayCanvasEl.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        let closestHandle = null;
        let minDist = Infinity;
        let maxLastMoved = -1;

        handles.forEach(h => {
          const hx = parseFloat(h.style.left) / 100 * rect.width;
          const hy = parseFloat(h.style.top) / 100 * rect.height;
          const dist = Math.hypot(touchX - hx, touchY - hy);
          
          if (dist < minDist) {
            minDist = dist;
            closestHandle = h;
            maxLastMoved = parseFloat(h.dataset.lastMoved || 0);
          } else if (Math.abs(dist - minDist) < 1) {
            const lastMoved = parseFloat(h.dataset.lastMoved || 0);
            if (lastMoved > maxLastMoved) {
              closestHandle = h;
              maxLastMoved = lastMoved;
            }
          }
        });

        if (closestHandle && minDist < 120) {
          activeHandle = closestHandle;
          activeHandle.dataset.lastMoved = ++moveCounter;
          
          dragStartHandleX = parseFloat(activeHandle.style.left) / 100 * rect.width;
          dragStartHandleY = parseFloat(activeHandle.style.top) / 100 * rect.height;
          
          dragStartTouchX = touchX;
          dragStartTouchY = touchY;
          
          displayCanvasEl.setPointerCapture(e.pointerId);
          Hub.haptic('light');

          // Lupa w przeciwnym rogu
          const id = activeHandle.dataset.id;
          if (id === "0") { loupe.style.left = "85%"; loupe.style.top = "85%"; }
          if (id === "1") { loupe.style.left = "15%"; loupe.style.top = "85%"; }
          if (id === "2") { loupe.style.left = "15%"; loupe.style.top = "15%"; }
          if (id === "3") { loupe.style.left = "85%"; loupe.style.top = "15%"; }
          
          loupe.style.display = "block";
          updateLoupe();
        }
      }, { signal });

      displayCanvasEl.addEventListener("pointermove", (e) => {
        if (!activeHandle) return;
        e.preventDefault();
        
        const rect = displayCanvasEl.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        const deltaX = (touchX - dragStartTouchX) / 3;
        const deltaY = (touchY - dragStartTouchY) / 3;

        let x = dragStartHandleX + deltaX;
        let y = dragStartHandleY + deltaY;

        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));

        activeHandle.style.left = (x / rect.width * 100) + "%";
        activeHandle.style.top = (y / rect.height * 100) + "%";
        
        updateCropPath();
        updateLoupe();
      }, { signal });

      displayCanvasEl.addEventListener("pointerup", (e) => {
        if (activeHandle) {
          displayCanvasEl.releasePointerCapture(e.pointerId);
          activeHandle = null;
          loupe.style.display = "none";
        }
      }, { signal });

      pdfBtn.addEventListener("click", () => {
        if (!isLoaded) return;
        
        const points = [];
        handles.forEach(h => {
          const hx = parseFloat(h.style.left) / 100;
          const hy = parseFloat(h.style.top) / 100;
          points.push([hx * originalCanvas.width, hy * originalCanvas.height]);
        });

        pdfBtn.disabled = true;
        pdfBtn.textContent = "Przetwarzanie...";
        Hub.haptic('medium');

        setTimeout(() => {
          try {
            const outW = 1000;
            const outH = 1414;
            
            const outCanvas = document.createElement("canvas");
            outCanvas.width = outW;
            outCanvas.height = outH;
            const outCtx = outCanvas.getContext("2d");
            
            outCtx.fillStyle = "#ffffff";
            outCtx.fillRect(0, 0, outW, outH);
            
            // NAKŁADANIE FILTRA PRZEGLĄDARKI NA UKRYTE PŁÓTNO
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = originalCanvas.width;
            tempCanvas.height = originalCanvas.height;
            const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
            
            let cssFilter = `contrast(${contrastSlider.value}%)`;
            if (!isColor) cssFilter += ` grayscale(100%)`;
            tempCtx.filter = cssFilter;
            tempCtx.drawImage(originalCanvas, 0, 0);
            
            const isDefaultCorners = points.every(p => p[0] === 0 || p[0] === originalCanvas.width) && points.some(p => p[0] === originalCanvas.width);
            
            if (isDefaultCorners) {
               outCtx.drawImage(tempCanvas, 0, 0, outW, outH);
            } else {
               const srcData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
               const outImgData = outCtx.createImageData(outW, outH);
               const outData = outImgData.data;

               const src = points;
               const dst = [[0,0], [outW,0], [outW,outH], [0,outH]];
               const H = solveHomography(dst, src);

               for (let y = 0; y < outH; y++) {
                 for (let x = 0; x < outW; x++) {
                   const w = H[6]*x + H[7]*y + 1;
                   const srcX = Math.round((H[0]*x + H[1]*y + H[2]) / w);
                   const srcY = Math.round((H[3]*x + H[4]*y + H[5]) / w);

                   const dstIdx = (y * outW + x) * 4;

                   if (srcX >= 0 && srcX < tempCanvas.width && srcY >= 0 && srcY < tempCanvas.height) {
                     const srcIdx = (srcY * tempCanvas.width + srcX) * 4;
                     outData[dstIdx] = srcData[srcIdx];
                     outData[dstIdx+1] = srcData[srcIdx+1];
                     outData[dstIdx+2] = srcData[srcIdx+2];
                     outData[dstIdx+3] = 255;
                   } else {
                     outData[dstIdx] = 255;
                     outData[dstIdx+1] = 255;
                     outData[dstIdx+2] = 255;
                     outData[dstIdx+3] = 255;
                   }
                 }
               }
               outCtx.putImageData(outImgData, 0, 0);
            }

            const jpegUrl = outCanvas.toDataURL("image/jpeg", 0.95);
            const pdfBlob = generatePDF(jpegUrl, outW, outH);
            
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement("a");
            a.href = url;
            
            let finalName = pdfNameInput.value.trim();
            if (!finalName) finalName = originalFileName;
            a.download = finalName + ".pdf";
            
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            Hub.haptic('success');

          } catch(err) {
            showToast("Błąd: " + err.message);
          } finally {
            pdfBtn.disabled = false;
            pdfBtn.textContent = "Pobierz PDF";
          }
        }, 50);
      }, { signal });
    },
    unmount() {}
  });

  function solveHomography(src, dst) {
    const A = [];
    const B = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i];
      const [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u*x, -u*y]);
      B.push(u);
      A.push([0, 0, 0, x, y, 1, -v*x, -v*y]);
      B.push(v);
    }
    
    for (let i = 0; i < 8; i++) {
      let maxRow = i;
      for (let j = i + 1; j < 8; j++) {
        if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) maxRow = j;
      }
      const tempA = A[i]; A[i] = A[maxRow]; A[maxRow] = tempA;
      const tempB = B[i]; B[i] = B[maxRow]; B[maxRow] = tempB;

      for (let j = i + 1; j < 8; j++) {
        const f = A[j][i] / A[i][i];
        for (let k = i; k < 8; k++) A[j][k] -= f * A[i][k];
        B[j] -= f * B[i];
      }
    }
    
    const H = new Array(8);
    for (let i = 7; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < 8; j++) sum += A[i][j] * H[j];
      H[i] = (B[i] - sum) / A[i][i];
    }
    return H;
  }

  function generatePDF(jpegDataUrl, w, h) {
    const b64 = jpegDataUrl.split(',')[1];
    const bin = atob(b64);
    let hex = '';
    for (let i = 0; i < bin.length; i++) {
      hex += bin.charCodeAt(i).toString(16).padStart(2, '0');
    }
    hex += '>';

    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 5 0 R /Resources << /XObject << /Im1 4 0 R >> >> >>\nendobj\n`;
    const obj4 = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${hex.length} >>\nstream\n${hex}\nendstream\nendobj\n`;
    
    const contentStream = `q\n${w} 0 0 ${h} 0 0 cm\n/Im1 Do\nQ\n`;
    const obj5 = `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

    const pdfString = `%PDF-1.4\n${obj1}${obj2}${obj3}${obj4}${obj5}`;
    
    let offsets = [];
    offsets.push(pdfString.indexOf("1 0 obj"));
    offsets.push(pdfString.indexOf("2 0 obj"));
    offsets.push(pdfString.indexOf("3 0 obj"));
    offsets.push(pdfString.indexOf("4 0 obj"));
    offsets.push(pdfString.indexOf("5 0 obj"));

    let xref = `xref\n0 6\n0000000000 65535 f \n`;
    offsets.forEach(off => {
      xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
    });
    
    const startXref = pdfString.length;
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
    
    return new Blob([pdfString + xref + trailer], { type: 'application/pdf' });
  }
})();