import { useLocalSearchParams } from "expo-router";
import { HabitFormScreen } from "@/modules/habits/screens/habit-form-screen";

export default function EditHabit() {
	const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
	// Only "frequency" is understood (Monthly's slipping insight, HAB-16); anything else is ignored.
	return (
		<HabitFormScreen
			habitId={Number(id)}
			focus={focus === "frequency" ? "frequency" : undefined}
		/>
	);
}
