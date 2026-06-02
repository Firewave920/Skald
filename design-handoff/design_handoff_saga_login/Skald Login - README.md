# Handoff: Skald — Saga Login Window

## Overview
A sign-in window for the Skald desktop application (an audiobook/library client that connects to a
self-hosted library server). This is the **"Saga"** concept — an editorial, literary direction that
leans into Skald's namesake (the Norse court poet). It is a split-panel login: a gold-leaf
"manuscript" panel on the left, and a quiet column of form fields on the right.

The window collects four things:
1. **Protocol** — `http` or `https` (a dropdown; default `http`)
2. **Server URL** — host:port of the library server
3. **Username**
4. **Password**

…and a primary **Enter** action that authenticates against `{scheme}://{host}`.

## About the Design Files
The files in this bundle are **design references created in HTML/React (via inline Babel)** — a
prototype showing the intended look and behavior. They are **not production code to copy directly.**
The task is to **recreate this design in the target codebase's existing environment** (the real Skald
app), using its established component patterns, fonts, and tokens. If no environment exists yet, pick
the framework appropriate to the project and implement the design there.

The prototype uses React function components with inline style objects purely for self-containment in a
single HTML file — do not treat inline styles as a requirement. Use the host app's styling system.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are all specified below
and should be reproduced faithfully. Exact hex values, font families, and pixel measurements are given
in the Design Tokens section.

## Screens / Views

### Screen: Saga Login Window
- **Name:** Saga Login / "Enter the hall"
- **Purpose:** The user points the app at their library server and authenticates. First screen on app
  launch when no saved session exists.
- **Overall layout:** A fixed window, designed at **760 × 620** (rounded 12px corners, 1px
  `rgba(255,255,255,0.08)` border, large ambient drop shadow). Horizontal flex split into two columns:
  - **Left panel:** fixed width **268px**, `flex-shrink: 0`, right border `1px solid rgba(212,166,74,0.35)`.
  - **Right panel:** `flex: 1`, holds the form, vertically centered.
  - A 40px-tall absolutely-positioned **titlebar** overlays the very top, spanning both columns.

#### Component: Window titlebar (overlay, full width, z-index above panels)
- Height **40px**, absolutely positioned top/left/right, padding `0 14px`, `justify-content: space-between`.
- **Left cluster** (flex, gap 9px):
  - 16×16 rounded-4px tile, background `rgba(255,255,255,0.07)`, border `1px solid rgba(255,255,255,0.09)`,
    centered serif **"S"** at 9px/700 in accent gold `#d4a64a`.
  - Label text: `Skald · Saga` — JetBrains Mono, 9px, color `rgba(235,231,223,0.38)`,
    letter-spacing `0.12em`, uppercase.
- **Right cluster:** three 40×40 window buttons with glyphs `–`, `□`, `✕` (minimize / maximize / close).
  - Color `rgba(235,231,223,0.38)`; middle glyph 10px, others 12px.
  - Hover (min/max): background `rgba(255,255,255,0.10)`, color `#ebe7df`.
  - Hover (close): background `rgba(231,72,86,0.85)`, color `#fff`.

#### Component: Left "manuscript" panel (268px)
- **Background:** the warm-onyx "wash" (see Design Tokens → Wash), at **1.4× intensity** for this panel.
  Plus an extra soft-light overlay: `radial-gradient(120% 80% at 0% 0%, rgba(212,166,74,0.35), transparent 55%)`
  at `opacity: 0.5`, `mix-blend-mode: soft-light`.
- **Padding:** `54px 30px 30px`. Content is a vertical flex with `justify-content: space-between`
  (top block pinned to top, quote pinned to bottom).
- **Top block:**
  - Eyebrow: `Skald` — JetBrains Mono, 10px, accent `#d4a64a`, letter-spacing `0.28em`, uppercase.
  - A 26×1px gold rule `rgba(212,166,74,0.35)`, margin `16px 0 18px`.
  - Display heading (Source Serif Pro, **33px / 600**, line-height 1.14, letter-spacing `-0.015em`,
    color `#ebe7df`), text on three lines:
    > The teller / returns to / the **hall**.
    The word **"hall"** is `font-style: italic` and accent gold `#d4a64a`.
- **Bottom quote block** (Source Serif Pro italic, 13px, line-height 1.55, color `rgba(235,231,223,0.62)`,
  max-width 200px):
  > "Every tale you keep awaits you here — bound, voiced, and ready to resume."
  - Attribution beneath: `— the keeper's note` — NOT italic, JetBrains Mono, 9.5px,
    `rgba(235,231,223,0.38)`, letter-spacing `0.16em`, uppercase, margin-top 14px.

#### Component: Right form panel (flex: 1)
- Padding `54px 44px 40px`, vertical flex, `justify-content: center`, z-index 10.
- **Header block** (margin-bottom 30px):
  - Title: `Enter the hall` — Source Serif Pro, **27px / 600**, letter-spacing `-0.01em`, color `#ebe7df`.
  - Subtitle: `Connect to your library server to continue.` — Inter, 13px, `rgba(235,231,223,0.62)`,
    margin-top 6px.
- **Fields:** a vertical flex with **gap 24px**. Every field uses the same pattern:
  - Label above (Source Serif Pro **italic**, 13px, color `rgba(235,231,223,0.62)`, margin-bottom 7px).
  - **Underline-only input:** transparent background, no border except
    `border-bottom: 1px solid rgba(255,255,255,0.12)`; Source Serif Pro, **16px**, color `#ebe7df`,
    padding `0 0 9px`, letter-spacing `0.01em`. Placeholder color `rgba(235,231,223,0.30)`.

  1. **"Where is your server?"** — a horizontal flex (`align-items: flex-end`, gap 12px):
     - **Scheme dropdown (custom button + menu)** — `flex-shrink: 0`:
       - Trigger button: transparent, `border-bottom: 1px solid rgba(255,255,255,0.12)`, accent color
         `#d4a64a`, Source Serif Pro 16px, padding `0 4px 9px 0`. Shows `{scheme}://` plus a small ▾
         caret (10px, `rgba(235,231,223,0.38)`) that rotates 180° when open. Hover → brighter gold `#e9bb5e`.
       - Menu (absolute, top offset +6px, min-width 132px): background `#1a1a22`, border
         `1px solid rgba(255,255,255,0.06)`, radius 8px, shadow `0 16px 32px rgba(0,0,0,0.5)`, padding 5px.
       - Two options `https` and `http`. Each row: space-between, serif 14px; the value (`https://`) on the
         left, a mono 9px tag on the right (`TLS` for https, `PLAIN` for http, color `rgba(235,231,223,0.38)`).
         Selected row: background `rgba(212,166,74,0.18)`, text accent `#d4a64a`. Others: text `#ebe7df`.
       - **Default selected: `http`.**
     - **Host input** — `flex: 1`, the standard underline input. **Prefill `192.168.1.238:13378`**,
       placeholder `192.168.1.238:13378`, `spellcheck=false`.
  2. **"By what name are you known?"** — underline input, **prefill `Testadmin`**, placeholder `username`,
     `spellcheck=false`.
  3. **"Your passphrase"** — underline input, `type=password`, placeholder `••••••••••`.
- **Error line** (only when validation fails): Source Serif Pro italic, 13px, color `#f1a89a`, margin-top 18px.
- **Action row** (flex, align-items center, gap 18px, margin-top 32px):
  - **Primary "Enter" button** (the bold gold pill):
    - Flex, gap 12px; padding `11px 28px`; `border-radius: 999px`.
    - Background gradient `linear-gradient(180deg, #e9bb5e, #d4a64a 55%, #a37d2e)`.
    - Border `1px solid rgba(212,166,74,0.35)`; text color **`#1a1306`** (near-black);
      Source Serif Pro **600**, 15px, letter-spacing `0.01em`.
    - Shadow `0 8px 24px rgba(212,166,74,0.22), inset 0 1px 0 rgba(255,255,255,0.2)`.
    - Label `Enter` plus a `→` arrow span.
    - **Hover:** `translateY(-1px)`, shadow `0 14px 36px rgba(212,166,74,0.32), inset 0 1px 0 rgba(255,255,255,0.2)`,
      `filter: brightness(1.04)`, and the arrow slides `translateX(4px)`. Transition 0.12–0.18s.
    - **Active:** `translateY(0)`.
    - **Pending state:** label becomes `Opening…`, cursor `wait`.
  - **Secondary link:** `I've forgotten my passphrase` — Source Serif Pro italic, 13px,
    `rgba(235,231,223,0.62)`, no underline.

## Interactions & Behavior
- **Scheme dropdown:** click trigger toggles the menu open/closed; caret rotates 180° when open;
  selecting an option sets `scheme` and closes the menu. (In production also close on outside-click /
  Escape — the prototype omits outside-click for brevity; add it.)
- **Submit (Enter button / form submit):** validate in order:
  1. host empty → error `A server address is required.`
  2. username empty → error `Your name is required.`
  3. password empty → error `A passphrase is required.`
  Otherwise clear error, set pending = true, attempt connection. Prototype simulates a 1500ms delay then
  clears pending; real implementation should perform the actual auth request to `{scheme}://{host}`.
- **Entrance animation:** the right form panel slides in — `saga-in`: from `opacity:0, translateX(12px)`
  to settled, 480ms `cubic-bezier(.2,.7,.2,1)`.
- **Focus:** inputs remove the default outline (underline is the affordance). Ensure an accessible focus
  indicator in production (e.g. brighten the underline to the accent on `:focus`).

## State Management
Local component state only — no remote data until submit:
- `scheme: 'http' | 'https'` (default `'http'`)
- `host: string` (default `'192.168.1.238:13378'`)
- `user: string` (default `'Testadmin'`)
- `pass: string` (default `''`)
- `schemeOpen: boolean` — dropdown open state
- `pending: boolean` — request in flight
- `error: string` — validation/connection message ('' = none)

Submit composes the base URL as `` `${scheme}://${host}` `` and authenticates with `user`/`pass`.
On success, persist the session/server and route into the app's library screen.

## Design Tokens
Colors:
- `--bg` `#0b0b0e` (window base)
- `--bg-deep` `#08080b`
- `--panel` `#131319`
- `--panel-2` `#1a1a22` (popovers/menus)
- `--text` `#ebe7df`
- `--text-dim` `rgba(235,231,223,0.62)`
- `--text-mute` `rgba(235,231,223,0.38)`
- `--line` `rgba(255,255,255,0.06)`
- `--line-strong` `rgba(255,255,255,0.12)` (input underlines)
- `--accent` `#d4a64a` (gold)
- `--accent-bright` `#e9bb5e`
- `--accent-deep` `#a37d2e`
- `--accent-dim` `rgba(212,166,74,0.18)` (selected menu row)
- `--accent-edge` `rgba(212,166,74,0.35)` (gold borders/rules)
- `--cta-text` `#1a1306` (near-black on gold)
- `--danger-text` `#f1a89a`

Typography:
- Serif (display + form): **Source Serif Pro** — weights 400/500/600, plus italics.
- Mono (eyebrows, tags, titlebar): **JetBrains Mono** — 400/500/600.
- Sans (subtitle/body): **Inter** — 400/500/600/700.
- Notable sizes: display heading 33/600; window title 27/600; field input 16; field label 13 italic;
  CTA 15/600; mono eyebrow 10 @ 0.28em.

Spacing / radius / shadow:
- Window radius 12px; menu radius 8px; CTA radius 999px (pill).
- Field group gap 24px; header margin-bottom 30px; action row margin-top 32px.
- Left panel width 268px; left panel padding `54px 30px 30px`; right panel padding `54px 44px 40px`.
- Window shadow `0 30px 70px rgba(0,0,0,0.5)`; CTA shadow `0 8px 24px rgba(212,166,74,0.22), inset 0 1px 0 rgba(255,255,255,0.2)`.

Wash (shared Skald background, used by the left panel at 1.4× intensity):
- Base `#0b0b0e`, overlaid with three blurred radial glows and a darkening gradient:
  - `radial-gradient(50% 50% at 50% 50%, rgba(212,166,74, 0.14×i), transparent 65%)` top-left, blur 90px
  - `radial-gradient(50% 50% at 50% 50%, rgba(212,166,74, 0.08×i), transparent 60%)` right, blur 110px
  - `radial-gradient(50% 50% at 50% 50%, rgba(60,40,20,0.6), transparent 65%)` bottom, blur 120px
  - top darkening `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))`
  - faint dotted grain at `opacity 0.05`, `mix-blend-mode: overlay`
  (where `i` = intensity multiplier; left panel uses `i = 1.4`.)

## Assets
No raster assets. The "S" mark is a serif glyph in a rounded tile. All other glyphs are Unicode
(`–`, `□`, `✕`, `▾`, `→`). Fonts load from Google Fonts (Source Serif Pro, JetBrains Mono, Inter) —
swap to the app's bundled equivalents in production.

## Files
Design reference files included in this bundle:
- `Skald Login.html` — the canvas host that mounts all three concepts (Saga is option **C**).
- `login/tokens.jsx` — shared Skald tokens (`SKALD`), the `Wash` background, the `MiniTitlebar`, and the
  `PREFILL` defaults (`{ scheme: 'http', host: '192.168.1.238:13378', user: 'Testadmin' }`).
- `login/saga.jsx` — **the Saga login component itself (this is the screen to build).**
- `app/chrome.jsx`, `app/icons.jsx` — reference for the real Skald app's chrome/icon vocabulary.

To view the prototype: open `Skald Login.html` and focus the **C · Saga** artboard (it is fully
interactive — typing, the scheme dropdown, validation, and the Enter button all work).
