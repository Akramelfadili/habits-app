import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ChartCardProps = {
	title: string;
	/** Right of the title: "19 – 25 Oct", "Since 3 Mar". */
	meta?: string;
	children: ReactNode;
	/** Under the body: a legend, or one line of explanation. */
	footer?: ReactNode;
	testID?: string;
};

/**
 * V3-11 · chart card: the container for every grid, chart and per-habit list.
 * A surface step and a hairline, never a shadow (F-06); header title (subhead)
 * and meta (caption), the body, then an optional legend or caption.
 */
export function ChartCard({
	title,
	meta,
	children,
	footer,
	testID = "chart-card",
}: ChartCardProps) {
	const { colors } = useTheme();

	return (
		<View
			testID={testID}
			style={[
				styles.card,
				{ backgroundColor: colors.card, borderColor: colors.border },
			]}
		>
			<View style={styles.header}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					{title}
				</Text>
				{meta ? (
					<Text style={[styles.meta, { color: colors.sub }]}>{meta}</Text>
				) : null}
			</View>
			{children}
			{footer}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: radius.l,
		borderWidth: StyleSheet.hairlineWidth,
		padding: space[400],
		gap: space[300],
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "baseline",
		gap: space[300],
	},
	title: {
		...textStyles.subhead,
		flexShrink: 1,
	},
	meta: {
		...textStyles.caption,
	},
});
