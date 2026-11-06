(() => {
  Hub.register({
    id: "kreator-faktur",
    title: "Kreator Faktur",
    desc: "Twórz profesjonalne faktury PDF z polskimi znakami",

    async mount(container, signal) {
      let savedSeller = await Hub.db.get("invoice_seller", { name: "", nip: "", address: "" });
      
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const paymentDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      
      let items = [{ name: "Usługa programistyczna", qty: 1, price: 100, vat: 23 }];
      let isGenerating = false;
      let lastGeneratedBlob = null;
      let lastGeneratedFilename = "";

      container.innerHTML = `
        <style>
          .inv-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px; margin-top: 12px; }
          .inv-input {
            width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--line);
            color: var(--ink); font-size: 15px; padding: 6px 0; outline: none;
            transition: border-color 0.2s; font-family: inherit; box-sizing: border-box;
          }
          .inv-input:focus { border-bottom-color: var(--accent); }
          .inv-input::placeholder { color: var(--line); font-size: 14px; }
          
          .inv-section { margin-bottom: 24px; }
          .inv-section-title {
            font-size: 12px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.5px; color: var(--accent);
            padding-bottom: 8px; border-bottom: 1px solid var(--line); margin-bottom: 4px;
          }
          
          .inv-row { display: flex; gap: 12px; align-items: flex-end; }
          .inv-row > div { flex: 1; }

          .inv-item {
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 8px; padding: 12px; margin-bottom: 10px;
            position: relative;
          }
          .inv-item-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 8px;
          }
          .inv-item-num { font-size: 12px; font-weight: 600; color: var(--accent); text-transform: uppercase; }
          .inv-item-remove {
            background: transparent; border: none; color: var(--danger); cursor: pointer;
            padding: 4px; border-radius: 4px;
          }
          .inv-item-remove:active { background: rgba(239, 68, 68, 0.1); }
          
          .inv-item-grid {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
          }
          .inv-item-grid .full { grid-column: span 3; }
          
          .inv-add-btn {
            width: 100%; padding: 12px; background: transparent; border: 1px dashed var(--line);
            border-radius: 8px; color: var(--muted); font-size: 14px; font-weight: 500;
            cursor: pointer; transition: all 0.2s; font-family: inherit;
          }
          .inv-add-btn:active { background: var(--surface); color: var(--accent); border-color: var(--accent); }
          
          .inv-total-box {
            background: var(--surface); border: 1px solid var(--accent);
            border-radius: 8px; padding: 16px; margin-top: 16px;
          }
          .inv-total-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 6px 0; font-size: 15px;
          }
          .inv-total-row.grand {
            border-top: 1px solid var(--line); margin-top: 8px; padding-top: 12px;
            font-size: 18px; font-weight: 700; color: var(--accent);
          }
          .inv-total-row span:first-child { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.3px; }
          .inv-total-row.grand span:first-child { color: var(--ink); font-size: 14px; }
          
          .inv-generate-btn {
            width: 100%; padding: 16px; margin-top: 24px; margin-bottom: 40px;
            font-size: 15px;
          }
          
          .inv-warning {
            display: flex; align-items: flex-start; gap: 10px;
            background: rgba(129, 140, 248, 0.08); border: 1px solid rgba(129, 140, 248, 0.3);
            border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;
            font-size: 12px; color: #a5b4fc; line-height: 1.5;
          }
          .inv-warning svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <div class="inv-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <div>Faktura ma pełne wsparcie polskich znaków. Dane sprzedawcy zapisują się automatycznie, więc przy kolejnej fakturze nie musisz ich wpisywać ponownie.</div>
          </div>

          <div class="inv-section">
            <div class="inv-section-title">Sprzedawca</div>
            <label class="inv-label">Nazwa / Imię i nazwisko</label>
            <input type="text" id="seller-name" class="inv-input" placeholder="np. Jan Kowalski / Firma XYZ" value="${savedSeller.name || ''}">
            <div class="inv-row">
              <div>
                <label class="inv-label">NIP</label>
                <input type="text" id="seller-nip" class="inv-input" placeholder="np. 1234567890" value="${savedSeller.nip || ''}">
              </div>
              <div>
                <label class="inv-label">Adres</label>
                <input type="text" id="seller-address" class="inv-input" placeholder="ul. Przykładowa 1, 00-000 Miasto" value="${savedSeller.address || ''}">
              </div>
            </div>
          </div>

          <div class="inv-section">
            <div class="inv-section-title">Nabywca</div>
            <label class="inv-label">Nazwa / Imię i nazwisko</label>
            <input type="text" id="buyer-name" class="inv-input" placeholder="np. Firma ABC Sp. z o.o.">
            <div class="inv-row">
              <div>
                <label class="inv-label">NIP</label>
                <input type="text" id="buyer-nip" class="inv-input" placeholder="np. 9876543210">
              </div>
              <div>
                <label class="inv-label">Adres</label>
                <input type="text" id="buyer-address" class="inv-input" placeholder="ul. Inna 2, 11-111 Miasto">
              </div>
            </div>
          </div>

          <div class="inv-section">
            <div class="inv-section-title">Dane faktury</div>
            <label class="inv-label">Numer faktury</label>
            <input type="text" id="invoice-number" class="inv-input" value="F/${today.getFullYear()}/${String(today.getMonth()+1).padStart(2,'0')}/001">
            <div class="inv-row">
              <div>
                <label class="inv-label">Data wystawienia</label>
                <input type="date" id="invoice-date" class="inv-input" value="${todayStr}">
              </div>
              <div>
                <label class="inv-label">Termin płatności</label>
                <input type="date" id="invoice-due" class="inv-input" value="${paymentDate}">
              </div>
            </div>
            <label class="inv-label">Metoda płatności</label>
            <input type="text" id="payment-method" class="inv-input" value="Przelew bankowy">
          </div>

          <div class="inv-section">
            <div class="inv-section-title">Pozycje na fakturze</div>
            <div id="items-list"></div>
            <button id="add-item-btn" class="inv-add-btn">+ Dodaj pozycję</button>
          </div>

          <div class="inv-total-box">
            <div class="inv-total-row"><span>Razem netto</span><span id="total-net">0,00 zł</span></div>
            <div class="inv-total-row"><span>Kwota VAT</span><span id="total-vat">0,00 zł</span></div>
            <div class="inv-total-row grand"><span>Razem brutto</span><span id="total-gross">0,00 zł</span></div>
          </div>

          <button id="generate-btn" class="n-btn n-btn-outline inv-generate-btn">Podgląd faktury</button>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);

      function formatMoney(n) {
        return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł';
      }

      function renderItems() {
        const list = $("items-list");
        list.innerHTML = "";
        items.forEach((item, i) => {
          const el = document.createElement("div");
          el.className = "inv-item";
          el.innerHTML = `
            <div class="inv-item-header">
              <span class="inv-item-num">Pozycja ${i + 1}</span>
              ${items.length > 1 ? `<button class="inv-item-remove" data-idx="${i}">✕ Usuń</button>` : ''}
            </div>
            <div class="inv-item-grid">
              <div class="full">
                <label class="inv-label">Nazwa towaru / usługi</label>
                <input type="text" class="inv-input item-name" data-idx="${i}" value="${item.name}" placeholder="np. Projekt graficzny">
              </div>
              <div>
                <label class="inv-label">Ilość</label>
                <input type="number" step="0.01" min="0" class="inv-input item-qty" data-idx="${i}" value="${item.qty}">
              </div>
              <div>
                <label class="inv-label">Cena netto</label>
                <input type="number" step="0.01" min="0" class="inv-input item-price" data-idx="${i}" value="${item.price}">
              </div>
              <div>
                <label class="inv-label">VAT %</label>
                <input type="number" step="1" min="0" max="100" class="inv-input item-vat" data-idx="${i}" value="${item.vat}">
              </div>
            </div>
          `;
          list.appendChild(el);
        });

        container.querySelectorAll(".item-name").forEach(el => {
          el.oninput = (e) => { items[e.target.dataset.idx].name = e.target.value; };
        });
        container.querySelectorAll(".item-qty").forEach(el => {
          el.oninput = (e) => { items[e.target.dataset.idx].qty = parseFloat(e.target.value) || 0; calculateTotals(); };
        });
        container.querySelectorAll(".item-price").forEach(el => {
          el.oninput = (e) => { items[e.target.dataset.idx].price = parseFloat(e.target.value) || 0; calculateTotals(); };
        });
        container.querySelectorAll(".item-vat").forEach(el => {
          el.oninput = (e) => { items[e.target.dataset.idx].vat = parseFloat(e.target.value) || 0; calculateTotals(); };
        });
        container.querySelectorAll(".inv-item-remove").forEach(el => {
          el.onclick = (e) => {
            Hub.haptic('light');
            items.splice(parseInt(e.target.dataset.idx), 1);
            renderItems();
            calculateTotals();
          };
        });
      }

      function calculateTotals() {
        let totalNet = 0, totalVat = 0;
        items.forEach(item => {
          const net = item.qty * item.price;
          const vat = net * item.vat / 100;
          totalNet += net;
          totalVat += vat;
        });
        $("total-net").textContent = formatMoney(totalNet);
        $("total-vat").textContent = formatMoney(totalVat);
        $("total-gross").textContent = formatMoney(totalNet + totalVat);
      }

      $("add-item-btn").onclick = () => {
        Hub.haptic('light');
        items.push({ name: "", qty: 1, price: 0, vat: 23 });
        renderItems();
      };

      renderItems();
      calculateTotals();

      const polishMap = {
        'Ą': 0xA5, 'Ć': 0xC6, 'Ę': 0xCA, 'Ł': 0xA3, 'Ń': 0xD1, 'Ó': 0xD3, 'Ś': 0x8C, 'Ź': 0x8F, 'Ż': 0xAF,
        'ą': 0xB9, 'ć': 0xE6, 'ę': 0xEA, 'ł': 0xB3, 'ń': 0xF1, 'ó': 0xF3, 'ś': 0x9C, 'ź': 0x9F, 'ż': 0xBF
      };

      function encodeText(text) {
        const bytes = [];
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (polishMap[ch] !== undefined) {
            bytes.push(polishMap[ch]);
          } else {
            const code = ch.charCodeAt(0);
            if (code < 256) bytes.push(code);
            else bytes.push(63);
          }
        }
        return bytes;
      }

      function numberToWords(num) {
        if (num === 0) return 'zero';
        const ones = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
        const teens = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
        const tens = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
        const hundreds = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];
        
        function seg(n) {
          const parts = [];
          const h = Math.floor(n / 100);
          if (h) parts.push(hundreds[h]);
          const t = Math.floor((n % 100) / 10);
          const o = n % 10;
          if (t === 1) parts.push(teens[o]);
          else {
            if (t) parts.push(tens[t]);
            if (o) parts.push(ones[o]);
          }
          return parts.join(' ');
        }
        
        const groups = [];
        let n = Math.floor(num);
        for (let i = 0; i < 4; i++) { groups.push(n % 1000); n = Math.floor(n / 1000); }
        
        const gNames = [
          ['', '', ''],
          ['tysiąc', 'tysiące', 'tysięcy'],
          ['milion', 'miliony', 'milionów'],
          ['miliard', 'miliardy', 'miliardów']
        ];
        
        const result = [];
        for (let i = groups.length - 1; i >= 0; i--) {
          const g = groups[i];
          if (g === 0) continue;
          const s = seg(g);
          let name = '';
          if (i > 0) {
            if (g === 1) name = gNames[i][0];
            else if (g % 10 >= 2 && g % 10 <= 4 && (g % 100 < 10 || g % 100 >= 20)) name = gNames[i][1];
            else name = gNames[i][2];
          }
          result.push(s + (name ? ' ' + name : ''));
        }
        return result.join(' ');
      }

      function getForm(n, forms) {
        if (n === 1) return forms[0];
        const lastTwo = n % 100;
        if (lastTwo >= 12 && lastTwo <= 14) return forms[2];
        const last = n % 10;
        if (last >= 2 && last <= 4) return forms[1];
        return forms[2];
      }

      function amountInWords(amount) {
        const intPart = Math.floor(amount);
        const decPart = Math.round((amount - intPart) * 100);
        const zlotyForm = getForm(intPart, ['złoty', 'złote', 'złotych']);
        const groszForm = getForm(decPart, ['grosz', 'grosze', 'groszy']);
        return `${numberToWords(intPart)} ${zlotyForm} ${String(decPart).padStart(2, '0')}/100 ${groszForm}`;
      }

      async function previewPDF() {
        if (isGenerating) return;
        isGenerating = true;
        
        const btn = $("generate-btn");
        btn.disabled = true;
        btn.textContent = "Generowanie podglądu...";
        Hub.haptic('medium');

        // Zapisujemy dane sprzedawcy
        const sellerData = {
          name: $("seller-name").value,
          nip: $("seller-nip").value,
          address: $("seller-address").value
        };
        await Hub.db.set("invoice_seller", sellerData);

        const buyerData = {
          name: $("buyer-name").value || 'Nabywca',
          nip: $("buyer-nip").value,
          address: $("buyer-address").value
        };
        
        const invoiceNum = $("invoice-number").value || 'F/2024/001';
        const invDate = $("invoice-date").value;
        const dueDate = $("invoice-due").value;
        const payMethod = $("payment-method").value;

        let totalNet = 0, totalVat = 0;
        items.forEach(item => {
          const net = item.qty * item.price;
          const vat = net * item.vat / 100;
          totalNet += net;
          totalVat += vat;
        });
        const totalGross = totalNet + totalVat;

        // === BUDOWA PDF ===
        const pdfChunks = [];
        let currentOffset = 0;
        let offsets = [];
        let objectId = 1;

        function pushBytes(bytes) {
          pdfChunks.push(bytes);
          currentOffset += bytes.length;
        }

        function pushStr(str) {
          const bytes = new Uint8Array(str.length);
          for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
          pushBytes(bytes);
        }

        const contentBytes = [];
        function pushContentBytes(bytes) { for (let b of bytes) contentBytes.push(b); }
        function pushContentStr(str) { for (let i = 0; i < str.length; i++) contentBytes.push(str.charCodeAt(i)); }

        function addText(x, y, text, font = 'F1', size = 10) {
          pushContentStr(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (`);
          const encoded = encodeText(text);
          for (let b of encoded) {
            if (b === 40 || b === 41 || b === 92) pushContentBytes([92]);
            pushContentBytes([b]);
          }
          pushContentStr(`) Tj ET\n`);
        }

        function addTextRight(xRight, y, text, font = 'F1', size = 10) {
          const estWidth = text.length * size * 0.55;
          addText(xRight - estWidth, y, text, font, size);
        }

        function addLine(x1, y1, x2, y2) {
          pushContentStr(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`);
        }

        // --- LAYOUT A4: 595 x 842 ---
        const W = 595, H = 842, M = 40;
        let y = H - 60;

        addText(M, y, 'FAKTURA VAT', 'F2', 22);
        addTextRight(W - M, y, `nr ${invoiceNum}`, 'F1', 12);
        y -= 20;
        addText(M, y, `Data wystawienia: ${formatDate(invDate)}`, 'F1', 9);
        addTextRight(W - M, y, `Termin płatności: ${formatDate(dueDate)}`, 'F1', 9);
        y -= 15;
        addText(M, y, `Metoda płatności: ${payMethod}`, 'F1', 9);
        y -= 10;
        addLine(M, y, W - M, y);
        y -= 25;

        const colW = (W - 2 * M) / 2 - 10;
        const colL = M;
        const colR = M + colW + 20;

        addText(colL, y, 'SPRZEDAWCA', 'F2', 10);
        addText(colR, y, 'NABYWCA', 'F2', 10);
        y -= 15;
        addText(colL, y, sellerData.name || '-', 'F1', 10);
        addText(colR, y, buyerData.name || '-', 'F1', 10);
        y -= 14;
        if (sellerData.nip) addText(colL, y, `NIP: ${sellerData.nip}`, 'F1', 9);
        if (buyerData.nip) addText(colR, y, `NIP: ${buyerData.nip}`, 'F1', 9);
        y -= 14;
        addText(colL, y, (sellerData.address || '-').substring(0, 35), 'F1', 9);
        addText(colR, y, (buyerData.address || '-').substring(0, 35), 'F1', 9);
        y -= 25;
        addLine(M, y, W - M, y);
        y -= 20;

        addText(M, y, 'Lp.', 'F2', 8);
        addText(M + 25, y, 'Nazwa towaru / usługi', 'F2', 8);
        addTextRight(M + 330, y, 'Ilość', 'F2', 8);
        addTextRight(M + 390, y, 'Cena netto', 'F2', 8);
        addTextRight(M + 440, y, 'VAT', 'F2', 8);
        addTextRight(M + 490, y, 'Netto', 'F2', 8);
        addTextRight(W - M, y, 'Brutto', 'F2', 8);
        y -= 8;
        addLine(M, y, W - M, y);
        y -= 15;

        items.forEach((item, idx) => {
          if (y < 200) return;
          const net = item.qty * item.price;
          const vat = net * item.vat / 100;
          const gross = net + vat;
          addText(M, y, String(idx + 1), 'F1', 9);
          addText(M + 25, y, item.name.substring(0, 45) || '-', 'F1', 9);
          addTextRight(M + 330, y, `${item.qty}`, 'F1', 9);
          addTextRight(M + 390, y, `${item.price.toFixed(2)}`, 'F1', 9);
          addTextRight(M + 440, y, `${item.vat}%`, 'F1', 9);
          addTextRight(M + 490, y, formatMoneyPlain(net), 'F1', 9);
          addTextRight(W - M, y, formatMoneyPlain(gross), 'F1', 9);
          y -= 15;
        });

        y -= 5;
        addLine(M, y, W - M, y);
        y -= 18;
        addTextRight(W - M - 150, y, 'Razem netto:', 'F1', 10);
        addTextRight(W - M, y, formatMoneyPlain(totalNet) + ' zł', 'F2', 10);
        y -= 15;
        addTextRight(W - M - 150, y, 'Kwota VAT:', 'F1', 10);
        addTextRight(W - M, y, formatMoneyPlain(totalVat) + ' zł', 'F1', 10);
        y -= 15;
        addTextRight(W - M - 150, y, 'RAZEM BRUTTO:', 'F2', 11);
        addTextRight(W - M, y, formatMoneyPlain(totalGross) + ' zł', 'F2', 11);
        y -= 30;
        addLine(M, y, W - M, y);
        y -= 20;

        addText(M, y, 'Kwota słownie:', 'F2', 9);
        y -= 14;
        const words = amountInWords(totalGross);
        const wordsLines = words.match(/.{1,80}(\s|$)/g) || [words];
        wordsLines.forEach(line => {
          addText(M, y, line.trim(), 'F1', 9);
          y -= 12;
        });

        y = 80;
        addLine(M, y, W - M, y);
        y -= 15;
        addText(M, y, 'Dokument wygenerowany w aplikacji Workspace', 'F1', 8);
        addTextRight(W - M, y, 'Dziękujemy za zaufanie!', 'F1', 8);

        const contentStream = new Uint8Array(contentBytes);
        
        pushStr("%PDF-1.4\n");

        offsets.push(currentOffset);
        pushStr(`${objectId} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
        objectId++;

        offsets.push(currentOffset);
        pushStr(`${objectId} 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
        objectId++;

        offsets.push(currentOffset);
        pushStr(`${objectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`);
        objectId++;

        offsets.push(currentOffset);
        pushStr(`${objectId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n`);
        pushBytes(contentStream);
        pushStr(`\nendstream\nendobj\n`);
        objectId++;

        const diffStr = '[140 /Sacute 143 /Zacute 156 /sacute 159 /zacute 163 /Lslash 165 /Aogonek 175 /Zdotaccent 179 /lslash 185 /aogonek 191 /zdotaccent 198 /Cacute 202 /Eogonek 209 /Nacute 230 /cacute 234 /eogonek 241 /nacute]';
        
        offsets.push(currentOffset);
        pushStr(`${objectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${diffStr} >> >>\nendobj\n`);
        objectId++;

        offsets.push(currentOffset);
        pushStr(`${objectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${diffStr} >> >>\nendobj\n`);
        objectId++;

        const startXref = currentOffset;
        let xref = `xref\n0 ${objectId}\n0000000000 65535 f \n`;
        offsets.forEach(off => {
          xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
        });
        const trailer = `trailer\n<< /Size ${objectId} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
        pushStr(xref + trailer);

        const finalBlob = new Blob(pdfChunks, { type: 'application/pdf' });
        lastGeneratedBlob = finalBlob;
        lastGeneratedFilename = `faktura_${invoiceNum.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        
        const url = URL.createObjectURL(finalBlob);
        
        const modalContent = `
          <div style="width: 100%; height: 80vh; max-height: 700px; display: flex; flex-direction: column; gap: 12px;">
            <div style="flex: 1; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid var(--line);">
              <iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
            <div style="font-size: 11px; color: var(--muted); text-align: center; line-height: 1.4;">
              Jeśli podgląd się nie wyświetla (np. w Chrome na Androidzie), po prostu kliknij "Pobierz PDF".
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="modal-cancel-btn" class="n-btn" style="flex: 1;">Anuluj</button>
              <button id="modal-download-btn" class="n-btn n-btn-outline" style="flex: 2;">Pobierz PDF</button>
            </div>
          </div>
        `;
        
        const modal = Hub.showModal({ content: modalContent });
        
        const originalClose = modal.close;
        modal.close = () => {
          URL.revokeObjectURL(url);
          originalClose();
        };
        
        modal.element.querySelector('#modal-cancel-btn').onclick = () => {
          Hub.haptic('light');
          modal.close();
        };
        
        modal.element.querySelector('#modal-download-btn').onclick = () => {
          Hub.haptic('success');
          Hub.download(lastGeneratedBlob, lastGeneratedFilename);
          modal.close();
        };
        
        btn.disabled = false;
        btn.textContent = "Podgląd faktury";
        isGenerating = false;
      }

      function formatDate(d) {
        if (!d) return '-';
        const parts = d.split('-');
        if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
        return d;
      }

      function formatMoneyPlain(n) {
        return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      }

      $("generate-btn").onclick = previewPDF;
    },

    unmount() {}
  });
})();