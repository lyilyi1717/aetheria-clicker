# YouTube Playables Integration Instructions (Dig Prototype)

> **Scope Notice:** This specification is strictly for the **Dig prototype** (`proto.html` and `proto/`). Do **not** apply these changes to the other games in this repository (e.g., Aetheria / `index.html`).
> Reference: [YouTube Playables Developer Portal](https://developers.google.com/youtube/gaming/playables/developer_portal)

---

## 1. Overview & Requirements

YouTube Playables allows HTML5/WebGL web games to run inside YouTube's mobile apps and desktop web interface. 

To pass the YouTube Playables certification and publish via the Developer Portal, the Dig prototype must:
1. Include the YouTube Playables SDK (`https://www.youtube.com/game_api/v1`) before any game script execution.
2. Signal `ytgame.game.firstFrameReady()` as soon as the first visual frame renders.
3. Signal `ytgame.game.gameReady()` when all assets and initial UI elements are interactive.
4. Synchronize audio mute/unmute states with YouTube's system-level audio controls (`ytgame.system.onAudioEnabledChange`).
5. Honor YouTube's pause/resume lifecycle (`ytgame.system.onPause` / `ytgame.system.onResume`).
6. Support cloud save persistence (`ytgame.game.saveData` / `ytgame.game.loadData`) with safe local fallback.

---

## 2. File-by-File Implementation Steps

### Step 1: Add SDK Script to `proto.html`
In `proto.html`, the YouTube Playables SDK must be loaded synchronously inside the `<head>` before any module scripts or stylesheets:

```html
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dig (prototype)</title>
  <!-- YouTube Playables SDK: Must be loaded first -->
  <script src="https://www.youtube.com/game_api/v1"></script>
  <link rel="stylesheet" href="proto/proto.css">
</head>
```

---

### Step 2: Lifecycle & Audio Hooks in `proto/ui/app.js`

In `proto/ui/app.js`, integrate the `ytgame` API calls into the game lifecycle:

#### A. Master Audio Integration
Sync YouTube's system mute toggle with Dig's `audio.js`:

```javascript
// Synchronize audio with YouTube Playables environment
if (window.ytgame) {
  // Respect initial YouTube mute state
  const ytAudioEnabled = ytgame.system.isAudioEnabled();
  setMuted(!ytAudioEnabled);
  paintMute();

  // Listen for user audio toggle from YouTube player chrome
  ytgame.system.onAudioEnabledChange((enabled) => {
    setMuted(!enabled);
    paintMute();
  });
}
```

#### B. Pause & Resume Handlers
Ensure Dig pauses gameplay, animation timers, and sound effects when YouTube backgrounds the game:

```javascript
if (window.ytgame) {
  ytgame.system.onPause(() => {
    paused = true;
    // Mute or suspend audio context if needed
  });

  ytgame.system.onResume(() => {
    paused = false;
  });
}
```

#### C. First Frame & Game Ready Signals
1. Call `firstFrameReady()` after the first canvas draw:
   ```javascript
   // Inside start() or right after initial canvas draw:
   if (window.ytgame) {
     ytgame.game.firstFrameReady();
   }
   ```
2. Call `gameReady()` when the UI, lessons, and drawer are fully mounted and ready for player clicks:
   ```javascript
   // Near the end of start():
   if (window.ytgame) {
     ytgame.game.gameReady();
   }
   ```

---

### Step 3: Cloud Save Synchronization

Dig currently saves state to `localStorage` under `DIG_PROTO_SAVE_V1`. Update `load()` and `save()` in `proto/ui/app.js` (or a helper module) to sync with YouTube Playables cloud storage:

```javascript
async function loadStateAsync() {
  let raw = null;
  if (window.ytgame) {
    try {
      raw = await ytgame.game.loadData();
    } catch (e) {
      console.warn('Playables cloud load failed, falling back to local storage', e);
    }
  }
  if (!raw) {
    try { raw = localStorage.getItem(SAVE_KEY); } catch {}
  }
  return raw ? G.deserialize(raw) : G.newState();
}

function saveState(state) {
  if (!state) return;
  const serialized = G.serialize(state);
  try { localStorage.setItem(SAVE_KEY, serialized); } catch {}
  
  if (window.ytgame) {
    ytgame.game.saveData(serialized).catch(err => {
      console.warn('Playables cloud save failed', err);
    });
  }
}
```

---

### Step 4: Engagement & Score Reporting (Optional but Recommended)

Whenever the player reaches a significant milestone (e.g. max depth reached or new site unlocked):

```javascript
if (window.ytgame && state.depth) {
  ytgame.engagement.sendScore({ value: Math.floor(state.depth) });
}
```

---

## 3. Packaging & Exporting for the Developer Portal

When building the release package for submission to the [YouTube Playables Developer Portal](https://developers.google.com/youtube/gaming/playables/developer_portal):

1. **Root Entry Point:** YouTube Playables requires `index.html` at the **root** of the zip archive.
   - For Dig prototype, package the contents such that `proto.html` becomes `index.html` inside the zip, and all relative paths to `proto/` (or flattened files) resolve properly.
2. **Directory Structure:**
   ```text
   dig-playable.zip
   ├── index.html         (renamed from proto.html, with relative assets intact)
   ├── proto/
   │   ├── main.js
   │   ├── game.js
   │   ├── proto.css
   │   ├── core/
   │   ├── ui/
   │   └── features/
   ```
3. **No External Network Dependencies:** All fonts, scripts, and media must be packaged locally within the zip (except the official `https://www.youtube.com/game_api/v1` script tag).

---

## 4. Certification Checklist Before Submission

- [ ] Game renders its first frame within 3 seconds and calls `ytgame.game.firstFrameReady()`.
- [ ] Game calls `ytgame.game.gameReady()` when interactive.
- [ ] Muting YouTube's audio control immediately silences all in-game sound effects.
- [ ] Game freezes timers and auto-dig loops on `onPause()`.
- [ ] Cloud save correctly restores player depth and coins across sessions.
- [ ] Aspect ratio / responsive canvas (`#cv` 640x680) fits cleanly on both mobile portrait/landscape and desktop.
