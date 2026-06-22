# Handoff: Skald — Metadata Match (Option B · Side-by-Side)

## Overview

**Metadata Match** is a small review modal inside the **Skald** desktop audiobook app. When Skald matches a local audiobook against an online metadata source (Audible, in this mock), it opens this window so the user can **review the proposed metadata, choose current-vs-incoming per field, hand-edit any value, and apply the result** to their library item.

This handoff covers **Option B — "Side-by-Side"**, the direction chosen for implementation. It is a true diff laid out as two aligned columns:

- **CURRENT** (left) — what Skald has now.
- **RESULT** (right) — the value that will be saved. It starts as the incoming source value, but is **fully editable** — the user can keep current, take incoming, or type a custom value.

Each field is one row spanning both columns; a round **accept toggle** sits in the gutter and picks current-vs-incoming as the base. Every result cell carries a **pencil** that opens an **inline editor** (input / textarea / chip list); hand-edited fields are flagged **EDITED** and gain a **revert** control. A segmented filter switches between **Changes** (only fields that differ — the default) and **All fields**. The footer has an **Accept all** control, a live **change count** (with an *edited* sub-count), and **Cancel / Apply** actions.

> **What changed in this revision:** the right column was reframed from a passive "FROM AUDIBLE" preview into an editable **RESULT** column. Users are no longer limited to accept/reject — they can correct a bad match inline before applying. New pieces: the `EditField` inline editor, an `EDITED` status tag, a per-row revert affordance, and a footer count driven by what actually differs from current rather than by checkbox selection.

The window is a fixed **720 × 600** modal that floats over the app behind it (it would typically be presented with a scrim/backdrop). It uses Skald's "Onyx" dark theme — warm-leaning black, brass-gold accent, glassy wash, serif for titles, monospace for labels.

## About the design files

The files in this bundle are **design references created in HTML/JSX (via Babel-in-browser)**. They are a working prototype intended to show the **intended look, layout, copy, and interactive behaviour** — not production code to ship directly.

The task is to **recreate this window in the target codebase's environment** (the Skald app — React, Tauri + a frontend framework, Electron + React, native, etc.) using its established patterns and component libraries. If no environment exists yet, pick the most appropriate framework and implement it there. The prototype is written as React function components with inline-style objects, so the structure translates cleanly.

The match payload (`RAW_FIELDS`, `MATCH_SOURCE`) is **illustrative mock data**. In production it is the diff between the library item's current metadata and the response from the metadata provider. Field keys, labels, and types should map onto your real metadata schema.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, copy, hover/active states, and interactions are all specified. Pixel-target the design as closely as your component primitives allow. Exact hex values, font sizes, and spacing are below and in `source/`.

The audiobook **cover art is a placeholder** — a pure-CSS typographic square (`MiniCover` in `shared.jsx`), shown in two looks: a dim "OLD" local-art variant (current column) and a crisp "NEW" source-art variant (incoming column). In production, replace `MiniCover` with a real cover-image component; the placeholder can stay as the loading / missing-art state. Covers are **square (1:1)** per audiobook convention.

The window targets a fixed **720 × 600** modal. Rows scroll inside; header and footer are pinned.

---

## Layout

The window is a single column flexbox, full height, `overflow: hidden`:

```
┌────────────────────────────────────────────────────────┐
│ HEADER  (border-bottom)                                  │
│  ‹back  Review Match                   [Changes|All]  ✕ │   ← title row
│         Audible.com · 97% match · 10 differ · edit any   │
│  ┌──────────┬───────────────┬────┬───────────────────┐  │
│  │          │ CURRENT       │    │ ✦ RESULT ·editable │  │   ← column heads
├──┴──────────┴───────────────┴────┴───────────────────┴──┤
│ ROWS  (flex:1, overflow-y:auto)                          │
│  ┌────────┬───────────────┬────┬────────────────────┐   │
│  │ LABEL  │ current value │ ◯  │ result value    ✎  │   ← CompareRow ×N
│  │ [tag]  │   (dim/strike)│ ↩  │ (tinted when appl.)│   │   (✎ edit · ↩ revert)
│  └────────┴───────────────┴────┴────────────────────┘   │
│  ✓ 6 more fields already match   show all                │   ← only in "Changes"
├──────────────────────────────────────────────────────────┤
│ FOOTER  (border-top)                                     │
│  ☑ Accept all    3 changes · 1 edited  [Cancel] [Apply 3]│
└──────────────────────────────────────────────────────────┘
```

When a row is in **edit mode** the result cell expands to hold the inline editor (input/textarea + Save/Cancel); the grid switches to `align-items: start` for that row so the tall cell tops-align.

### The 4-column grid (the heart of the layout)

Both the column-head row and every `CompareRow` use the **same CSS grid** so cells line up perfectly:

```css
display: grid;
grid-template-columns: 78px 1fr 38px 1fr;
align-items: center;
```

| Column | Width | Contents |
|---|---|---|
| 1 — label | `78px` | Field label (mono, uppercase) + status tag (`CHANGED`/`NEW`/`EDITED`) stacked below |
| 2 — current | `1fr` | Current value cell (strikes through when the result differs) |
| 3 — gutter | `38px` | Accept toggle (changed rows) **or** revert button (edited rows), centered |
| 4 — result | `1fr` | Editable result cell — read view (value + pencil) or inline editor |

`CompareRow` has `border-bottom: 1px solid line` and `min-height: 50px`. `align-items` is `center` normally, `start` while that row is being edited.

---

## Components

### Header

- **Container:** `padding: 16px 18px 0`, `border-bottom: 1px solid line`. Sits above the wash (`position: relative`).
- **Title row:** flex, `gap: 12px`, `align-items: flex-start`, `padding-bottom: 14px`.
  - **Back button** — `Glyph name="back"` 17px, `textDim`, `padding: 4px`, `margin-left: -4px`. (Leading affordance; in a modal you may drop it in favor of just the close button.)
  - **Title block** (`flex: 1`):
    - `Review Match` — serif, **19px / 600**, line-height 1.1, color `text`.
    - Sub-line — mono, **10px**, color `textMute`, `margin-top: 5px`, `letter-spacing: 0.04em`: `{source.name} · {round(confidence*100)}% match · {N} differ · edit any field`. Mock renders `Audible.com · 97% match · 10 differ · edit any field`.
  - **Segmented filter** — `display: flex`, background `rgba(0,0,0,0.3)`, `border-radius: 8px`, `padding: 3px`, `border: 1px solid line`. Two buttons (`Changes`, `All fields`): `padding: 5px 11px`, `border-radius: 6px`, mono **9.5px**, `letter-spacing: 0.05em`, uppercase. Active button: background `accentDim`, color `accent`. Inactive: transparent, `textMute`. `transition: all .12s`.
  - **Close button** — `Glyph name="close"` 16px, `textDim`, `padding: 4px`, `margin-right: -4px`.
- **Column heads** — the 4-col grid. Col 1 empty; col 2 `CURRENT` (mono 9px, `letter-spacing: 0.12em`, `textMute`, `padding: 8px 14px`); col 3 empty; col 4 `✦ RESULT · editable` (mono 9px, `letter-spacing: 0.12em`, color `accent`, `padding: 8px 16px`, flex with a 9px `sparkle` glyph, `gap: 5px`; the `· editable` suffix is in `textMute`).

### CompareRow (`option-b.jsx`)

Props: `field`, `base` (`'incoming'|'current'` — which side is the chosen base), `resolved` (the value that will be saved), `edited` (bool — hand-edited away from incoming), `applied` (bool — resolved differs from current, i.e. it will write), `editing` (bool — this row's inline editor is open), and handlers `onToggle`, `onStartEdit`, `onSaveEdit(value)`, `onCancelEdit`, `onRevert`.

- `changed = field.status !== 'same'`. `accent = field.status === 'added' ? add(green) : accent(brass)`.
- **Col 1 — label:** `padding: 12px 10px 12px 16px`, flex column, `gap: 5px`.
  - Label: mono **9px**, `letter-spacing: 0.08em`, uppercase, line-height 1.2. Color `textDim` if changed *or* edited, else `textMute`.
  - Tag below, `align-self: flex-start`: **`EDITED`** if `edited`, else `StatusTag` for the field status (only when changed).
- **Col 2 — current value:** `padding: 12px 14px`, `min-width: 0`. Renders `<ValueCell side="current" dim strike={applied} />`. When the result will replace it, the current value gets a `line-through` (in `rgba(235,231,223,0.25)`).
- **Col 3 — toggle / revert:** flex centered.
  - **Edited row** → a **revert** button: `26×26`, `border-radius: 13px`, transparent, border `1.5px lineStrong`, `revert` glyph 13px in `textDim`, `title="Revert to source value"`. Clears the edit (`onRevert`).
  - **Changed (not edited) row** → the **accept toggle** button: `26×26`. On (`base==='incoming'`): background `accent` (brass / green for added), glyph `check` 13px in `bg`, `sw 2`. Off (`base==='current'`): transparent, border `1.5px lineStrong`, glyph `right` 13px in `textMute`. `transition: all .12s`. `title` = `"Using new value"` / `"Keeping current"`.
  - **Same row** → static muted `check` glyph 12px, `textMute` (no button).
- **Col 4 — result value (editable):** `padding: 12px 16px 12px 14px` (read) / `10px 16px 12px 14px` (editing), `min-width: 0`, `align-self: stretch`, flex, `gap: 8px`.
  - **Read view:** `<ValueCell side="incoming" value={resolved} dim={!applied && !edited} />` plus a trailing **pencil** button (`Glyph name="edit"` 13px, `textMute` → `accent` on hover, `flex-shrink:0`, top-aligned). The pencil is shown for every type **except** `cover`. When `applied`, the cell is **tinted** with an `inset 2px 0 0` left bar: edited → neutral (`rgba(255,255,255,0.05)` + `textDim` bar); added → `addDim` + green bar; otherwise brass tint (`rgba(212,166,74,0.07)`) + brass bar.
  - **Edit view:** renders `<EditField>` (below); the tint/bar are dropped while editing.

### EditField (`option-b.jsx`)

The inline editor mounted in the result cell when a row is being edited. Props: `field`, `value` (the current resolved value to seed the draft), `onSave(value)`, `onCancel`.

- Holds its own `draft` state; focuses + selects on mount. `chips` seed/produce a **comma-separated** string ↔ array (`split(',')`, trim, drop empties).
- **Control:** `longtext` → `<textarea rows={4}>`; everything else → `<input>` (chips input shows placeholder `comma, separated, tags`). Style: `width:100%`, background `panel2`, border `1px solid accentEdge`, `border-radius: 6px`, color `text`, font per type (mono for `mono`, else sans), `padding: 7px 9px`, `resize: vertical`.
- **Keyboard:** `Esc` cancels; `Enter` saves for single-line fields; for `longtext`, `⌘/Ctrl+Enter` saves (plain Enter inserts a newline).
- **Toolbar** (below the input, flex `gap: 6px`): **Save** — brass button (`accent` bg, `bg` text, mono 9.5px uppercase, `check` glyph) commits the draft; **Cancel** — ghost button (`glassEdge` border, `textDim`) discards. A muted hint at the right reads `↵ save · esc` (or `⌘↵ save · esc` for longtext).

### ValueCell (`option-b.jsx`)

Renders a field value per its `type`. Props: `field`, `side` (`'current'|'incoming'`), `value`, `dim`, `strike`. In the result column it is fed the **resolved** value (which may be a user edit), not necessarily `field.incoming`.

- **`cover`** → `<MiniCover variant={side==='current' ? 'sam-old' : 'sam-new'} size={46} />`.
- **`chips`** → if empty, italic `none` (11px, `textMute`); else a wrapping flex (`gap: 4px`) of pills: **10.5px**, `padding: 2px 7px`, `border-radius: 20px`, color `textMute` (dim) / `textDim`, background `glass`, `border: 1px solid line`.
- **empty scalar** → italic `empty`, 12px, `textMute`, sans.
- **`longtext`** → 11.5px / line-height 1.45, clamped to **4 lines** (`-webkit-line-clamp: 4`).
- **`mono`** → mono family.
- **other text** → 12.5px / line-height 1.3, sans.
- Text cells: color `textMute` (dim) / `textDim`; `text-decoration: line-through` when `strike`, decoration color `rgba(235,231,223,0.25)`; clamped to 2 lines (long → 4).

### StatusTag (`shared.jsx`)

Tiny mono pill, 8.5px, `letter-spacing: 0.13em`, `border-radius: 3px`, `padding: 1.5px 5px`, line-height 1, `white-space: nowrap`.

| status | text | color | background | border |
|---|---|---|---|---|
| `added` | `NEW` | `add` `#5ac88a` | `addDim` | `addEdge` |
| `changed` | `CHANGED` | `accent` `#d4a64a` | `accentDim` | `accentEdge` |
| `edited` | `EDITED` | `text` `#ebe7df` | `glassStrong` | `lineStrong` |
| `same` | `MATCH` | `textMute` | transparent | `line` |

The `edited` variant is the one added for hand-editing; it reads as a neutral/light pill so it's visually distinct from the brass `CHANGED` and green `NEW`.

### Footer

- `position: relative`, `padding: 12px 18px`, `border-top: 1px solid line`, flex, `align-items: center`, `gap: 12px`, background `rgba(8,8,11,0.6)`.
- **Accept all** — clickable row: `Check` (square checkbox, 15px) + label `ACCEPT ALL` (mono 10px, `letter-spacing: 0.06em`, uppercase). Color `accent` when **all changed fields are on incoming and none are hand-edited**, else `textDim`. Clicking takes all changed fields to incoming **and clears all edits** (closing any open editor); if everything was already in that all-on state, it instead flips all changed fields to current.
- **Spacer** (`flex: 1`).
- **Change count** — `{n} change(s)`, 11.5px `textMute`, with `n` in `text` color, weight 600, where `n` = number of fields whose resolved value differs from current. When any fields are hand-edited, a `· {m} edited` suffix follows in `textMute`.
- **Cancel** — ghost button: `padding: 9px 18px`, `border-radius: 8px`, transparent, `border: 1px solid glassEdge`, `textDim`, 13px.
- **Apply {n}** — primary button: `padding: 9px 18px`, `border-radius: 8px`, no border, 13px / 600, flex with a 14px `check` glyph (`gap: 7px`). `n` is the same change count. **Enabled** (n>0): background `accent`, text `bg` (dark), glyph `bg`. **Disabled** (n=0): background `glassStrong`, text `textMute`, glyph `textMute`.

### MatchWash (`match-wash.jsx`)

Fixed background layer inside the window: two large blurred radial glows (`pointer-events: none`) — a warm brass glow top-left (`rgba(212,166,74,0.10)`, blur 80px) and a deep amber glow bottom-right (`rgba(60,40,20,0.5)`, blur 100px). All content sits above it with `position: relative`. Do not put it inside the scrolling rows region.

### MiniCover (`shared.jsx`)

Pure-CSS square cover placeholder. `variant`: `sam-new` (crisp, blue-slate gradient, light text, brass corner flag reading `NEW`) or `sam-old` (dim, grey gradient, muted text, grey corner flag reading `OLD`). Serif type, square, `border-radius` 4px. Replace with a real `<img>` from your metadata provider in production.

### Glyph & Check (`shared.jsx`)

`Glyph` is the stroked SVG icon set (`back`, `close`, `check`, `right`, `edit` (pencil), `revert` (undo arrow), `sparkle`, etc. — `stroke-linecap/linejoin: round`). `Check` is the square gold checkbox (used by Accept all): `border-radius: 4px`, brass fill + dark checkmark when on, `1.5px lineStrong` border when off.

---

## Interactions & behavior

- **Accept toggle (per row):** clicking the gutter button flips `base[field.key]` between `incoming` and `current`. When `incoming`, the result cell tints + gains the left accent bar and the current cell strikes through; when `current`, the result mirrors current and the cell is untinted. Only `changed`/`added` rows show the toggle; `same` rows show a static muted check. Once a row is hand-edited the toggle is replaced by the **revert** button.
- **Edit a value (per row):** the pencil in the result cell (any type except `cover`) opens the inline `EditField` seeded with the current resolved value. **Save** stores the value in `edits[key]`, flags the row `EDITED`, and re-tints the result as a neutral (non-brass) change; **Cancel**/`Esc` discards. Editing is available on `same` rows too — correcting an already-matched value will mark it applied.
- **Revert (per row):** on an edited row, the gutter button becomes a `revert` glyph that deletes `edits[key]`, returning the result to the toggle-driven base (incoming/current).
- **Filter (Changes / All fields):** `Changes` (default) renders only `CHANGED_FIELDS`; `All fields` renders the full `FIELDS` list (matching rows included, shown with the static check — still editable). The active segment is brass-tinted.
- **"N more fields already match" strip:** appears only in `Changes` mode, below the rows. Shows `{SAME_FIELDS.length} more fields already match` (mono 10px, `textMute`) with a `show all` link (brass) that switches the filter to All fields.
- **Accept all (footer):** if every changed field is already on incoming with no edits, clicking it flips them all to current; otherwise it sets all changed fields to incoming **and clears all edits** (and closes any open editor).
- **Change count / Apply label:** both reflect the number of fields whose **resolved value differs from current** (`appliedCount`), recomputed live as toggles/edits change. The footer also shows an `edited` sub-count. `Apply {n}` uses disabled styling when `n === 0`.
- **Cancel / Close / Back:** dismiss the modal without applying. (Wire to your modal/router dismissal.)
- **Apply:** writes each field's **resolved** value (incoming, current, or the user's edit) onto the library item for every field that differs from current, and closes. (Stubbed in the mock.)
- **Transitions:** toggle button and segmented filter both `transition: all .12s`. While a row is editing, the grid `align-items` switches to `start`. No entrance animation is specified for the rows; add a subtle fade if your modal system uses one.
- **Scroll:** the rows region (`flex: 1`) scrolls; header and footer stay pinned. Custom thin scrollbar styles are in the HTML `<style>`.

### Accessibility notes

- Toggle buttons carry a `title` reflecting state; add `aria-pressed` and an accessible label (e.g. `Use Audible value for {label}`) in production. Give the pencil/revert buttons labels too (`Edit {label}`, `Revert {label} to source`).
- The inline editor focuses on open and is fully keyboard-operable (Enter / ⌘Enter to save, Esc to cancel); ensure focus returns to a sensible spot (the pencil) on save/cancel.
- `Check` already uses `aria-pressed`.
- Focus ring is `2px accent` at `2px offset` (`button:focus-visible`).
- Ensure the modal traps focus and `Esc` triggers Cancel/Close.

---

## State management

All state is local to `OptionB` (`option-b.jsx`):

| State | Type | Init | Purpose |
|---|---|---|---|
| `base` | `{ [key]: 'incoming'\|'current' }` | every changed field → `'incoming'` | Which side is the base for each changed field. |
| `edits` | `{ [key]: value }` | `{}` | Hand-edited overrides. Presence here wins over `base`. Values are strings, or arrays for `chips`. |
| `editingKey` | `string \| null` | `null` | Which row's inline editor is open (one at a time). |
| `onlyChanges` | `boolean` | `true` | Filter mode — `true` = Changes, `false` = All fields. |

Derived:

- `resolve(f)` — the value that will be saved: `edits[key]` if set, else (`same` → `current`) else (`base==='incoming' ? incoming : current`).
- `isEdited(f)` — `edits[key]` exists **and** differs from `incoming` (normalized).
- `isApplied(f)` — `resolve(f)` differs from `current` (normalized) → it will write.
- `appliedCount` / `editedCount` — counts over all `FIELDS` for the footer.
- `allOn` — every changed field is on `incoming` with no edit (drives the Accept-all checkbox).
- `visible` — `onlyChanges ? CHANGED_FIELDS : FIELDS`.

Handlers: `toggle(key)` flips `base`; `saveEdit(key, v)` sets `edits[key]` and closes the editor; `revert(key)` deletes `edits[key]`; `acceptAll()` as described above.

`normVal(v)` normalizes for comparison (arrays joined with `\0`, strings trimmed) — the same logic `fieldStatus` uses in `shared.jsx`.

In the real app, the **input** is the diff result `{ current, incoming }[]` per field (computed by comparing the library item to the provider response), and the **output** on Apply is, for every field where `isApplied`, `{ key → resolve(field) }` — written onto the item. Note the output value may be a **user edit**, not just incoming or current.

### Data model (`shared.jsx`)

`MATCH_SOURCE = { name, asin, confidence }`. Each field in `RAW_FIELDS`:

```
{ key, label, type, current, incoming }
```

- **`type`** ∈ `text | longtext | mono | chips | cover`. Drives how `ValueCell` renders.
- **`status`** is **derived** by `fieldStatus(f)`, not stored: `cover` → always `changed`; both sides equal → `same`; current empty → `added`; otherwise `changed`. (Arrays compared by joining with `\0`; strings trimmed.)
- `FIELDS` = `RAW_FIELDS` with `status` attached. `CHANGED_FIELDS` = status ≠ `same`. `SAME_FIELDS` = status `same`.

The mock fields: cover, title, subtitle, author, narrator, series, publisher, year, genres, tags, language, isbn, asin, description.

---

## Design tokens (`ONYX`, in `shared.jsx`)

This window uses the Onyx **dark** palette only.

| Token | Value | Use |
|---|---|---|
| `bg` | `#0b0b0e` | Window background |
| `bgDeep` | `#08080b` | Footer / page backdrop |
| `panel` | `#131319` | Solid panel surface |
| `panel2` | `#1a1a22` | Popover / menu surface |
| `line` | `rgba(255,255,255,0.06)` | Hairline dividers, row borders |
| `lineStrong` | `rgba(255,255,255,0.12)` | Toggle border (off), checkbox border |
| `text` | `#ebe7df` | Primary text (warm off-white) |
| `textDim` | `rgba(235,231,223,0.62)` | Values, secondary text |
| `textMute` | `rgba(235,231,223,0.38)` | Labels, captions, placeholders |
| `accent` | `#d4a64a` | Brass — accepted state, FROM-source head, primary action |
| `accentBright` | `#e9bb5e` | Hover brass |
| `accentDeep` | `#a37d2e` | Deep brass |
| `accentDim` | `rgba(212,166,74,0.18)` | Active filter bg, CHANGED tag bg |
| `accentEdge` | `rgba(212,166,74,0.35)` | CHANGED tag border, focus accents |
| `glass` | `rgba(255,255,255,0.04)` | Chip fill |
| `glassStrong` | `rgba(255,255,255,0.07)` | Disabled primary button bg |
| `glassEdge` | `rgba(255,255,255,0.09)` | Ghost button border |
| `add` | `#5ac88a` | Green — NEW (added) status |
| `addDim` | `rgba(90,200,138,0.14)` | NEW tag bg, added-cell tint |
| `addEdge` | `rgba(90,200,138,0.32)` | NEW tag border |

The result-cell **brass tint** (`rgba(212,166,74,0.07)`), the **edited tint** (`rgba(255,255,255,0.05)`), and the current-cell **strikethrough color** (`rgba(235,231,223,0.25)`) are literals in `option-b.jsx`, not `ONYX` tokens — promote them to tokens if you like.

### Typography

Imported via Google Fonts in the entry HTML:

```
Source Serif Pro (400, 500, 600, 700; italic 400)
Inter           (400, 500, 600, 700)
JetBrains Mono  (400, 500, 600)
```

| Token | Stack | Use |
|---|---|---|
| `sans` | `"Inter", -apple-system, system-ui, sans-serif` | Body, values, buttons |
| `serif` | `"Source Serif Pro", Georgia, serif` | The `Compare Match` title; cover type |
| `mono` | `"JetBrains Mono", ui-monospace, Menlo, monospace` | Labels, column heads, tags, counters, captions |

Type pattern: mono uppercase eyebrows/labels with wide tracking (`0.08–0.13em`) over serif/sans content; counters and technical fields are mono.

### Radius

| Size | Use |
|---|---|
| 3px | Status tags |
| 4px | Checkbox, MiniCover |
| 6px | Segmented filter buttons; inline editor input/textarea; Save/Cancel buttons |
| 8px | Segmented container, Cancel / Apply buttons |
| 13px | Round accept toggle (26px circle) |
| 14px | Window frame |
| 20px | Chips |

### Spacing

- Window: `720 × 600`, `border-radius: 14px`, `overflow: hidden`.
- Window border + shadow (from the modal frame): `border: 1px solid rgba(255,255,255,0.10)`; `box-shadow: 0 40px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`.
- Header padding `16px 18px 0`; footer padding `12px 18px`; row cell paddings as listed per column above.
- Grid: `78px 1fr 38px 1fr`. Row `min-height: 50px`.

---

## Assets

- **No external image assets.** Cover art is `MiniCover` (pure CSS). All icons are inline SVG in `Glyph` / `Check` (`shared.jsx`).
- **Fonts** from Google Fonts (Source Serif Pro, Inter, JetBrains Mono). For a desktop/offline build, vendor these and drop the `<link rel=stylesheet>`.
- In production, swap `MiniCover` for a real cover-image component fed by your metadata provider; keep the placeholder as the loading/missing state.

---

## Files in this bundle

```
source/
  Metadata Match B.html   — standalone entry. Loads Google Fonts, React UMDs,
                            Babel, then shared.jsx + match-wash.jsx + option-b.jsx,
                            and renders <OptionB/> inside the 720×600 WindowFrame.
  shared.jsx              — ONYX tokens, MATCH_SOURCE + RAW_FIELDS data model,
                            fieldStatus(), FIELDS/CHANGED_FIELDS/SAME_FIELDS,
                            and UI atoms: MiniCover, StatusTag (incl. EDITED),
                            Check, Glyph (incl. edit + revert).
  option-b.jsx            — OptionB screen + CompareRow + ValueCell + EditField
                            (inline editor) + normVal().
  match-wash.jsx          — MatchWash background layer (extracted for standalone).
```

Open `source/Metadata Match B.html` directly in a browser to see the live prototype. It runs entirely client-side via Babel-in-browser. You can toggle each field's accept control, **click the pencil to edit any value inline** (then Save / Cancel / revert), switch the Changes/All filter, use Accept all, and watch the change count + Apply label update.

> Note: this window is **one screen of the larger Skald app**. If you also received the `design_handoff_skald_app` bundle, the same `ONYX` tokens, fonts, `Glyph` set, and dark "Onyx" treatment apply there — reuse those primitives rather than redefining them.
