import {
	type Href,
	Redirect,
	useLocalSearchParams,
	useRootNavigationState,
	useRouter,
} from "expo-router";
import { useEffect, useState } from "react";
import { isDeviceValidationBuild } from "@/lib/device-validation/enabled";

// The loader and the launch-file reader are required in the same expression
// that tests the flag. Metro inlines `EXPO_PUBLIC_*` at bundle time and drops
// the dead branch, so a build without the flag contains neither module (and
// not the fixtures, the dev-state repository or the launch file name behind
// them). Never import them statically: `device-validation.guard.test.ts` and
// `make release-check` fail if they are, or if this pattern changes.
const deviceState: typeof import("../services/load-device-state") | null =
	process.env.EXPO_PUBLIC_DEVICE_VALIDATION === "1"
		? require("../services/load-device-state")
		: null;
const launchFile:
	| typeof import("@/lib/device-validation/launch-request")
	| null =
	process.env.EXPO_PUBLIC_DEVICE_VALIDATION === "1"
		? require("@/lib/device-validation/launch-request")
		: null;

/**
 * `habitsapp://dev-state?route=<web route>&clock=<local date-time>`: opens one
 * visual-check state on the device-validation build. It pins the clock, writes
 * the route's `?fixtures=` scenario into the database, applies the stored
 * Appearance and replaces itself with the route. In any other build the link
 * goes straight to Today and does nothing else (`device-validation.guard.test.ts`).
 */
export function DevStateScreen() {
	const enabled = isDeviceValidationBuild();
	const { route, clock } = useLocalSearchParams<{
		route?: string;
		clock?: string;
	}>();
	const router = useRouter();

	useEffect(() => {
		if (!enabled || !route || !deviceState) return;
		let cancelled = false;
		const [, query = ""] = route.split("?");
		// Fire-and-forget: `applyDeviceState` never rejects (it logs and carries on), and the effect has nothing to await it with.
		void (async () => {
			await deviceState.applyDeviceState(`?${query}`, clock ?? null);
			if (!cancelled) router.replace(route as Href);
		})();
		return () => {
			cancelled = true;
		};
	}, [enabled, route, clock, router]);

	if (!enabled) return <Redirect href="/" />;
	return null;
}

/**
 * Rendered once by the root layout: when the CI driver left a launch request
 * (`lib/device-validation/launch-request.ts`), opens `dev-state` for it as soon
 * as the navigator is ready. Renders nothing, and does nothing, in any other
 * build.
 */
export function DeviceValidationLaunch() {
	const router = useRouter();
	const navigationReady = Boolean(useRootNavigationState()?.key);
	const [done, setDone] = useState(false);

	useEffect(() => {
		if (done || !navigationReady || !isDeviceValidationBuild() || !launchFile)
			return;
		setDone(true);
		const request = launchFile.readLaunchRequest();
		if (request) {
			const query = new URLSearchParams({ route: request.route });
			if (request.clock) query.set("clock", request.clock);
			router.replace(`/dev-state?${query}` as Href);
		}
	}, [done, navigationReady, router]);

	return null;
}
