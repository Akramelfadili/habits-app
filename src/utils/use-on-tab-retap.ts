import { type RefObject, useEffect, useRef } from "react";
import type { HostInstance } from "react-native";
import { useTabRetapStore } from "@/store/tab-retap-store";
import { moveFocusTo } from "./use-initial-focus";

/** Runs `handler` each time the person taps the already-selected tab `tab` (08.4). */
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

/** How long the scroll back to the top takes before the large title can be read. */
const SCROLL_SETTLE_MS = 400;

/**
 * 08.4, for a tab's root screen: a re-tap of the selected tab scrolls to the
 * top and puts the screen reader on the title (the large title has to be back
 * on screen first, so the focus follows the scroll).
 */
export function useTabRetapToTop(
	tab: string,
	scrollToTop: () => void,
	titleRef: RefObject<HostInstance | null>,
): void {
	useOnTabRetap(tab, () => {
		scrollToTop();
		setTimeout(() => {
			if (titleRef.current) moveFocusTo(titleRef.current);
		}, SCROLL_SETTLE_MS);
	});
}
