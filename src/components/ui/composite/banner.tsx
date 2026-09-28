import { StyleSheet, Text, View } from "react-native";
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
};

/**
 * Persistent inline message — design-system.md's warning banner style. Not
 * a toast: it stays for as long as its condition holds, and never blocks.
 */
export function Banner({ children, tone = "warning" }: BannerProps) {
	const { colors } = useTheme();
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
			<Text style={[styles.text, { color: warning ? colors.ink : colors.sub }]}>
				{children}
			</Text>
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
	text: {
		flex: 1,
		fontSize: typeScale.caption,
		lineHeight: 16,
	},
});
