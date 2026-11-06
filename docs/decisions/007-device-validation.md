# 007 — Device validation: an iOS Simulator build in CI, from `expo prebuild` + `xcodebuild`

Status: accepted · Sources: the owner's "device validation" brief (2026-11-04), `docs/decisions/006-navigation.md`, `docs/how-to/dev-tooling.md`, `e2e/README.md`

## Context

Everything the project looks at is rendered by react-native-web in Chromium
(`npm run visual-check`, 369 baselines) or driven through Maestro's *web*
driver (`npm run e2e`). There is no Mac and no KVM on the dev machine. The web
build cannot show SF Symbols, the real tab-bar pill and glass, fonts, safe
areas, native sheets, real Dynamic Type or real gestures, and the owner has
been finding those problems on the phone and sending screenshots. This record
chooses how to get an iOS Simulator build in CI so those problems can be
looked at without a phone. It is a **validation tool, not a gate**: it never
runs on a pull request or a push.

## Options

**A. `npx expo prebuild --platform ios` + `xcodebuild -sdk iphonesimulator`.**
`ios/` is generated from `app.json` and the config plugins (it is gitignored
and CLAUDE.md forbids hand-editing it, so nothing changes), then built with the
Release configuration. In Release the Xcode build phase "Bundle React Native
code and images" runs Metro once and embeds `main.jsbundle`, so the app needs
no dev server and no dev client. No account, token or signing is involved.

**B. `eas build --local --platform ios --profile <simulator>`.** The same
prebuild and Xcode build, wrapped by `eas-cli`. It needs an `eas.json`, an
Expo account and a project id (even locally the CLI logs in to resolve the
project and credentials), a CI secret, and `fastlane`/`ruby` on the runner. It
returns a `.tar.gz` that has to be unpacked. Everything it adds is for
distribution builds; none of it is wanted here.

**C. `npx expo run:ios --configuration Release`.** Prebuild + build + install +
launch in one command. It works, but it hides the `xcodebuild` invocation (no
control of DerivedData for the cache, no `-resultBundlePath`, no clean
separation between *build* and *run*), and it boots whatever simulator it
likes. Rejected for control, not capability.

## What the project needs from the build

| Fact | Consequence |
|---|---|
| Expo SDK 58, React Native 0.88, New Architecture only | Reanimated 4 and `react-native-worklets` require it; nothing to configure. Xcode 26 (the SDK's floor) is needed anyway for `ios.icon: ./assets/expo.icon` (an Icon Composer file) and for the iOS 26 glass the tab bar and header buttons depend on (ADR 006). |
| expo-router, `expo-sqlite`, `expo-notifications`, `expo-sharing`, `expo-symbols`, `expo-blur`, `@expo/ui`, `react-native-screens`, `react-native-gesture-handler`, `react-native-safe-area-context` | All autolinked from `package.json` by prebuild + CocoaPods. None is a dev-client-only module and the app has no `expo-dev-client`, so a Release build runs without Metro. |
| Release has `__DEV__ === false` | The app's dev-only hooks (`__DEV__`) are off. The validation hook cannot use `__DEV__`; it uses a build-time flag (see Decision). |
| `scheme: "habitsapp"`, expo-router | A custom URL scheme already exists, so a dev-only link can open a state through `xcrun simctl openurl`. |
| Reminders ask for notification permission | The simulator shows the real system prompt; this is a known difference from the web states, listed by the run. |

## Decision

**Option A, in one manual workflow.**

1. `workflow_dispatch` only. `check.yml` stays the only workflow on pull
   requests and pushes; `device-validation.guard.test.ts` fails if the simulator
   workflow ever gains `push`, `pull_request` or `schedule`.
2. `npx expo prebuild --platform ios --no-install --clean`, `pod install`, then
   `xcodebuild … -configuration Release -sdk iphonesimulator
   -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO`, with the simulator's
   architecture only (`arm64`, `ONLY_ACTIVE_ARCH=YES`) to halve the compile.
3. **The hook is a build-time flag, not `__DEV__`.** The build sets
   `EXPO_PUBLIC_DEVICE_VALIDATION=1`; Metro inlines it, so in every other build
   `isDeviceValidationBuild()` is the constant `false`. The hook is the route
   `habitsapp://dev-state?route=<web route>&clock=<local time>`, which pins the
   clock, writes the route's `?fixtures=` scenario into SQLite from the *same*
   fixture generators the web repositories use (`dev/device-state.ts`), applies
   the stored Appearance and replaces itself with the route. With the flag off
   the route redirects to Today and loads nothing.
   `src/lib/device-validation/device-validation.guard.test.ts` fails if the flag
   is set by any config except the simulator workflow, if the loader is
   reachable except through that screen, or if the screen stops asking the flag
   first.
4. **Caches cannot let a stale native build pass.** The Pods and DerivedData
   cache keys hash the *generated* native project (`ios/Podfile.lock`,
   `project.pbxproj`, `Info.plist`) together with `package-lock.json`,
   `app.json`, the Xcode version and a manual `CACHE_VERSION`; there are no
   `restore-keys`, so a key that changed is a clean build. The JS is never
   cached: Xcode re-runs the bundle phase every build, and the job then
   **fails if `main.jsbundle` is older than the build step** that just ran.
5. **Simulator.** The newest iOS runtime the runner has, and on it
   `iPhone 16` (393 × 852 pt, the web baselines' viewport) when the runtime
   offers it, otherwise the newest iPhone that is not a Pro Max or an SE. The
   run writes the exact runner image, Xcode, runtime and model into the job
   summary. A `device` input overrides the model.
6. **Build once, capture in parallel.** One macOS job builds and uploads the
   `.app`; a matrix of capture jobs (one per appearance and text size) and a
   flows job download it, each with its own timeout. macOS minutes are free on
   a public repository; the summary reports them anyway.

## Consequences

- A change to a native dependency, `app.json` or a config plugin changes the
  cache key and rebuilds from scratch (about 20–30 min); JS-only changes reuse
  the Pods and DerivedData and take a few minutes to build.
- I could not run Xcode where this was written (WSL); the workflow's first runs
  are the proof, and `docs/backlog.md` records what they found.
- States that rely on web-only simulations cannot be reproduced and are listed
  by every run: the migration screens driven by `DatabaseProvider.web.tsx`,
  `today-loading` / `today-load-fails`, `?failWrites=1`, and anything that
  needs a pointer gesture the Maestro translation does not support
  (`page.evaluate`, `page.mouse.move/down/up`). The full list is generated
  into `coverage.json` by `scripts/device-validation/plan.mjs`.
- Rejected: committing `ios/` (CLAUDE.md: generated, never hand-edited), a
  required PR check (this is for human review), pixel-diffing against the web
  baselines (fonts and rendering differ on purpose).
