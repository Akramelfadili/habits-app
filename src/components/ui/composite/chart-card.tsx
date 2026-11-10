import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ChartCardProps = {
	/** Omitted when the body names itself (the one-habit week card). */
	title?: string;
	meta?: string;
	children: ReactNode;
	footer?: ReactNode;
	testID?: string;
};

/** The container for every grid, chart and per-habit list. A surface step and a hairline, never a shadow. */
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
			{title || meta ? (
				<View style={styles.header}>
					{title ? (
						<Text
							accessibilityRole="header"
							style={[styles.title, { color: colors.ink }]}
						>
							{title}
						</Text>
					) : null}
					{meta ? (
						<Text style={[styles.meta, { color: colors.sub }]}>{meta}</Text>
					) : null}
				</View>
			) : null}
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
