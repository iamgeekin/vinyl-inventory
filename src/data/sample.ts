import { emptyRecord, type Track, type VinylRecord } from './types';

const tracks = (rows: [string, string, string][]): Track[] =>
  rows.map(([position, title, duration]) => ({ position, title, duration, artist: '' }));

interface Sample {
  slug: string;
  artist: string;
  title: string;
  year: number;
  price: number;
  bought: string;
  spine: string;
  pop: string;
  genre: string;
  color?: string;
  editionName?: string;
  numbering?: string;
  tracks: [string, string, string][];
}

const SAMPLES: Sample[] = [
  { slug: 'night-tides', artist: 'Marina Vale', title: 'Night Tides', year: 2021, price: 48, bought: '2026-03-14', spine: '#0f2d4a', pop: '#6fbcc4', genre: 'Electronic', color: 'Blue translucent', editionName: 'Sea Glass Edition', numbering: '214/500',
    tracks: [['A1', 'Harbour Lights', '4:12'], ['A2', 'Salt & Static', '3:48'], ['A3', 'Night Tides', '5:03'], ['B1', 'Slow Ferry', '4:31'], ['B2', 'Lantern Room', '3:15'], ['B3', 'Undertow', '6:02']] },
  { slug: 'paper-lanterns', artist: 'The Quiet Harbour', title: 'Paper Lanterns', year: 2018, price: 36, bought: '2025-11-02', spine: '#b3261e', pop: '#f6b13d', genre: 'Folk',
    tracks: [['A1', 'Red Thread', '3:30'], ['A2', 'Festival Night', '4:05'], ['B1', 'Ember Walk', '3:52'], ['B2', 'Last Boat Home', '5:11']] },
  { slug: 'concrete-garden', artist: 'Odile Park', title: 'Concrete Garden', year: 2020, price: 33, bought: '2025-08-19', spine: '#c9c6bd', pop: '#3f7d4a', genre: 'Jazz',
    tracks: [['A1', 'Stairwell Bloom', '4:44'], ['A2', 'Rooftop Moss', '3:21'], ['B1', 'Crane Shadows', '6:10']] },
  { slug: 'orange-hour', artist: 'Sunday Static', title: 'Orange Hour', year: 2023, price: 29.5, bought: '2026-06-07', spine: '#f08a24', pop: '#7a2e1d', genre: 'Rock', color: 'Orange', editionName: 'Indie exclusive',
    tracks: [['A1', 'Long Shadows', '3:02'], ['A2', 'Porch Radio', '3:40'], ['B1', 'Golden Static', '4:18']] },
  { slug: 'halcyon-drive', artist: 'Kito Mara', title: 'Halcyon Drive', year: 2022, price: 42, bought: '2026-01-25', spine: '#24143f', pop: '#f26d5b', genre: 'Electronic',
    tracks: [['A1', 'Night Highway', '5:20'], ['A2', 'Neon Exit', '4:02'], ['B1', 'Halcyon', '4:47']] },
  { slug: 'small-weather', artist: 'Fern & Ash', title: 'Small Weather', year: 2019, price: 31, bought: '2024-12-30', spine: '#dfe8e4', pop: '#2f5d73', genre: 'Folk',
    tracks: [['A1', 'Drizzle', '2:58'], ['A2', 'Cloud Lesson', '3:36'], ['B1', 'Clearing', '4:09']] },
  { slug: 'monsoon-radio', artist: 'Delta Verse', title: 'Monsoon Radio', year: 2024, price: 27, bought: '2026-09-13', spine: '#0e6b5c', pop: '#f1c84b', genre: 'Hip Hop',
    tracks: [['A1', 'Tune In', '1:45'], ['A2', 'Flood Warning', '3:27'], ['B1', 'Static Rain', '3:55']] },
  { slug: 'glass-orchard', artist: 'June Calloway', title: 'Glass Orchard', year: 2017, price: 55, bought: '2025-04-06', spine: '#161616', pop: '#9a6fe8', genre: 'Soul', color: 'Purple marble', editionName: 'Anniversary pressing', numbering: '88/1000',
    tracks: [['A1', 'Fruit of Light', '4:33'], ['A2', 'Window Seat', '3:48'], ['B1', 'Orchard Hymn', '5:56']] },
];

/** Invented albums for trying the app out. Ids are stable so reloading does not duplicate them. */
export function sampleRecords(currency: string): VinylRecord[] {
  return SAMPLES.map((s, i) => {
    const base = emptyRecord(currency);
    return {
      ...base,
      id: `sample-${s.slug}`,
      artist: s.artist,
      title: s.title,
      year: s.year,
      label: 'Sample Records',
      catalogNumber: `SMP-${String(i + 1).padStart(3, '0')}`,
      genres: [s.genre],
      edition: {
        isSpecial: Boolean(s.editionName),
        name: s.editionName ?? '',
        color: s.color ?? '',
        numbering: s.numbering ?? '',
        notes: '',
      },
      purchase: { price: s.price, currency, date: s.bought, store: 'Sample store' },
      condition: { media: 'NM', sleeve: 'VG+' },
      tags: ['sample'],
      tracklist: tracks(s.tracks),
      links: { discogsId: null, mbid: '', coverUrl: `samples/${s.slug}.svg` },
      spineColor: s.spine,
      popColor: s.pop,
    };
  });
}
