(() => {
  Hub.register({
    id: "skaner-pdf",
    title: "Skaner do PDF",
    icon: "📄",
    desc: "Skanowanie dokumentów z prostowaniem perspektywy i PDF",
    
    async mount(container, signal) {
      let img = new Image();
      let originalCanvas = document.createElement("canvas");
      let displayCanvas = document.createElement("canvas");
      let isLoaded = false;
      let isColor = true;

      container.innerHTML = `
        <style>
          .sk-handle {
            position: absolute;
            width: 26px; height: 26px;
            margin: -13px 0 0 -13px;
            z-index: 10;
            pointer-events: none;
            touch-action: none;
            opacity: 0.5;
          }
          .sk-handle::before, .sk-handle::after {
            content: '';
            position: absolute;
            background-color: #ff3b30;
            box-shadow: 0 0 3px rgba(0,0,0,0.8);
          }
          .sk-handle::before {
            top: 50%; left: 0; width: 100%; height: 2px;
            transform: translateY(-50%);
          }
          .sk-handle::after {
            left: 50%; top: 0; width: 2px; height: 100%;
            transform: translateX(-50%);
          }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="sk-back" style="width:auto; padding:10px 16px; border-radius:14px; margin:0;">Wróć</button>
        </div>

        <div class="card" id="sk-start-card">
          <p style="color:var(--muted); font-size:14px; margin-bottom:16px;">Wybierz zdjęcie z galerii lub zrób nowe. Następnie przeciągnij czerwone krzyżyki na rogi dokumentu.</p>
          <input type="file" id="sk-file" accept="image/*" style="display:none;">
          <button id="sk-pick-btn" class="p" style="margin:0; display:flex; justify-content:center; align-items:center; gap:8px;">
            📁 Wybierz zdjęcie
          </button>
        </div>

        <div id="sk-editor" class="hidden">
          <div id="sk-wrapper" style="position:relative; margin:16px 0; touch-action:none;">
            <div style="overflow:hidden; border-radius:14px; border:1.5px solid var(--line); background:#000;">
              <canvas id="sk-display" style="display:block; width:100%; height:auto; transition: filter 0.1s;"></canvas>
            </div>
            <div class="sk-handle"></div>
            <div class="sk-handle"></div>
            <div class="sk-handle"></div>
            <div class="sk-handle"></div>
          </div>
          
          <div class="card" style="margin-top:16px;">
            <label>Popraw kontrast (Skan)</label>
            <input type="range" id="sk-contrast" min="0" max="200" value="100">
            
            <div style="display:flex; gap:10px; margin-top:14px;">
              <button id="sk-rotate-btn" style="flex:1; margin:0; padding:14px; background:var(--bg);">🔄 Obróć</button>
              <button id="sk-color-btn" style="flex:1; margin:0; padding:14px; background:var(--bg);">🎨 Kolor: TAK</button>
            </div>
            <button class="p" id="sk-pdf-btn" style="width:100%; margin-top:10px; padding:14px;">Zapisz PDF</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("sk-file");
      const pickBtn = $("sk-pick-btn");
      const editorDiv = $("sk-editor");
      const startCard = $("sk-start-card");
      const wrapperDiv = $("sk-wrapper");
      const displayCanvasEl = $("sk-display");
      const handles = wrapperDiv.querySelectorAll(".sk-handle");
      const contrastSlider = $("sk-contrast");
      const pdfBtn = $("sk-pdf-btn");
      const rotateBtn = $("sk-rotate-btn");
      const colorBtn = $("sk-color-btn");

      $("sk-back").addEventListener("click", () => history.back(), { signal });
      pickBtn.addEventListener("click", () => fileInput.click(), { signal });

      let activeHandle = null;
      let dragStartHandleX = 0, dragStartHandleY = 0;
      let dragStartTouchX = 0, dragStartTouchY = 0;

      function applyLiveFilter() {
        const contrast = contrastSlider.value;
        let filter = `contrast(${contrast}%)`;
        if (!isColor) filter += ` grayscale(100%)`;
        displayCanvasEl.style.filter = filter;
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
        });
      }

      function updateDisplay() {
        const maxW = 800;
        const displayW = originalCanvas.width > maxW ? maxW : originalCanvas.width;
        const displayH = (originalCanvas.height / originalCanvas.width) * displayW;

        displayCanvasEl.width = displayW;
        displayCanvasEl.height = displayH;
        displayCanvasEl.getContext("2d").drawImage(originalCanvas, 0, 0, displayW, displayH);

        applyLiveFilter();
      }

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            originalCanvas.getContext("2d").drawImage(img, 0, 0);

            updateDisplay();
            resetHandles();

            startCard.classList.add("hidden");
            editorDiv.classList.remove("hidden");
            isLoaded = true;
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }, { signal });

      contrastSlider.addEventListener("input", applyLiveFilter, { signal });

      colorBtn.addEventListener("click", () => {
        isColor = !isColor;
        colorBtn.textContent = isColor ? "🎨 Kolor: TAK" : "🎨 Kolor: NIE";
        applyLiveFilter();
      }, { signal });

      rotateBtn.addEventListener("click", () => {
        if (!isLoaded) return;
        
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

      wrapperDiv.addEventListener("pointerdown", (e) => {
        const rect = displayCanvasEl.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        let closestHandle = null;
        let minDist = Infinity;

        handles.forEach(h => {
          const hX = parseFloat(h.style.left) / 100 * rect.width;
          const hY = parseFloat(h.style.top) / 100 * rect.height;
          const dist = Math.hypot(touchX - hX, touchY - hY);
          if (dist < minDist) {
            minDist = dist;
            closestHandle = h;
          }
        });

        if (closestHandle && minDist < 120) {
          activeHandle = closestHandle;
          
          dragStartHandleX = parseFloat(activeHandle.style.left) / 100 * rect.width;
          dragStartHandleY = parseFloat(activeHandle.style.top) / 100 * rect.height;
          
          dragStartTouchX = touchX;
          dragStartTouchY = touchY;
          
          wrapperDiv.setPointerCapture(e.pointerId);
        }
      }, { signal });

      wrapperDiv.addEventListener("pointermove", (e) => {
        if (!activeHandle) return;
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
      }, { signal });

      wrapperDiv.addEventListener("pointerup", (e) => {
        if (activeHandle) {
          wrapperDiv.releasePointerCapture(e.pointerId);
          activeHandle = null;
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

        setTimeout(() => {
          try {
            const outW = 1000;
            const outH = 1414;
            
            const outCanvas = document.createElement("canvas");
            outCanvas.width = outW;
            outCanvas.height = outH;
            const outCtx = outCanvas.getContext("2d");
            const srcCtx = originalCanvas.getContext("2d");
            const srcData = srcCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height).data;
            const outImgData = outCtx.createImageData(outW, outH);
            const outData = outImgData.data;

            const src = points;
            const dst = [[0,0], [outW,0], [outW,outH], [0,outH]];
            const H = solveHomography(dst, src);

            const sliderVal = parseFloat(contrastSlider.value);
            const contrastValue = (sliderVal - 100) * 2.55;
            const factor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
            const isColorMode = isColor;

            for (let y = 0; y < outH; y++) {
              for (let x = 0; x < outW; x++) {
                const w = H[6]*x + H[7]*y + 1;
                const srcX = Math.round((H[0]*x + H[1]*y + H[2]) / w);
                const srcY = Math.round((H[3]*x + H[4]*y + H[5]) / w);

                if (srcX >= 0 && srcX < originalCanvas.width && srcY >= 0 && srcY < originalCanvas.height) {
                  const srcIdx = (srcY * originalCanvas.width + srcX) * 4;
                  const dstIdx = (y * outW + x) * 4;

                  let r = srcData[srcIdx];
                  let g = srcData[srcIdx+1];
                  let b = srcData[srcIdx+2];

                  if (!isColorMode) {
                    let gray = 0.299*r + 0.587*g + 0.114*b;
                    gray = factor * (gray - 128) + 128;
                    gray = Math.max(0, Math.min(255, gray));
                    outData[dstIdx] = gray;
                    outData[dstIdx+1] = gray;
                    outData[dstIdx+2] = gray;
                  } else {
                    r = factor * (r - 128) + 128;
                    g = factor * (g - 128) + 128;
                    b = factor * (b - 128) + 128;
                    outData[dstIdx] = Math.max(0, Math.min(255, r));
                    outData[dstIdx+1] = Math.max(0, Math.min(255, g));
                    outData[dstIdx+2] = Math.max(0, Math.min(255, b));
                  }
                  outData[dstIdx+3] = 255;
                }
              }
            }
            outCtx.putImageData(outImgData, 0, 0);

            const jpegUrl = outCanvas.toDataURL("image/jpeg", 0.8);
            const pdfBlob = generatePDF(jpegUrl, outW, outH);
            const url = URL.createObjectURL(pdfBlob);
            
            const a = document.createElement("a");
            a.href = url;
            a.download = "skan.pdf";
            a.click();
            
            setTimeout(() => URL.revokeObjectURL(url), 1000);

          } catch(err) {
            alert("Błąd: " + err.message);
          } finally {
            pdfBtn.disabled = false;
            pdfBtn.textContent = "Zapisz PDF";
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