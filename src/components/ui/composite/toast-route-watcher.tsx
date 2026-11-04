import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { useToastStore } from "@/store/toast-store";
import { motion } from "@/theme/theme";

/**
 * Mounted once in the shell: a toast that has been up for a while goes when the
 * screen changes. One raised by the action that also changes the screen
 * (archive, then back) is younger than `motion.toast.navigationGrace` and
 * survives the navigation, which is where its confirmation has to show.
 */
export function ToastRouteWatcher() {
	const pathname = usePathname();
	const last = useRef(pathname);
	const seen = useRef<{ id: number; at: number } | null>(null);
	const toast = useToastStore((state) => state.toast);

	if (toast && seen.current?.id !== toast.id) {
		seen.current = { id: toast.id, at: Date.now() };
	}

	useEffect(() => {
		if (last.current === pathname) return;
		last.current = pathname;
		const current = useToastStore.getState().toast;
		if (
			current &&
			seen.current?.id === current.id &&
			Date.now() - seen.current.at > motion.toast.navigationGrace
		) {
			useToastStore.getState().dismissToast(current.id);
		}
	}, [pathname]);

	return null;
}
