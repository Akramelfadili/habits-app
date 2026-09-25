import { StyleSheet, Text } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/** Uppercase eyebrow heading a card's content ("NAME", "ICON & COLOR", "FREQUENCY"). */
export function SectionLabel({ children }: { children: string }) {
	const { colors } = useTheme();

	return (
		<Text style={[styles.label, { color: colors.faint }]}>
			{children.toUpperCase()}
		</Text>
	);
}

const styles = StyleSheet.create({
	label: {
		fontSize: typeScale.caption,
		fontWeight: "500",
		letterSpacing: 1.2,
	},
});
