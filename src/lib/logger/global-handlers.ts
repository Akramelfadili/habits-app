import { log } from "./logger";

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsLike = {
	getGlobalHandler?: () => ErrorHandler;
	setGlobalHandler: (handler: ErrorHandler) => void;
};

type HermesLike = {
	enablePromiseRejectionTracker?: (options: {
		allRejections: boolean;
		onUnhandled: (id: number, rejection: unknown) => void;
	}) => void;
};

let installed = false;

// The previous `ErrorUtils` handler (red box in dev, fatal crash in release) is always called afterwards.
// In dev React Native already routes rejections to the global handler, so no second tracker (one
// error, one log line); in release it installs none, so Hermes' own tracker is enabled, logging only.
export function installGlobalHandlers(): () => void {
	const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
	if (installed || !errorUtils) return () => undefined;
	installed = true;

	const previous = errorUtils.getGlobalHandler?.();
	errorUtils.setGlobalHandler((error, isFatal) => {
		log.error(isFatal ? "global.fatal_error" : "global.unhandled_error", {
			isFatal: Boolean(isFatal),
			error,
		});
		previous?.(error, isFatal);
	});

	if (!__DEV__) {
		const hermes = (globalThis as { HermesInternal?: HermesLike })
			.HermesInternal;
		if (hermes?.enablePromiseRejectionTracker) {
			hermes.enablePromiseRejectionTracker({
				allRejections: true,
				onUnhandled: (_id, rejection) =>
					log.error("global.unhandled_rejection", { error: rejection }),
			});
		} else {
			log.warn("global.rejection_tracking_unavailable");
		}
	}

	return () => {
		if (previous) errorUtils.setGlobalHandler(previous);
		installed = false;
	};
}
