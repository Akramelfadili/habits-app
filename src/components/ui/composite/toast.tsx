import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type ToastProps = {
	message: string;
	actionLabel?: string;
	onAction?: () => void;
};

/** Floating completion feedback with an optional inline action (e.g. "Undo"). */
export function Toast({ message, actionLabel, onAction }: ToastProps) {
	const { colors, opacity } = useTheme();

	return (
		<View style={[styles.base, { backgroundColor: colors.toast }]}>
			<Text style={[styles.message, { color: colors.toastInk }]}>
				{message}
			</Text>
			{actionLabel ? (
				<Pressable
					accessibilityRole="button"
					onPress={onAction}
					style={({ pressed }) => [
						styles.action,
						{ backgroundColor: colors.toastBtn },
						pressed && { opacity: opacity.pressed },
					]}
				>
					<Text style={[styles.actionLabel, { color: colors.toastInk }]}>
						{actionLabel}
					</Text>
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
		paddingVertical: 10,
		paddingLeft: 16,
		paddingRight: 6,
	},
	message: {
		flex: 1,
		fontSize: 14,
		fontWeight: "500",
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
