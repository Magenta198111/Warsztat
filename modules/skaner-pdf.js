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

      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="sk-back" style="width:auto; padding:10px 16px; border-radius:14px; margin:0;">Wróć</button>
        </div>

        <div class="card" id="sk-start-card">
          <p style="color:var(--muted); font-size:14px; margin-bottom:16px;">Wybierz zdjęcie z galerii lub zrób nowe. Następnie przeciągnij fioletowe punkty na rogi dokumentu, aby go wyprostować.</p>
          <label>Zdjęcie dokumentu</label>
          <input type="file" id="sk-file" accept="image/*">
        </div>

        <div id="sk-editor" class="hidden">
          <div id="sk-wrapper" style="position:relative; margin:16px 0; touch-action:none;">
            <div style="overflow:hidden; border-radius:14px; border:1.5px solid var(--line); background:#000;">
              <canvas id="sk-display" style="display:block; width:100%; height:auto;"></canvas>
            </div>
            <div class="sk-handle" style="position:absolute; width:36px; height:36px; margin:-18px 0 0 -18px; background:rgba(123,144,255,0.8); border:2px solid #fff; border-radius:50%; z-index:10; touch-action:none; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></div>
            <div class="sk-handle" style="position:absolute; width:36px; height:36px; margin:-18px 0 0 -18px; background:rgba(123,144,255,0.8); border:2px solid #fff; border-radius:50%; z-index:10; touch-action:none; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></div>
            <div class="sk-handle" style="position:absolute; width:36px; height:36px; margin:-18px 0 0 -18px; background:rgba(123,144,255,0.8); border:2px solid #fff; border-radius:50%; z-index:10; touch-action:none; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></div>
            <div class="sk-handle" style="position:absolute; width:36px; height:36px; margin:-18px 0 0 -18px; background:rgba(123,144,255,0.8); border:2px solid #fff; border-radius:50%; z-index:10; touch-action:none; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></div>
          </div>
          
          <div class="card" style="margin-top:16px;">
            <label>Popraw kontrast (Skan)</label>
            <input type="range" id="sk-contrast" min="0" max="200" value="100">
            <button class="p" id="sk-pdf-btn">Zapisz jako PDF</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("sk-file");
      const editorDiv = $("sk-editor");
      const startCard = $("sk-start-card");
      const wrapperDiv = $("sk-wrapper");
      const displayCanvasEl = $("sk-display");
      const handles = wrapperDiv.querySelectorAll(".sk-handle");
      const contrastSlider = $("sk-contrast");
      const pdfBtn = $("sk-pdf-btn");

      $("sk-back").addEventListener("click", () => history.back(), { signal });

      let activeHandle = null;
      let scaleX = 1, scaleY = 1;

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            originalCanvas.getContext("2d").drawImage(img, 0, 0);

            const maxW = 800;
            const displayW = img.width > maxW ? maxW : img.width;
            const displayH = (img.height / img.width) * displayW;

            displayCanvasEl.width = displayW;
            displayCanvasEl.height = displayH;
            displayCanvasEl.getContext("2d").drawImage(img, 0, 0, displayW, displayH);

            scaleX = img.width / displayW;
            scaleY = img.height / displayH;

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

            startCard.classList.add("hidden");
            editorDiv.classList.remove("hidden");
            isLoaded = true;
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }, { signal });

      wrapperDiv.addEventListener("pointerdown", (e) => {
        if (e.target.classList.contains("sk-handle")) {
          activeHandle = e.target;
          activeHandle.setPointerCapture(e.pointerId);
        }
      }, { signal });

      wrapperDiv.addEventListener("pointermove", (e) => {
        if (!activeHandle) return;
        const rect = displayCanvasEl.getBoundingClientRect();
        
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));

        activeHandle.style.left = (x / rect.width * 100) + "%";
        activeHandle.style.top = (y / rect.height * 100) + "%";
      }, { signal });

      wrapperDiv.addEventListener("pointerup", (e) => {
        if (activeHandle) {
          activeHandle.releasePointerCapture(e.pointerId);
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

            const contrast = parseFloat(contrastSlider.value) / 100;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

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

                  let gray = 0.299*r + 0.587*g + 0.114*b;
                  gray = factor * (gray - 128) + 128;
                  gray = Math.max(0, Math.min(255, gray));

                  outData[dstIdx] = gray;
                  outData[dstIdx+1] = gray;
                  outData[dstIdx+2] = gray;
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
            pdfBtn.textContent = "Zapisz jako PDF";
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