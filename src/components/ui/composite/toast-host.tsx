import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToastStore } from "@/store/toast-store";
import { UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { runSafely } from "@/utils/run-safely";
import { useScreenReader } from "@/utils/use-screen-reader";
import { Toast } from "./toast";

/** How long a toast — and with it, its Undo — stays up. */
export const TOAST_DURATION_MS = 4000;

/**
 * With a screen reader running the toast stays longer — it has to be heard
 * and the Undo found — but still not for ever: a stale Undo is a trap.
 */
export const TOAST_SCREEN_READER_DURATION_MS = 8000;

type ToastHostProps = {
	/**
	 * "bottom" is the page-level host; "top" is the one a `Sheet` mounts inside
	 * its own Modal — a native Modal covers the page, so a toast raised while a
	 * sheet is open (a failed save) would otherwise be invisible. While any
	 * sheet is open the page-level host steps aside, so there is one toast.
	 */
	placement?: "bottom" | "top";
};

/**
 * Renders the current toast (see `@/store/toast-store`) pinned to the bottom
 * of its parent, and dismisses it after TOAST_DURATION_MS. One host per
 * navigator, so a toast survives navigating between that navigator's screens.
 * The action runs once, then the toast goes away. A failing action (an Undo
 * that throws or rejects) is logged and answered with an error toast — it
 * never escapes as a floating rejection.
 */
export function ToastHost({ placement = "bottom" }: ToastHostProps) {
	const toast = useToastStore((state) => state.toast);
	const openSheets = useToastStore((state) => state.openSheets);
	const dismissToast = useToastStore((state) => state.dismissToast);

	const screenReader = useScreenReader();
	const toastId = toast?.id;
	const message = toast?.message;

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(
			() => dismissToast(toast.id),
			screenReader ? TOAST_SCREEN_READER_DURATION_MS : TOAST_DURATION_MS,
		);
		return () => clearTimeout(timer);
	}, [toast, screenReader, dismissToast]);

	// Spoken once per toast (keyed by its id, not by re-renders), and only by
	// the host that is actually showing it — the page host steps aside while a
	// sheet is open, and the sheet's own host announces instead.
	const visible = toast !== null && !(placement === "bottom" && openSheets > 0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the id is the trigger; `message` is read at that moment.
	useEffect(() => {
		if (visible && message) AccessibilityInfo.announceForAccessibility(message);
	}, [visible, toastId]);

	if (!toast) return null;
	if (placement === "bottom" && openSheets > 0) return null;

	const content = (
		<View
			pointerEvents="box-none"
			style={placement === "top" ? undefined : styles.host}
		>
			<Toast
				message={toast.message}
				tone={toast.tone}
				actionLabel={toast.actionLabel}
				onAction={
					toast.onAction
						? () => {
								dismissToast(toast.id);
								void runSafely(
									{
										scope: "toast",
										failure: UNDO_FAILED_MESSAGE,
									},
									() => toast.onAction?.(),
								);
							}
						: undefined
				}
			/>
		</View>
	);

	return placement === "top" ? (
		<SafeAreaView edges={["top"]} pointerEvents="box-none" style={styles.top}>
			{content}
		</SafeAreaView>
	) : (
		content
	);
}

const styles = StyleSheet.create({
	top: {
		position: "absolute",
		top: 0,
		left: 16,
		right: 16,
	},
	host: {
		position: "absolute",
		left: 16,
		right: 16,
		bottom: 16,
	},
});
