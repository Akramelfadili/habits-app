import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { habitAccentInk, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { fromDayKey } from "@/utils/day-key";
import { EditDaySheet } from "../components/edit-day-sheet";
import { ExportSheet } from "../components/export-sheet";
import { ProgressHeader } from "../components/progress/progress-header";
import { ProgressMonth } from "../components/progress/progress-month";
import { useProgressFilterQueries } from "../hooks/use-progress-filter-queries";
import { useProgressShellQueries } from "../hooks/use-progress-shell-queries";
import { useRetroLogQueries } from "../hooks/use-retro-log-queries";
import { messages, showMessage } from "../messages";
import type { Habit } from "../types";

const SCREEN_EDGES = ["left", "right"] as const;

type ProgressMonthScreenProps = {
	month: string;
};

// Pushed inside the Progress stack so Back and the iOS swipe-back return to Year exactly as it was (filter, scroll).
export function ProgressMonthScreen({ month }: ProgressMonthScreenProps) {
	const router = useRouter();
	const { colors, scheme } = useTheme();
	const shell = useProgressShellQueries();
	const filter = useProgressFilterQueries();
	const [selectedDay, setSelectedDay] = useState<Date | null>(null);
	const [editDate, setEditDate] = useState<Date | null>(null);
	const [exportOpen, setExportOpen] = useState(false);
	const editDay = useRetroLogQueries(null, editDate);
	const monthStart = fromDayKey(month);
	const exportUnavailable = !shell.hasHabits || !shell.hasLogs;

	if (!shell.loaded) {
		return (
			<SafeAreaView
				edges={SCREEN_EDGES}
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

	return (
		<SafeAreaView
			edges={SCREEN_EDGES}
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<ScrollView
				testID="progress-month-scroll"
				contentContainerStyle={styles.content}
			>
				<ProgressHeader
					eyebrow={format(monthStart, "MMMM yyyy")}
					exportUnavailable={exportUnavailable}
					onExport={() =>
						exportUnavailable
							? showMessage(messages.exportNothing, [])
							: setExportOpen(true)
					}
				/>
				<ProgressMonth
					oneHabit={filter.onlyHabit}
					month={monthStart}
					selectedKey={selectedDay ? format(selectedDay, "yyyy-MM-dd") : null}
					selectedDay={selectedDay}
					dot={(habit: Habit) => habitAccentInk(habit.category.hue, scheme)}
					today={shell.today}
					onSelectDay={setSelectedDay}
					onEditDay={setEditDate}
					onChangeFrequency={(habitId) =>
						router.push(`/edit-habit/${habitId}?focus=frequency`)
					}
					onAddHabit={() => router.push("/new-habit")}
					onGoToToday={() => router.navigate("/")}
				/>
			</ScrollView>
			<ExportSheet visible={exportOpen} onClose={() => setExportOpen(false)} />
			<EditDaySheet day={editDay} onDismiss={() => setEditDate(null)} />
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
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[300],
	},
});
