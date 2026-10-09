import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type ToastProps = {
	message: string;
	/** "error" adds a danger dot before the message (design-system.md, Error tone). */
	tone?: "default" | "error";
	actionLabel?: string;
	onAction?: () => void;
};

/** Floating completion feedback with an optional inline action (e.g. "Undo"). */
export function Toast({
	message,
	tone = "default",
	actionLabel,
	onAction,
}: ToastProps) {
	const { colors, opacity } = useTheme();

	return (
		<View style={[styles.base, { backgroundColor: colors.toast }]}>
			{tone === "error" ? (
				<View
					testID="toast-error-marker"
					style={[styles.marker, { backgroundColor: colors.dangerBg }]}
				/>
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
		gap: 12,
		borderRadius: 999,
		paddingVertical: 5,
		paddingLeft: 16,
		paddingRight: 6,
	},
	marker: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	message: {
		flex: 1,
		paddingVertical: 5,
		fontSize: 14,
		fontWeight: "500",
	},
	actionTouch: {
		minHeight: 44,
		justifyContent: "center",
	},
	action: {
		borderRadius: 999,
		paddingVertical: 8,
		paddingHorizontal: 14,
	},
	actionLabel: {
		fontSize: 14,
		fontWeight: "600",
	},
});
