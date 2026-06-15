# EE Cockpit — Guided Tour with Einstein Avatar

A professional onboarding splash for EE Cockpit. An Albert Einstein avatar walks the user through every menu of your application — auto-playing on first visit and re-launchable from a discreet `?` button. Plain HTML / CSS / vanilla JavaScript. No build tools. No framework. Web Speech API for the voice. Web Speech API + Canvas for the avatar.

---

## 1. Files in this folder

| File | Purpose |
|------|---------|
| `index-tour-demo.html` | Working sample layout — open this directly in a browser to see the tour. |
| `tour.css` | All visual styling for the avatar frame, spotlight, controls, captions, help button, and chat input. Themed with CSS variables. |
| `tour.js` | Tour orchestrator. Auto-discovers menus, drives the step sequence, handles controls and Q&A. |
| `einstein-avatar.js` | Canvas-drawn Einstein face with idle animation, blinks, head tilt, and amplitude-driven lip-sync over Web Speech. |
| `faq.js` | Starter Q&A dictionary (15 entries). Easy to extend. Exposes `window.EinsteinFAQ.answer(question)` returning a `Promise<string>`. |

---

## 2. Quick start — add the tour to your app in 3 steps

### Step 1 — Add the assets to your project

Copy the `Tour/` folder somewhere your HTML can reference (the same folder as your `index.html` is easiest).

### Step 2 — Add the `<head>` and `<body>` references

```html
<head>
  <!-- ... your existing head ... -->
  <link rel="stylesheet" href="Tour/tour.css" />
</head>
<body>
  <!-- ... your existing app ... -->

  <!-- Load order matters: faq.js -> einstein-avatar.js -> tour.js -->
  <script src="Tour/faq.js"></script>
  <script src="Tour/einstein-avatar.js"></script>
  <script src="Tour/tour.js"></script>
  <script>
    window.addEventListener('DOMContentLoaded', function () {
      EECockpitTour.init({ autoStart: true });
    });
  </script>
</body>
```

That's it. The tour will auto-play on first visit. The `?` button stays in the bottom-right for re-launching anytime.

> **CDN note** — everything in this tour is plain vanilla JS and the Web Speech API. **No CDN is required.** If you want a more elaborate spotlight, you can optionally include Driver.js — but `tour.js` already implements its own spotlight, so it isn't needed.

### Step 3 — Tag your menus

The tour scans the DOM for elements with the `data-tour` attribute. Add three small attributes to any element you want included:

```html
<a href="#revenue"
   data-tour="revenue"
   data-tour-title="Revenue & Commercial"
   data-tour-desc="Billing efficiency, DCB reconciliation, HT consumer reviews."
   data-tour-order="2">
  Revenue
</a>
```

| Attribute | Required | Purpose |
|-----------|----------|---------|
| `data-tour` | yes (presence) | Marks the element as a tour stop. Value is an internal ID — can be anything unique. |
| `data-tour-title` | optional | Bold heading shown in Einstein's speech bubble. Falls back to `textContent` if omitted. |
| `data-tour-desc` | optional | Description text Einstein speaks. If omitted, a generic prompt is used. |
| `data-tour-order` | optional | Number that controls sequence. Lower goes first. If omitted, source order is used. |

If you have **no** `data-tour` attributes anywhere, the tour falls back to heuristics: `nav a`, `.menu-item`, `.sidebar-item`, `[role="menuitem"]`, `header a`. So even an untagged app will get a basic tour.

---

## 3. Customisation

### 3.1 Colours & design tokens

All colours live in `:root` CSS variables at the top of `tour.css`. Change them once and the entire tour re-themes:

```css
:root {
  --tour-bg-deep:  #070b14;   /* page-fade overlay */
  --tour-bg-card:  #10162e;   /* avatar frame */
  --tour-accent-1: #06b6d4;   /* cyan (left of gradient) */
  --tour-accent-2: #8b5cf6;   /* violet (centre of gradient) */
  --tour-accent-3: #ec4899;   /* pink (right of gradient) */
  /* ... more ... */
}
```

### 3.2 Voice (pitch / speed / accent)

Voice preferences are an ordered list. The first one available on the user's device wins. To override the defaults, set the array *before* `EECockpitTour.init`:

```html
<script>
  window.EinsteinAvatar.preferredVoices = [
    'Daniel',             // Safari / macOS — British male
    'Microsoft George',   // Edge / Windows — British male
    'Google UK English Male'
  ];
</script>
<script src="Tour/tour.js"></script>
```

Then to tweak pitch and rate at runtime:

```js
const t = EECockpitTour.init({ autoStart: false });
// somewhere later (e.g. a settings panel)
t.avatar.setRate(0.92);   // 0.5–1.6
t.avatar.setPitch(0.90);  // 0.5–1.6 (lower = older / gravelly)
```

> **Browser caveat** — the Web Speech API uses voices installed on the user's operating system. Available voices differ across Windows, macOS, Linux, and mobile. The selector falls back gracefully: best match → any English male → any English → any voice → silent. Captions are always visible regardless.

### 3.3 Edit / extend the FAQ

Open `faq.js` and add entries to `FAQ_ENTRIES`. Each entry has `keywords` (lowercase) and an `answer`:

```js
{
  keywords: ['outage', 'tripped', 'feeder fault'],
  answer: "Open the O&M War Room. Feeder trips are logged with their root-cause analysis under 'Top causes (this quarter)'."
}
```

The matcher scores each entry by how many of its keywords appear as whole-word substrings in the user's question. Highest score wins. If nothing matches, the fallback message ("Please contact support…") is used.

### 3.4 Plug in a real LLM for the Q&A

The default Q&A is keyword-based. To swap in a real LLM (OpenAI, Anthropic, your own endpoint), call `setFaqAnswer` with a function that returns a `Promise<string>`:

```js
EECockpitTour.setFaqAnswer(async function (question) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + YOUR_API_KEY  // put behind a proxy in production!
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: "You are Albert Einstein, friendly guide to EE Cockpit. Answer succinctly." },
        { role: 'user', content: question }
      ]
    })
  });
  const data = await res.json();
  return data.choices[0].message.content;
});
```

> **Security** — never ship an API key in client JavaScript. Stand up a small proxy endpoint (Cloudflare Worker, Vercel function, your existing backend) that holds the key and forwards the request. The browser only calls your proxy.

### 3.5 Upgrade to a premium avatar (D-ID / HeyGen)

The current avatar is a stylised SVG/Canvas face plus Web Speech. To upgrade to a streaming photoreal avatar, replace the contents of `einstein-avatar.js` with the SDK calls from your chosen provider, but keep the same public API surface so `tour.js` continues to work unchanged:

```js
window.EinsteinAvatar = {
  create: function ({ canvas, onReady }) {
    // 1. Mount the provider's video element where `canvas` lives.
    // 2. Connect to their streaming endpoint with your API key.
    // 3. Return an object with the same methods we expose now:
    return {
      speak: function (text) { /* send to provider, return Promise that resolves when audio ends */ },
      stop:  function () { /* cancel current speech */ },
      replay: function () { /* re-send last text */ },
      setMuted: function (m) { /* mute audio output */ },
      setRate: function () {}, setPitch: function () {},  // ignored or remapped
      destroy: function () {}
    };
  },
  preferredVoices: []
};
```

Cost estimate (May 2025 pricing — verify before committing):
- **D-ID Express** — about $0.30 per minute of generated speech, monthly subscription with included minutes.
- **HeyGen Streaming Avatar** — about $0.10–0.30 per minute depending on tier, with monthly minute caps.
- **ElevenLabs voice only** (no avatar video) — about $0.18 per 1000 characters at the Pro tier.

For 50 daily active users × 2 minutes of tour × 30 days, expect ~$300–$1000/month at premium tiers. The free tier (`einstein-avatar.js` as shipped) costs $0.

---

## 4. Controls reference

### Avatar frame buttons

| Button | What it does |
|--------|--------------|
| **← Prev** | Go to previous step. Disabled at step 1. |
| **Next →** / **Finish** | Advance one step. On the last step it ends the tour and marks it completed. |
| **⏸ Pause** | Stops Einstein mid-sentence. Click again to resume the current step. |
| **🔇 Mute** | Silences the voice. Captions and speech bubble remain. Click again to unmute. |
| **↻ Replay** | Re-speaks the current step's text. |
| **Skip** | Exits and marks tour completed. The `?` button still re-launches it. |

### Keyboard

| Key | Action |
|-----|--------|
| `→` | Next step |
| `←` | Previous step |
| `Space` | Pause / resume |
| `Esc` | Skip / exit |
| `Enter` (in chat input) | Submit Q&A question |

### Ask Einstein

Type any question into the input below the speech bubble and press **Ask** (or Enter). The answer is spoken aloud and shown in the bubble. Backed by `faq.js` keyword matching by default — see §3.4 to swap in an LLM.

---

## 5. Accessibility

- **Captions** — always-visible bottom caption duplicates Einstein's speech (`role="aria-live"`).
- **Mute** — full keyboard / mouse access to mute; speech is decorative, all content also rendered as text.
- **Keyboard navigation** — Arrow keys, Esc, Space, Enter all work.
- **ARIA** — every control has `aria-label`. The frame is `role="dialog"`. The spotlight is `aria-hidden`.
- **Reduced motion** — the avatar's idle animations are subtle by design; if you want to disable them entirely for `prefers-reduced-motion`, add this to `tour.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .ee-help-pulse, .ee-avatar-canvas-wrap.speaking::after { animation: none; }
    .ee-avatar-frame, .ee-spotlight { transition: none; }
  }
  ```

---

## 6. Mobile / responsive

- Below 760 px wide, the avatar frame docks to the bottom of the screen full-width and the caption moves to the top.
- The avatar canvas downscales to fit; lip-sync still runs.
- The `?` button stays in the bottom-right at 48 px.
- The spotlight follows the target on scroll and resize.

---

## 7. State & persistence

- The flag `eeCockpit_tourCompleted = '1'` is written to `localStorage` when the user clicks **Skip** or completes the final step.
- On subsequent visits, `EECockpitTour.init({ autoStart: true })` reads this flag and **does not** auto-play. The `?` button still works.
- To force the tour to auto-play again (e.g. for QA), call `EECockpitTour.resetCompletion()` in DevTools, or click the **Reset Tour** button in the demo's top-right.

---

## 8. Public API summary

```js
// One-time setup
const tour = EECockpitTour.init({ autoStart: true });

// Manual control
EECockpitTour.start();      // open the tour from step 1
EECockpitTour.stop();       // close without marking completed
EECockpitTour.next();       // advance one step
EECockpitTour.prev();       // back one step
EECockpitTour.replay();     // re-speak current step
EECockpitTour.discover();   // returns the live step list (for debugging)
EECockpitTour.resetCompletion();  // clear the localStorage flag

// Override the Q&A backend (see §3.4)
EECockpitTour.setFaqAnswer(async (question) => { ... });
```

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| No voice, only captions | Browser blocks autoplay audio until user interacts | Normal — voice will work after the first click. Or warn users at the start. |
| Voice sounds robotic / wrong accent | OS only has the default voice installed | Install a high-quality British voice from the system speech settings, or switch to ElevenLabs (§3.5). |
| Tour skips the menus you expect | Element invisible / `display:none` when tour starts | The discovery filter skips invisible nodes by design. Ensure the element is rendered before `init`. |
| Spotlight is mispositioned after scroll | Target is in a scrollable container with `overflow:hidden` | The spotlight uses viewport coordinates. Scroll the page so the target is visible, or call `EECockpitTour.next()` again to re-position. |
| `?` button overlaps your existing UI | z-index conflict | Adjust the rule `.ee-help-btn { z-index: 9990; }` in `tour.css`. |

---

## 10. License & credit

The code in this folder is yours to use, modify, and redistribute as part of EE Cockpit. The Einstein character is public-domain (Albert Einstein died in 1955; his likeness is in the public domain in most jurisdictions). The voice is whatever is installed on the user's operating system — typically royalty-free for end-user playback.

Happy touring.
