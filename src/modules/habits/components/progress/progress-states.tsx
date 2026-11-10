import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { EmptyState } from "@/components/ui/composite/empty-state";
import { Button } from "@/components/ui/primitives/button";
import { space, textStyles } from "@/theme/theme";
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
		<Container
			variant="outlined"
			padding="snug"
			testID="progress-nothing-logged"
		>
			<View style={styles.content}>
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
		</Container>
	);
}

const styles = StyleSheet.create({
	content: {
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
