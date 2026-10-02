import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type FieldHelperProps = {
	children: string;
	/**
	 * "blocking" explains why an action is unavailable yet ("Pick a category
	 * to save this habit") — neutral, nothing's wrong. "error" flags input
	 * that can't be used as-is ("You already have Fitness…") — amber.
	 */
	tone?: "blocking" | "error";
	align?: "start" | "center";
};

/** NEW-24 field helper — a dot and one line, under a field or above its action. */
export function FieldHelper({
	children,
	tone = "blocking",
	align = "start",
}: FieldHelperProps) {
	const { colors } = useTheme();
	const color = tone === "error" ? colors.warnInk : colors.faint;

	return (
		<View
			style={[styles.row, align === "center" && styles.centered]}
			// One element for VoiceOver — the dot is decoration, the line is the message.
			accessible
			accessibilityRole={tone === "error" ? "alert" : undefined}
		>
			<View style={[styles.dot, { backgroundColor: color }]} />
			<Text style={[styles.text, { color }]}>{children}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	centered: {
		justifyContent: "center",
	},
	dot: {
		width: 5,
		height: 5,
		borderRadius: 2.5,
	},
	text: {
		flexShrink: 1,
		fontSize: typeScale.caption,
	},
});
