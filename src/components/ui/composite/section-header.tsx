import { StyleSheet, Text, View } from "react-native";
import { space, textStyles, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type SectionHeaderProps = {
	title: string;
	/** Trailing mini-count, e.g. "2/3" — omit when there's nothing to count. */
	count?: string;
	/**
	 * "small" is a card's own semibold title (Weekly Summary's "Per habit")
	 * rather than a group header; "group" is the compact label-and-count above
	 * a list card (Manage Categories' "Built-in 10", HAB-25), count beside it;
	 * "eyebrow" is V3's caps label over a card with its "0 of 2" at the far edge
	 * (Today's category groups, T1).
	 */
	size?: "default" | "small" | "group" | "eyebrow";
	/**
	 * Trailing note on a "group" header, pushed to the far edge — Manage's
	 * "Reordering within Training" while a row of that group is lifted (HAB-19).
	 */
	tag?: string;
};

/** "Morning, 2 of 3" — title and count as one stop, "2/3" spoken as a fraction. */
function spokenLabel(title: string, count?: string, tag?: string): string {
	const fraction = count?.match(/^(\d+)\/(\d+)$/);
	// "0 of 2" is a done-count (Today's groups): VoiceOver says "0 of 2 done".
	const spokenCount = fraction
		? `${fraction[1]} of ${fraction[2]}`
		: count?.match(/^\d+ of \d+$/)
			? `${count} done`
			: count;
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

	const eyebrow = size === "eyebrow";

	return (
		<View
			accessible
			accessibilityRole="header"
			accessibilityLabel={spokenLabel(title, count, tag)}
			style={[
				styles.row,
				size === "group" && styles.groupRow,
				eyebrow && styles.eyebrowRow,
			]}
		>
			<Text
				style={[
					size === "small"
						? styles.smallTitle
						: size === "group"
							? styles.groupTitle
							: eyebrow
								? styles.eyebrowTitle
								: styles.title,
					{
						color: eyebrow
							? colors.faint
							: size === "group"
								? colors.sub
								: colors.ink,
					},
				]}
			>
				{eyebrow ? title.toUpperCase() : title}
			</Text>
			{count ? (
				<Text
					style={[
						size === "group" ? styles.groupCount : styles.count,
						eyebrow && styles.eyebrowCount,
						{ color: size === "group" || eyebrow ? colors.faint : colors.sub },
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
		gap: space[150],
		paddingHorizontal: space[100],
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
	eyebrowRow: {
		alignItems: "center",
		paddingHorizontal: space[100],
	},
	eyebrowTitle: {
		...textStyles.caption,
		letterSpacing: 1.2,
	},
	eyebrowCount: {
		...textStyles.caption,
		fontVariant: ["tabular-nums"],
	},
	groupCount: {
		fontSize: typeScale.caption,
	},
});
