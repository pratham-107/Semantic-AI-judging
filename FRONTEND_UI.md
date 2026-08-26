# Frontend UI — Visual Design Spec

Reference direction: bold flat-color sections, chunky friendly illustrations, a wavy divider between color blocks, playful rounded display type (see the "Super Hello" reference screenshot). We're keeping that *structural energy* — big color-block sections, a wavy seam, one illustrated "hero character" — but reskinning it entirely around a **classroom / chalkboard** world, since SketchAI is a drawing-and-guessing game. This doc is the token system and layout plan; hand it to whoever builds the actual components (or use it yourself when building `client/`).

---

## 1. Concept

The reference's world was "friendly robot design agency." Ours is **"after-hours classroom where the chalkboard comes alive."** Every visual element should trace back to something that actually exists in a classroom: chalkboards, dusty erasers, notebook paper, rulers, crayons, hall passes, gold star stickers, desk graffiti. Nothing decorative that isn't classroom-native.

**Signature element:** the hero isn't a static illustration — it's a **live mini version of the actual game canvas**, rendered as chalk-on-blackboard, where a looping animation "draws" a simple doodle stroke-by-stroke (reusing your real Canvas/stroke-sync component, just fed a scripted demo instead of live WebSocket data). This is the one thing this landing page can do that a generic template can't: show the product instead of illustrating a metaphor for it.

---

## 2. Color Palette

| Token | Hex | Used for |
|---|---|---|
| `--blackboard` | `#1F3D33` | Deep chalkboard green — hero section background |
| `--blackboard-dark` | `#16302A` | Header bar, footer, shadow depth |
| `--chalk` | `#F6F3EA` | Primary text on blackboard, "chalk" stroke color |
| `--paper` | `#FBF6E9` | Light section backgrounds (notebook-paper cream, not pure white) |
| `--marker-yellow` | `#F4B942` | Primary CTA, highlight accents (chalk-holder yellow) |
| `--crayon-red` | `#E1533B` | Secondary accent, alerts, "wrong guess" states |
| `--ruler-blue` | `#3E6FD9` | Links, secondary CTA, "correct guess" states |
| `--pencil-graphite` | `#4A4A45` | Body text on paper backgrounds |
| `--eraser-pink` | `#E9A0B0` | Sparingly — hover states, small decorative accents only |

**Rule:** every section is either **on blackboard** (dark green bg, chalk-white text, chalk-textured illustrations) or **on paper** (cream bg, graphite text, ink-line illustrations). No section mixes the two — that contrast *is* the page's rhythm, echoing how the reference alternates pink/yellow blocks.

---

## 3. Typography

| Role | Typeface | Notes |
|---|---|---|
| Display (headlines) | **Chalkboard-style hand-lettered face** — e.g. "Caveat" or "Kalam" for the roughest chalk feel, or "Baloo 2" if you want it chunkier/friendlier than literal handwriting | Used large, always in `--chalk` or `--blackboard` depending on section. This carries the personality — don't default to a generic geometric sans here. |
| Body | **"Nunito" or "Figtree"** | Rounded terminals echo the chalk/marker world without being illegible at small sizes like a full handwriting font would be |
| Utility (labels, nav, buttons, scores) | **"Space Mono" or "JetBrains Mono", uppercase, letter-spaced** | Reads like stenciled classroom labels ("SUPPLY CLOSET", "DO NOT ENTER") — gives structure a distinct voice from body copy |

Headline sizes should feel chalk-drawn: slightly irregular baseline via CSS (`transform: rotate(-0.5deg)` on alternating words is enough — don't overdo it) rather than a perfectly straight, template-neat headline.

---

## 4. Layout Concept

### 4.1 The wavy divider → "torn notebook edge"

The reference uses a smooth wave to separate color blocks. Ours reinterprets that as a **torn spiral-notebook-paper edge** (small semicircle "holes punched" pattern, slightly irregular) — same structural job (soft seam between two flat-color sections) but drawn from the actual subject matter instead of a generic blob wave.

### 4.2 Page wireframe

```
┌──────────────────────────────────────────────────────┐
│  [SketchAI]              Features  How it works  Log in│  ← header, --blackboard-dark
├──────────────────────────────────────────────────────┤
│  BLACKBOARD SECTION (--blackboard)                     │
│                                                          │
│   sketch               [ live chalk-drawn canvas demo ] │
│   ai.                  [ looping doodle animation,      │
│                         reuses real Canvas component ]  │
│   Draw. Guess. Get judged                                │
│   by an AI that actually                                 │
│   gets what you meant.                                   │
│                                                            │
│   [ Play Now ]  (marker-yellow button, chalk-outline)     │
│                                                              │
╰┈┈┈┈┈┈┈┈┈┈ torn notebook edge divider ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈╯
├──────────────────────────────────────────────────────┤
│  PAPER SECTION (--paper)                                │
│                                                            │
│   [ illustrated open notebook,        Not your average    │
│     doodles in margins ]              skribbl clone        │
│                                                              │
│                                        We scrap exact-match  │
│                                        guessing. Guess       │
│                                        "puppy," get credit   │
│                                        for "dog." The AI      │
│                                        actually understands.  │
│                                                                │
├──────────────────────────────────────────────────────┤
│              HOW IT WORKS  (--paper, 3-card row)          │
│                                                              │
│   [Hall Pass]        [Chalk Dust]        [Report Card]     │
│   card 1              card 2              card 3            │
│   Join a room         Draw or guess       See your score,    │
│   with a code,        in real time.       drawer accuracy    │
│   no signup needed.                       breaks it down.    │
│                                                              │
╰┈┈┈┈┈┈┈┈┈┈ torn notebook edge divider ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈╯
├──────────────────────────────────────────────────────┤
│  BLACKBOARD SECTION — feature deep-dive                  │
│  (Fog of War, semantic scoring, drawer accuracy —          │
│   each gets a chalk-drawn diagram, not a stock icon)        │
├──────────────────────────────────────────────────────┤
│  FOOTER (--blackboard-dark)                                │
└──────────────────────────────────────────────────────┘
```

**Note on the 3-card "How it works" row:** unlike the reference's generic numbered 01/02/03 cards, name each step after an actual classroom object (hall pass = the room code / entry mechanism, chalk dust = the live drawing phase, report card = the score breakdown) — the frontend-design principle here is that structural labels should encode something true about the content, not just decorate it. Skip numbering; the classroom nouns already imply sequence.

### 4.3 Card style
- Rounded corners (12–16px), not sharp — echoes worn classroom furniture, not a sterile SaaS card
- Subtle chalk-dust texture on blackboard-section cards (very low-opacity noise/grain SVG overlay), flat and clean on paper-section cards — this contrast reinforces the blackboard/paper distinction from §2
- Card border: 2px, hand-drawn-wobble style (slight `border-radius` asymmetry, e.g. `border-radius: 14px 16px 15px 13px`) rather than a perfect radius — small detail, avoid overusing it (2–3 places max, per the "spend your boldness in one place" principle)

---

## 5. Motion

- **Hero canvas demo**: the signature moment — a looping, scripted stroke-by-stroke doodle draws itself in chalk on the hero blackboard, using the actual game's Canvas/stroke rendering logic. This alone should make the page feel alive without needing scroll animations everywhere else.
- **Section reveals**: simple fade+rise on scroll, once, no repeated bounce — keep it restrained per the reference's own relatively calm motion language
- **Button hover**: a short "chalk squeak" — 2–3px wobble/rotate on hover, not a generic scale-up — ties back to the physical chalk metaphor
- **Reduced motion**: respect `prefers-reduced-motion` — hero demo should fall back to a static drawn illustration, not keep animating

---

## 6. What NOT to do (guardrails against templated defaults)

- No warm-cream-background + terracotta-accent combo (the generic AI-design default) — our cream (`--paper`) pairs with blackboard green and marker yellow instead, which reads distinctly classroom, not "generic AI landing page"
- No numbered 01/02/03 markers unless the content is a genuine sequence (see §4.2 — we use classroom nouns instead)
- No stock "AI sparkle" icons — if illustrating the AI-judging feature, draw it as a chalk-outline teacher's red pen mark / checkmark instead, staying in the classroom vocabulary
- No generic rocket-ship / lightbulb iconography — every icon should be a real object from a classroom or a stationery drawer

---

## 7. Component Token Summary (for implementation)

```css
:root {
  --blackboard: #1F3D33;
  --blackboard-dark: #16302A;
  --chalk: #F6F3EA;
  --paper: #FBF6E9;
  --marker-yellow: #F4B942;
  --crayon-red: #E1533B;
  --ruler-blue: #3E6FD9;
  --pencil-graphite: #4A4A45;
  --eraser-pink: #E9A0B0;

  --font-display: 'Kalam', cursive;       /* or 'Baloo 2' for chunkier feel */
  --font-body: 'Nunito', sans-serif;
  --font-utility: 'Space Mono', monospace;

  --radius-card: 14px 16px 15px 13px;     /* hand-drawn wobble, use sparingly */
  --radius-button: 10px;
}
```

This is a starting point, not a locked spec — once you're building `client/` and seeing real content in the layout, it's normal to adjust spacing/scale. Keep the palette, type roles, and the blackboard/paper section rhythm fixed; those are the identity.
