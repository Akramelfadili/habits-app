import { useCallback, useState } from "react";

/**
 * Consistent { execute, isLoading, error } shape for any repository or service
 * call a write hook exposes — see docs/app-architecture.md's async-action-state note.
 */
export function useAsyncAction<Args extends unknown[], Result>(
	action: (...args: Args) => Promise<Result>,
) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

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
				throw normalized;
			} finally {
				setIsLoading(false);
			}
		},
		[action],
	);

	return { execute, isLoading, error };
}
