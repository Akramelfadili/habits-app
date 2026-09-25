import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type SectionHeaderProps = {
	title: string;
	/** Trailing mini-count, e.g. "2/3" — omit when there's nothing to count. */
	count?: string;
};

/**
 * Group header used above a card's rows (Today's "Morning 2/3", Weekly
 * Summary's "Per habit") — the `section` type-scale token, normal case.
 * Distinct from `SectionLabel`, which is the all-caps form eyebrow style.
 */
export function SectionHeader({ title, count }: SectionHeaderProps) {
	const { colors } = useTheme();

	return (
		<View style={styles.row}>
			<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
			{count ? (
				<Text style={[styles.count, { color: colors.sub }]}>{count}</Text>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "baseline",
		justifyContent: "space-between",
	},
	title: {
		fontSize: typeScale.section,
		fontWeight: "500",
	},
	count: {
		fontSize: typeScale.subtitle,
	},
});
