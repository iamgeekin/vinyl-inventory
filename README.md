# Vinyl Inventory

A phone-friendly web app for tracking a vinyl record collection: cover art, price, purchase date, edition and tracklist, with barcode scanning, cover-photo recognition, a record shelf to browse and search across artists, albums and songs.

It installs to the home screen and keeps working offline. It is published with GitHub Pages and syncs through Firebase.

## Run it on your computer

```powershell
npm install
```

```powershell
npm run dev
```

Without Firebase settings the app runs in **demo mode**: records are saved only in that browser. Open the shelf and choose "Try it with sample records" to look around.

| Command | What it does |
|---|---|
| `npm test` | Run the tests |
| `npm run build` | Type-check and build the site into `dist/` |
| `npm run preview` | Serve the built site at `/vinyl-inventory/` |

## Set up sync with Firebase

The free Spark plan is enough. No payment card is needed.

1. In the [Firebase console](https://console.firebase.google.com/), create a project, then add a **Web app** to it. Keep the config values it shows.
2. **Authentication > Sign-in method:** enable **Google** and **Email/Password**.
3. **Authentication > Settings > Authorised domains:** add `iamgeekin.github.io`.
4. **Firestore Database > Create database:** start in production mode. Pick the region nearest you; it cannot be changed later.
5. **Firestore Database > Rules:** replace the contents with [`firestore.rules`](firestore.rules) and publish.
6. For local testing, copy `.env.example` to `.env.local` and fill in the four values.
7. For the published site, add the same four names under the GitHub repository's **Settings > Secrets and variables > Actions > Variables**.
8. Open the app and sign in once. Then, in **Authentication > Settings > User actions**, turn **off** "Enable create (sign-up)". This stops strangers from creating accounts that use your free quota.

If you plan to use both Google and a password, sign in with Google first, then use "Forgot password" with the same email to set a password for that account.

## Publish with GitHub Pages

1. A free GitHub account can publish Pages only from a public repository.
2. In the repository, open **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow tests, builds and publishes to `https://iamgeekin.github.io/vinyl-inventory/`.

If the repository has a different name, change `PAGES_BASE` in `vite.config.ts`.

## On your phone

- **iPhone:** open the address in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open it in Chrome, open the menu, then **Install app**.
- If Google sign-in fails inside the installed iPhone app, sign in with email and password.

## Discogs token

Create a personal access token at [discogs.com/settings/developers](https://www.discogs.com/settings/developers) and paste it into the app under **Settings**. It adds cover pictures to search results and raises the request limit. Do not put it in this repository.

## How adding a record works

| Method | Sources, in order | Limits |
|---|---|---|
| Barcode | Discogs, MusicBrainz, iTunes | Older records often have no barcode |
| Cover photo | Text read on the phone, then iTunes and Discogs, ranked by likeness to your photo | Needs readable text on the cover; the first use downloads a few MB |
| Typed search | Discogs, then iTunes | |
| Manual | You | |

Always check the chosen pressing: edition and colour are guessed from the Discogs description. iTunes results describe the digital release, so their tracklist may differ from your record.

Saved cover thumbnails come from Cover Art Archive, iTunes or your own photo. Discogs pictures can only be linked to, so they may not show offline.

## Where data lives

```
users/{your id}/records/{record}   details of each record
users/{your id}/covers/{record}    JPEG thumbnail, under 100 KB
users/{your id}/settings/app       currency, Discogs token, shelf view, appearance
```

**Settings > Export backup** saves everything to a JSON file that can be imported again. There is also a CSV export for spreadsheets.

## Design

The "Listening Room" direction: a quiet interface where the cover art provides the colour. Fraunces is used for screen, album and song titles; Figtree for everything else, including prices and track times. Both fonts ship with the app.

### Colour from the cover

The whole page takes its colour from the cover of the record in focus: the one pulled out on the shelf, centred in the slider, or open on its own page. Other screens keep the last one.

| Appearance | What it does |
|---|---|
| Match my phone (default) | Light or dark, following the phone |
| Light | A bright shade of the cover colour |
| Dark | The cover colour, deepened |
| Night | The deepest shade, with dimmed artwork and warm text |

Change it with the sun or moon button on the shelf, or under **Settings**. Text and highlight colours are adjusted until they pass a contrast of at least 4.5 to 1. A black, white or grey cover borrows its tint from its second colour. A cover that is only linked from Discogs cannot be analysed, so the page stays neutral until you save artwork or a photo.

The colour rules are in `src/theme/palette.ts`.

### Sideways view

Turn a phone to landscape on the shelf to get the cover slider: the focused record is enlarged with its disc slid out. Swipe, tap a side cover, use the arrows or drag the bar underneath, and sort by artist, title, year, purchase date or price. The phone's rotation lock must be off. It appears when the screen is landscape and no more than 540 px tall.

## Project layout

| Folder | Contents |
|---|---|
| `src/data` | Record types, storage (browser and Firestore), sorting, totals, backup |
| `src/lookup` | Discogs, MusicBrainz and iTunes |
| `src/scan` | Barcode camera, text reading, artwork and thumbnails |
| `src/search` | Collection search |
| `src/theme` | Colours from covers, light, dark and night |
| `src/pages`, `src/components` | Screens, shelf and slider |
