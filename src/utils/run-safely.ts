import { log } from "@/lib/logger/logger";
import { showToast } from "@/store/toast-store";
import { GENERIC_FAILURE_MESSAGE } from "./failure-message";

export type RunResult<Result> =
	| { ok: true; value: Result }
	| { ok: false; error: Error };

export type RunSafelyOptions = {
	/** Logger scope — the feature doing the write, e.g. "today". */
	scope: string;
	/** What the person sees when it fails; see `failureMessage`. */
	failure?: string;
	/** Replaces the error toast where no `ToastHost` is mounted (modals) — it still logs. */
	onFailure?: (error: Error, message: string) => void;
};

/**
 * Runs `action` and never rejects: a failure is logged, shown (an error toast,
 * or `onFailure`), and reported as `{ ok: false }` so the caller can skip the
 * "it worked" follow-up (the Undo toast, closing a sheet). Every write and
 * every Undo goes through this — a floating rejection is silent in release.
 */
export async function runSafely<Result>(
	options: RunSafelyOptions,
	action: () => Promise<Result> | Result,
): Promise<RunResult<Result>> {
	try {
		return { ok: true, value: await action() };
	} catch (caught) {
		const error = caught instanceof Error ? caught : new Error(String(caught));
		const message = options.failure ?? GENERIC_FAILURE_MESSAGE;
		log.error("action.failed", { scope: options.scope, error });
		if (options.onFailure) options.onFailure(error, message);
		else showToast({ message, tone: "error" });
		return { ok: false, error };
	}
}
