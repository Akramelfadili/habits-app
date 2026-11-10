import { type RefObject, useEffect } from "react";
import { AccessibilityInfo, type HostInstance, Platform } from "react-native";

/**
 * How long a sheet's slide-in takes before a screen reader can be moved into
 * it: a focus event sent mid-animation lands on whatever is under the finger.
 */
const SHEET_SETTLE_MS = 400;

type Focusable = HostInstance & { focus?: () => void };

export function moveFocusTo(element: Focusable): void {
	if (Platform.OS === "web") element.focus?.();
	else AccessibilityInfo.sendAccessibilityEvent(element, "focus");
}

/**
 * Puts the screen reader's focus (and, on the web, keyboard focus) on `ref` when `active` turns
 * true: a confirm sheet starts on its safe action ("Focus starts on Archive instead"), not on the
 * first thing in the tree. Nothing moves while `active` is false, and a sheet that closes before
 * the delay ends never gets the late event.
 */
export function useInitialFocus(
	ref: RefObject<Focusable | null>,
	active: boolean,
	delayMs = SHEET_SETTLE_MS,
): void {
	useEffect(() => {
		if (!active) return;
		const timer = setTimeout(() => {
			const element = ref.current;
			if (!element) return;
			moveFocusTo(element);
		}, delayMs);
		return () => clearTimeout(timer);
	}, [active, delayMs, ref]);
}
