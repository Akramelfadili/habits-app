import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { useToastStore } from "@/store/toast-store";
import { motion } from "@/theme/theme";
import { useScreenReader } from "@/utils/use-screen-reader";

/**
 * Mounted once in the shell: a toast that has been up for a while goes when the screen changes. One
 * raised by the action that also changes the screen (archive, then back) is younger than
 * `motion.toast.navigationGrace` and survives the navigation, which is where its confirmation has to
 * show. With a screen reader on a toast is kept until dismissed, navigation or not.
 */
export function ToastRouteWatcher() {
	const pathname = usePathname();
	const screenReader = useScreenReader();
	const last = useRef(pathname);
	const seen = useRef<{ id: number; at: number } | null>(null);
	const toastId = useToastStore((state) => state.toast?.id);

	// When a toast first showed, for the grace above.
	useEffect(() => {
		if (toastId !== undefined && seen.current?.id !== toastId) {
			seen.current = { id: toastId, at: Date.now() };
		}
	}, [toastId]);

	useEffect(() => {
		if (last.current === pathname) return;
		last.current = pathname;
		if (screenReader) return;
		const current = useToastStore.getState().toast;
		if (
			current &&
			seen.current?.id === current.id &&
			Date.now() - seen.current.at > motion.toast.navigationGrace
		) {
			useToastStore.getState().dismissToast(current.id);
		}
	}, [pathname, screenReader]);

	return null;
}
