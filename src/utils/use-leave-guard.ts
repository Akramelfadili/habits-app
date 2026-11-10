import { useNavigation, usePreventRemove } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

/** The slice of the navigation object the guard uses (expo-router types its param list as empty). */
type GuardedNavigation = {
	dispatch: (action: unknown) => void;
	goBack: () => void;
};

/**
 * Asks before a screen goes away while it holds edits. Every way out (the header's Close, a
 * swipe down, the Android back) reaches the navigator as "remove this screen"; the guard stops
 * that and raises `prompting`. `leave` (Discard) then lets that very action through, `keep` drops
 * it, and `leaveWith` is for the screen's own exits (a successful save): it stops guarding first,
 * and only then runs the exit, so the exit is not itself stopped.
 */
export function useLeaveGuard(hasEdits: boolean) {
	const navigation = useNavigation() as unknown as GuardedNavigation;
	const [prompting, setPrompting] = useState(false);
	const [allowed, setAllowed] = useState(false);
	const pending = useRef<unknown>(null);
	const exit = useRef<(() => void) | null>(null);

	usePreventRemove(hasEdits && !allowed, ({ data }) => {
		pending.current = data.action;
		setPrompting(true);
	});

	useEffect(() => {
		if (!allowed) return;
		exit.current?.();
		exit.current = null;
	}, [allowed]);

	const keep = useCallback(() => setPrompting(false), []);
	const leaveWith = useCallback((go: () => void) => {
		exit.current = go;
		setAllowed(true);
	}, []);
	const leave = useCallback(() => {
		setPrompting(false);
		leaveWith(() => {
			if (pending.current) navigation.dispatch(pending.current);
			else navigation.goBack();
		});
	}, [leaveWith, navigation]);

	return { prompting, keep, leave, leaveWith };
}
