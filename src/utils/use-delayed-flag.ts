import { useEffect, useState } from "react";

/**
 * True once `active` has stayed true for `delayMs`, false again the moment it stops. For
 * anything that should only appear if the wait is long enough to notice (a skeleton after
 * 300 ms), so a fast load never flashes it.
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
	const [elapsed, setElapsed] = useState(false);

	useEffect(() => {
		if (!active) {
			setElapsed(false);
			return;
		}
		const timer = setTimeout(() => setElapsed(true), delayMs);
		return () => clearTimeout(timer);
	}, [active, delayMs]);

	return active && elapsed;
}
