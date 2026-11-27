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

Without Firebase settings, records are saved only in that browser and syncing is not offered. Open the shelf and choose "Try it with sample records" to look around.

| Command | What it does |
|---|---|
| `npm test` | Run the tests |
| `npm run build` | Type-check and build the site into `dist/` |
| `npm run preview` | Serve the built site at `/vinyl-inventory/` |

## Set up sync with Firebase

There are no accounts or logins. The free Spark plan is enough. You only need the database; leave Authentication and Storage switched off.

1. In the [Firebase console](https://console.firebase.google.com/), create a project. Google Analytics is not needed.
2. **Firestore Database > Create database:** keep the default database, start in **production mode**, and pick the region nearest you. The region cannot be changed later.
3. **Firestore Database > Rules:** replace everything with the contents of [`firestore.rules`](firestore.rules) and **Publish**.
4. **Firestore Database > Data > Start collection:** collection ID `config`, document ID `access`, one field named `invite` of type **string**. Its value is your **invite phrase**: make up a long one (at least 8 characters, several words is better).
5. **Project settings > General > Your apps:** add a **Web app** (no Firebase Hosting). From the config it shows, you need `apiKey`, `projectId` and `appId`.
6. For the published site, in the GitHub repository open **Settings > Secrets and variables > Actions > Variables** and add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`. For local testing, copy `.env.example` to `.env.local` and fill them in.
7. Publish again: push to `main`, or open **Actions > Deploy to GitHub Pages > Run workflow**.

Optional: in the [Google Cloud console](https://console.cloud.google.com/apis/credentials), restrict the API key to the website `https://iamgeekin.github.io/*`.

Never put the invite phrase in this repository.

## Using sync

| To do this | In the app, open Settings |
|---|---|
| Start a collection | **New collection**, enter the invite phrase, **Create sync code** |
| Link another device | On the first device **Show sync code**; on the second **I have a code**, then scan or paste it |
| Share a collection with a friend | Give them your code. They can see, change and delete everything in it |
| Give a friend their own collection | Give them the invite phrase, not your code |
| Unlink a device | **Stop syncing on this device**. It keeps a copy |

- **Save your sync code**, for example in a password manager. If you lose it and every linked device, nobody can recover the collection.
- **Privacy:** records and covers are encrypted on the device with a key made from the code. You cannot read friends' collections in the Firebase console; you can only see how many items they hold.
- **Who can create collections:** only people with the invite phrase. Changing the phrase in `config/access` does not affect existing collections.
- **Removing a collection from the server:** delete its document under `vaults`, including its subcollections, in the console.
- **Settings stay on each device**, including the Discogs token and appearance.
- **Clearing a browser's data** unlinks that device. Link it again with the code.

## Publish with GitHub Pages

1. A free GitHub account can publish Pages only from a public repository.
2. In the repository, open **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow tests, builds and publishes to `https://iamgeekin.github.io/vinyl-inventory/`.

If the repository has a different name, change `PAGES_BASE` in `vite.config.ts`.

## On your phone

- **iPhone:** open the address in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open it in Chrome, open the menu, then **Install app**.
- On iPhone the home screen app keeps its own storage, so enter the sync code inside the installed app.

## Discogs token

Create a personal access token at [discogs.com/settings/developers](https://www.discogs.com/settings/developers) and paste it into the app under **Settings**. It adds cover pictures to search results, raises the request limit and is needed to send records to your collection. Do not put it in this repository.

## Send your collection to Discogs

With a token saved, open **Settings > Send to Discogs** and choose **Check my collection**. The app reads your Discogs collection, lists the records Discogs does not have, and adds the ones you leave ticked to the **Uncategorized** folder. To try it first, choose **Select none** and tick one record.

- **One way only:** nothing on Discogs is changed or removed, and nothing is imported from it. Deleting a record in the app leaves it on Discogs.
- **Only the release is sent:** condition, price, purchase details, notes and cover photos stay in the app.
- **Linked records:** a record added from a Discogs result already knows its release. For others, choose **Find** under **Not linked to Discogs** and pick the pressing you own. The choice is saved with the record.
- **Copies:** if the app holds two records of one release and Discogs has one, one more is added.
- **Speed:** about one release a second, to stay within the Discogs request limit. Keep the screen open until it finishes.
- **Interrupted:** if a request fails and may have got through, sending stops. Check the collection again before sending more.

## How adding a record works

| Method | Sources, in order | Limits |
|---|---|---|
| Barcode | Discogs, MusicBrainz, iTunes | Older records often have no barcode |
| Cover photo | Text read on the phone, then iTunes and Discogs, ranked by likeness to your photo | Needs readable text on the cover; the first use downloads a few MB |
| Typed search | Discogs, then iTunes | |
| Manual | You | |

Always check the chosen pressing: edition and colour are guessed from the Discogs description. iTunes results describe the digital release, so their tracklist may differ from your record.

Saved cover thumbnails come from Cover Art Archive, iTunes or your own photo. Discogs pictures can only be linked to, so they may not show offline.

## Track previews

On a record's page, each track has a play button for a 30-second clip. Clips come from Apple's public search service: no account, key or subscription is needed, and nothing is saved.

- Opening a record sends its artist and title to Apple to find the clips.
- Tracks are matched by name. Live, remix and demo versions are only matched when your tracklist names them that way.
- A magnifier button searches for a track that was not on the matched album. On iPhone it may take a second tap to start.
- Previews need a connection, and some releases are not listed.
- Spotify is offered as a search link only, because its service does not give previews to new apps without a server.
- Apple allows previews for promoting its store, which is why a link to Apple Music sits beside them. Check Apple's current terms before using this in anything beyond a personal app.

## Where data lives

```
config/access                      your invite phrase (you create this; apps cannot read it)
vaults/{vault}                     one per synced collection; {vault} is a fingerprint of its code
vaults/{vault}/records/{record}    record details, encrypted
vaults/{vault}/covers/{record}     JPEG thumbnail, under 100 KB before encryption
```

Without syncing, records and covers are in the browser's own storage. Settings are always there.

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
| `src/data` | Record types, browser storage, settings, sorting, totals, backup |
| `src/sync` | Sync codes, encryption and Firestore |
| `src/lookup` | Discogs, MusicBrainz and iTunes |
| `src/discogs` | Sending records to a Discogs collection |
| `src/preview` | Matching and playing track previews |
| `src/scan` | Barcode camera, text reading, artwork and thumbnails |
| `src/search` | Collection search |
| `src/theme` | Colours from covers, light, dark and night |
| `src/pages`, `src/components` | Screens, shelf and slider |
