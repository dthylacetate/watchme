# Pixel Room View — Design Spec

**Date**: 2026-03-20
**Branch**: `redesign/pixel-room` (based on `main`)
**Status**: Approved

---

## Overview

Add a **Pixel Room** view to the existing live-dashboard frontend. The room is an alternative way to visualize device activity: each online device is represented by a Stardew-Valley-style pixel character sitting at a desk, with their current app shown on their monitor screen.

This is a **new view alongside the existing card view** — a toggle button switches between "Room" and "Cards". No existing UI is removed or modified.

---

## Visual Design

### Style
- **Pixel art**, Stardew Valley aesthetic: small blocky characters, soft rounded-rect shapes, soft colors
- Implemented entirely with **inline SVG + CSS** — no external images, no new libraries
- Plant decoration is a pixel-art SVG shape (not emoji), consistent with the SVG-only constraint

### Perspective
- **Front-facing full view** (正面全景): like looking at a stage set
- Viewer sees: back wall, window with curtains, baseboard, wooden floor planks
- All character+desk slots arranged horizontally left-to-right

### Color Modes (auto-switching)

| State | Mode | Key Colors |
|-------|------|-----------|
| Any device online | **Day** | Wall `#efe5d0`, curtains `#f0b0c0`, floor `#c8935a`, sunshine window |
| All devices offline | **Night** | Wall `#16213e`, floor `#2c1a0e`, moon window — matches existing `body.night-mode` |

Transition uses the same 1.2s CSS transition already on the main theme.
`isNightMode` is passed as a **prop** from `page.tsx` (where `allOffline` is already computed), never read from `document.body.classList`.

> **Note**: The room's night/day state is driven **exclusively by `allOffline`**, independent of any system dark-mode preference or manual theme toggle. When all devices go offline the room turns to night regardless of the rest of the page's theme state. This is intentional.

### Default View

The toggle **defaults to `"room"`** on first load. This is intentional: the pixel room is the featured new experience and users can switch to cards at any time.

### Per-device Slot

Each device occupies one slot (desk + character). Slots are laid out evenly across the room SVG.

**Online state:**
- Character sits upright, subtle breathing animation (`transform: scaleY` with `transform-box: fill-box; transform-origin: bottom center` to prevent positional shift)
- Monitor has glowing border (blue in day, purple-blue in night)
- Monitor content: app emoji (large, centered via `<foreignObject><div>`) + short app name text
- App emoji resolved from a small static map in `PixelRoom.tsx` (see App Icon Mapping below); falls back to `💻`
- Character name label below the desk, with green `●` indicator

**Offline state:**
- Slot dimmed (`opacity: 0.35`), character head drooped, floating `zzz` above
- Monitor dark, no glow
- Label with `○` indicator

### App Icon Mapping

A small static map defined inside `PixelRoom.tsx`:

```ts
const APP_EMOJI: Record<string, string> = {
  "VS Code": "💻", "Xcode": "🔨", "Chrome": "🌐", "Safari": "🧭",
  "Firefox": "🦊", "Terminal": "⬛", "Finder": "📁", "Spotify": "🎵",
  "YouTube": "▶️", "Steam": "🎮", "Discord": "💬", "Slack": "💬",
  "Figma": "🎨", "Notion": "📝", "Obsidian": "🗒️",
};
// fallback: "💻"
```

The `app_name` from the API response is matched against this map. Easy to extend.

### Monitor Text Rendering

App name and emoji on the monitor screen use `<foreignObject>` wrapping a `<div>`, not SVG `<text>`, to ensure consistent cross-browser emoji rendering and text overflow handling (truncated with `text-overflow: ellipsis`).

### Room Decorations (fixed)
- Window centered on back wall
- Curtains flanking the window (SVG rect shapes)
- One pixel-art potted plant (SVG) between desk slots
- Wooden floor planks (horizontal lines in SVG)

---

## Architecture

### Integration Point

The view toggle state and `PixelRoom` rendering live in **`page.tsx`**, which already controls full-page layout, holds the `allOffline` boolean, and has `"use client"`. No changes to `CurrentStatus.tsx`.

`PixelRoom` is a pure component (`"use client"` not required if it receives all state as props from `page.tsx`).

### New Files

```
packages/frontend/src/components/
└── PixelRoom.tsx          # Room component — accepts devices[] + isNightMode prop
                           # Contains: RoomBackground (SVG), DeviceSlot (SVG, per device)
                           # App emoji map defined here as a module-level const
```

### Modified Files

```
packages/frontend/app/
├── page.tsx               # Add viewMode state; toggle button; pass isNightMode to PixelRoom
└── globals.css            # Add @keyframes: breathe, screenGlow, zzzFloat

packages/frontend/src/components/
└── (CurrentStatus.tsx — NO CHANGES)
```

### Toggle Button Placement

Located in `page.tsx`, **below `<Header>`, above `<CurrentStatus>`**, right-aligned. Pill-shaped button with two options: `🏠 房间` / `📋 卡片`.

### Data Flow

- `PixelRoom` receives `devices: DeviceState[]` and `isNightMode: boolean` as props
- `isNightMode = allOffline` (already computed in `page.tsx`)
- No new API calls, no backend changes
- Reuses existing `useDashboard` hook (10s polling)

---

## Animations

All via CSS `@keyframes`, `prefers-reduced-motion: reduce` disables all:

| Animation | Target | Keyframe |
|-----------|--------|---------|
| `breathe` | Online character body `<g>` | `scaleY(1) → scaleY(0.97)`, 3s ease-in-out infinite |
| `screenGlow` | Online monitor border | opacity 1 → 0.6 → 1, 4s infinite |
| `zzzFloat` | Offline zzz `<text>` | `translateY(0) → translateY(-6px)`, 2s infinite |

Character groups must have `transform-box: fill-box; transform-origin: bottom center` for `breathe` to compress in-place.

---

## Mobile Behavior

- The room SVG uses a fixed `viewBox` and `width="100%"` — it scales proportionally on narrow screens
- Minimum readable width: **320px** (iPhone SE). At this width, 2 slots render without clipping
- For **3+ slots below 480px**: a horizontal scroll container (`overflow-x: auto`) activates so slots don't compress below 120px each
- The scroll wrapper has `min-width: 240px` to handle sub-240px viewports gracefully
- Toggle button remains accessible at all widths (minimum 44px touch target)

---

## Zero-Device Empty State

When `devices.length === 0`, `PixelRoom` renders the full room background with **no desks or characters** — just the empty room with the window and plant decoration, matching the existing card view's "all offline" appearance.

---

## Constraints & Non-Goals

- **No isometric/oblique view**
- **No speech bubbles** — app info on monitor only
- **No external images or sprite sheets** — pure SVG
- **No new npm packages**
- **No backend changes**
- **No changes to existing card/timeline views**

---

## Acceptance Criteria

1. Toggle button (below Header, right-aligned) switches between Room and Cards views; defaults to Room
2. Room renders correct online/offline state per device from `/api/current`
3. Online character has breathing animation; offline has floating zzz
4. Monitor screen shows app emoji + name for online devices; falls back to 💻 for unknown apps
5. When `allOffline = true`, room wall is `#16213e` and floor is `#2c1a0e`; when `allOffline = false`, wall is `#efe5d0` and floor is `#c8935a`
6. `prefers-reduced-motion: reduce` disables all CSS animations
7. No visual regressions in existing card/timeline view
8. Room renders without horizontal overflow at 375px viewport width (2-device case); 3+ devices trigger horizontal scroll below 480px
9. Zero-device state renders empty room (no desks, no characters) without errors
10. Monitor `<foreignObject>` content renders correctly on Safari (macOS), including when the room is inside a horizontal scroll container — verify emoji and app name display without clipping
