# CHANGELOG - Scallion

## [1.1.37] - 2026-11-19
### Changed
- **Prompt Banner Loading State**: `public/client.js` — During `game_starting` and `round_intermission` countdowns, prompt banner now shows "Loading prompt..." instead of stale/previous prompt. `ticket-swap` animation cleared. Real prompt appears when `game_state` arrives.
- **Cache-Busting**: `public/index.html` bumped to `?v=29` for `style.css` and `client.js`.

## [1.1.36] - 2026-11-19
### Fixed
- **Post-Game Countdown Text Stuck**: `public/client.js` — `lobby_ready` now explicitly clears `waitingStatusEl.textContent` and adds `hidden` class after `resetPostGameState()`, preventing "Returning to lobby in 1..." from reappearing when host message toggles visibility.
- **Leave Room Bounce-Back (Pre-Game & Post-Game)**: `public/client.js` — Membership guards in `room_updated`, `game_starting`, `game_state`, `lobby_ready` now check `room.players` membership **unconditionally** (removed `currentRoomCode &&` prefix), so players who left are never processed. Added `justLeftRoomCode` debounce flag to ignore stale events for the room just left.
- **Cache-Busting**: `public/index.html` bumped to `?v=28` for `style.css` and `client.js`.

## [1.1.35] - 2026-11-19
### Fixed
- **Create Room Flow**: `public/client.js` — `room_updated` now sets `currentRoomCode = room.code` (was only setting `myRoomCode`), so host's Start Game button has a valid room code. Fixed `room.phase` → `room.state` mismatch in `room_updated` and `lobby_ready` handlers. Added debug logging to trace create/join flow.
- **Start Game Countdown**: `public/client.js` — `game_starting` guard checked `data.roomCode` but server emits `data.code`; fixed to check `data.code` so 3s intermission countdown ("🔪 Get ready! X is up first in 3...") appears correctly.
- **Width Standardisation**: `public/style.css` — `--arena-bar-width` changed to `min(100%, 560px)` to match `.arena-stage` max-width. `.prompt-banner`, `.arena-bottom-sticky .input-area`, and `#answer-form` all constrained to this width. `#answer-form` now `width: 100%` so input stretches, Send button stays fixed-size on right.
- **Cache-Busting**: `public/index.html` bumped to `?v=27` for `style.css` and `client.js`.

## [1.1.34] - 2026-11-19
### Fixed
- **Bulletproof Leave-Room Guard**: `public/client.js` — `btnLeaveRoom` now captures `codeToLeave`, immediately nulls `currentRoomCode`, calls `resetPostGameState()`, switches to lobby view, then emits `leave_room`. Added membership guards at top of `room_updated`, `lobby_ready`, `game_starting`, `game_state`: `if (!currentRoomCode) return;` + `if (room.players && !room.players.some(p => p.id === socket.id)) return;` prevents bounced-back ghosts.
- **Victory Showcase State Lock**: `public/client.js` — Added `isPostGameShowcase` flag set `true` in `game_over`, `false` in `resetPostGameState()`. While `true`, `room_updated`/`lobby_ready` are blocked from unhiding meta, hiding winner banner, overwriting countdown, or re-rendering without `.is-winner`/`.winner-crown`/`.is-dead`. `server/index.js` `game:over` now emits full `players[]` array so client can render crown/dead states correctly.
- **In-Game Panic Shake Restored**: `public/style.css` — `@keyframes panicShake` uses `translate` (`0%,100% {translate:0 0} 25% {translate:-2px 1px} 75% {translate:2px -1px}`); applied to `#view-game .panic-shake` (0.18s infinite). `#waiting-screen .panic-shake` forced `animation:none !important`. `public/client.js` `updateFuseUI` adds `.panic-shake` to active player card and cleaver when fuse <30%, strips on expiry.
- **Gold Ring on Waiting Board**: `public/style.css` — `.chopping-block.waiting-board` gets `border:5px solid #facc15 !important; box-shadow:0 0 18px rgba(250,204,21,0.55), 0 6px 0 #160d08 !important;` so base rules cannot override.
- **Cache-Busting**: `public/index.html` bumped to `?v=26` for `style.css` and `client.js`.

## [1.1.32] - 2026-11-19
### Changed
- **Room Code Randomization on Auto-Return**: `server/gameManager.js` — `resetRoomToLobby(oldCode)` now generates a brand-new unique 4-letter room code, deletes the old code from the rooms Map, stores the room under the new code, and returns `{ oldCode, newCode, room }`. All player states, timers, prompts, and used answers are cleared.
- **Socket Migration on Auto-Return**: `server/index.js` — Inside the 5000ms `returnTimer`, all remaining sockets in the old room are migrated to the new room code via `socket.leave(oldCode)` / `socket.join(newCode)`, then `'lobby_ready'` is emitted on the new code.
- **Fix `leave_room` Bounce-Back**: `server/index.js` — Confirmed `socket.leave(code)` is called before `io.to(code).emit('room_updated', ...)` so the leaving socket never receives the room update that would bounce it back to the Waiting Room.

## [1.1.31] - 2026-11-19
### Added
- **Post-Game Rejoin UI**: `public/client.js` — `resetPostGameState()` clears winner state, strips shake/crown/dead classes, and clears event/recent-answer logs. On `game_over`, hides `#waiting-room-meta`, shows `#waiting-winner-banner` with `"👑 <Winner> WINS!"`, renders winner with crown and dead opponents as `.is-dead`. Post-game controls show `PLAY AGAIN` (host) or `REJOIN LOBBY` (non-host) + `LEAVE ROOM`. `rejoin_status` disables `REJOIN LOBBY` when waiting for host; `lobby_ready` calls `resetPostGameState()` and re-renders fresh lobby.
- **Shake Removal**: `public/style.css` — Disabled `.panic-shake`, `.cleaver-panic`, and board/active-turn shake animations so cards and board stay steady.
- **Fixed Prompt Ticket**: `public/style.css` — Added `--arena-bar-width` CSS variable (`min(92vw, 420px)`); prompt ticket locked to `width: var(--arena-bar-width); min-height: 108px;` centered flex layout.
- **Flush Input Alignment**: `public/style.css` — Answer input row set to `width: var(--arena-bar-width);` with `align-items: stretch` so input left border aligns with prompt ticket left border and SEND button right border aligns with prompt ticket right border.

### Fixed
- **Post-Game Artifacts**: `public/client.js` — `resetPostGameState()` called on `room_updated`, `leave_room`, and `lobby_recreated` to strip all `.panic-shake`, `.board-shake`, `.is-winner`, `.is-dead` classes and clear `#event-log` / `#recent-answers`.

## [1.1.30] - 2026-11-19
### Changed
- **Room Code Randomization on Auto-Return**: `server/gameManager.js` — `resetRoomToLobby(oldCode)` now generates a brand-new unique 4-letter room code, deletes the old code from the rooms Map, stores the room under the new code, and returns `{ oldCode, newCode, room }`. All player states, timers, prompts, and used answers are cleared.
- **Socket Migration on Auto-Return**: `server/index.js` — Inside the 5000ms `returnTimer`, all remaining sockets in the old room are migrated to the new room code via `socket.leave(oldCode)` / `socket.join(newCode)`, then `'lobby_ready'` is emitted on the new code.
- **Fix `leave_room` Bounce-Back**: `server/index.js` — Confirmed `socket.leave(code)` is called before `io.to(code).emit('room_updated', ...)` so the leaving socket never receives the room update that would bounce it back to the Waiting Room.

## [1.1.31] - 2026-11-19
### Changed
- **Remove Rejoin/Play Again Bloat**: `public/client.js` — Deleted `rejoin_lobby`, `play_again`, `rejoin_status`, `lobby_recreated` handlers and `waitingForHostRejoin` state. Added `returnCountdownInterval` tracker cleared in `resetPostGameState()`. On `game_over`, auto-returns to lobby after 5s with winner showcase (`#waiting-winner-banner` showing `"👑 <WinnerName> WINS!"`, winner card `.is-winner` + crown, others `.is-dead`). `lobby_ready` resets post-game state and re-renders fresh lobby with `START GAME` for host.
- **Simplify Waiting Room Controls**: `public/index.html` — Removed `#rejoin-lobby-btn` and `#play-again-btn`; only `START GAME` (host) and `LEAVE ROOM` remain.
- **Cache-Busting**: `public/index.html` bumped to `?v=24b` for `style.css` and `client.js`.

## [1.1.30] - 2026-11-19
### Changed
- **Remove Rejoin Queue Bloat**: `server/gameManager.js` — Removed `rejoinQueue`, `rejoinLobby`, `hostPlayAgain`, and `'post_game'` phase logic. Rooms now have only two phases: `'lobby'` and `'playing'`. Added `resetRoomToLobby(roomCode)` helper that clears timers, resets player lives to 3, clears prompts/usedAnswers, and returns the room to lobby state.
- **Simplify removePlayer**: `server/gameManager.js` — `removePlayer()` now removes the player, clears any active `returnTimer` if the room becomes empty and is deleted, and automatically promotes `room.players[0].id` to `room.hostId` if the host left.
- **Auto-Return to Lobby**: `server/index.js` — On `game_over`, emits `'game_over'` with `{ winnerId, winnerName, returnDelayMs: 5000 }`, then sets a 5-second `returnTimer` that calls `resetRoomToLobby()` and emits `'lobby_ready'` to the room.
- **Delete Stale Handlers**: `server/index.js` — Deleted `rejoin_lobby` handler and broken `play_again` handler (was causing `ReferenceError`). Updated `leave_room` and `disconnect` to call `socket.leave(code)` and emit `'room_updated'` to remaining players.

## [1.1.29] - 2026-11-19
### Added
- **Post-Game Rejoin UI**: `public/client.js` — `resetPostGameState()` clears winner state, strips shake/crown/dead classes, and clears event/recent-answer logs. On `game_over`, hides `#waiting-room-meta`, shows `#waiting-winner-banner` with `"👑 <Winner> WINS!"`, renders winner with crown and dead opponents as `.is-dead`. Post-game controls show `PLAY AGAIN` (host) or `REJOIN LOBBY` (non-host) + `LEAVE ROOM`. `rejoin_status` disables `REJOIN LOBBY` when waiting for host; `lobby_recreated` calls `resetPostGameState()` and re-renders fresh lobby.
- **Shake Removal**: `public/style.css` — Disabled `.panic-shake`, `.cleaver-panic`, and board/active-turn shake animations so cards and board stay steady.
- **Fixed Prompt Ticket**: `public/style.css` — Added `--arena-bar-width` CSS variable (`min(92vw, 420px)`); prompt ticket locked to `width: var(--arena-bar-width); min-height: 108px;` centered flex layout.
- **Flush Input Alignment**: `public/style.css` — Answer input row set to `width: var(--arena-bar-width);` with `align-items: stretch` so input left border aligns with prompt ticket left border and SEND button right border aligns with prompt ticket right border.

### Fixed
- **Post-Game Artifacts**: `public/client.js` — `resetPostGameState()` called on `room_updated`, `leave_room`, and `lobby_recreated` to strip all `.panic-shake`, `.board-shake`, `.is-winner`, `.is-dead` classes and clear `#event-log` / `#recent-answers`.

## [1.1.28] - 2026-11-19
### Added
- **Post-Game Rejoin Queue**: `server/gameManager.js` — Track `phase` (`'lobby'`, `'playing'`, `'post_game'`) and `rejoinQueue` per room. `rejoinLobby()` lets eliminated players join the rejoin queue after `game_over`, returning `waiting_for_host` status until the host clicks Play Again. `hostPlayAgain()` resets the room to `lobby` phase, clears lives/chopped states, and clears the rejoin queue.
- **Automatic Host Promotion**: `removePlayer()` now removes leaving players from `rejoinQueue`. If the host leaves during `post_game` and the queue is non-empty, the first queued player is promoted to host and the lobby is immediately recreated (`phase = 'lobby'`, states reset). Otherwise, the first remaining player is promoted.
- **Socket Events**: `server/index.js` — `rejoin_lobby` handler emits `rejoin_status` to the requester and `room_updated` to the room. `play_again` now uses `hostPlayAgain()` and emits `lobby_recreated` to all room members. `leave_room` and `disconnect` emit `lobby_recreated` when host promotion triggers a lobby reset.

## [1.1.27] - 2026-11-19
### Fixed
- **Server Leave Room**: `server/index.js` — Added `socket.on('leave_room', ...)` handler that removes the player from `room.players` via `gameManager.removePlayer`, calls `socket.leave(roomCode)`, resets `socket.roomCode`, and emits `room_updated` to remaining players. Empty rooms are deleted automatically via `removePlayer`.
- **Client State Guard**: `public/client.js` — `game_started` and `game_state` handlers now ignore events when `!myRoomCode`, preventing a player who already left from being pulled back into a match.
- **Centered Input Bar**: `public/style.css` — `.arena-bottom-sticky` centered with `display: flex; flex-direction: column; align-items: center;` and input row centered with `width: 100%; max-width: 440px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 8px;`.
- **Toast Cache-Busting**: `public/index.html` bumped to `?v=22b` for both `style.css` and `client.js`.

## [1.1.26] - 2026-11-19
### Fixed
- **Disappeared In-Game Players**: `public/client.js` — In-game player renderer now explicitly targets `document.getElementById('game-arena-stage')` instead of `document.querySelector('.arena-stage')`, preventing cards from rendering into the wrong (or no) container after the waiting-room arena was split into a separate element.
- **Leave Room Button**: `public/client.js` — `btnLeaveRoom` emits `leave_room`, resets `myRoomCode`/`lastWinnerId`/`lastWinnerName`, and transitions back to the lobby view.
- **Waiting Room Wood Background**: `public/index.html` removed the white `.card` wrapper from `#waiting-screen`; `public/style.css` sets `background: transparent; border: none; box-shadow: none;` with full-height flex layout, matching the game screen's dark oak butcher-block background.
- **Waiting Room Room Info Inside Board**: Room code, category pill, and player count (`X / 6`) moved inside `.waiting-board` (central wooden chopping board). `.waiting-board` styled with `clamp(135px, 34vw, 185px)` sizing, centered flex column with gap 4px.
- **Waiting Room Card Simplification**: Life stalks (`scallion-lives`) and progress bar (`rarity-bar-bg`) hidden inside `.waiting-arena-stage .player-card` via `display: none !important;` so cards only show scallion, YOU badge / crown, and player name.
- **Toast Cache-Busting**: `public/index.html` bumped to `?v=22a` for both `style.css` and `client.js`.

## [1.1.25] - 2026-11-19
### Added
- **Waiting Room 3×3 Simulation**: `public/client.js` — Extracted `renderArenaPlayers(containerEl, players, options)` shared helper for 3×3 compass slot assignment. Waiting room renders players in `#waiting-arena-stage` with local player at `.slot-local` (YOU badge) and opponents in clockwise compass slots (1–5). Blank chopping board preserved during re-renders.
- **Post-Game Winner Lobby**: `game_over` transitions back to Waiting Room instead of static overlay. Tracks `lastWinnerId`/`lastWinnerName`. Shows `#waiting-winner-banner` (`"👑 <Winner> WINS!"`), winner card with `.is-winner` + `<span class="winner-crown">👑</span>`, dead opponents with `.is-dead` + chopped scallion avatar. `game_starting` clears winner state and resets cards to `calm`.

### Fixed
- **Dead DOM References**: Removed `elements.waitingPlayers` (old `#waiting-players` no longer in DOM). Guarded `waiting-player-count` and `waiting-host-message` lookups.
- **Status Flash Overwrite**: `flashTurnStatus` tracks `statusFlashActive` flag. `updateTurnUI` cancels flash when it becomes local player's turn; preserves active flash (e.g., "Correct! ...") when not local player's turn, letting timer finish before reverting.
- **Life-Loss Toast**: `"lost a heart"` routed exclusively to `addEventLog(...)` (cell 3,3) — never to any toast container.

## [1.1.24] - 2026-11-18
### Added
- **Waiting Room 3x3 Arena Simulation**: `public/index.html` replaces the vertical player list with a live 3×3 arena grid (`#waiting-arena-stage`) showing waiting players around a blank chopping board. Top bar shows room code (copy button), category pill, and player count (`X / 6`). Bottom bar shows host controls (`Start Game`) or waiting message plus `Leave Room`.
- **Winner Crown**: `.winner-crown` gold crown badge positioned at top edge of winner's `.player-card`.
- **Dead Scallion State**: `.player-card.is-dead` with muted opacity and grayscale for eliminated players in post-game lobby.
- **Winner Card State**: `.player-card.is-winner` with gold border and warm glow.

### Fixed
- **Toast Top-Center Pin**: `#global-toast-container` strictly pinned to top-center using `top: max(10px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); bottom: auto; right: auto;` — no bottom-right toast rules remain.

## [1.1.23] - 2026-11-18
### Fixed
- **Exclusive Status-Line Score Alerts**: `public/client.js` — `answer_result` now routes all score/rarity/answer-validation alerts exclusively to `flashTurnStatus(...)`. Removed `addFeedMessage` and `showToast` calls from in-game answer handling so no toast or activity-feed entry is ever created for answer results. The `console.log('[SUBMIT]', ...)` debug line was removed.
- **Cleaver Offset**: `public/style.css` — `.hover-cleaver svg` repositioned to `top: -4%; right: -6%; width: 40%;` with `pointer-events: none;` so it hovers diagonally up and to the right without overlapping the centered scallion. Removed idle rotation/transform from `.hover-cleaver` wrapper.

## [1.1.22] - 2026-11-18
### Fixed
- **Cache-Bust Mobile CSS**: `public/index.html` — Added `?v=21a3` query strings to `style.css` and `client.js` so mobile Safari immediately loads updated files instead of serving cached versions.
- **Recent Answers Separated from Event Log**: `#recent-answers` moved from inside `.arena-stage` (grid cell 3,3) to directly below the timer bar inside `.arena-top-sticky`. `#event-log` remains the only feed element inside `.arena-stage` grid cell (3,3).
- **No Brown Sticky Rectangles**: `.arena-top-sticky` and `.arena-bottom-sticky` explicitly set to `background: transparent; background-color: transparent; box-shadow: none;` across the entire stylesheet including all `@media` queries.
- **Compact Lobby Toast**: `#global-toast-container` centered with `width: auto; max-width: 90vw; left: 50%; transform: translateX(-50%)`. `.toast` uses `width: max-content; max-width: 100%;` so lobby alerts render as compact pills instead of stretching full-width.
- **Desktop Cleaver Scaling**: Removed fixed `px` `width`/`height` constraints from `.hover-cleaver`. Cleaver SVG now uses `width: 44%; height: auto; top: 8%; right: 6%;` scaling properly on both desktop and mobile.

## [1.1.21] - 2026-11-18
### Fixed
- **Answer Submission**: `public/client.js` refactored into `handleAnswerSubmit()` wired to both form submit and `#send-btn` click (Enter key included). Turn check now reads `sendBtn.disabled` directly so submission only fires when it is the local player's turn. Emits `submit_answer` with `{ roomCode, text }` matching `server/index.js`, with `console.log('[SUBMIT]', ...)` for DevTools verification. Input cleared after successful emit.
- **Sticky Brown Boxes**: `.arena-top-sticky` and `.arena-bottom-sticky` set to `background: transparent; box-shadow: none;` — no solid brown rectangles behind the prompt ticket or input bar.
- **Board Scallion & Cleaver**: Center scallion SVG scaled to `height: 52%;` (slightly larger). Cleaver SVG now `position: absolute; top: 10%; right: 8%; width: 42%; transform-origin: center;` hovers diagonally above-right on mobile without crowding the scallion, while staying proportionally visible on desktop.

## [1.1.20] - 2026-11-18
### Fixed
- **Answer Submission Restored**: `public/client.js` — Removed dangling `toastContainer` reference (`#toast-container` no longer in DOM) to prevent `TypeError: Cannot read properties of null`. `isMyTurn` state is now consistently set to `false` on `game_starting` and `round_intermission` events (in addition to `game_state`), so `sendBtn.disabled = !isMyTurn` stays in sync across all turn transitions. Answer submission via `socket.emit('submit_answer', ...)` fires cleanly when it IS the local player's turn and input is non-empty.
- **Sticky Prompt/Timer Alignment**: `public/style.css` — `.arena-top-sticky` now uses `display: flex; flex-direction: column; align-items: center; gap: 8px;` with `padding: max(6px, env(safe-area-inset-top)) 10px 6px;`. `#prompt-banner` has `position: relative; margin: 0 auto;` for centered horizontal placement within the sticky bar.

## [1.1.19] - 2026-11-18
### Added
- **Major Event Log**: `#event-log` in grid cell (3,3) of `.arena-stage`, showing up to 3 recent major events (player chopped, eliminated, joined, left) as compact dark translucent pills via `addEventLog()`.
- **Status-Bar Flash Notifications**: `flashTurnStatus()` displays in-game alerts (correct answers, already-used, invalid) in the `#turn-indicator` above the input bar. A single `statusFlashTimer` ensures new flashes replace older ones and auto-revert to the live turn prompt. All in-game `showToast()` calls route to `flashTurnStatus()`.
- **Pre-Typing Support**: Answer `<input>` stays enabled at all times; only `#send-btn` is toggled (`disabled` when not your turn). Pre-typed text is preserved — submitting while not your turn does not clear the input. Disabled send button shows a crisp diagonal strikethrough overlay.
- **Keyboard-Safe Layout**: `#game-screen` uses `min-height: 100dvh; overflow-y: auto;`. `.arena-top-sticky` pins prompt+timer at top; `.arena-bottom-sticky` pins turn status+input at bottom — both remain visible when the mobile keyboard opens.

### Changed
- **Desktop Layout**: `.arena-stage` max-width widened to 560px.
- **Toast Cleanup**: `#toast-container` removed from `.arena-stage`; `#global-toast-container` retained for Lobby/Waiting Room only.

## [1.1.18] - 2026-11-18
### Changed
- **Status-Bar Flash Notifications**: `public/client.js` adds `flashTurnStatus()` to show in-game alerts (correct answers, already-used, invalid) directly in the `#turn-indicator` status text above the input bar. A single `statusFlashTimer` ensures new flashes replace older ones and auto-revert to the live turn prompt on expiry or turn handover. All in-game `showToast()` calls now route to `flashTurnStatus()` while on the game screen; `#global-toast-container` remains for Lobby/Waiting Room alerts.
- **Bottom-Right Grid Feed**: `#recent-answers` moved inside `.arena-stage` occupying grid cell (3,3), limited to the 3 most recent items (newest on top) so the cell never overflows. `#toast-container` grid-cell rules removed and hidden.
- **Flash State Classes**: Added `.status-success`, `.status-error`, `.status-info` for status text color flash states.

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
