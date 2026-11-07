(() => {
  Hub.register({
    id: "kreator-ofert",
    title: "Kreator Ofert",
    desc: "Twórz profesjonalne oferty handlowe i zapisuj je w PDF",

    async mount(container, signal) {
      // Ładowanie zapisanych danych
      let savedSeller = await Hub.db.get("offer_seller", { name: "", nip: "", address: "", email: "", phone: "", bank: "" });
      let savedClients = await Hub.db.get("offer_clients", []);
      let savedProducts = await Hub.db.get("offer_products", []);
      
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const validDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      
      let items = [{ name: "Usługa programistyczna", qty: 1, unit: "szt.", price: 100, vat: 23 }];
      let isGenerating = false;

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
          
          .inv-item-actions { display: flex; gap: 4px; align-items: center; }
          .inv-item-btn {
            background: transparent; border: none; color: var(--muted); cursor: pointer;
            padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
          }
          .inv-item-btn:hover { background: var(--surface-hover); color: var(--ink); }
          .inv-item-btn.danger { color: var(--danger); }
          .inv-item-btn svg { width: 16px; height: 16px; }
          
          .inv-item-grid {
            display: grid; grid-template-columns: 1fr 1fr 1.5fr 1fr; gap: 12px;
          }
          .inv-item-grid .full { grid-column: span 4; }
          
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

          .inv-trigger {
            display: flex; justify-content: space-between; align-items: center;
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 6px; padding: 12px 16px; color: var(--accent); font-size: 14px; font-weight: 600;
            cursor: pointer; user-select: none; transition: background 0.2s; margin-bottom: 16px;
          }
          .inv-trigger:active { background: var(--surface-hover); }
          .inv-trigger svg { width: 16px; height: 16px; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <div class="inv-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <div>Dokument ten nie jest fakturą VAT. Służy do przedstawienia oferty handlowej i nie wymaga systemu KSeF.</div>
          </div>

          <div class="inv-section">
            <div class="inv-section-title">Wystawiający (Twoja firma)</div>
            <label class="inv-label">Nazwa / Imię i nazwisko</label>
            <input type="text" id="seller-name" class="inv-input seller-field" placeholder="np. Jan Kowalski / Firma XYZ" value="${savedSeller.name || ''}">
            <div class="inv-row">
              <div>
                <label class="inv-label">NIP</label>
                <input type="text" id="seller-nip" class="inv-input seller-field" placeholder="np. 1234567890" value="${savedSeller.nip || ''}">
              </div>
              <div>
                <label class="inv-label">Adres (ulica, kod, miasto)</label>
                <input type="text" id="seller-address" class="inv-input seller-field" placeholder="ul. Przykładowa 1, 00-000 Miasto" value="${savedSeller.address || ''}">
              </div>
            </div>
            <div class="inv-row">
              <div>
                <label class="inv-label">E-mail</label>
                <input type="text" id="seller-email" class="inv-input seller-field" placeholder="np. kontakt@firma.pl" value="${savedSeller.email || ''}">
              </div>
              <div>
                <label class="inv-label">Numer telefonu</label>
                <input type="text" id="seller-phone" class="inv-input seller-field" placeholder="np. 123 456 789" value="${savedSeller.phone || ''}">
              </div>
            </div>
            <div style="margin-top: 4px;">
              <label class="inv-label">Numer konta (IBAN)</label>
              <input type="text" id="seller-bank" class="inv-input seller-field" placeholder="np. 12 1234 5678 9012 3456 7890 1234" value="${savedSeller.bank || ''}">
            </div>
          </div>

          <div class="inv-section">
            <div class="inv-section-title">Klient (Odbiorca oferty)</div>
            
            <div id="client-select-trigger" class="inv-trigger" style="display:none;">
              <span>Wczytaj z listy klientów</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>

            <label class="inv-label">Nazwa / Imię i nazwisko</label>
            <input type="text" id="buyer-name" class="inv-input" placeholder="np. Firma ABC Sp. z o.o.">
            <div class="inv-row">
              <div>
                <label class="inv-label">NIP</label>
                <input type="text" id="buyer-nip" class="inv-input" placeholder="np. 9876543210">
              </div>
              <div>
                <label class="inv-label">Adres (ulica, kod, miasto)</label>
                <input type="text" id="buyer-address" class="inv-input" placeholder="ul. Inna 2, 11-111 Miasto">
              </div>
            </div>
            <button id="save-client-btn" class="n-btn" style="width: 100%; padding: 10px; margin-top: 16px; font-size: 13px;">Zapisz klienta w bazie</button>
          </div>

          <div class="inv-section">
            <div class="inv-section-title">Dane oferty</div>
            <label class="inv-label">Numer oferty</label>
            <input type="text" id="offer-number" class="inv-input" value="O/${today.getFullYear()}/${String(today.getMonth()+1).padStart(2,'0')}/001">
            <div class="inv-row">
              <div>
                <label class="inv-label">Data wystawienia</label>
                <input type="date" id="offer-date" class="inv-input" value="${todayStr}">
              </div>
              <div>
                <label class="inv-label">Ważna do</label>
                <input type="date" id="offer-valid" class="inv-input" value="${validDate}">
              </div>
            </div>
            <div class="inv-row">
              <div>
                <label class="inv-label">Miejsce wystawienia</label>
                <input type="text" id="offer-place" class="inv-input" placeholder="np. Warszawa">
              </div>
              <div>
                <label class="inv-label">Warunki współpracy</label>
                <input type="text" id="payment-terms" class="inv-input" value="Płatność przelewem, 14 dni od akceptacji oferty">
              </div>
            </div>
          </div>

          <div class="inv-section">
            <div class="inv-section-title">Pozycje w ofercie</div>
            
            <div id="product-select-trigger" class="inv-trigger" style="display:none;">
              <span>Wczytaj z bazy produktów</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>

            <div id="items-list"></div>
            <button id="add-item-btn" class="inv-add-btn">+ Dodaj pozycję</button>
          </div>

          <div class="inv-total-box">
            <div class="inv-total-row"><span>Razem netto</span><span id="total-net">0,00 zł</span></div>
            <div class="inv-total-row"><span>Kwota VAT</span><span id="total-vat">0,00 zł</span></div>
            <div class="inv-total-row grand"><span>Razem brutto</span><span id="total-gross">0,00 zł</span></div>
          </div>

          <button id="generate-btn" class="n-btn n-btn-outline inv-generate-btn">Podgląd oferty</button>
        </div>
        
        <canvas id="invoice-canvas" style="display:none;"></canvas>
      `;

      const $ = id => container.querySelector("#" + id);

      // --- ZAPISYWANIE DANYCH WYSTAWCY (AUTO) ---
      const sellerFields = container.querySelectorAll(".seller-field");
      const saveSellerDebounced = Hub.debounce(() => {
        Hub.db.set("offer_seller", {
          name: $("seller-name").value,
          nip: $("seller-nip").value,
          address: $("seller-address").value,
          email: $("seller-email").value,
          phone: $("seller-phone").value,
          bank: $("seller-bank").value
        });
      }, 500);

      sellerFields.forEach(input => {
        input.addEventListener("input", saveSellerDebounced, { signal });
      });

      // --- BAZA KLIENTÓW ---
      const clientTrigger = $("client-select-trigger");
      
      function updateClientTrigger() {
        clientTrigger.style.display = savedClients.length > 0 ? "flex" : "none";
      }
      updateClientTrigger();

      $("save-client-btn").onclick = async () => {
        const name = $("buyer-name").value.trim();
        const nip = $("buyer-nip").value.trim();
        const address = $("buyer-address").value.trim();

        if (!name) return showToast("Wpisz przynajmniej nazwę klienta.");

        const newClient = { id: Date.now().toString(), name, nip, address };
        
        const existingIdx = savedClients.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
        if (existingIdx > -1) {
          savedClients[existingIdx] = newClient;
          showToast("Zaktualizowano dane klienta.");
        } else {
          savedClients.push(newClient);
          showToast("Zapisano nowego klienta.");
        }

        await Hub.db.set("offer_clients", savedClients);
        updateClientTrigger();
        Hub.haptic('success');
      };

      clientTrigger.onclick = async () => {
        const opts = savedClients.map(c => ({ id: c.id, label: c.name }));
        const choice = await Hub.showSelect({ title: "Wybierz klienta", options: opts, current: "", anchor: clientTrigger, signal });
        
        if (choice) {
          const c = savedClients.find(x => x.id === choice);
          if (c) {
            $("buyer-name").value = c.name;
            $("buyer-nip").value = c.nip;
            $("buyer-address").value = c.address;
            Hub.haptic('light');
          }
        }
      };

      // --- BAZA PRODUKTÓW ---
      const productTrigger = $("product-select-trigger");
      
      function updateProductTrigger() {
        productTrigger.style.display = savedProducts.length > 0 ? "flex" : "none";
      }
      updateProductTrigger();

      productTrigger.onclick = async () => {
        const opts = savedProducts.map(p => ({ id: p.id, label: `${p.name} (${p.price} zł)` }));
        const choice = await Hub.showSelect({ title: "Wybierz produkt", options: opts, current: "", anchor: productTrigger, signal });
        
        if (choice) {
          const p = savedProducts.find(x => x.id === choice);
          if (p) {
            items.push({ name: p.name, qty: 1, unit: p.unit || "szt.", price: p.price, vat: p.vat || 23 });
            renderItems();
            calculateTotals();
            Hub.haptic('light');
            showToast("Dodano produkt do oferty.");
          }
        }
      };

      // --- GENEROWANIE POZYCJI I OBLICZANIE ---
      function formatMoney(n) {
        return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł';
      }

      function formatIBAN(iban) {
        if (!iban) return "";
        let clean = iban.replace(/\s+/g, '').toUpperCase();
        if (clean.startsWith('PL')) clean = clean.substring(2);
        let formatted = clean.replace(/(.{4})/g, '$1 ').trim();
        return `PL ${formatted}`;
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
              <div class="inv-item-actions">
                <button class="inv-item-btn save-btn" data-idx="${i}" title="Zapisz w bazie">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                </button>
                ${items.length > 1 ? `<button class="inv-item-btn danger remove-btn" data-idx="${i}" title="Usuń">✕</button>` : ''}
              </div>
            </div>
            <div class="inv-item-grid">
              <div class="full">
                <label class="inv-label" style="margin-top:0;">Nazwa usługi / towaru</label>
                <input type="text" class="inv-input item-name" data-idx="${i}" value="${item.name}" placeholder="np. Projekt graficzny">
              </div>
              <div>
                <label class="inv-label" style="margin-top:0;">Ilość</label>
                <input type="number" step="0.01" min="0" class="inv-input item-qty" data-idx="${i}" value="${item.qty}">
              </div>
              <div>
                <label class="inv-label" style="margin-top:0;">J.m.</label>
                <input type="text" class="inv-input item-unit" data-idx="${i}" value="${item.unit}" placeholder="szt.">
              </div>
              <div>
                <label class="inv-label" style="margin-top:0;">Cena netto</label>
                <input type="number" step="0.01" min="0" class="inv-input item-price" data-idx="${i}" value="${item.price}">
              </div>
              <div>
                <label class="inv-label" style="margin-top:0;">VAT %</label>
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
        container.querySelectorAll(".item-unit").forEach(el => {
          el.oninput = (e) => { items[e.target.dataset.idx].unit = e.target.value; };
        });
        container.querySelectorAll(".item-price").forEach(el => {
          el.oninput = (e) => { items[e.target.dataset.idx].price = parseFloat(e.target.value) || 0; calculateTotals(); };
        });
        container.querySelectorAll(".item-vat").forEach(el => {
          el.oninput = (e) => { items[e.target.dataset.idx].vat = parseFloat(e.target.value) || 0; calculateTotals(); };
        });
        
        container.querySelectorAll(".remove-btn").forEach(el => {
          el.onclick = (e) => {
            Hub.haptic('light');
            items.splice(parseInt(e.target.dataset.idx), 1);
            renderItems();
            calculateTotals();
          };
        });

        container.querySelectorAll(".save-btn").forEach(el => {
          el.onclick = async (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            const item = items[idx];
            if (!item.name) return showToast("Wpisz nazwę produktu przed zapisem.");
            
            const newProduct = { 
              id: Date.now().toString(), 
              name: item.name.trim(), 
              price: item.price, 
              unit: item.unit || "szt.", 
              vat: item.vat 
            };
            
            const existingIdx = savedProducts.findIndex(p => p.name.toLowerCase() === item.name.toLowerCase());
            if (existingIdx > -1) {
              savedProducts[existingIdx] = newProduct;
              showToast("Zaktualizowano produkt w bazie.");
            } else {
              savedProducts.push(newProduct);
              showToast("Zapisano nowy produkt w bazie.");
            }
            
            await Hub.db.set("offer_products", savedProducts);
            updateProductTrigger();
            Hub.haptic('success');
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
        items.push({ name: "", qty: 1, unit: "szt.", price: 0, vat: 23 });
        renderItems();
      };

      renderItems();
      calculateTotals();

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
        return `${numberToWords(intPart)} ${zlotyForm} ${String(decPart).padStart(2, '0')}/100`;
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

      function renderOfferToCanvas(seller, buyer, offerNum, offerDate, validDate, offerPlace, paymentTerms, totalNet, totalVat, totalGross) {
        const canvas = $("invoice-canvas");
        const ctx = canvas.getContext("2d");
        const W = 1240, H = 1754, M = 100;
        canvas.width = W;
        canvas.height = H;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#000000";
        let y = M + 40;

        ctx.font = "bold 44px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("OFERTA HANDLOWA", M, y);
        
        ctx.font = "20px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`nr ${offerNum}`, W - M, y);
        
        y += 35;
        ctx.font = "16px sans-serif";
        ctx.textAlign = "left";
        if (offerPlace) {
          ctx.fillText(`${offerPlace}, ${formatDate(offerDate)}`, M, y);
        } else {
          ctx.fillText(`Data oferty: ${formatDate(offerDate)}`, M, y);
        }
        
        ctx.textAlign = "right";
        ctx.fillText(`Ważna do: ${formatDate(validDate)}`, W - M, y);
        
        y += 25;
        ctx.textAlign = "left";
        ctx.fillText(`Warunki: ${paymentTerms}`, M, y);
        
        y += 20;
        ctx.beginPath();
        ctx.moveTo(M, y);
        ctx.lineTo(W - M, y);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.stroke();

        y += 40;

        const colL = M;
        const colR = M + (W - 2*M) / 2 + 20;

        ctx.font = "bold 20px sans-serif";
        ctx.fillText("WYSTAWIAJĄCY", colL, y);
        ctx.fillText("KLIENT", colR, y);

        y += 30;
        ctx.font = "22px sans-serif";
        ctx.fillText(seller.name || "-", colL, y);
        ctx.fillText(buyer.name || "-", colR, y);

        y += 25;
        ctx.font = "18px sans-serif";
        if (seller.nip) ctx.fillText(`NIP: ${seller.nip}`, colL, y);
        if (buyer.nip) ctx.fillText(`NIP: ${buyer.nip}`, colR, y);
        
        y += 25;
        ctx.fillText((seller.address || "-").substring(0, 40), colL, y);
        ctx.fillText((buyer.address || "-").substring(0, 40), colR, y);

        y += 25;
        if (seller.email) ctx.fillText(`E-mail: ${seller.email}`, colL, y);
        if (seller.phone) ctx.fillText(`Tel: ${seller.phone}`, colL + 300, y); 
        
        y += 25;
        if (seller.bank) ctx.fillText(`Nr konta: ${formatIBAN(seller.bank)}`, colL, y);

        y += 40;
        ctx.beginPath();
        ctx.moveTo(M, y);
        ctx.lineTo(W - M, y);
        ctx.stroke();

        y += 35;

        const xLp = M;
        const xName = M + 50;
        const xQty = 500;
        const xUnit = 530;
        const xPrice = 700;
        const xVat = 790;
        const xNet = 930;
        const xGross = 1140;

        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Lp.", xLp, y);
        ctx.fillText("Nazwa usługi / towaru", xName, y);
        
        ctx.textAlign = "right";
        ctx.fillText("Ilość", xQty, y);
        
        ctx.textAlign = "left";
        ctx.fillText("J.m.", xUnit, y);
        
        ctx.textAlign = "right";
        ctx.fillText("Cena netto", xPrice, y);
        ctx.fillText("VAT", xVat, y);
        ctx.fillText("Wartość netto (PLN)", xNet, y);
        ctx.fillText("Wartość brutto (PLN)", xGross, y);

        y += 15;
        ctx.beginPath();
        ctx.moveTo(M, y);
        ctx.lineTo(W - M, y);
        ctx.stroke();

        y += 30;

        ctx.font = "16px sans-serif";
        items.forEach((item, idx) => {
          const net = item.qty * item.price;
          const vat = net * item.vat / 100;
          const gross = net + vat;

          ctx.textAlign = "left";
          ctx.fillText(String(idx + 1), xLp, y);
          ctx.fillText(item.name.substring(0, 38) || "-", xName, y);

          ctx.textAlign = "right";
          ctx.fillText(String(item.qty), xQty, y);
          
          ctx.textAlign = "left";
          ctx.fillText(item.unit || "szt.", xUnit, y);
          
          ctx.textAlign = "right";
          ctx.fillText(formatMoneyPlain(item.price), xPrice, y);
          ctx.fillText(`${item.vat}%`, xVat, y);
          ctx.fillText(formatMoneyPlain(net), xNet, y);
          ctx.fillText(formatMoneyPlain(gross), xGross, y);

          y += 35;
        });

        y += 10;
        ctx.beginPath();
        ctx.moveTo(M, y);
        ctx.lineTo(W - M, y);
        ctx.stroke();

        y += 30;

        const vatSummary = {};
        items.forEach(item => {
          const net = item.qty * item.price;
          const vatAmt = net * item.vat / 100;
          if (!vatSummary[item.vat]) vatSummary[item.vat] = { net: 0, vat: 0 };
          vatSummary[item.vat].net += net;
          vatSummary[item.vat].vat += vatAmt;
        });

        let summaryY = y;
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Podsumowanie VAT", M, summaryY);
        summaryY += 25;
        
        ctx.font = "16px sans-serif";
        ctx.fillText("Stawka", M, summaryY);
        ctx.textAlign = "right";
        ctx.fillText("Netto", M + 150, summaryY);
        ctx.fillText("Kwota VAT", M + 280, summaryY);
        ctx.fillText("Brutto", M + 410, summaryY);

        summaryY += 20;
        
        for (const [rate, vals] of Object.entries(vatSummary)) {
          ctx.textAlign = "left";
          ctx.fillText(`${rate}%`, M, summaryY);
          ctx.textAlign = "right";
          ctx.fillText(formatMoneyPlain(vals.net), M + 150, summaryY);
          ctx.fillText(formatMoneyPlain(vals.vat), M + 280, summaryY);
          ctx.fillText(formatMoneyPlain(vals.net + vals.vat), M + 410, summaryY);
          summaryY += 20;
        }

        let totalY = y;
        ctx.font = "18px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Razem netto:", xNet, totalY); 
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(formatMoneyPlain(totalNet) + " PLN", xGross, totalY);

        totalY += 30;
        ctx.font = "18px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Kwota VAT:", xNet, totalY);
        ctx.fillText(formatMoneyPlain(totalVat) + " PLN", xGross, totalY);

        totalY += 30;
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("RAZEM BRUTTO:", xNet, totalY);
        ctx.fillText(formatMoneyPlain(totalGross) + " PLN", xGross, totalY);

        y = Math.max(summaryY, totalY) + 30;
        ctx.beginPath();
        ctx.moveTo(M, y);
        ctx.lineTo(W - M, y);
        ctx.stroke();

        y += 30;

        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("Kwota słownie:", M, y);
        
        y += 25;
        ctx.font = "18px sans-serif";
        const words = amountInWords(totalGross);
        const wordsLines = [];
        let currentLine = "";
        const maxLineWidth = W - 2 * M;
        const wordsSplit = words.split(' ');
        wordsSplit.forEach(word => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          if (ctx.measureText(testLine).width > maxLineWidth && currentLine) {
            wordsLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) wordsLines.push(currentLine);
        
        wordsLines.forEach(line => {
          ctx.fillText(line, M, y);
          y += 25;
        });

        y = H - 200;
        ctx.beginPath();
        ctx.moveTo(M, y);
        ctx.lineTo(W - M, y);
        ctx.stroke();

        y += 60;
        ctx.textAlign = "right";
        ctx.font = "16px sans-serif";
        ctx.fillText("..............................................", W - M - 50, y);
        y += 25;
        ctx.fillText("Podpis wystawiającego", W - M - 100, y);

        return canvas;
      }

      async function generatePDFBlob(canvas) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
        const arrayBuffer = await blob.arrayBuffer();
        const jpegData = new Uint8Array(arrayBuffer);
        
        const W = canvas.width, H = canvas.height;

        const pdfChunks = [];
        let currentOffset = 0;
        let offsets = [];
        let objectId = 1;

        function pushBytes(bytes) { pdfChunks.push(bytes); currentOffset += bytes.length; }
        function pushStr(str) { const b = new Uint8Array(str.length); for(let i=0;i<str.length;i++) b[i]=str.charCodeAt(i); pushBytes(b); }
        function addObject(content) { offsets.push(currentOffset); pushStr(`${objectId} 0 obj\n${content}\nendobj\n`); objectId++; }
        function addStream(dict, stream) {
          offsets.push(currentOffset);
          pushStr(`${objectId} 0 obj\n<< ${dict} /Length ${stream.length} >>\nstream\n`);
          pushBytes(stream);
          pushStr(`\nendstream\nendobj\n`);
          objectId++;
        }

        pushStr("%PDF-1.4\n");
        
        addObject(`<< /Type /Catalog /Pages 2 0 R >>`);
        addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
        addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>`);
        
        const contentStream = `q\n${W} 0 0 ${H} 0 0 cm\n/Im1 Do\nQ\n`;
        addStream('', new TextEncoder().encode(contentStream));

        addStream(`/Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, jpegData);

        const startXref = currentOffset;
        let xref = `xref\n0 ${objectId}\n0000000000 65535 f \n`;
        offsets.forEach(off => { xref += `${off.toString().padStart(10, '0')} 00000 n \n`; });

        const trailer = `trailer\n<< /Size ${objectId} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
        pushStr(xref + trailer);

        return new Blob(pdfChunks, { type: 'application/pdf' });
      }

      async function previewOffer() {
        if (isGenerating) return;
        isGenerating = true;
        
        const btn = $("generate-btn");
        btn.disabled = true;
        btn.textContent = "Generowanie podglądu...";
        Hub.haptic('medium');

        const sellerData = {
          name: $("seller-name").value,
          nip: $("seller-nip").value,
          address: $("seller-address").value,
          email: $("seller-email").value,
          phone: $("seller-phone").value,
          bank: $("seller-bank").value
        };

        const buyerData = {
          name: $("buyer-name").value || 'Odbiorca',
          nip: $("buyer-nip").value,
          address: $("buyer-address").value
        };
        
        const offerNum = $("offer-number").value || 'O/2024/001';
        const offerDate = $("offer-date").value;
        const validDate = $("offer-valid").value;
        const offerPlace = $("offer-place").value;
        const paymentTerms = $("payment-terms").value;

        let totalNet = 0, totalVat = 0;
        items.forEach(item => {
          const net = item.qty * item.price;
          const vat = net * item.vat / 100;
          totalNet += net;
          totalVat += vat;
        });
        const totalGross = totalNet + totalVat;

        try {
          const canvas = renderOfferToCanvas(sellerData, buyerData, offerNum, offerDate, validDate, offerPlace, paymentTerms, totalNet, totalVat, totalGross);
          const pdfBlob = await generatePDFBlob(canvas);
          const filename = `oferta_${offerNum.replace(/[^a-z0-9]/gi, '_')}.pdf`;
          const previewUrl = canvas.toDataURL("image/jpeg", 0.85);

          const modalContent = `
            <div style="width: 100%; height: 80vh; max-height: 700px; display: flex; flex-direction: column; gap: 12px;">
              <div style="flex: 1; background: #fff; border-radius: 8px; overflow: auto; border: 1px solid var(--line);">
                <img src="${previewUrl}" style="width: 100%; height: auto; display: block;">
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="modal-cancel-btn" class="n-btn" style="flex: 1;">Anuluj</button>
                <button id="modal-download-btn" class="n-btn n-btn-outline" style="flex: 2;">Pobierz PDF</button>
              </div>
            </div>
          `;

          const modal = Hub.showModal({ content: modalContent });

          modal.element.querySelector('#modal-cancel-btn').onclick = () => {
            Hub.haptic('light');
            modal.close();
          };

          modal.element.querySelector('#modal-download-btn').onclick = () => {
            Hub.haptic('success');
            Hub.download(pdfBlob, filename);
            modal.close();
          };

        } catch (err) {
          console.error(err);
          showToast("Błąd podczas generowania: " + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = "Podgląd oferty";
          isGenerating = false;
        }
      }

      $("generate-btn").onclick = previewOffer;
    },

    unmount() {}
  });
})();