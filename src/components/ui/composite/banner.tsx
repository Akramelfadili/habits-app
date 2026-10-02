import { Pressable, StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type BannerProps = {
	children: string;
	/**
	 * "warning" is the amber conflict banner (a reminder on a day the habit
	 * isn't scheduled); "neutral" the grey persistent notice (notifications
	 * turned off for the app).
	 */
	tone?: "warning" | "neutral";
	/** A link under the message — "Open iOS Settings →" (HAB-15). */
	action?: { label: string; onPress: () => void };
};

/**
 * Persistent inline message — design-system.md's warning banner style. Not
 * a toast: it stays for as long as its condition holds, and never blocks.
 */
export function Banner({ children, tone = "warning", action }: BannerProps) {
	const { colors, opacity } = useTheme();
	const warning = tone === "warning";

	return (
		<View
			testID="banner"
			style={[
				styles.banner,
				{ backgroundColor: warning ? colors.warnTint : colors.inner },
			]}
		>
			<View
				testID="banner-marker"
				style={[
					styles.marker,
					warning ? { backgroundColor: colors.warnInk } : styles.ring,
					!warning && { borderColor: colors.faint },
				]}
			/>
			<View style={styles.body}>
				<Text
					style={[styles.text, { color: warning ? colors.ink : colors.sub }]}
				>
					{children}
				</Text>
				{action ? (
					<Pressable
						accessibilityRole="link"
						onPress={action.onPress}
						style={({ pressed }) => pressed && { opacity: opacity.pressed }}
					>
						<Text style={[styles.action, { color: colors.ink }]}>
							{action.label}
						</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {
		flexDirection: "row",
		alignItems: "flex-start",
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		gap: 10,
	},
	marker: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginTop: 3,
	},
	ring: {
		width: 14,
		height: 14,
		borderRadius: 7,
		borderWidth: 1.5,
		marginTop: 1,
	},
	body: {
		flex: 1,
		gap: 6,
	},
	action: {
		fontSize: typeScale.caption,
		fontWeight: "600",
	},
	text: {
		fontSize: typeScale.caption,
		lineHeight: 16,
	},
});
