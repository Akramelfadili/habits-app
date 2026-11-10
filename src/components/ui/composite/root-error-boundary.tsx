import type { ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { log } from "@/lib/logger/logger";
import { ErrorScreen } from "./error-screen";

/**
 * The app's last resort, exported as `ErrorBoundary` from the root layout: anything that throws
 * while rendering, including a live-query error rethrown by `useLiveRows`, lands here instead of a
 * blank screen. `retry` resets expo-router's boundary and re-renders the route, so every screen
 * remounts and re-subscribes.
 */
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
	// Logged once: an error already recorded by the hook that threw it is skipped.
	useEffect(() => {
		log.error("boundary.render_error", { error });
	}, [error]);

	return (
		<ErrorScreen
			title="Something went wrong"
			message="Your habits are safe. Try again, and if it keeps happening, copy the diagnostics and send them over."
			onRetry={retry}
		/>
	);
}
