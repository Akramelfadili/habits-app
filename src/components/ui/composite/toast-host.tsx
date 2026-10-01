import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useToastStore } from "@/store/toast-store";
import { Toast } from "./toast";

/** How long a toast — and with it, its Undo — stays up. */
export const TOAST_DURATION_MS = 4000;

/**
 * Renders the current toast (see `@/store/toast-store`) pinned to the bottom
 * of its parent, and dismisses it after TOAST_DURATION_MS. One host per
 * navigator, so a toast survives navigating between that navigator's screens.
 * The action runs once, then the toast goes away.
 */
export function ToastHost() {
	const toast = useToastStore((state) => state.toast);
	const dismissToast = useToastStore((state) => state.dismissToast);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS);
		return () => clearTimeout(timer);
	}, [toast, dismissToast]);

	if (!toast) return null;

	return (
		<View pointerEvents="box-none" style={styles.host}>
			<Toast
				message={toast.message}
				actionLabel={toast.actionLabel}
				onAction={
					toast.onAction
						? () => {
								dismissToast(toast.id);
								toast.onAction?.();
							}
						: undefined
				}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	host: {
		position: "absolute",
		left: 16,
		right: 16,
		bottom: 16,
	},
});
