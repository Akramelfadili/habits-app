import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "@/components/ui/composite/empty-state";
import { Button } from "@/components/ui/primitives/button";
import { space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useDiagnosticsActions } from "../../hooks/use-diagnostics-actions";
import { todayCopy } from "../../messages";
import { TodayHeader } from "../today-header";

type TodayLoadErrorProps = {
	onRetry: () => void;
	onAddHabit: () => void;
	day: Date;
};

export function TodayLoadError({
	onRetry,
	onAddHabit,
	day,
}: TodayLoadErrorProps) {
	const { colors } = useTheme();
	const diagnostics = useDiagnosticsActions();

	// An error is spoken when it appears: the screen reader was on the list.
	useEffect(() => {
		AccessibilityInfo.announceForAccessibility(
			`${todayCopy.loadError.title}. ${todayCopy.loadError.body}`,
		);
	}, []);

	return (
		<SafeAreaView
			edges={["top", "left", "right"]}
			testID="today-load-error"
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<View style={styles.content}>
				<TodayHeader day={day} onAddHabit={onAddHabit} />
				<EmptyState
					centered={false}
					icon="circle.dashed"
					headline={todayCopy.loadError.title}
					subtitle={todayCopy.loadError.body}
				>
					<Button
						label={todayCopy.loadError.retry}
						fullWidth={false}
						onPress={onRetry}
					/>
					<Button
						label={todayCopy.loadError.copyDiagnostics}
						variant="link"
						onPress={diagnostics.copyDiagnostics}
					/>
				</EmptyState>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: space[500],
		paddingTop: space[300],
		gap: space[500],
	},
});
