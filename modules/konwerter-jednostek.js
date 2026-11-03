(() => {
  Hub.register({
    id: "jednostki",
    title: "Konwerter Jednostek",
    desc: "Błyskawiczne przeliczanie jednostek",

    async mount(container, signal) {
      let menuStyle = "bottom";
      let savedPrecision = 4;
      try { 
        menuStyle = await Hub.db.get("menu_style", "bottom"); 
        savedPrecision = await Hub.db.get("unit_precision", 4);
      } catch(e) {}

      const data = {
        length: {
          name: "Długość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"></line></svg>`,
          units: { m: [1n, 1n], cm: [1n, 100n], km: [1000n, 1n], in: [254n, 10000n], ft: [3048n, 10000n], mi: [160934n, 100n] },
          names: { m: 'Metry', cm: 'Centymetry', km: 'Kilometry', in: 'Cale', ft: 'Stopy', mi: 'Mile' }
        },
        mass: {
          name: "Masa",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><path d="M3 7h18"></path><path d="M6 7l-3 7h6l-3-7z"></path><path d="M18 7l-3 7h6l-3-7z"></path></svg>`,
          units: { kg: [1n, 1n], g: [1n, 1000n], t: [1000n, 1n], lb: [453592n, 1000000n], oz: [283495n, 10000000n] },
          names: { kg: 'Kilogramy', g: 'Gramy', t: 'Tony', lb: 'Funty', oz: 'Uncje' }
        },
        temp: {
          name: "Temperatura",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>`,
          units: ['C', 'F', 'K'],
          names: { C: 'Celsjusz', F: 'Fahrenheit', K: 'Kelwin' }
        },
        volume: {
          name: "Objętość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12"></path><path d="M6 22h12"></path><path d="M6 2l1.5 18h9L18 2"></path><path d="M7 14h10"></path></svg>`,
          units: { l: [1n, 1n], ml: [1n, 1000n], gal: [378541n, 100000n], pt: [473176n, 1000000n] },
          names: { l: 'Litry', ml: 'Mililitry', gal: 'Galony (US)', pt: 'Pinty (US)' }
        },
        speed: {
          name: "Prędkość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
          units: { ms: [1n, 1n], kmh: [1000n, 3600n], mph: [44704n, 100000n], knot: [514444n, 1000000n] },
          names: { ms: 'Metry na sekundę', kmh: 'Kilometry na godzinę', mph: 'Mile na godzinę', knot: 'Węzły' }
        },
        time: {
          name: "Czas",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
          units: { s: [1n, 1n], min: [60n, 1n], h: [3600n, 1n], d: [86400n, 1n], w: [604800n, 1n], mo: [2629800n, 1n], y: [31557600n, 1n] },
          names: { s: 'Sekundy', min: 'Minuty', h: 'Godziny', d: 'Dni', w: 'Tygodnie', mo: 'Miesiące', y: 'Lata' }
        },
        area: {
          name: "Powierzchnia",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`,
          units: { m2: [1n, 1n], km2: [1000000n, 1n], cm2: [1n, 10000n], ha: [10000n, 1n], a: [100n, 1n], ft2: [92903n, 1000000n], in2: [64516n, 100000000n] },
          names: { m2: 'Metry kwadratowe', km2: 'Kilometry kwadratowe', cm2: 'Centymetry kwadratowe', ha: 'Hektary', a: 'Ary', ft2: 'Stopy kwadratowe', in2: 'Cale kwadratowe' }
        }
      };

      let currentCat = 'length';