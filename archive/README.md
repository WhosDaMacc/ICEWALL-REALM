# Archived files

Code moved out of `src/` on 2026-11-10 so the React frontend (`npm run build`,
react-scripts) can compile. The TypeScript checker scans all of `src/`, so
even unused files with broken imports fail the build. Nothing here was
deleted — it is preserved for later revival.

- `components-App.tsx` — an older duplicate App entry point (was
  `src/components/App.tsx`). Nothing imported it. It imports
  `./Profile`, `./Realm`, `./Business` components that were never committed,
  so it cannot compile as-is. It is worth keeping because it shows the
  intended provider wiring: Web3Provider + UserProvider + RealmProvider +
  ARProvider around the router, with routes `/`, `/profile`, `/realm/:id`,
  `/realm/:id/ar`, `/business/:id`.
- `components-NavitarMap.tsx` — Google Maps navitar map (was
  `src/components/NavitarMap.tsx`, 506 lines). Nothing imported it. It
  imports `@react-google-maps/api`, which was never installed, and hardcodes
  `googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY"`, so it could not run even
  with the package installed. The live map is the Leaflet one in
  `src/pages/RealmMap.tsx`. Revival needs the package installed plus a real
  Google Maps API key.
- `components-RealmMap.tsx` — Google Maps realm map (was
  `src/components/RealmMap.tsx`, 83 lines). Nothing imported it; the app
  uses `src/pages/RealmMap.tsx` (Leaflet) instead. Same missing package and
  same missing key (`REACT_APP_GOOGLE_MAPS_API_KEY`, defaults to empty).
- `server/` (separate folder) holds the Express / Next.js backend files
  moved out of `src/` for the same reason; see `server/README.md`.
