# CHANGELOG - Scallion

## Milestone: Game Pacing & UI Refinement (Step 14A/B/15A/B/C)
### Changed
- **Toast Routing**: Implemented smart toast routing in `client.js`. Lobby/Waiting Room alerts now use `#global-toast-container` (top-centered), while in-game alerts use the status slot below the chopping block.
- **Start Countdown**: Added `game_starting` handler. The game now starts with a 3-second countdown in the arena view: `"🔪 Get ready! [Player] is up first in 3..."`
- **Intermission Polish**: Updated `round_intermission` to show both the victim and the next active player: `"🔪 [Player] got chopped! [NextPlayer] is up next in 3..."`
- **Visual Polish**: 
  - Updated tab title to "Scallion | Chopped".
  - Increased center Scallion size (80px) and centered it with the player name using a new flex container.
  - Redrew the Cleaver as an angled poised asset with "cock-back" panic pulses and a decisive "chop" swing.
  - Added a scrollable category pill tray in the Lobby.
- **Cleanup**: Removed the background rarity watermark text logic and CSS.
- **Pacing**: Increased fuse duration to 18–32s and bumped minimum turn windows to 8s.

### Files & Key Symbols
- `public/index.html`: Updated structure, tab title, and layout.
- `public/style.css`: Added `.chopping-contents`, new cleaver animations, and scrollable tray.
- `public/client.js`: `showToast` routing, `socket.on('game_starting')`, and updated intermission countdown.
- `server/gameManager.js`: `MIN_FUSE_MS`, `MAX_FUSE_MS`, `MIN_TURN_WINDOW_MS`, `startGame`.
- `server/index.js`: `gameManager.on('game_starting')`.

---

## Milestone: Game Loop Refinement & Polish (Final)
### Fixed
- **Pointer Alignment**: Fixed arrow rotation logic using `getBoundingClientRect` and `Math.atan2` for pixel-perfect targeting.
- **Timer Sync**: Fixed timer bar reset on turn switch; added red color shift when < 25% remaining.
- **Winner Overlay**: Fixed view-flip bug where `room_updated` would override the Winner screen.
- **State Machine**: Fixed `ReferenceError` in `onFuseExpired` by removing shadowing of the `snapshot` function.

### Changed
- **Game Loop**: Introduced "Intermission" state (3s) after explosions to allow prompt reading before the fuse restarts.
- **Turn Flow**: Forced a fresh fuse timer on every valid answer instead of only if time was low.
- **UI**: Moved toast container to the bottom to avoid overlapping the prompt banner.
- **Visuals**: Replaced onion emoji with custom Scallion SVG and added a rotating pointer.

### Added
- **Intermission System**: `round_intermission` event and `#intermission-banner` overlay.
- **Recent Answers**: `#recent-answers` pill bar with rarity-based color coding.
- **Typing Presence**: `typing_update` / `player_typing` relay for live "Typing..." bubbles.
- **Play Again**: Host-only restart functionality via `play_again` socket event.

### Files & Key Symbols
- `server/gameManager.js`: `onFuseExpired`, `submitAnswer`, `endGame`.
- `server/index.js`: `typing_update`, `play_again`.
- `public/index.html`: `#intermission-banner`, `#recent-answers`, `.pointer-orbit`.
- `public/style.css`: `.turn-pointer`, `.typing-bubble`, `.answer-pill`, `.winner-backdrop`.
- `public/client.js`: `updatePointerRotation`, `showToast`, `updateFuseUI`.

---

## Milestone: Visual Identity & UX Polish
### Added
- **Toast System**: Floating, themed notifications (`#toast-container`).
- **Custom Theme**: Dark oceanic palette with scallion-green accents.
- **Responsive Layout**: `100dvh` support for mobile browser compatibility.
- **Waiting Room Polish**: Click-to-copy room code badge.

### Changed
- **Game Arena**: Shifted to a Grid layout for better alignment across devices.
- **Player Cards**: Added rarity progress bars and state-based styling (active/eliminated).

### Files & Key Symbols
- `public/index.html`: `#toast-container`, `#view-waiting`.
- `public/style.css`: `:root` variables, `.game-layout`, `.player-card`.
- `public/client.js`: `showToast`, `showView`.

---

## Milestone: Online Hosting & Infrastructure
### Added
- **Proxy Readiness**: `app.set('trust proxy', 1)` for Render/Cloudflare/ngrok.
- **Health Check**: `GET /health` endpoint for cloud host monitoring.
- **Deployment Config**: `.gitignore` and `engines` field in `package.json`.

### Changed
- **Socket Config**: Added `cors` and aggressive `pingInterval`/`pingTimeout` to stabilize mobile connections.

### Files & Key Symbols
- `server/index.js`: `app.get('/health')`, `io` config.
- `package.json`: `"engines": { "node": ">=18.0.0" }`.
- `.gitignore`: `node_modules/`, `.env`.

---

## Milestone: Core Engine & Socket.io Setup
### Added
- **Question Loader**: Synchronous JSON loading with typo-tolerant Levenshtein validation.
- **Game Manager**: Room-based state machine, hot-potato timer logic, and heart/rarity point system.
- **Network Layer**: Socket.io wiring for room creation, joining, and answer submission.
- **Basic Frontend**: Three-view architecture (Lobby, Waiting, Game).

### Files & Key Symbols
- `server/questionLoader.js`: `validateAnswer`, `getRandomPrompt`.
- `server/gameManager.js`: `createRoom`, `startGame`, `submitAnswer`.
- `server/index.js`: Express server and Socket.io event handlers.
- `public/index.html`, `public/style.css`, `public/client.js`.