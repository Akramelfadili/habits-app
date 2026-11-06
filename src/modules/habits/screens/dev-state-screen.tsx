import {
	type Href,
	Redirect,
	useLocalSearchParams,
	useRootNavigationState,
	useRouter,
} from "expo-router";
import { useEffect, useState } from "react";
import { shiftClockTo } from "@/lib/dev-clock/shift-clock";
import { isDeviceValidationBuild } from "@/lib/device-validation/enabled";
import { readLaunchRequest } from "@/lib/device-validation/launch-request";
import { log } from "@/lib/logger/logger";
import { loadThemePreference } from "@/theme/theme-preference";
import { loadDeviceState } from "../services/load-device-state";

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
		if (!enabled || !route) return;
		let cancelled = false;
		const [, query = ""] = route.split("?");
		(async () => {
			try {
				shiftClockTo(clock ?? null);
				await loadDeviceState(`?${query}`);
				await loadThemePreference();
			} catch (error) {
				log.error("devstate.load_failed", { error });
			}
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
		if (done || !navigationReady || !isDeviceValidationBuild()) return;
		setDone(true);
		const request = readLaunchRequest();
		if (request) {
			const query = new URLSearchParams({ route: request.route });
			if (request.clock) query.set("clock", request.clock);
			router.replace(`/dev-state?${query}` as Href);
		}
	}, [done, navigationReady, router]);

	return null;
}
