import { File, Paths } from "expo-file-system";
import { isDeviceValidationBuild } from "./enabled";

export type LaunchRequest = { route: string; clock?: string };

const LAUNCH_REQUEST_FILE = "dev-state.json";

// A file, not a URL: `simctl openurl` with a custom scheme puts up iOS's "Open in …?" alert, which needs a tap.
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
	} catch {}
	return null;
}
