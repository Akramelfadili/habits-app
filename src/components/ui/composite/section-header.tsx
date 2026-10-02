import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type SectionHeaderProps = {
	title: string;
	/** Trailing mini-count, e.g. "2/3" — omit when there's nothing to count. */
	count?: string;
	/**
	 * "small" is a card's own semibold title (Weekly Summary's "Per habit")
	 * rather than a group header; "group" is the compact label-and-count above
	 * a list card (Manage Categories' "Built-in 10", HAB-25), count beside it.
	 */
	size?: "default" | "small" | "group";
};

/**
 * Group header used above a card's rows (Today's "Morning 2/3", Weekly
 * Summary's "Per habit") — the `section` type-scale token, normal case.
 * Distinct from `SectionLabel`, which is the all-caps form eyebrow style.
 */
export function SectionHeader({
	title,
	count,
	size = "default",
}: SectionHeaderProps) {
	const { colors } = useTheme();

	return (
		<View style={[styles.row, size === "group" && styles.groupRow]}>
			<Text
				style={[
					size === "small"
						? styles.smallTitle
						: size === "group"
							? styles.groupTitle
							: styles.title,
					{ color: size === "group" ? colors.sub : colors.ink },
				]}
			>
				{title}
			</Text>
			{count ? (
				<Text
					style={[
						size === "group" ? styles.groupCount : styles.count,
						{ color: size === "group" ? colors.faint : colors.sub },
					]}
				>
					{count}
				</Text>
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
	smallTitle: {
		fontSize: typeScale.rowLabel,
		fontWeight: "600",
	},
	count: {
		fontSize: typeScale.subtitle,
	},
	groupRow: {
		justifyContent: "flex-start",
		gap: 6,
		paddingHorizontal: 4,
	},
	groupTitle: {
		fontSize: typeScale.subtitle,
		fontWeight: "600",
	},
	groupCount: {
		fontSize: typeScale.caption,
	},
});
