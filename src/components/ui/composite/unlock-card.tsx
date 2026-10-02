import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ProgressBar } from "./progress-bar";

type UnlockCardProps = {
	/** "Monthly view unlocks on 4 October". */
	title: string;
	/** Why it waits. */
	body: string;
	/** 0–1 toward unlocking. */
	progress: number;
	/** Left and right of the bar: "12 of 30 days", "18 to go". */
	progressLabel: string;
	remainingLabel: string;
};

/** The "month locked" card (NEW-11): states when it unlocks, why, and how far along it is. */
export function UnlockCard({
	title,
	body,
	progress,
	progressLabel,
	remainingLabel,
}: UnlockCardProps) {
	const { colors } = useTheme();

	return (
		<View style={[styles.card, { backgroundColor: colors.card }]}>
			<View style={[styles.icon, { backgroundColor: colors.inner }]}>
				<SymbolView name="calendar" size={22} tintColor={colors.faint} />
			</View>
			<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
			<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
			<View style={styles.progress}>
				<ProgressBar value={progress} />
				<View style={styles.labels}>
					<Text style={[styles.label, { color: colors.sub }]}>
						{progressLabel}
					</Text>
					<Text style={[styles.label, { color: colors.sub }]}>
						{remainingLabel}
					</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		padding: 16,
		alignItems: "center",
		gap: 10,
	},
	icon: {
		width: 48,
		height: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		fontSize: typeScale.rowLabel,
		fontWeight: "600",
		textAlign: "center",
	},
	body: {
		fontSize: typeScale.subtitle,
		lineHeight: 18,
		textAlign: "center",
	},
	progress: {
		alignSelf: "stretch",
		gap: 6,
		marginTop: 4,
	},
	labels: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	label: {
		fontSize: typeScale.caption,
	},
});
