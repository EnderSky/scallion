# CHANGELOG - Scallion

## [1.1.17] - 2026-11-18
### Changed
- **No-Grow Active Highlight**: `.player-card.active` highlight now uses only `border-color` and `box-shadow` glow; `transform: scale(...)` removed so card dimensions never change during active-turn pulses.
- **Toast Grid Cell**: `#toast-container` moved from fixed positioning into `.arena-stage` as a direct child occupying grid cell (3,3) — `grid-column: 3; grid-row: 3;` — so rarity toasts render in the bottom-right cell without clipping or overlapping the input bar. `.toast` restyled to wrap cleanly (`font-size: 0.72rem`, `padding: 4px 6px`, `width: 100%`, `white-space: normal`).
- **Reclaim Mobile Top Dead Space**: `#game-screen` switched to `justify-content: flex-start` with `padding-top: max(6px, env(safe-area-inset-top))` so the prompt ticket sits cleanly near the top viewport edge. `.arena-stage` set to `flex: 1; min-height: 0; align-content: center; margin: 0 auto;`. `#turn-indicator` and `#answer-form` given `flex-shrink: 0; margin-top: 4px;` to prevent grid overlap.
- **Compact Mobile Cards**: `@media (max-width: 480px), (max-height: 780px)` — `.player-card` padding tightened to `4px 5px; gap: 2px;` and `.player-card svg` height set to `clamp(22px, 4dvh, 32px);` so all 3 grid rows fit comfortably above the status text.

## [1.1.16] - 2026-11-18
### Changed
- **Proportional Chopping Board & Cleaver Scaling**: `.chopping-block` diameter increased to `clamp(112px, 28vw, 155px)` with `overflow: visible`. Center scallion SVG scaled to `height: 46%; width: auto;` and cleaver SVG to `width: 48%; height: auto;`, both proportional to the board and positioned upper-right so the scallion face stays visible.
- **Board Label Pill**: `.center-player-name` restyled as an unclipped dark pill at the bottom rim of the chopping board (`position: absolute; bottom: -10px;`).
- **Compact, Balanced Player Cards**: `.arena-stage .player-card` tightened to `padding: 5px 6px; gap: 3px;`; `.rarity-bar-fill` slimmed to `height: 5px; margin-top: 2px;`; player scallion SVG set to `height: clamp(26px, 4.5dvh, 38px);`.
- **Even Vertical Rhythm**: `.arena-stage` gap set to `clamp(10px, 2dvh, 18px) clamp(8px, 2vw, 16px);` for balanced breathing room between top row, chopping board, and `YOU` card.

## [1.1.15] - 2026-11-18
### Fixed
- **Mobile Vertical Overflow**: `#game-screen` now uses `100vh` fallback before `100dvh` with `env(safe-area-inset-*)` padding to prevent the local `YOU` card from overlapping the input bar on notched/safe-area devices. `.arena-stage` rows pack tightly (`grid-template-rows: auto auto auto`, `align-content: center`, `gap: clamp(4px, 1dvh, 12px)`).
- **Compact Mobile Media Query**: Added `@media (max-width: 480px), (max-height: 780px)` scaling prompt banner, chopping board, player cards, scallion SVG, life pips, and `.you-badge` so all 3 grid rows fit cleanly above the turn indicator and input bar on 375×667px screens.
- **Toast Cascade Fix**: Audited all `#toast-container` and `.toast` positioning rules; removed duplicate/conflicting `bottom`/`right` declarations so rarity toasts never clip behind the SEND button.

## [1.1.14] - 2026-11-18
### Changed
- **3×3 Grid Slot Wiring**: `public/client.js` now renders all player cards directly as children of `.arena-stage` using deterministic 3×3 grid slot classes (`.slot-local`, `.slot-top`, `.slot-top-left`, `.slot-top-right`, `.slot-mid-left`, `.slot-mid-right`), replacing polar-coordinate absolute positioning (`Math.cos`/`Math.sin`, `style.left`/`style.top`).
- **Opponent Rotation**: Opponents are rotated starting from the player immediately after the local player in turn order, mapped to grid slots per opponent count (1–5).
- **YOU Badge**: Local player card receives `slot-local` class and a `<span class="you-badge">YOU</span>` pill for immediate identification.
- **Legacy Cleanup**: `#player-ring` and `#local-player-slot` contents are cleared and hidden to prevent duplicate card rendering; `window.resize` listener for polar math removed.

## [1.1.13] - 2026-11-18
### Added
- **3×3 CSS Grid Compass**: `.arena-stage` converted to a 3×3 grid (`1fr auto 1fr`) with explicit slot classes (`.slot-local`, `.slot-top`, `.slot-top-left`, `.slot-top-right`, `.slot-mid-left`, `.slot-mid-right`) replacing absolute-positioned `#player-ring` layout.
- **No-Scroll Mobile Viewport**: `#game-screen` locked to `100dvh` with `overflow: hidden`, compact `clamp()` sizing on prompt banner, timer bar, `#recent-answers`, and input bar for zero-scroll fit on 375×667px screens.
- **`.you-badge`**: Gold pill badge on `.slot-local` card to identify the local player.
### Fixed
- **Blocked Toast Notifications**: `#toast-container` changed to `position: fixed` at bottom-center (`clamp(64px, 11vh, 88px)`), `z-index: 1000`, so rarity toasts float above the input bar and are never clipped by the SEND button.

## [1.1.12] - 2026-11-18
### Fixed
- **Google Fonts 400**: `public/index.html` now requests only valid per-font weights (`Fredoka:wght@400;600;700`, `Nunito:wght@400;700;800;900`) instead of unsupported weights that caused 400 responses.
- **iOS cursive fallback**: `public/style.css` replaces `cursive` with `ui-rounded, 'SF Pro Rounded', system-ui, sans-serif` and adds `-webkit-text-size-adjust: 100%;` to `body` to prevent iOS font/layout inflation.

## [1.1.11] - 2026-11-18
### Added
- **6-Player Room Cap**: `server/gameManager.js` enforces `MAX_PLAYERS = 6`; `joinRoom` rejects additional players with `"Room is full (max 6 players)."`.
### Fixed
- **iOS Safari Font Loading**: `public/index.html` loads Google Fonts via `<link rel="preconnect">` and a `<link rel="stylesheet">` (`wght@400;600;700;800;900&display=swap`) instead of CSS `@import`, with a fixed viewport (`maximum-scale=1.0, user-scalable=no`) to prevent font/layout shifts on iOS.

## [1.1.10] - 2026-11-18
- Updated opponent arc math to prevent overlap with the chopping board.
- Lowered the arc center (`cy = height * 0.58`) and enforced safer minimum radii.
- Wrapped `positionOtherPlayers()` in `requestAnimationFrame` during render to ensure accurate layout dimensions.

## [1.1.9] - 2026-11-18
- Fixed toast positioning by moving `#toast-container` to the status bar above the local player.
- Fixed "card-jumping" bug by migrating `.panic-shake` to use the CSS `translate` property instead of `transform`.
- Increased `.arena-stage` headroom to `320px` and shifted the chopping block down to prevent collision with orbiting players.

## [1.1.8] - 2026-11-18
- Implemented circular arc positioning for other players in the Game Arena.
- Local player card now resides in a dedicated `#local-player-slot` above the input bar.
- Added elliptical arc math for player distribution (190° to 350°).
- Updated `.panic-shake` animation to maintain `translate(-50%, -50%)` for orbiting cards.
- Added window resize listener to dynamically reposition the player ring.

## [1.1.7] - 2026-11-18
- Refactored Game Arena layout to a layered architecture.
- Separated local player card into a dedicated `#local-player-slot` above the input bar.
- Converted `#player-ring` to an absolute-positioned overlay for other players to orbit the chopping block.
- Optimized `.game-layout` width to prevent horizontal overflow.

## [1.1.6] - 2026-11-18
- Fixed player card stacking by targeting the exact container selector `#player-ring` with `!important` flex rules.
- Enforced horizontal wrapping and prevented vertical stacking for `.player-card`.
- Widened `.game-layout` to ensure it utilizes full screen width.

## [1.1.0] - Milestone: Game Pacing & UI Refinement (Step 14A/B/15A/B/C)
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

## [1.0.2] - Milestone: Game Loop Refinement & Polish (Final)
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

## [1.0.1] - Milestone: Visual Identity & UX Polish
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

## [1.0.0] - Milestone: Online Hosting & Infrastructure
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

## [0.1.0] - Milestone: Core Engine & Socket.io Setup
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
