# Landscape shelf mockups

Five ways to redesign the sideways view of the shelf. They sit beside the app and change nothing in it. The records are invented (the app's eight samples and 52 more); nothing is saved or sent.

**Open `index.html` in a browser** to try all five side by side, or `screenshots/overview.png` to compare them at a glance. Each option also opens on its own; narrow the window to a phone held sideways, or use the browser's phone view.

All keep the Listening Room look: the page takes its colours from the focused cover, with Fraunces for titles and Figtree for the rest.

| Option | In one line | Screenshot |
|---|---|---|
| [1 · Pull-Out Shelf](1-pull-out.html) | Cover and disc swing out of a shelf of spines | [view](screenshots/1-pull-out.png) |
| [2 · Crate Dig](2-crate-dig.html) | Flip through a crate, sleeve by sleeve | [view](screenshots/2-crate-dig.png) |
| [3 · Spine Wheel](3-spine-wheel.html) | Level spines fanned around a wheel | [view](screenshots/3-spine-wheel.png) |
| [4 · Stacks](4-stacks.html) | Piles by letter, year or price: a chart you can pick from | [view](screenshots/4-stacks.png) |
| [5 · Needle Drop](5-needle-drop.html) | Every spine on screen, widening under your finger | [view](screenshots/5-needle-drop.png) |

Option 1 is the "cover and disc in focus, spines for the rest" design. Options 3, 4 and 5 also show the others as spines only, in different arrangements.

## How each behaves

| | Scrolling | Focusing | Sorting | Scrubbing |
|---|---|---|---|---|
| **1 · Pull-Out** | Swipe sideways, with momentum | The spine turns into the sleeve in the middle and the disc slides out. Tap a spine to pull it out | Re-orders around the focused record; divider cards mark groups | Strip of spine colours with a bubble |
| **2 · Crate Dig** | Swipe down for next, up for previous | Front sleeve upright, disc out, details beside it | Crate re-orders; tabs and the crate front name groups | Contacts-style index on the right edge |
| **3 · Spine Wheel** | Swipe the wheel up or down; swipe the cover sideways | Spine drawn out to a pointer; cover dealt in with disc spinning | Buttons down the left edge; group names on the rim | Coloured bar on the right edge |
| **4 · Stacks** | Sideways between piles, up and down within one | Tapped record lifts from its pile; cover and disc on the left | Records fly into new piles, each labelled and counted | Miniature bar chart underneath |
| **5 · Needle Drop** | Nothing scrolls; swipe the top half to step | Tap a spine or drag along them; the disc slides out and the arm drops when you stop | Spines re-order in place above a ruler | The shelf itself |

In all five: tapping the focused cover or **Open** would open the record page, holding a record shows the menu, arrow keys step through, and the sun or moon button changes light, dark and night. Where a screen has a disc, tapping it would play a preview (a new idea, not something the app does from the shelf today).

## What to weigh

- **Pull-Out** is the closest to the existing spine shelf, so portrait and landscape would feel like one app. Spine titles read sideways.
- **Crate Dig** is the most physical, but vertical swiping on a short screen has the least room, and only one cover is readable.
- **Spine Wheel** has the most readable spines. It puts the sort buttons down the side, a new pattern for the app.
- **Stacks** says the most about the collection under Price and Year. Under Artist the piles are short and the space above them is empty. It has the most gestures to learn and is the most work to build.
- **Needle Drop** is the fastest way across a collection, up to about 150 records. Far spines are only slivers of colour.

Spines are narrower than the 44 px iPhone touch target. Each option can also be driven by dragging, so a near miss is corrected by moving the finger.

## Limits of the mockups

- Toasts stand in for the record page, the hold menu and the previews. **Clear filters** is not shown.
- Space is kept clear at both sides for the notch or Dynamic Island; shelves run underneath it.
- Spine and second colours are set per record rather than read from the picture.
- Checked in headless Chrome, not on a real iPhone: layouts at 667 × 375, 844 × 390 and 932 × 430, and gestures by script at 844 × 390. Safari's own edge swipe for going back may compete with sideways dragging near the edges.

## Files

`shared/core.js` holds sorting, colour rules (copied from `src/theme`), focus and gestures. `shared/records.js` holds the records, `shared/base.css` the common look, and `shared/fonts` the two fonts. The eight sample covers are read from `public/samples`.
