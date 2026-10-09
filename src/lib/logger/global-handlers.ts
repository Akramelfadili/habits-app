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

/**
 * Logs unhandled JS errors and promise rejections (audit A3-02). Nothing is
 * swallowed:
 * - the previous `ErrorUtils` handler (React Native's: the dev red box, and the
 *   fatal crash in release) is always called afterwards;
 * - rejections: in development React Native already routes them through
 *   `ExceptionsManager` → the global handler above, so there is no second
 *   tracker (one error, one log line). In release React Native installs none
 *   at all, so this enables Hermes' own tracker — logging only, as an unhandled
 *   rejection was never fatal.
 *
 * Idempotent; call once at module load, before anything can fail.
 * Returns an uninstall function (tests).
 */
export function installGlobalHandlers(): () => void {
	const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
	if (installed || !errorUtils) return () => undefined;
	installed = true;

	const previous = errorUtils.getGlobalHandler?.();
	errorUtils.setGlobalHandler((error, isFatal) => {
		log.error("global", isFatal ? "fatal error" : "unhandled error", error, {
			isFatal: Boolean(isFatal),
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
					log.error("global", "unhandled promise rejection", rejection),
			});
		} else {
			log.warn("global", "promise rejection tracking unavailable");
		}
	}

	return () => {
		if (previous) errorUtils.setGlobalHandler(previous);
		installed = false;
	};
}
