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
 * Logs unhandled JS errors and promise rejections. Nothing is swallowed:
 * - the previous `ErrorUtils` handler (React Native's: the dev red box, and the fatal crash in
 *   release) is always called afterwards;
 * - rejections: in development React Native already routes them through `ExceptionsManager` to
 *   the global handler above, so there is no second tracker (one error, one log line). In release
 *   React Native installs none at all, so this enables Hermes' own tracker: logging only, as an
 *   unhandled rejection was never fatal.
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
