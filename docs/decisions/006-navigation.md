# 006 — V3 navigation: a custom pill tab bar on JS tabs, with shared routes

Status: accepted · Sources: `docs/specs/feature-spec-v3.md` HAB-27 + decisions D2–D4, `docs/design/design-system-v3.md` V3-01/V3-02 and T-20/T-21/T-23/T-25, `docs/assessment-v3.md` §9 and row 27 · Spike: `spike/v3-1-navigation` (throwaway, `d54dc5b`) · Landed: V3-1

> Numbering note: `docs/assessment-v3.md` sketches this ADR as "005". It is filed as 006 at the owner's request; 005 is left free.

## Context

V3 replaces one Habits tab plus a `⋯` popover menu with three tabs — Today,
Progress, Habits — and a **floating pill** tab bar (V3-01 variant B) that is
the baseline on every frame. Three things had to be true before the shell
could be built, and the assessment could not settle any of them from the
published docs:

1. **A custom tab bar.** The pill is not a restyle of the system bar: it
   floats 22 pt above the bottom inset with 16 pt side insets, a blurred
   translucent card, a hairline and a shadow. The installed types expose
   `tabBar?: (props: BottomTabBarProps) => ReactNode` on the JS tabs
   navigator, and type `Tabs` from `"expo-router"` as deprecated in favour of
   `expo-router/js-tabs` — but the published tabs page (fetched 2026-10-25)
   still imports from `"expo-router"` and documents neither `tabBar` nor the
   `js-tabs` entry point. Types and docs disagreed.
2. **Detail inside the originating tab (D4).** Habit Detail opens from Today,
   from Progress and from Habits, and the tab it came from must stay
   highlighted, with Back returning to that tab. Expo Router's answer is
   **shared routes** (array group syntax `(today,progress,habits)`), which
   the installed `matchArrayGroupName` and `layoutAnchor` support but which
   the app had never used.
3. **The iOS 26 header-button guard.** Every header button goes through
   `components/ui/composite/header-buttons.tsx`, which sets
   `hidesSharedBackground` on `unstable_header*Items` so the Liquid Glass
   capsule stays off. Restructuring every route risked both the guard and
   the API it depends on.

A throwaway spike settled all three before any V3-1 code was written.

## Decision

**Use `expo-router/js-tabs` with a custom `tabBar`, and one shared route
group for everything inside the tabs.**

```
src/app/
  _layout.tsx                           root Stack: tabs + the two modals
  new-habit.tsx · edit-habit/[id].tsx   root full-screen modals
  (tabs)/
    _layout.tsx                         <Tabs tabBar={…}> — the pill
    (today,progress,habits)/
      _layout.tsx                       one Stack, three anchors
      index.tsx     Today               anchor for (today)
      week · month · year               Progress; anchor for (progress) is week
      manage                            Habits; anchor for (habits)
      settings · categories
      habit/[id] · reminders/[id]
```

- The three tabs are the three **groups**, not three directories: one set of
  files serves all three, and each group picks its root through
  `unstable_settings` (`anchor: "index"`, `progress: { anchor: "week" }`,
  `habits: { anchor: "manage" }`).
- The tab bar is `components/ui/composite/tab-bar-pill.tsx`, rendered from
  the navigator's `tabBar` prop. It presses through
  `emitter.emit({ type: "tabPress", … })` then `navigateToTab(route.key)` —
  **not** the React Navigation `navigation.navigate(route.name)` of older
  versions; `BottomTabBarProps` on SDK 58 is
  `{ state, descriptors, emitter, navigateToTab, insets }`.
- Header buttons keep going through `header-buttons.tsx` unchanged; the
  shared stack sets its back buttons with `headerBackOptions`.
- `src/app/index.tsx` (the old `Redirect` to `/(tabs)/habits`) is gone: the
  tab group's `index.tsx` *is* `/`.

## Spike result (2026-10-25, SDK 58.0.19 / expo-router 58.0.26)

Run against `expo start --web` with Playwright, 17 of 17 checks passed.

| # | Claim | Result |
|---|---|---|
| a | `tabBar` is honoured by the JS tabs navigator | **PASS** — the custom pill renders; `BottomTabView` destructures `tabBar = renderTabBarDefault` and calls it with the insets |
| a | Three tabs render in order with the right one selected | **PASS** |
| b | Detail pushes inside the Today tab, Today stays selected, Back returns to Today | **PASS** (`/` → `/habit/2` → `/`) |
| b | Same from the Habits tab (`/manage` → `/habit/2` → `/manage`) | **PASS** |
| b | Each tab keeps its own stack: leaving Habits on Detail and coming back restores Detail | **PASS** |
| b | Tab roots resolve from their anchors (`/`, `/week`, `/manage`) | **PASS** |
| b | A group-qualified cold link selects that tab (`/(progress)/week`, `/(habits)/manage`) | **PASS** |
| c | The header-button guard and its 14 tests still pass after the restructure | **PASS** |
| c | `unstable_headerLeftItems` / `hidesSharedBackground` still exist on SDK 58 | **PASS** (`native-stack/types.d.ts:332, 1148`) |

**Not verifiable here (no Mac, no device):** that `hidesSharedBackground`
actually suppresses the iOS 26 Liquid Glass capsule, that the pill's blur
(`experimentalBlurMethod` / `BlurView`-free `backdropFilter`) reads correctly
on device, and real safe-area insets. These stay on the manual checklist.

## Consequences

- **The published docs are not the source of truth for tabs.** `js-tabs` and
  `tabBar` are typed and implemented but undocumented; anyone touching the
  navigator should read `node_modules/expo-router/build/layouts/TabsClient.d.ts`
  and `react-navigation/bottom-tabs/types.d.ts`, not the website.
- **URLs change.** `/habits` → `/`, `/habits/week` → `/week`,
  `/habits/<id>` → `/habit/<id>`, `/habits/reminders/<id>` → `/reminders/<id>`,
  and likewise for `manage`, `month`, `year`, `settings`, `categories`. Every
  Maestro flow and visual-check route moves with them.
- **A cold link to a shared route has no group**, so it lands on the first
  tab (measured: `/week` opens inside **Today**, showing the weekly summary
  with Today selected — not "first alphabetical" as the docs say, because the
  navigator's first screen wins). Links that must land in a particular tab
  spell the group out: `/(progress)/week`. In-app navigation keeps the
  current group, so `router.push`/`replace` from inside a tab is unambiguous
  and needs no prefix.
- **Every route exists in all three groups.** `/(today)/manage` is a real
  route nothing navigates to. That is the price of one shared directory; the
  alternative (three directories plus a shared one for Detail) collides on
  the group name. It costs a few extra entries in `_sitemap` and in the
  generated route types.
- **Each tab keeps its own stack**, so a half-finished push survives a tab
  switch. That is the iOS norm and what D4 asks for; it also means "go to
  Today" from a deep screen is a tab tap, not a pop.
- **The `⋯` menu goes away entirely** (D2). Its five rows move to the tabs:
  Weekly/Monthly/Yearly → the Progress tab, Manage → the Habits tab,
  Settings → the gear in the Habits header (D3). The live sublines the menu
  showed ("7 active · 2 archived", "After your first full week") have no
  home in a tab bar and are dropped with it.
- **The pill overlays content**, so every scrolling tab root and Detail pays a
  112 pt bottom padding (T-25) and the toast host sits 12 pt above it (T-21).
  That is one shared constant, not a per-screen number.
