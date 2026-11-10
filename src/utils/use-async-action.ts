import { useCallback, useState } from "react";
import { log } from "@/lib/logger/logger";
import { type RunResult, type RunSafelyOptions, runSafely } from "./run-safely";

// `execute` rethrows, for callers that handle the failure inline; `run` never rejects (prefer it for writes).
export function useAsyncAction<Args extends unknown[], Result>(
	action: (...args: Args) => Promise<Result>,
	options: RunSafelyOptions = { scope: "action" },
) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const { scope, failure, onFailure } = options;

	const execute = useCallback(
		async (...args: Args) => {
			setIsLoading(true);
			setError(null);
			try {
				return await action(...args);
			} catch (caught) {
				const normalized =
					caught instanceof Error ? caught : new Error(String(caught));
				setError(normalized);
				log.error("action.failed", { scope, error: normalized });
				throw normalized;
			} finally {
				setIsLoading(false);
			}
		},
		[action, scope],
	);

	const run = useCallback(
		async (...args: Args): Promise<RunResult<Result>> => {
			const result = await runSafely({ scope, failure, onFailure }, () =>
				execute(...args),
			);
			return result;
		},
		[execute, scope, failure, onFailure],
	);

	return { execute, run, isLoading, error };
}
