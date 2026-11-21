# CHANGELOG - Scallion

## [1.1.86] - 2026-11-21
### Fixed
- **Dead Bots Now Display as Defeated in Seats**: `public/client.js` — Fixed bug where dead bots (and humans) disappeared from the game arena instead of staying in their seats with a dimmed/chopped appearance.
  - **Root Cause**: `renderGameArenaPlayers` was filtering out dead players (`filter(p => p.alive !== false)`) before seat assignment, causing dead players to disappear entirely instead of remaining in their assigned seats with the `.eliminated` class (dimmed/chopped appearance).
  - **Fix**: Modified `renderGameArenaPlayers` to include ALL opponents (both alive and dead) in the seat assignment. Dead players now render in their assigned seats with the `.eliminated` class (dimmed) and `chopped` avatar state, matching human player behavior. Also stripped leftover `.slot-*` classes from all game arena cards to prevent CSS conflicts.
  - **Files**: `public/client.js` (`renderGameArenaPlayers` function).
- **Cache-Busting**: `public/index.html` bumped to `?v=82` for `style.css` and `?v=83` for `client.js`.

## [1.1.85] - 2026-11-20
### Fixed
- **Bot Victory Selection**: `server/gameManager.js` — When all human players die and only bots remain, the game now selects the bot with the highest health as winner (random if tied). Other bots are marked as dead so they display as defeated before the victory screen.
  - **Logic**: In `checkWinOrContinue`, when no humans remain alive, find the bot(s) with maximum health. Randomly select from tied bots. Mark all other bots as `alive = false` so they render as defeated on the victory screen.
  - **Files**: `server/gameManager.js` (`checkWinOrContinue` function).
- **Cache-Busting**: `public/index.html` bumped to `?v=81` for `style.css` and `?v=82` for `client.js`.

## [1.1.84] - 2026-11-20
### Fixed
- **Human Opponents Not Displaying in Game Arena**: `public/client.js`, `public/style.css` — Fixed bug where human opponents (non-bot players) failed to render in `#game-arena-stage` while bots worked correctly.
  - **Root Cause**: `renderGameArenaPlayers` did not filter dead/eliminated players from the opponents list, causing seat assignment mismatches. Human players lacked `slotClass` (null) while bots had it, and leftover `.slot-*` classes on bot cards had `position: absolute` CSS that conflicted with grid positioning.
  - **Fixes Applied**:
    - `renderGameArenaPlayers`: Filter out dead/eliminated players (`alive !== false`) before seat assignment; validate `players` array for null/undefined entries; clamp opponent count to valid preset range (1-5); strip leftover `.slot-*` classes from all cards; ensure every alive opponent gets a valid `.game-seat-*` class.
    - `public/style.css`: Added `position: static` to `.game-seat-*` classes to explicitly override any residual `position: absolute` from `.slot-*` classes.
  - **Defensive Guards Added**: Filter falsy/null players; clamp opponent count to valid preset range (1-5); guarantee seat assignment; strip `.slot-*` classes from all game arena cards.
- **Cache-Busting**: `public/index.html` bumped to `?v=80` for `style.css` and `?v=81` for `client.js`.

## [1.1.83] - 2026-11-20
### Added
- **Symmetrical 3×3 In-Game Seating with Clockwise Turn Order**: `public/client.js`, `public/style.css` — Complete overhaul of in-game player seating:
  - **Clockwise Turn-Order Rotation**: In `#game-arena-stage`, local player anchored at bottom-center (`.slot-local`). Opponents rendered in clockwise turn order starting immediately after local player (wrapping around server's turn-order array). Seats locked for entire match; eliminated players remain in assigned seats (dimmed).
  - **Symmetrical 3×3 Formation Presets**: New `.game-seat-*` CSS classes for symmetrical seating around the chopping board (center=board, bottom-right=event log, bottom-center=local player). Presets by opponent count:
    - 1 opponent (2P): `['game-seat-tc']`
    - 2 opponents (3P): `['game-seat-tl', 'game-seat-tr']`
    - 3 opponents (4P): `['game-seat-ml', 'game-seat-tc', 'game-seat-mr']`
    - 4 opponents (5P): `['game-seat-ml', 'game-seat-tl', 'game-seat-tr', 'game-seat-mr']`
    - 5 opponents (6P): `['game-seat-ml', 'game-seat-tl', 'game-seat-tc', 'game-seat-tr', 'game-seat-mr']`
  - **Lobby/Waiting Room Unchanged**: `#waiting-arena-stage` retains original fixed left-to-right / top-to-bottom slot allocation, `+ BOT` placeholders, and bot add/remove logic.
  - **All Player Card Features Preserved**: Live typing bubbles (`data-player-id`), `.panic-shake`, `YOU`/`HOST`/bot badges, lives, progress bar intact on desktop & mobile.
- **Cache-Busting**: `public/index.html` bumped to `?v=79` for `style.css` and `?v=80` for `client.js`.

## [1.1.82] - 2026-11-20
### Reverted
- **Polar Positioning Reverted to Grid**: `public/style.css`, `public/client.js` — Polar positioning experiment reverted due to positioning issues. Restored original 3×3 grid layout with slot-based positioning.
- **Cache-Busting**: `public/index.html` bumped to `?v=78` for `style.css` and `?v=79` for `client.js`.

## [1.1.81] - 2026-11-20
### Added
- **Polar Positioning Arena Layout**: `public/style.css`, `public/client.js` — Complete overhaul of player positioning:
  - Replaced fixed 3×3 grid with polar positioning around the chopping board
  - Players positioned on a circle around the board based on their semantic slot
  - Dynamic radius adjusts based on player count (more players = slightly larger radius)
  - Local player (YOU) always at bottom center (`slot-local`)
  - Other players positioned at semantic angles:
    - `slot-top`: -90° (12 o'clock, top center)
    - `slot-top-right`: -30° (1 o'clock)
    - `slot-mid-right`: 60° (3 o'clock)
    - `slot-mid-left`: 120° (9 o'clock)
    - `slot-top-left`: -150° (11 o'clock)
  - Dynamic radius adjusts with player count (45% → 54%)
  - Smooth transitions (0.3s) for join/leave animations
  - Works in lobby, game arena, and victory screen
  - Placeholders positioned at correct polar angles
- **Cache-Busting**: `public/index.html` bumped to `?v=77` for `style.css` and `?v=78` for `client.js`.

## [1.1.80] - 2026-11-20
### Fixed
- **Game Start Countdown Text**: `public/client.js` — Fixed `renderGameStartView` to properly set intermission text ("Get ready! X is up first in N...") instead of showing default "NEW PROMPT INCOMING...". Removed buggy code referencing undefined `card`/`slotClass` variables.
- **Golden Outline on Active Turn**: `public/client.js` — Fixed `game_state` handler to query `.chopping-block` element and add/remove `active-turn` class for golden outline glow when local player's turn.
- **Lobby Bot Placeholders on Return**: `public/client.js` — `lobby_ready` handler now uses `isLobby: true` for host, so bot placeholders and empty human slots reappear correctly when returning to lobby after game over.
- **Cache-Busting**: `public/index.html` bumped to `?v=76` for `style.css` and `?v=77` for `client.js`.

## [1.1.79] - 2026-11-20
### Fixed
- **Bot-Aware Human Slot Skipping**: `public/client.js` — Client now skips bot-occupied slots when assigning human display slots:
  - When computing human display slots, client builds `botOccupiedSlots` from bot `slotClass` values
  - Human display assignment iterates through `HUMAN_SLOT_ORDER`, skipping both self AND bot-occupied slots
  - Example: Bot at `slot-top` → 2nd human gets `slot-top-left`, 3rd human gets `slot-top-right` (skips `slot-top`)
  - When new player joins, client recalculates next available human slot based on current bot positions
  - Placeholders only show for truly empty slots (no human, no bot)
- **Cache-Busting**: `public/index.html` bumped to `?v=75` for `style.css` and `?v=76` for `client.js`.

## [1.1.78] - 2026-11-20
### Fixed
- **Self-Skip Human Display Logic**: `server/gameManager.js`, `public/client.js` — Complete redesign of human display:
  - Server no longer assigns human display slots; **client computes display by skipping self**
  - **HUMAN_SLOT_ORDER**: `['slot-top-left', 'slot-top', 'slot-top-right', 'slot-mid-left', 'slot-mid-right']` — left-to-right, top-to-bottom
  - Each client sees OTHER humans in order, skipping themselves:
    - Host (alone): no display slot
    - 2nd player joins: host sees them at slot-top-left; they see host at slot-top-left
    - 3rd player joins: host sees them at slot-top; 2nd player sees host at slot-top-left, 3rd at slot-top-right
    - Each client skips themselves in the sequence
  - **Bots**: Placed at clicked placeholder; don't affect human slot sequence
  - **renderArenaPlayers**: Computes human display slots by filtering out local player, assigns HUMAN_SLOT_ORDER sequentially
  - **Game start countdown**: Uses same skip-self logic so each player sees others correctly
- **Cache-Busting**: `public/index.html` bumped to `?v=74` for `style.css` and `?v=75` for `client.js`.

## [1.1.77] - 2026-11-20
### Fixed
- **Lobby Slot Occupied Bug Fixed (Standardized Human Slots)**: `server/gameManager.js`, `public/client.js` — Complete overhaul of human slot assignment:
  - **HUMAN_SLOT_ORDER**: `['slot-top-left', 'slot-top', 'slot-top-right', 'slot-mid-left', 'slot-mid-right']` — left-to-right, top-to-bottom
  - **nextHumanSlot()**: Returns next available human slot, skipping bot-occupied ones
  - **assignHumanSlots()**: Host gets first human slot, joining players get next available
  - **Local player (YOU)** always renders at `slot-local` (bottom middle) on own screen
  - **Cross-client consistency**: Host sees new player in next human slot; new player sees host in that same slot
  - **Bots**: Placed at clicked placeholder; don't affect human slot sequence
  - **renderArenaPlayers**: Local player included in slotMap with actual server slotClass for lobby/waiting room, so their slot shows occupied (no phantom placeholder)
- **Cache-Busting**: `public/index.html` bumped to `?v=73` for `style.css` and `?v=74` for `client.js`.

## [1.1.76] - 2026-11-20
### Fixed
- **Cleaver Animation Overhaul**: `public/style.css`, `public/client.js` — Complete redesign:
  - Removed `cleaverVibrateIntense` stage
  - Added horizontal (parallel to floor) as first vibration stage
  - Progression: Calm horizontal → Horizontal gentle → Diagonal gentle → Diagonal moderate → Diagonal intense → Diagonal final (10% larger)
  - No descent/translation - cleaver stays in position, only rotates/vibrates
  - Size constant (1.0x) until final stage, then 10% growth (1.10x)
  - Slower, more deliberate vibration at each stage
- **Cache-Busting**: `public/index.html` bumped to `?v=72` for `style.css` and `?v=73` for `client.js`.

## [1.1.75] - 2026-11-20
### Fixed
- **Standardized Modal Button Spacing**: `public/style.css` — Consistent 16px vertical gap between difficulty pills, "Add Bot", and "Cancel" buttons in bot picker modal.
- **Cleaver Diagonal Descent & Growth**: `public/style.css` — Cleaver now moves diagonally down-left towards center of chopping board (translateX negative, translateY positive) while growing slightly (scale 1→1.02→1.05→1.1→1.15) at each vibration stage.
- **Waiting Room Local Player at Bottom**: `public/client.js` — `renderArenaPlayers` now correctly renders local player in `slot-local` (bottom center) during waiting room, with other players in their compass slots. Fixes "lobby screen" issues where local player was missing or in wrong position.
- **Cache-Busting**: `public/index.html` bumped to `?v=71` for `style.css` and `?v=72` for `client.js`.

## [1.1.74] - 2026-11-20
### Fixed
- **Local Player at Bottom During Gameplay**: `public/client.js` — Fixed `renderArenaPlayers` to reliably render local player in `slot-local` (bottom center) during gameplay. Added `localPlayer` parameter passing from `game_state` handler, fallback lookup with warning if not found.
- **Countdown View Shows Real Positions**: `public/client.js` — `renderGameStartView` now shows ALL players in their assigned compass slots during 3-second countdown (no one in slot-local). Local player moves to bottom only when gameplay starts.
- **Cache-Busting**: `public/index.html` bumped to `?v=70` for `style.css` and `?v=71` for `client.js`.

## [1.1.73] - 2026-11-20
### Fixed
- **Slot Occupied Error Fixed**: `public/client.js` — `renderArenaPlayers` now includes local player in slotMap for lobby/waiting room, so host's occupied slot (slot-top) doesn't show a placeholder. Fixes "bot occupied" error when clicking middle-top slot.
- **Player Distribution Per Group Size**: `server/gameManager.js` — `redistributePlayersEvenly()` now spaces players evenly per group size:
  - 2 players: slot-top + slot-mid-left (opposite)
  - 3 players: top row (slot-top, slot-top-left, slot-top-right)
  - 4 players: slot-top + slot-top-left + slot-mid-left + slot-mid-right
  - 5+ players: all 5 compass slots
- **Game Ending Logic Overhauled**: `server/gameManager.js` — Game now ends when **0 humans alive** (was ≤1). If only bots remain, a random surviving bot wins. If 1 human + bots remain, game continues.
- **Victory Screen Shows Dead Players**: `server/index.js`, `public/client.js` — `game_over` event now includes `slotClass` and `isBot` for all players. Victory screen renders all players (alive/dead) in their positions without placeholders.
- **Cleaver Animation Refined**: `public/style.css`, `public/client.js` — More descent toward scallion at each stage (0→2→5→10→16px), slower ramp-up (0.6s→0.4s→0.3s→0.2s), larger dramatic swings at max intensity but slower frequency.
- **Mobile Difficulty Picker Font Scaling**: `public/style.css` — `.difficulty-pill` now scales to 0.75rem on mobile, matching Add Bot/Cancel buttons.
- **Cache-Busting**: `public/index.html` bumped to `?v=69` for `style.css` and `?v=70` for `client.js`.

## [1.1.72] - 2026-11-20
### Fixed
- **Lobby Bot Placement & Game Redistribution**: `server/gameManager.js` — Complete rewrite of slot assignment logic:
  - **Lobby**: Bots placed EXACTLY where host clicks placeholder; humans auto-fill remaining compass slots in join order via `assignHumanSlots()`.
  - **Game Start**: All players redistributed evenly around 5 compass slots via `redistributePlayersEvenly()` (host first, then humans by join order, then bots by slot priority).
  - **Join/Leave/Remove Bot**: `assignHumanSlots()` called to re-balance human slots while preserving bot positions.
  - Removed `FIXED_SLOTS` / `reassignFixedSlots` / `reassignBotSlots` / `getNextHumanSlot` — replaced with simpler `COMPASS_SLOTS` + `assignHumanSlots()` + `redistributePlayersEvenly()`.
- **Cache-Busting**: `public/index.html` bumped to `?v=68` for `style.css` and `?v=69` for `client.js`.

## [1.1.71] - 2026-11-20
### Fixed
- **Bot Picker Button Spacing**: `public/style.css` — Added 16px margin between "Add Bot" and "Cancel" buttons in modal for better visual separation.
- **Cleaver Progressive Chop Animation**: `public/style.css` — Cleaver now progressively moves closer to scallion (translateY) while vibrating: gentle (1px down), moderate (3-4px down), intense (6-8px down), diagonal (10-13px down). Creates visual tension of impending chop.
- **Active Player Gold Outline**: `public/style.css` — Chopping board gets gold border + glow (`box-shadow: 0 0 30px var(--accent-gold)`) when local player is active (via `.active-turn .chopping-block`). Already functional via body class toggle.
- **Cache-Busting**: `public/index.html` bumped to `?v=67` for `style.css` and `?v=68` for `client.js`.

## [1.1.70] - 2026-11-20
### Fixed
- **Bot Picker Modal - Pill Selection**: `public/client.js`, `public/style.css` — Changed modal to use horizontal pill buttons for difficulty selection (Easy/Medium/Hard) with larger spacing, replacing dropdown.
- **Cleaver Visibility Restored**: `public/client.js` — Cleaver now shows during gameplay (was hidden after countdown and never re-shown). Added display logic in `game_state` handler for `state: 'playing'`.
- **Host Visibility Fixed**: `server/gameManager.js`, `public/client.js` — Removed `slot-local` from server slots (it's client-side only). Host now gets `slot-top` on server, renders as `slot-local` on own client. Other clients see host in correct compass position.
- **Bot Behavior Overhauled**: `server/gameManager.js` — Bots now slower (Easy: 3-6s, Medium: 2-4s, Hard: 1-2.5s) with chance to not answer (Easy: 35%, Medium: 15%, Hard: 3%). Added `BOT_NO_ANSWER_CHANCE` config.
- **Cache-Busting**: `public/index.html` bumped to `?v=66` for `style.css` and `?v=67` for `client.js`.

## [1.1.69] - 2026-11-20
### Fixed
- **Red X Button Size Matched to Bot Badge**: `public/style.css` — `.remove-bot-btn` now 22px desktop / 20px mobile with 4px border-radius to match `.bot-badge` visual height exactly.
- **Bot Difficulty Picker Converted to Modal**: `public/client.js`, `public/style.css` — Replaced inline picker with centered modal dialog (`#bot-difficulty-modal`) with backdrop, eliminating mobile overflow issues. Added Escape key and backdrop click to close.
- **Chopper Animation Restored with Progressive Vibration**: `public/style.css`, `public/client.js` — Cleaver now hovers diagonally above-right, then vibrates in 4 stages: gentle (60-85% fuse), moderate (30-60%), intense (10-30%), diagonal intense (<10%). Restores pre-regression behavior.
- **Fixed Slot Assignment & Even Distribution**: `server/gameManager.js` — Implemented `FIXED_SLOTS` array for deterministic join-order slot assignment (Host=slot-local, P2=slot-top, P3=slot-top-left, P4=slot-top-right, P5=slot-mid-left, P6=slot-mid-right). Added `redistributePlayersEvenly()` on game start and `reassignFixedSlots()`/`reassignBotSlots()` on player/bot leave to maintain consistent positions across all clients.
- **Bot Slot Consistency**: `server/gameManager.js` — Bots added at clicked placeholder slot; humans keep fixed slots; bots fill remaining SLOT_PRIORITY slots. Slot reassignment on join/leave ensures no conflicts across client views.
- **Cache-Busting**: `public/index.html` bumped to `?v=65` for `style.css` and `?v=66` for `client.js`.

## [1.1.68] - 2026-11-20
### Fixed
- **Yellow Outline/Shaking/Chopper Missing During Gameplay**: `public/client.js` — Fixed `renderArenaPlayers` to pass `activePlayerId` to `createPlayerCard` (was passing `null`), restoring yellow outline on active player. Added `currentActivePlayerId` tracking in `game_state` handler and fallback logic in `updateFuseUI` to ensure panic-shake and cleaver-panic animations trigger correctly during gameplay.
- **Slot Occupied Error Fixed**: `server/gameManager.js` — `addBot()` now automatically finds next available slot if requested slot is occupied, eliminating "slot_occupied" errors when host is displayed on another player's screen.
- **Host Red X Visibility**: `public/client.js`, `public/style.css` — Fixed `renderArenaPlayers` to pass `isLobby` and `isHostViewer` to `createPlayerCard`, ensuring host sees red X buttons on bot cards in lobby.
- **Bot Name Uniqueness**: `server/gameManager.js` — `createBot()` now accepts `usedNames` array to ensure each bot gets a unique name.
- **Game Start Neutral State Preserved**: `public/client.js` — `renderGameStartView()` correctly shows neutral state (no active highlight, no cleaver) during countdown; gameplay animations restore properly after countdown via `game_state` handler.
- **Cache-Busting**: `public/index.html` bumped to `?v=64` for `style.css` and `client.js`.

## [1.1.67] - 2026-11-20
### Fixed
- **No Duplicate Bot Names**: `server/gameManager.js` — `createBot()` now accepts `usedNames` array to ensure each bot gets a unique name.
- **Slot Occupied Error Fixed**: `server/gameManager.js` — `addBot()` now passes used bot names to `createBot()` to prevent duplicate names; client sends `slotClass` from placeholder correctly.
- **Host Sees Red X in Lobby**: `public/client.js` — `createPlayerCard()` now receives `isLobby` and `isHostViewer` options; red X only shows for host in lobby on bot cards.
- **Red X Button Size**: `public/style.css` — `.remove-bot-btn` reduced to 16px desktop / 14px mobile for better visual balance.
- **Bot Names Unique**: `server/gameManager.js` — `createBot()` filters used names to ensure each bot gets a unique creative name.
- **Cache-Busting**: `public/index.html` bumped to `?v=62` for `style.css` and `client.js`.

## [1.1.66] - 2026-11-20
### Fixed
- **Red X Button Lobby-Only**: `public/client.js`, `public/style.css` — `.remove-bot-btn` now only appears in lobby (not in-game), only for host, and only on bot cards (not local player). Button is always visible (no hover required) and smaller (16px desktop, 14px mobile).
- **Game End Logic Fixed**: `server/gameManager.js` — Game only ends when fewer than 2 human players remain alive. Bots don't count toward player count for game ending. If 1 human + bots remain, game continues. If 0 humans, game ends.
- **Bot Tag Position**: `public/style.css` — Bot badge moved to top-left to avoid overlap with red X button at top-right.
- **Bot Difficulty Display**: `public/client.js`, `public/style.css` — Added `.difficulty-badge` showing bot difficulty (Easy/Medium/Hard) below bot names in waiting room only.
- **Bot Tag Position**: `public/style.css` — Bot badge moved to top-left to avoid overlap with red X button at top-right.
- **Cache-Busting**: `public/index.html` bumped to `?v=59` for `style.css` and `client.js`.

## [1.1.65] - 2026-11-20
### Fixed
- **Critical: normalize is not defined**: `server/gameManager.js` — Added `normalize` import from `questionLoader` to fix ReferenceError in `pickBotAnswer`.
- **Shorter, Sweeter Bot Names**: `server/gameManager.js` — `BOT_NAMES` simplified to single-word herb names (Chive, Basil, Thyme, Sage, Rosemary, Dill, Mint, Parsley, Cilantro, Oregano, Tarragon, Chervil, Marjoram, Savory, BayLeaf) — no truncation, easy to say.
- **Bot Picker Mobile Overflow**: `public/style.css` — Reduced padding, font sizes, and gaps in `.bot-difficulty-picker` to fit within placeholder on mobile.
- **Red X Button**: `public/style.css` — `.remove-bot-btn` now smaller (18px → 18px, then 16px on mobile), always visible (no hover required), same height as tags.
- **Difficulty Display in Lobby**: `public/client.js`, `public/style.css` — Added `.difficulty-badge` showing bot difficulty (Easy/Medium/Hard) below bot names in waiting room only.
- **Mobile Lobby Text Overflow**: `public/style.css` — Comprehensive responsive fixes for lobby inputs, labels, buttons, category pills, and bot difficulty picker at 600px and 480px breakpoints.
- **Bot Names Simplified**: `server/gameManager.js` — Replaced LLM-style names with single-word herb names (Chive, Basil, Thyme, Sage, etc.) — no truncation, easy to say.
- **Removed Confirmation Dialog**: `public/client.js` — Bot removal now immediate on click, no confirmation popup.

### Cache-Busting
- `public/index.html` bumped to `?v=57` for `style.css` and `client.js`.
### Fixed
- **Critical: normalize is not defined**: `server/gameManager.js` — Added `normalize` import from `questionLoader` to fix ReferenceError in `pickBotAnswer`.
- **Shorter, Sweeter Bot Names**: `server/gameManager.js` — `BOT_NAMES` simplified to single-word herb names (Chive, Basil, Thyme, Sage, Rosemary, Dill, Mint, Parsley, Cilantro, Oregano, Tarragon, Chervil, Marjoram, Savory, BayLeaf) — no truncation, easy to say.
- **Bot Picker Mobile Overflow**: `public/style.css` — Reduced padding, font sizes, and gaps in `.bot-difficulty-picker` to fit within placeholder on mobile.
- **Red X Button**: `public/style.css` — `.remove-bot-btn` now smaller (18px → 18px, then 16px on mobile), always visible (no hover required), same height as tags.
- **Difficulty Display in Lobby**: `public/client.js`, `public/style.css` — Added `.difficulty-badge` showing bot difficulty (Easy/Medium/Hard) below bot names in waiting room only.
- **Mobile Lobby Text Overflow**: `public/style.css` — Comprehensive responsive fixes for lobby inputs, labels, buttons, category pills, and bot difficulty picker at 600px and 480px breakpoints.
- **Bot Names Simplified**: `server/gameManager.js` — Replaced LLM-style names with single-word herb names (Chive, Basil, Thyme, Sage, etc.) — no truncation, easy to say.
- **Removed Confirmation Dialog**: `public/client.js` — Bot removal now immediate on click, no confirmation popup.

### Cache-Busting
- `public/index.html` bumped to `?v=56` for `style.css` and `client.js`.

## [1.1.63] - 2026-11-20

## [1.1.61] - 2026-11-19
### Fixed
- **Host Visibility in Lobby**: `server/gameManager.js` — `joinRoom()` now moves host from `slot-local` to next available compass slot when a new player joins; new player gets `slot-local`. Host now visible to joiners in their assigned slot.
- **Game Start Overlay Covers Previous State**: `public/style.css` — `.intermission-banner` now has `background: rgba(0,0,0,0.7)` and `z-index: 1000` to fully cover previous game state (shaking players, etc.) during countdown.
- **Bot Difficulty Picker Fits Placeholder**: `public/style.css` — `.bot-difficulty-picker` now uses `inset: 3px` to account for placeholder's 3px dashed border, with reduced padding/border to fit exactly within placeholder content area.
- **Cache-Busting**: `public/index.html` bumped to `?v=51` for `style.css` and `client.js`.

## [1.1.61] - 2026-11-19
### Fixed
- **Player Visibility in Lobby**: `server/gameManager.js`, `public/client.js` — Fixed `joinRoom()` to assign each new player the next available compass slot (instead of always `slot-local`), preventing slot conflicts. Local player always renders in `slot-local` on their own screen; other players render in their assigned slots.
- **Mutual Player Visibility**: `public/client.js` — `renderArenaPlayers()` now correctly renders all players in their assigned slots; host moves to next available slot when new players join, ensuring all players see each other.
- **Cache-Busting**: `public/index.html` bumped to `?v=49` for `style.css` and `client.js`.

## [1.1.60] - 2026-11-19
### Fixed
- **Auto-Return to Lobby Preserves Bot Functionality**: `public/client.js` — `lobby_ready` handler now passes `isHost` to `renderArenaPlayers`, restoring bot placeholder visibility after auto-return from game over.
- **Game Ends When Only 1 Human Remains**: `server/gameManager.js` — `checkWinOrContinue()` and `removePlayer()` now count human players (not bots) for win conditions. With 2 real + 1 bot, if bot dies and a real player leaves, game ends correctly.
- **Host Visible to All Players**: `server/gameManager.js` — `joinRoom()` moves host from `slot-local` to next compass slot when a player joins, ensuring host is visible in their assigned slot to all players.
- **Cache-Busting**: `public/index.html` bumped to `?v=47` for `style.css` and `client.js`.

## [1.1.59] - 2026-11-19
### Fixed
- **Dropdown Difficulty Selector**: `public/client.js`, `public/style.css` — Reverted to aesthetic `<select>` dropdown in 3-row layout (Difficulty / Add Bot / Cancel) with sufficient padding (`padding: 12px`, `gap: 8px`). Dropdown styled with custom arrow, matches game aesthetic.
- **Host Visibility on Other Players' Screens**: `server/gameManager.js` — When a player joins, host is moved from `slot-local` to next available compass slot; new player gets `slot-local`. Host now visible to joiners in their assigned slot.
- **Bot Never Promoted to Host**: `server/gameManager.js` — `removePlayer()` fallback no longer promotes bots when no humans remain; `hostId` set to `null` instead.
- **Card Width for Long Names**: `public/style.css` — `.player-card` width increased to `clamp(80px, 22vw, 120px)` for 15-char nicknames.
- **Cache-Busting**: `public/index.html` bumped to `?v=46` for `style.css` and `client.js`.

## [1.1.58] - 2026-11-19
### Fixed
- **Host/You Badge Overlap**: `public/style.css` — Repositioned YOU badge to top-right (absolute) and HOST badge to top-left (absolute) to prevent overlap.
- **Lobby/Waiting Room Player Visibility**: `public/client.js` — Fixed `renderArenaPlayers()` slotMap logic to correctly include all human players in their assigned slots; local player always in `slot-local` with YOU badge; host shows HOST badge in their assigned slot.
- **Card Width for Long Names**: `public/style.css` — Widened `.player-card` to `width: clamp(80px, 22vw, 120px)` to accommodate 15-character nicknames.
- **Bot Placement at Exact Clicked Slot**: `server/gameManager.js`, `server/index.js`, `public/client.js` — `add_bot` now passes `slotClass` from placeholder click; bot created with exact `slotClass`; appears in the exact grid position where placeholder was clicked.
- **Picker Matches Placeholder Size**: `public/style.css` — `.bot-difficulty-picker` now uses `inset: 0` to exactly match placeholder card dimensions.
- **Vertical Centering in Waiting Room**: `public/style.css` — Added `justify-content: center` to `.waiting-arena-stage .player-card` to center scallion/name vertically when lives/rarity bars are hidden.
- **Local Player Card Height**: `public/style.css` — Local player card in `#local-player-slot` naturally accommodates YOU badge; other cards have no dead space.
- **Host Transfer to Real Player**: `server/gameManager.js` — `removePlayer()` now promotes next human (non-bot) player to host when host leaves; bots never become hosts.
- **Difficulty Picker Buttons Work**: `public/client.js`, `public/style.css` — Fixed event delegation with `stopPropagation()`; difficulty pills, Add Bot, and Cancel buttons all functional.
- **Cache-Busting**: `public/index.html` bumped to `?v=45` for `style.css` and `client.js`.

## [1.1.57] - 2026-11-19
### Fixed
- **Local Player / Host Badge Confusion**: `public/client.js` — Fixed `renderArenaPlayers()` to exclude local player from slotMap (prevents duplicate rendering). Local player now only renders in `slot-local` with YOU badge; host renders in their assigned slot with HOST badge only.
- **Standardized Card Sizes (Taller Than Wide)**: `public/style.css` — Unified `.player-card` to `width: clamp(72px, 20vw, 100px); height: clamp(100px, 28vw, 140px)` — taller than wide, consistent across all grid positions (center row no longer oversized).
- **Bot Placement at Clicked Slot**: `server/gameManager.js`, `server/index.js`, `public/client.js` — `add_bot` now accepts `slotClass` from placeholder click; bot created with that exact `slotClass`; appears in the exact grid position where placeholder was clicked.
- **Compact Difficulty Picker (Buttons, Not Dropdown)**: `public/client.js`, `public/style.css` — Replaced dropdown with compact button group (Easy/Medium/Hard pills); picker shrunk to `min-width: 140px`, `padding: 8px`; buttons styled like category pills.
- **Cache-Busting**: `public/index.html` bumped to `?v=44` for `style.css` and `client.js`.

## [1.1.55] - 2026-11-19
### Added
- **Waiting Room Bot Placeholders (Option B)**: `server/gameManager.js`, `server/index.js`, `public/client.js`, `public/style.css` — Empty slot placeholders in the 3×3 waiting room grid. Host sees dotted-border cards at next available compass slots (slot-top → slot-top-left → slot-top-right → slot-mid-left → slot-mid-right). Click placeholder → inline difficulty picker (Easy/Medium/Hard) → bot added with assigned slot. Non-hosts see muted disabled placeholders.
- **Socket Events**: `add_bot` / `remove_bot` (host only, lobby state) with `room_updated` broadcast.
- **Bot Identity**: `createBot()` assigns slotClass, `isBot: true`, `botDifficulty`, and unique ID.
- **Visuals**: Dotted-border placeholder cards with 🤖 + "+ Bot", hover scale/color transition. Inline dropdown picker on click. Bot badge (🤖) on bot cards.
- **Cache-Busting**: `public/index.html` bumped to `?v=42` for `style.css` and `client.js`.

## [1.1.54] - 2026-11-19
### Removed
- **Automated Gameplay Bot System**: `server/gameManager.js`, `public/index.html`, `public/client.js`, `public/style.css` — Removed all automated bot gameplay logic including: `BOT_NAMES`, `createBot()`, `pickBotAnswer()`, `introduceTypo()`, `getBotDelay()`, `maybeTriggerBotTurn()`, `BOT_DELAYS`, `BOT_TYPO_RATES`, `BOT_RARITY_WEIGHTS` constants. Removed bot insertion in `startGame()`, bot turn triggers in `submitAnswer()`/`onFuseExpired()`, bot-aware logic in `checkWinOrContinue()`. Removed bot settings UI from lobby (bot count slider, difficulty dropdown) and associated CSS.
### Changed
- **Bot System Redesign**: Bots will now be added manually in the waiting room via empty slot placeholders (Option B design). Bots are added by host before game start, not during gameplay.
- **Cache-Busting**: `public/index.html` bumped to `?v=41` for `style.css` and `client.js`.

## [1.1.52] - 2026-11-19
### Added
- **Bot Answer Selection & Turn Logic (Task 3/8)**: `server/gameManager.js` — Implemented `pickBotAnswer(room, bot)` with rarity-weighted selection per difficulty (easy=uniform, medium=1.5x uncommon+, hard=4x rare+). Added `introduceTypo()` for typo injection (easy 30%, medium 10%, hard 0%). `maybeTriggerBotTurn(room)` triggers bot moves after: game start, human answer, fuse expiry/intermission. `getBotDelay()` returns difficulty-based delays (easy 1.5-3s, medium 0.8-1.8s, hard 0.3-0.8s).
- **Cache-Busting**: (server-side only, no client version bump)

## [1.1.51] - 2026-11-19
### Added
- **Bot Creation & Identity (Task 2/8)**: `server/gameManager.js` — Added `BOT_NAMES`, `createBot(difficulty, index)`, and bot insertion in `startGame()`. Bots have unique IDs, names (OnionBot, ShallotAI, etc.), difficulty, and `isBot: true` flag. `checkWinOrContinue()` updated to end game with no human winner if only bots remain alive.
- **Cache-Busting**: (server-side only, no client version bump)

## [1.1.50] - 2026-11-19
### Added
- **Bot Configuration Foundation (Task 1/8)**: `server/gameManager.js`, `server/index.js`, `public/client.js` — Room creation now accepts `settings.botCount` (0-5) and `settings.botDifficulty` ('easy'|'medium'|'hard'). Validated and stored in room.settings. Client sends defaults (0 bots, medium difficulty); UI in next task.
- **Cache-Busting**: (server-side only, no client version bump)

## [1.1.49] - 2026-11-19
### Fixed
- **Game Ends on Player Leave (2-Player)**: `server/gameManager.js` — `removePlayer()` now ends the game immediately if player count drops below 2 during active play. Previously only checked alive players, allowing game to continue with 1 player after a departure.
- **Cache-Busting**: (server-side only, no client version bump)

## [1.1.48] - 2026-11-19
### Fixed
- **Alias Duplicate Detection**: `server/questionLoader.js` — `finalize()` now checks ALL normalized forms of a matched answer entry (main answer + aliases) against the used-answers set. Previously only the specific matched candidate was checked, allowing aliases of already-used answers to slip through. Now if "Jesus" was given, entering "Christ" (alias) is correctly rejected as "used".
- **Cache-Busting**: (server-side only, no client version bump)

## [1.1.47] - 2026-11-19
### Fixed
- **Lobby Vertical Centering + Mobile Scroll**: `public/style.css` — `body` restored to `overflow: hidden; align-items: center` for viewport-centered flex container. `#view-lobby` now `max-height: 100dvh; overflow-y: auto; justify-content: center` — centers vertically when content fits, scrolls internally when it overflows. Best of both worlds: centered on desktop, scrollable on small mobile.
- **Cache-Busting**: `public/index.html` bumped to `?v=39` for `style.css` and `client.js`.

## [1.1.46] - 2026-11-19
### Fixed
- **Mobile Scroll & Lobby Corners**: `public/style.css` — `body` changed to `min-height: 100dvh; overflow: auto; align-items: flex-start` allowing page scroll when content exceeds viewport. `#view-lobby` now `justify-content: flex-start; overflow-y: auto` so lobby content scrolls on small screens while preserving rounded corners (`border-radius: 1rem`). Game/Waiting views remain non-scrolling via their sticky sections.
- **Cache-Busting**: `public/index.html` bumped to `?v=38` for `style.css` and `client.js`.

## [1.1.45] - 2026-11-19
### Fixed
- **Mobile Lobby Card Rounded Corners**: `public/style.css` — Added explicit `border-radius: 1rem` to `#view-lobby .card` in `@media (max-width: 600px)` to ensure top corners stay rounded when card stretches to full viewport width.
- **Cache-Busting**: `public/index.html` bumped to `?v=37` for `style.css` and `client.js`.

## [1.1.44] - 2026-11-19
### Changed
- **Mobile Waiting Board Shrunk Further**: `public/style.css` — `@media (max-width: 600px)` reduces `.waiting-board` to `clamp(135px, 34vw, 185px)` with `padding: 10px` (was `clamp(150px, 38vw, 200px)` / `12px`). Grid column updated to `minmax(135px, 185px)` to match. Returns to original sizing for tighter fit.
- **Cache-Busting**: `public/index.html` bumped to `?v=36` for `style.css` and `client.js`.

## [1.1.43] - 2026-11-19
### Changed
- **Mobile Waiting Board Scaled Down**: `public/style.css` — `@media (max-width: 600px)` reduces `.waiting-board` to `clamp(150px, 38vw, 200px)` with `padding: 12px` (was `clamp(170px, 42vw, 230px)` / `14px`). Grid column updated to `minmax(150px, 200px)` to match.
- **Cache-Busting**: `public/index.html` bumped to `?v=35` for `style.css` and `client.js`.

## [1.1.42] - 2026-11-19
### Fixed
- **Waiting Board Grid + Mobile Override**: `public/style.css` — `.waiting-arena-stage` grid-template-columns changed to `1fr minmax(170px, 230px) 1fr` (explicit min/max matching mobile board size). Media query rules for `.waiting-board` now use `!important` on width/height/padding to guarantee override. Ensures mobile board reaches `230px` with `14px` padding.
- **Cache-Busting**: `public/index.html` bumped to `?v=34` for `style.css` and `client.js`.

## [1.1.41] - 2026-11-19
### Fixed
- **Waiting Board Grid Constraint**: `public/style.css` — Changed `.waiting-arena-stage` grid-template-columns from `1fr auto 1fr` to `1fr minmax(0, fit-content(230px)) 1fr` so the center column expands to fit the board's max-width instead of being constrained by `auto` sizing. Ensures mobile size increases take effect.
- **Cache-Busting**: `public/index.html` bumped to `?v=33` for `style.css` and `client.js`.

## [1.1.40] - 2026-11-19
### Changed
- **Mobile Waiting Board Expanded Further**: `public/style.css` — `@media (max-width: 600px)` increases `.waiting-board` to `clamp(170px, 42vw, 230px)` with `padding: 14px` (was `clamp(155px, 38vw, 205px)` / `12px`) to accommodate longer category names (e.g., "Bible") without crowding the gold border.
- **Cache-Busting**: `public.index.html` bumped to `?v=32` for `style.css` and `client.js`.

## [1.1.39] - 2026-11-19
### Changed
- **Mobile Waiting Board Size Increase**: `public/style.css` — `@media (max-width: 600px)` expands `.waiting-board` to `clamp(155px, 38vw, 205px)` (was `clamp(135px, 34vw, 185px)`) with `padding: 12px` (was `10px`) so metadata text fits elegantly inside the gold border without crowding.
- **Cache-Busting**: `public/index.html` bumped to `?v=31` for `style.css` and `client.js`.

## [1.1.38] - 2026-11-19
### Changed
- **Waiting Board Metadata Gap**: `public/style.css` — Added `#waiting-room-meta { display: flex; flex-direction: column; align-items: center; gap: 8px; }` for clear vertical separation between room code badge and category/player-count row.
- **Mobile Waiting Board Scaling**: `public/style.css` — `@media (max-width: 600px)` reduces room code badge (`font-size: clamp(1rem, 4.2vw, 1.25rem); padding: 2px 8px; letter-spacing: 0.08em`), category pill (`font-size: 0.65rem; padding: 2px 6px`), and player count (`font-size: 0.68rem`) with `gap: 6px` to fit comfortably inside the gold-bordered circle.
- **Centered Mobile Lobby**: `public/style.css` — `@media (max-width: 600px)` styles `#view-lobby` as full-screen flex column centered with safe-area padding, and `.card` constrained to `max-width: 360px; margin: 0 auto` for equal horizontal margins.
- **Cache-Busting**: `public/index.html` bumped to `?v=30` for `style.css` and `client.js`.

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
