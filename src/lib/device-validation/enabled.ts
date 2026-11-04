/**
 * Device validation (docs/decisions/007-device-validation.md): a CI-only build
 * for the iOS Simulator that can open any visual-check state through the
 * `habitsapp://dev-state` link. It exists only when the build was made with
 * `EXPO_PUBLIC_DEVICE_VALIDATION=1`, which only `.github/workflows/ios-simulator.yml`
 * sets. Metro inlines `EXPO_PUBLIC_*` at bundle time, so in every other build
 * this reads as `false` and the minifier drops the branches behind it.
 *
 * Not `__DEV__`: the validation build is a Release build (JS bundled, no
 * Metro), where `__DEV__` is false.
 *
 * `device-validation.guard.test.ts` keeps it that way.
 */
export function isDeviceValidationBuild(): boolean {
	return process.env.EXPO_PUBLIC_DEVICE_VALIDATION === "1";
}
