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
	/**
	 * Trailing note on a "group" header, pushed to the far edge — Manage's
	 * "Reordering within Training" while a row of that group is lifted (HAB-19).
	 */
	tag?: string;
};

/** "Morning, 2 of 3" — title and count as one stop, "2/3" spoken as a fraction. */
function spokenLabel(title: string, count?: string, tag?: string): string {
	const fraction = count?.match(/^(\d+)\/(\d+)$/);
	const spokenCount = fraction ? `${fraction[1]} of ${fraction[2]}` : count;
	return [title, spokenCount, tag].filter(Boolean).join(", ");
}

/**
 * Group header used above a card's rows (Today's "Morning 2/3", Weekly
 * Summary's "Per habit") — the `section` type-scale token, normal case.
 * Distinct from `SectionLabel`, which is the all-caps form eyebrow style.
 */
export function SectionHeader({
	title,
	count,
	size = "default",
	tag,
}: SectionHeaderProps) {
	const { colors } = useTheme();

	return (
		<View
			accessible
			accessibilityRole="header"
			accessibilityLabel={spokenLabel(title, count, tag)}
			style={[styles.row, size === "group" && styles.groupRow]}
		>
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
			{tag ? (
				<Text style={[styles.tag, { color: colors.ink }]}>{tag}</Text>
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
	tag: {
		marginLeft: "auto",
		fontSize: typeScale.caption,
		fontWeight: "500",
	},
	groupCount: {
		fontSize: typeScale.caption,
	},
});
