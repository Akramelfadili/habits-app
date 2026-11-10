import { StyleSheet, Text, View } from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type FieldHelperProps = {
	children: string;
	// An error is danger ink, a "!" and words, never colour alone.
	tone?: "blocking" | "hint" | "error" | "limit";
	align?: "start" | "center";
	plain?: boolean;
};

export function FieldHelper({
	children,
	tone = "blocking",
	align = "start",
	plain = false,
}: FieldHelperProps) {
	const { colors } = useTheme();
	const color =
		tone === "error"
			? colors.dangerBg
			: tone === "limit"
				? colors.warnInk
				: colors.sub;

	return (
		<View
			style={[styles.row, align === "center" && styles.centered]}
			accessible
			accessibilityLabel={children}
			accessibilityRole={tone === "error" ? "alert" : undefined}
		>
			{tone === "error" ? (
				<Text style={[styles.bang, { color }]}>!</Text>
			) : plain ? null : (
				<View style={[styles.dot, { backgroundColor: color }]} />
			)}
			<Text style={[styles.text, { color }]}>{children}</Text>
		</View>
	);
}

const DOT = space[150];

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: space[150],
	},
	centered: {
		justifyContent: "center",
	},
	dot: {
		width: DOT,
		height: DOT,
		borderRadius: radius.pill,
		marginTop: space[150],
	},
	bang: {
		...textStyles.footnote,
		fontWeight: "500",
		width: DOT,
		textAlign: "center",
	},
	text: {
		flexShrink: 1,
		...textStyles.footnote,
	},
});
