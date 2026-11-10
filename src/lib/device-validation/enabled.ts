// Metro inlines `EXPO_PUBLIC_*` at bundle time, so elsewhere this reads `false` and the minifier
// drops the branches behind it. Not `__DEV__`: the validation build is a Release build, where it is false.
export function isDeviceValidationBuild(): boolean {
	return process.env.EXPO_PUBLIC_DEVICE_VALIDATION === "1";
}
