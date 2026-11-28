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

## Add from the search page

The switch beside the **Search** title chooses between **Collection** and **Discogs**.

- **Discogs search:** vinyl releases by artist, album, catalogue number or barcode. It starts when you press Search or Return, or switch over with something already typed, not on every keystroke.
- **Add:** saves that release to your collection at once, with its tracklist, pressing details and artwork where one can be saved. Price, date, store and condition are left empty; add them later with **Edit**.
- **Review first:** tap the result itself to open the filled-in form before saving.
- **Already owned:** results are marked, and adding one again asks first.
- Only this app's collection changes. To copy records to your Discogs account, see **Send your collection to Discogs**.

## Original release year

A record's page shows when the album first came out, which for a reissue differs from the year of your pressing.

- **Sources:** Discogs, using the linked release, then MusicBrainz. Opening a record sends the release ID, or its artist and title, to them.
- **Kept on the device:** a year that was found is remembered there, so the record itself is not changed.
- **Unsure:** nothing is shown if no match is found, or if albums of the same name came out in different years.
- **Correct it:** type **Original year** on the record's edit form. It is saved with the record and replaces the one found online.

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

The page takes two colours from the cover of the record in focus: the one pulled out on the shelf, centred in the slider, or open on its own page. Other screens keep the last one.

- **Primary:** the colour covering most of the cover fills the page. A colour wins over black, white or grey when they cover about as much.
- **Secondary:** the most prominent clearly different colour marks buttons, the selected tab, the shelf ledge, the disc label and the glow behind the artwork.

| Appearance | What it does |
|---|---|
| Match my phone (default) | Light or dark, following the phone |
| Light | The primary colour, lightened only if it is too dark for a light page |
| Dark | The primary colour, darkened only if it is too light for a dark page |
| Night | The deepest shade, with a dimmed secondary colour and artwork, and warm text |

Change it with the sun or moon button on the shelf, or under **Settings**. A change of lightness keeps the hue. Filled shapes show the secondary colour as it is (dimmed at night). Where it is used for text and outlines, it is lightened or darkened until it passes a contrast of at least 4.5 to 1, as all text is. A black, white or grey cover gives a black, white or grey page, with its second colour as the highlight.

Colours are read from the picture each time, so records saved by an earlier version follow these rules without being changed. A record's spine keeps its saved colour until you edit and save the record. A cover that is only linked from Discogs cannot be analysed, so the page uses the record's saved colours, or stays neutral until you save artwork or a photo.

Colours are read by `src/theme/extract.ts`; the page rules are in `src/theme/palette.ts`.

### On iPhone

The app follows iPhone conventions without changing the look above:

- A floating tab bar holds Shelf, Add and Stats, with Search as its own button. Each tab returns to what it was showing, and tapping the current tab scrolls to the top.
- Large titles shrink into a bar as you scroll. Settings and record pages have a round back button, and the add and edit form has **Cancel** and **Save** at the top.
- Lists and forms are grouped rows, with switches for on and off settings and centred alerts before anything is deleted.
- Text follows the iPhone text size setting. Add the app to the Home Screen to run it without Safari's bars.

| Gesture | Where | What it does |
|---|---|---|
| Swipe sideways | The large cover on the spine shelf | Next or previous record |
| Slide a finger along | A row of spines | Pulls out each record it passes |
| Press and hold | A spine, cover or search result | Menu to open, edit or delete |
| Swipe left | An album in search results | Shows **Edit** and **Delete** |
| Pull down from the top | The add or edit form | Closes it, asking first if you changed anything |

Everything a gesture does can also be done with buttons. Going back is the phone's own swipe from the screen edge. With a mouse, a right click opens the press-and-hold menu.

### Sideways view

Turn a phone to landscape on the shelf to get the cover slider: the focused record is enlarged with its disc slid out. Swipe, tap a side cover, use the arrows or drag the bar underneath, and sort by artist, title, year, purchase date or price. The phone's rotation lock must be off. It appears when the screen is landscape and no more than 540 px tall.

A record's page has a sideways layout too, under the same condition. The back button, **Edit**, the cover with its disc slid out, and the title and edition stay on the left, so the record you opened is always in view. The purchase tiles, tracklist, notes and details scroll on the right.

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
