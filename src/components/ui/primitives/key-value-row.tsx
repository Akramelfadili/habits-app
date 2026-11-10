import { StyleSheet, Text, View } from "react-native";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type KeyValueRowProps = {
	label: string;
	value: string;
};

/** NEW-15: a label on the left, its value on the right — "Last export · Never", the export confirm's counts. */
export function KeyValueRow({ label, value }: KeyValueRowProps) {
	const { colors } = useTheme();

	return (
		<View testID="key-value-row" style={styles.row}>
			<Text style={[styles.label, { color: colors.sub }]}>{label}</Text>
			<Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: space[300],
	},
	label: {
		...textStyles.footnote,
	},
	value: {
		...textStyles.footnote,
		fontWeight: "500",
		flexShrink: 1,
		textAlign: "right",
	},
});
