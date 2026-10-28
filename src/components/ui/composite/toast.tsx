import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import type { ToastTone } from "@/store/toast-store";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ToastProps = {
	message: string;
	/** Tone sets the leading glyph, never the surface: the toast is always ink-on-toast (V3-26). */
	tone?: ToastTone;
	actionLabel?: string;
	onAction?: () => void;
};

/** The shape that carries the tone, so colour is never the only signal (08.7). */
const TONE_GLYPH: Record<Exclude<ToastTone, "info">, SFSymbol> = {
	success: "checkmark.circle.fill",
	warning: "exclamationmark.triangle.fill",
	error: "exclamationmark.circle.fill",
};

/** Floating event feedback with an optional inline action (Undo, Retry). */
export function Toast({
	message,
	tone = "info",
	actionLabel,
	onAction,
}: ToastProps) {
	const { colors, opacity } = useTheme();
	const glyph = tone === "info" ? null : TONE_GLYPH[tone];
	const glyphColor =
		tone === "error"
			? colors.dangerBg
			: tone === "warning"
				? colors.warnInk
				: colors.toastInk;

	return (
		<View style={[styles.base, { backgroundColor: colors.toast }]}>
			{glyph ? (
				<View testID={`toast-${tone}-marker`}>
					<SymbolView name={glyph} size={16} tintColor={glyphColor} />
				</View>
			) : null}
			<Text
				numberOfLines={2}
				accessibilityLabel={message}
				style={[styles.message, { color: colors.toastInk }]}
			>
				{message}
			</Text>
			{actionLabel ? (
				// The touch area is 44pt tall; the visible pill inside stays smaller.
				<Pressable
					accessibilityRole="button"
					onPress={onAction}
					style={({ pressed }) => [
						styles.actionTouch,
						pressed && { opacity: opacity.pressed },
					]}
				>
					<View style={[styles.action, { backgroundColor: colors.toastBtn }]}>
						<Text style={[styles.actionLabel, { color: colors.toastInk }]}>
							{actionLabel}
						</Text>
					</View>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	base: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: space[300],
		borderRadius: radius.pill,
		paddingVertical: space[100],
		paddingLeft: space[400],
		paddingRight: space[150],
	},
	message: {
		flex: 1,
		paddingVertical: space[100],
		...textStyles.subhead,
	},
	actionTouch: {
		minHeight: minTouchTarget,
		justifyContent: "center",
	},
	action: {
		borderRadius: radius.pill,
		paddingVertical: space[200],
		paddingHorizontal: space[350],
	},
	actionLabel: {
		...textStyles.subhead,
		fontWeight: "600",
	},
});
