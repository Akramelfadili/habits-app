import { StyleSheet, Text, View } from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ProgressBar } from "./progress-bar";

type UnlockCardProps = {
	/** "Insights unlock in 4 days". */
	title: string;
	/** Why it waits: "They need 7 days of logs. Your first 3 days are below." */
	body: string;
	/** 0–1 toward the 7 days of logs. */
	progress: number;
	/** Over the bar: "3 of 7 days". */
	progressLabel: string;
	/** Right of the progress label, when there is one ("18 to go"). */
	remainingLabel?: string;
};

/**
 * V3-29 · unlock card: progress toward 7 days of logs. Left-aligned title,
 * body, then "3 of 7 days" over a 6 pt bar (which fills over the "fill"
 * token). The same card on Week, Month and Year, so it is learned once.
 */
export function UnlockCard({
	title,
	body,
	progress,
	progressLabel,
	remainingLabel,
}: UnlockCardProps) {
	const { colors } = useTheme();

	return (
		<View
			testID="unlock-card"
			style={[
				styles.card,
				{ backgroundColor: colors.card, borderColor: colors.border },
			]}
		>
			<View style={styles.text}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					{title}
				</Text>
				<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
			</View>
			<View style={styles.progress}>
				<View style={styles.labels}>
					<Text style={[styles.label, { color: colors.sub }]}>
						{progressLabel}
					</Text>
					{remainingLabel ? (
						<Text style={[styles.label, { color: colors.sub }]}>
							{remainingLabel}
						</Text>
					) : null}
				</View>
				<ProgressBar value={progress} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: radius.l,
		borderWidth: StyleSheet.hairlineWidth,
		padding: space[350],
		gap: space[300],
	},
	text: {
		gap: space[50],
	},
	title: {
		...textStyles.callout,
		fontWeight: "500",
	},
	body: {
		...textStyles.footnote,
	},
	progress: {
		gap: space[150],
	},
	labels: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	label: {
		...textStyles.footnote,
		fontVariant: ["tabular-nums"],
	},
});
