import { useEffect, useMemo, useRef, useState } from "react";
import {
	AccessibilityInfo,
	Animated,
	Easing,
	PanResponder,
	Pressable,
	StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	type ShownToast,
	type ToastMessage,
	useToastStore,
} from "@/store/toast-store";
import { motion, space } from "@/theme/theme";
import { UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { runSafely } from "@/utils/run-safely";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import { useScreenReader } from "@/utils/use-screen-reader";
import { Toast } from "./toast";

const DEFAULT_TOAST_BOTTOM = space[400];

const SWIPE_START = space[800];

export function toastHoldMs(toast: ToastMessage): number | null {
	if (toast.tone === "error") return null;
	if (toast.actionLabel) return motion.toast.hold.undo;
	if (toast.tone === "warning") return motion.toast.hold.warning;
	return motion.toast.hold.info;
}

type ToastHostProps = {
	// A native Modal covers the page, so a toast raised while a sheet is open would be invisible:
	// the sheet mounts its own host ("top" or "inline") and the page-level host steps aside.
	placement?: "bottom" | "top" | "inline";
	bottomOffset?: number;
};

// One host per navigator, so a toast survives navigating between its screens. A failing action
// is logged and answered with an error toast rather than escaping as a floating rejection.
export function ToastHost({
	placement = "bottom",
	bottomOffset = DEFAULT_TOAST_BOTTOM,
}: ToastHostProps) {
	const toast = useToastStore((state) => state.toast);
	const openSheets = useToastStore((state) => state.openSheets);
	const dismissToast = useToastStore((state) => state.dismissToast);

	const screenReader = useScreenReader();
	const reduceMotion = useReducedMotion();
	const toastId = toast?.id;

	// `shown` outlives the store's toast by the exit animation; a newer toast swaps in at once.
	const [shown, setShown] = useState<ShownToast | null>(toast);
	const progress = useRef(new Animated.Value(toast ? 1 : 0)).current;
	const target = useRef(toast ? 1 : 0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the store's toast changes; `progress` is stable
	useEffect(() => {
		const duration = reduceMotion
			? motion.toast.reduced.crossfade
			: toast
				? motion.toast.in
				: motion.toast.out;
		if (toast) {
			setShown(toast);
		}
		const end = toast ? 1 : 0;
		if (target.current === end) return;
		target.current = end;
		const run = Animated.timing(progress, {
			toValue: toast ? 1 : 0,
			duration,
			easing: Easing.out(Easing.quad),
			useNativeDriver: false,
		});
		run.start(({ finished }) => {
			if (finished && !toast) setShown(null);
		});
		return () => run.stop();
	}, [toast, reduceMotion]);

	const message = toast?.message;

	useEffect(() => {
		if (!toast) return;
		const hold = toastHoldMs(toast);
		if (hold === null || screenReader) return;
		const timer = setTimeout(() => dismissToast(toast.id), hold);
		return () => clearTimeout(timer);
	}, [toast, screenReader, dismissToast]);

	// Spoken once per toast (keyed by id), and only by the host actually showing it.
	const visible = toast !== null && !(placement === "bottom" && openSheets > 0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the id is the trigger; `message` is read at that moment.
	useEffect(() => {
		if (visible && message) AccessibilityInfo.announceForAccessibility(message);
	}, [visible, toastId]);

	const swipe = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_event, gesture) =>
					Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > SWIPE_START,
				onPanResponderRelease: (_event, gesture) => {
					if (
						toastId !== undefined &&
						Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > SWIPE_START
					) {
						dismissToast(toastId);
					}
				},
			}),
		[toastId, dismissToast],
	);

	if (!shown) return null;
	if (placement === "bottom" && openSheets > 0) return null;
	const rise = reduceMotion ? 0 : motion.toast.rise;

	const content = (
		<Animated.View
			testID="toast-host"
			pointerEvents="box-none"
			{...swipe.panHandlers}
			accessibilityActions={[{ name: "dismiss", label: "Dismiss" }]}
			onAccessibilityAction={() => dismissToast(shown.id)}
			style={[
				placement === "bottom"
					? [styles.host, { bottom: bottomOffset }]
					: undefined,
				{
					opacity: progress,
					transform: [
						{
							translateY: progress.interpolate({
								inputRange: [0, 1],
								outputRange: [rise, 0],
							}),
						},
					],
				},
			]}
		>
			<Pressable
				accessible={false}
				onPress={() => dismissToast(shown.id)}
				style={styles.tapArea}
			>
				<Toast
					message={shown.message}
					tone={shown.tone}
					actionLabel={shown.actionLabel}
					onAction={
						shown.onAction
							? () => {
									dismissToast(shown.id);
									void runSafely(
										{
											scope: "toast",
											failure: UNDO_FAILED_MESSAGE,
										},
										() => shown.onAction?.(),
									);
								}
							: undefined
					}
				/>
			</Pressable>
		</Animated.View>
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
		left: space[400],
		right: space[400],
	},
	tapArea: {
		alignSelf: "stretch",
	},
	host: {
		position: "absolute",
		left: space[400],
		right: space[400],
	},
});
