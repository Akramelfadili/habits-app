import { File, Paths } from "expo-file-system";
import { isDeviceValidationBuild } from "./enabled";

/** A state to open at launch: the visual-check route and the clock it is pinned to. */
export type LaunchRequest = { route: string; clock?: string };

const LAUNCH_REQUEST_FILE = "dev-state.json";

/**
 * The CI driver writes `Documents/dev-state.json` into the app's data
 * container (`xcrun simctl get_app_container booted <bundle id> data`) and
 * launches the app. A file, not a URL: `simctl openurl` with a custom scheme
 * puts up iOS's "Open in …?" alert, a launch needs no tap. Returns null in any
 * build but the validation one, and when there is no (valid) file.
 */
export function readLaunchRequest(): LaunchRequest | null {
	if (!isDeviceValidationBuild()) return null;
	try {
		const file = new File(Paths.document, LAUNCH_REQUEST_FILE);
		if (!file.exists) return null;
		const parsed: unknown = JSON.parse(file.textSync());
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"route" in parsed &&
			typeof parsed.route === "string"
		) {
			const clock =
				"clock" in parsed && typeof parsed.clock === "string"
					? parsed.clock
					: undefined;
			return { route: parsed.route, clock };
		}
	} catch {
		// No readable request: open the app normally.
	}
	return null;
}
