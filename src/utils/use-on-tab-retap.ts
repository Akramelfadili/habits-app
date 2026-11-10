import { type RefObject, useEffect, useRef } from "react";
import type { HostInstance } from "react-native";
import { useTabRetapStore } from "@/store/tab-retap-store";
import { moveFocusTo } from "./use-initial-focus";
import { useReducedMotion } from "./use-reduced-motion";

export function useOnTabRetap(tab: string, handler: () => void): void {
	const latest = useRef(handler);
	latest.current = handler;
	useEffect(
		() =>
			useTabRetapStore.subscribe((state, previous) => {
				if (state.count !== previous.count && state.tab === tab) {
					latest.current();
				}
			}),
		[tab],
	);
}

const SCROLL_SETTLE_MS = 400;

// The large title has to be back on screen first, so the screen-reader focus follows the scroll
// (instant with Reduce Motion). The pending focus is dropped when the screen goes.
export function useTabRetapToTop(
	tab: string,
	scrollToTop: () => void,
	titleRef: RefObject<HostInstance | null>,
): void {
	const reduceMotion = useReducedMotion();
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
	useOnTabRetap(tab, () => {
		scrollToTop();
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(
			() => {
				if (titleRef.current) moveFocusTo(titleRef.current);
			},
			reduceMotion ? 0 : SCROLL_SETTLE_MS,
		);
	});
}
