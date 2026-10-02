import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/**
 * NEW-26: a small non-interactive pill saying what a setting applies to —
 * "All habits" beside the Evening review title (HAB-15), so a global switch
 * never reads as a per-habit one.
 */
export function ScopeChip({ label }: { label: string }) {
	const { colors } = useTheme();

	return (
		<View style={[styles.chip, { backgroundColor: colors.inner }]}>
			<Text style={[styles.label, { color: colors.sub }]}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	chip: {
		borderRadius: 999,
		paddingVertical: 2,
		paddingHorizontal: 8,
	},
	label: {
		fontSize: typeScale.caption,
		fontWeight: "500",
	},
});
