# The Last 1%: Project ECHO

A 2D top-down adventure / puzzle / survival game. HTML5 Canvas + JavaScript + CSS.
No build step, no backend, no external assets.

## Play locally
Unzip and double-click `index.html` (Chrome or Edge, desktop).

## Deploy (any static host)
Upload the whole folder as-is. `index.html` must stay at the root next to `css/` and `js/`.
- GitHub Pages: push the folder to a repo, Settings > Pages > deploy from branch (root).
- Netlify: drag the folder onto app.netlify.com/drop.
- Vercel: `vercel` in this folder, framework preset "Other".

## Controls
WASD / arrows move · SHIFT run · E interact · F flashlight · R scan · I backpack · ESC pause

## Code layout
- `js/core.js`     state, save system (localStorage), items, clues, energy
- `js/audio.js`    synthesized music and sound effects (WebAudio)
- `js/rooms.js`    room data: floors, objects, lights, hazards
- `js/render.js`   pixel-art sprites, room building, lighting, effects
- `js/ui.js`       HUD, dialogue, terminal shell, keypad, inventory, menus
- `js/puzzles.js`  the five computer puzzle types
- `js/story.js`    interactions, decisions, objectives, endings
- `js/main.js`     game loop, input, player, collision, hazards, room travel

Fonts load from Google Fonts when online; the game falls back to system monospace offline.
