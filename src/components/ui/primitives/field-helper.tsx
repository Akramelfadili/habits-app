import { StyleSheet, Text, View } from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type FieldHelperProps = {
	children: string;
	/**
	 * "blocking" explains why an action is unavailable yet ("Add a name to
	 * save"); "hint" says what a field does ("Shown after the number…") — both
	 * neutral, nothing is wrong. "error" flags input that can't be used as-is
	 * ("You already have…"): danger ink, a "!" and words, never colour alone
	 * (F-01). "limit" is the amber heads-up at a length cap ("32 characters max").
	 */
	tone?: "blocking" | "hint" | "error" | "limit";
	align?: "start" | "center";
};

/** V3-16 helper line — a dot (a "!" for an error) and one message, under a field or above its action. */
export function FieldHelper({
	children,
	tone = "blocking",
	align = "start",
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
			// One element for VoiceOver — the dot is decoration, the line is the message.
			accessible
			// Read as the message alone: the "!" is the second signal for the eye.
			accessibilityLabel={children}
			accessibilityRole={tone === "error" ? "alert" : undefined}
		>
			{tone === "error" ? (
				<Text style={[styles.bang, { color }]}>!</Text>
			) : (
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
		alignItems: "center",
		gap: space[150],
	},
	centered: {
		justifyContent: "center",
	},
	dot: {
		width: DOT,
		height: DOT,
		borderRadius: radius.pill,
	},
	bang: {
		...textStyles.caption,
		width: DOT,
		textAlign: "center",
	},
	text: {
		flexShrink: 1,
		...textStyles.footnote,
	},
});
