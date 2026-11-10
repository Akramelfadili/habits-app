import { StyleSheet, Text, View } from "react-native";
import { letterSpacing, space, textStyles, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type SectionHeaderProps = {
	title: string;
	count?: string;
	size?: "default" | "small" | "group" | "eyebrow";
	tag?: string;
};

function spokenLabel(title: string, count?: string, tag?: string): string {
	const fraction = count?.match(/^(\d+)\/(\d+)$/);
	// VoiceOver says "0 of 2 done" for the done-count.
	const spokenCount = fraction
		? `${fraction[1]} of ${fraction[2]}`
		: count?.match(/^\d+ of \d+$/)
			? `${count} done`
			: count;
	return [title, spokenCount, tag].filter(Boolean).join(", ");
}

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
		...textStyles.footnote,
	},
	groupRow: {
		justifyContent: "flex-start",
		gap: space[150],
		paddingHorizontal: space[100],
	},
	groupTitle: {
		...textStyles.footnote,
		fontWeight: "600",
	},
	tag: {
		marginLeft: "auto",
		...textStyles.caption,
	},
	eyebrowRow: {
		alignItems: "center",
		paddingHorizontal: space[100],
	},
	eyebrowTitle: {
		...textStyles.caption,
		letterSpacing: letterSpacing.eyebrow,
	},
	eyebrowCount: {
		...textStyles.caption,
		fontVariant: ["tabular-nums"],
	},
	groupCount: {
		...textStyles.caption,
	},
});
