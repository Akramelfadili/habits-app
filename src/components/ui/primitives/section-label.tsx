import { StyleSheet, Text } from "react-native";
import { letterSpacing, textStyles } from "@/theme/theme";
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
		...textStyles.caption,
		letterSpacing: letterSpacing.eyebrow,
	},
});
