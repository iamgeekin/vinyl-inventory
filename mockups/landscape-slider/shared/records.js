/* Invented records only: the app's eight samples, then enough made-up ones to fill a shelf. */
window.RECORDS = (() => {
  // artist, title, year, price, bought, spine, second colour, genre, edition, vinyl colour
  const samples = [
    ['night-tides', 'Marina Vale', 'Night Tides', 2021, 48, '2026-03-14', '#0f2d4a', '#6fbcc4', 'Electronic', 'Sea Glass Edition', 'Blue translucent'],
    ['paper-lanterns', 'The Quiet Harbour', 'Paper Lanterns', 2018, 36, '2025-11-02', '#b3261e', '#f6b13d', 'Folk'],
    ['concrete-garden', 'Odile Park', 'Concrete Garden', 2020, 33, '2025-08-19', '#c9c6bd', '#3f7d4a', 'Jazz'],
    ['orange-hour', 'Sunday Static', 'Orange Hour', 2023, 29.5, '2026-06-07', '#f08a24', '#7a2e1d', 'Rock', 'Indie exclusive', 'Orange'],
    ['halcyon-drive', 'Kito Mara', 'Halcyon Drive', 2022, 42, '2026-01-25', '#24143f', '#f26d5b', 'Electronic'],
    ['small-weather', 'Fern & Ash', 'Small Weather', 2019, 31, '2024-12-30', '#dfe8e4', '#2f5d73', 'Folk'],
    ['monsoon-radio', 'Delta Verse', 'Monsoon Radio', 2024, 27, '2026-09-13', '#0e6b5c', '#f1c84b', 'Hip Hop'],
    ['glass-orchard', 'June Calloway', 'Glass Orchard', 2017, 55, '2025-04-06', '#161616', '#9a6fe8', 'Soul', 'Anniversary pressing', 'Purple marble'],
  ];
  const invented = [
    ['Ada Fennimore', 'Quiet Machines'], ['Bellwether', 'Salt Meadow'], ['Cardinal Rooms', 'Second Summer'], ['Cass Orlo', 'Milk Teeth'],
    ['Dune Parade', 'Mirage Hotel'], ['Elio Santos', 'Terraço'], ['Everyday Comet', 'Low Orbit'], ['Foxglove Union', 'The Long Thaw'],
    ['Gilt Theory', 'Paper Gold'], ['Hana Ito', 'Window Light'], ['Harbourmaster', 'Fog Signals'], ['Ines Duarte', 'Marés'],
    ['Juniper Vox', 'Kindling'], ['Kestrel Bay', 'Northern Line'], ['Lantern Club', 'After Hours'], ['Lio Brandt', 'Static Bloom'],
    ['Mosswork', 'Understory'], ['Mira Sol', 'Amber Rooms'], ['Nocturne Kids', 'Streetlamp Hymns'], ['North Pier', 'Tidal Charts'],
    ['Olive & the Wren', 'Homing'], ['Otto Lane', 'Blue Hour Taxi'], ['Pale Motel', 'Vacancy'], ['Petra Voss', 'Granite'],
    ['Quarry Choir', 'Echo Practice'], ['Rosalind Hart', 'Letters Unsent'], ['Rue Marchand', 'Café Minuit'], ['Saltline', 'Driftwood Radio'],
    ['Sable Thorne', 'Velvet Static'], ['Tamsin Reed', 'Orchard Road'], ['The Glass Ferns', 'Greenhouse'], ['Tidewater Inn', 'Room Nine'],
    ['Umber Sky', 'Dust Season'], ['Vera Quill', 'Marginalia'], ['Violet Arcade', 'High Score'], ['Wild Cartography', 'Unmapped'],
    ['Wren Okafor', 'Sunroom'], ['Yara Mendes', 'Saudade Nova'], ['Zephyr Hall', 'Open Windows'], ['Amber Division', 'Signal Fires'],
    ['Basalt', 'Slow Lava'], ['Coral Fields', 'Reef Notes'], ['Dov Kline', 'Porch Songs'], ['Ember Row', 'Cinder Waltz'],
    ['Gale Ferry', 'Crossing'], ['Hollow Pines', 'Winter Count'], ['Iris Calder', 'Prism'], ['Juno Park', 'Satellite Hearts'],
    ['Maple Static', 'Syrup'], ['Neon Abbey', 'Vespers'], ['Opaline', 'Soft Focus'], ['Slate Rivers', 'Confluence'],
  ];
  const pairs = [
    ['#7a2e1d', '#f0c987'], ['#12343b', '#e1b382'], ['#e8dcc4', '#a63d40'], ['#2b4f81', '#f2e9d0'], ['#44603a', '#e9c46a'],
    ['#5d3a78', '#f4a7b9'], ['#d9b13b', '#1c1c1c'], ['#c4442c', '#f7ede2'], ['#1f2421', '#9fd8cb'], ['#8a4b2a', '#ffd8a8'],
    ['#f2c1b6', '#33415c'], ['#2f3e46', '#ff8c61'], ['#9db4a0', '#3a2d32'], ['#1d5b82', '#ffcf56'], ['#3b0d11', '#e57a7a'],
    ['#f4f0e6', '#e4572e'], ['#006d77', '#edf6f9'], ['#6a4c93', '#c5f277'], ['#101820', '#f2aa4c'], ['#a44a3f', '#cbdfbd'],
  ];
  const genres = ['Electronic', 'Folk', 'Jazz', 'Rock', 'Soul', 'Hip Hop', 'Ambient', 'Pop'];

  let seed = 7;
  const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const pick = (list) => list[Math.floor(random() * list.length)];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /** Simple geometric sleeve art, so each invented record has a cover of its own. */
  function art(motif, bg, ink, title, artist) {
    const mid = `${ink}99`;
    const shapes = [
      `<circle cx="200" cy="210" r="96" fill="${ink}"/><path d="M0 250H400V400H0Z" fill="${bg}"/>` +
        [262, 284, 308, 336].map((y, i) => `<path d="M${70 + i * 22} ${y}H${330 - i * 22}" stroke="${ink}" stroke-width="${9 - i * 2}"/>`).join(''),
      [150, 118, 86, 54, 22].map((r) => `<circle cx="140" cy="250" r="${r}" fill="none" stroke="${ink}" stroke-width="13"/>`).join(''),
      [0, 1, 2, 3, 4, 5].map((i) => `<path d="M${-120 + i * 90} 400L${80 + i * 90} 110h38L${-82 + i * 90} 400Z" fill="${i % 2 ? mid : ink}"/>`).join(''),
      Array.from({ length: 36 }, (_, i) => `<circle cx="${60 + (i % 6) * 56}" cy="${110 + Math.floor(i / 6) * 48}" r="${5 + ((i * 7) % 17)}" fill="${ink}"/>`).join(''),
      `<path d="M200 105L360 360H40Z" fill="${ink}"/><path d="M200 190L300 360H100Z" fill="${mid}"/><path d="M200 268L250 360H150Z" fill="${bg}"/>`,
      `<path d="M50 260a150 150 0 0 1 300 0Z" fill="${ink}"/><path d="M50 272a150 150 0 0 0 300 0Z" fill="${mid}"/>`,
      [170, 215, 260, 305, 350].map((y, i) => `<path d="M-10 ${y}q50 -${34 - i * 3} 100 0t100 0t100 0t100 0t100 0" fill="none" stroke="${i % 2 ? mid : ink}" stroke-width="16"/>`).join(''),
      `<path d="M40 110H215V360H40Z" fill="${ink}"/><path d="M230 110H360V230H230Z" fill="${mid}"/><circle cx="295" cy="305" r="55" fill="${ink}"/>`,
    ];
    return 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><rect width="400" height="400" fill="${bg}"/>${shapes[motif]}` +
      `<text x="28" y="48" font-family="Helvetica, Arial, sans-serif" font-size="${title.length > 14 ? 24 : 30}" font-weight="700" letter-spacing="2" fill="${ink}">${esc(title.toUpperCase())}</text>` +
      `<text x="28" y="74" font-family="Helvetica, Arial, sans-serif" font-size="15" letter-spacing="3" fill="${ink}">${esc(artist.toUpperCase())}</text></svg>`,
    );
  }

  const list = samples.map(([slug, artist, title, year, price, bought, spine, pop, genre, edition = '', vinyl = '']) => ({
    id: slug, artist, title, year, price, bought, spine, pop, genre, edition, vinyl, discs: 1, img: `../../public/samples/${slug}.svg`,
  }));
  invented.forEach(([artist, title], i) => {
    const [a, b] = pairs[(i * 7 + 3) % pairs.length];
    const [spine, pop] = random() < 0.2 ? [b, a] : [a, b];
    const special = random() < 0.22;
    list.push({
      id: `m${i}`, artist, title,
      year: 2008 + Math.floor(random() * 18),
      price: 18 + Math.floor(random() * 50) + (random() < 0.25 ? 0.5 : 0),
      bought: `${pick([2024, 2025, 2025, 2026, 2026])}-${String(1 + Math.floor(random() * 11)).padStart(2, '0')}-${String(1 + Math.floor(random() * 27)).padStart(2, '0')}`,
      spine, pop, genre: pick(genres),
      edition: special ? pick(['Limited pressing', 'Indie exclusive', 'Tour edition', 'Half-speed master']) : '',
      vinyl: special ? pick(['Red', 'Clear', 'Green', 'Pink', 'Orange', 'White', 'Smoke']) : '',
      discs: random() < 0.16 ? 2 : 1,
      img: art((i * 3 + 1) % 8, spine, pop, title, artist),
    });
  });
  return list;
})();
