# Westwood Lineup

A phone-first app for building little league defensive lineups inning by inning,
and exporting them as a printable lineup card.

Built for a continuous batting order: **every rostered player bats**, but only
nine take the field each inning. With a 20-player roster that means eleven kids
sit every inning, so the app tracks bench time and flags unfair patterns.

## What it does

- **Roster** — up to 20 players (name + uniform number). Roster order is the
  batting order.
- **Per-inning lineup** — six innings by default, changeable per game.
- **Field view** — drag a player onto a position, or tap a player then tap a
  position. Both work; tap is the reliable one on a phone.
- **Grid view** — the whole game as a table, the same shape as the printed card.
- **Auto-fill** — suggests a full lineup that spreads bench time evenly, avoids
  benching anyone twice in a row, and rotates players through positions.
- **Fair play panel** — bench count per player, plus warnings for back-to-back
  sits, uneven bench time, and anyone stuck out of the infield all game.
- **PDF export** — a one-page lineup card matching the standard format.
- **Works offline** — installable to your home screen; no signal needed at the
  field.

## Running it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests for autofill, fairness, and the store
npm run build    # production build into dist/
```

## Deploying to Vercel

This repo is configured for Vercel (`vercel.json` handles SPA routing and
service-worker cache headers). The import is a one-time manual step:

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New → Project**, then **Import** this repository.
3. Leave the defaults — Vercel detects Vite automatically.
4. Click **Deploy**.

Every push to the branch redeploys automatically after that.

### Installing it on your phone

Open the deployed URL on your phone, then:

- **iPhone (Safari):** Share → Add to Home Screen.
- **Android (Chrome):** menu → Install app / Add to Home screen.

It then launches full-screen like a native app and works with no signal.

## Your data lives on your device

Rosters and games are stored in the browser's local storage on the phone or
computer you set them up on. They are **not** synced to a server or to your
other devices.

That means clearing your browser data, switching phones, or using private
browsing will lose the season. Use **Games → Export backup** now and then to
save a JSON file, and **Import backup** to restore it.

## Project layout

```
src/
  types.ts                 domain types; OUT is always derived, never stored
  store/useAppStore.ts     zustand store, persisted, swap-aware assignment
  lib/
    autofill.ts            lineup suggestion algorithm
    fairness.ts            bench counts, warnings, completeness checks
    pdf.ts                 lineup card generation (jsPDF + autotable)
    ids.ts                 ids, seeded RNG, date formatting
  components/              field diagram, grid, bench, tabs, fairness panel
  views/                   Lineup, Games, Roster
  styles/tokens.css        design tokens — change colours here, only here
scripts/pdf-sample.ts      renders a sample PDF for visual checks
```

### Regenerating a sample PDF

```bash
npx vite-node scripts/pdf-sample.ts -- out.pdf 20 6   # 20 players, 6 innings
```

## Design notes

Colours are sampled from the Westwood logo: green `#2C653A`, black, white.
They live as CSS custom properties in `src/styles/tokens.css` — components never
hardcode a hex, so re-theming is a single-file change.

Two deliberate choices worth knowing about:

- **The brand green is also the universal "success" green.** Rather than let a
  green "complete" indicator vanish into green chrome, completion is shown with
  a check glyph and a tint background. Warnings use amber. Nothing depends on
  hue alone.
- **The PDF is intentionally unbranded.** It keeps the neutral charcoal header
  of the standard lineup card so position letters and the shaded `OUT` cells
  carry all the meaning on paper.
