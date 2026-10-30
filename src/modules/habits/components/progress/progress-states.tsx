import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/ui/composite/empty-state";
import { Button } from "@/components/ui/primitives/button";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { progressCopy } from "../../messages";

/** No habits (P3): one clear next step instead of an empty chart. The switcher stays above, so the layout doesn't jump. */
export function ProgressNoHabits({ onAddHabit }: { onAddHabit: () => void }) {
	return (
		<View testID="progress-no-habits">
			<EmptyState
				icon="circle.dashed"
				headline={progressCopy.empty.noHabitsTitle}
				subtitle={progressCopy.empty.noHabitsBody}
				centered={false}
			>
				<Button
					label={progressCopy.empty.addHabit}
					fullWidth={false}
					onPress={onAddHabit}
				/>
			</EmptyState>
		</View>
	);
}

/** Habits but nothing logged (P4): a note and a link to Today above the outlined grid. */
export function ProgressNothingLogged({
	range,
	onGoToToday,
}: {
	range: string;
	onGoToToday: () => void;
}) {
	const { colors } = useTheme();
	return (
		<View
			testID="progress-nothing-logged"
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
					{progressCopy.empty.nothingLoggedTitle}
				</Text>
				<Text style={[styles.body, { color: colors.sub }]}>
					{progressCopy.empty.nothingLoggedBody(range)}
				</Text>
			</View>
			<Button
				label={progressCopy.empty.goToToday}
				variant="secondary"
				fullWidth={false}
				onPress={onGoToToday}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: radius.l,
		borderWidth: StyleSheet.hairlineWidth,
		padding: space[350],
		gap: space[300],
		alignItems: "flex-start",
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
});
