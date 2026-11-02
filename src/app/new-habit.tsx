import { useLocalSearchParams } from "expo-router";
import { HabitFormScreen } from "@/modules/habits/screens/habit-form-screen";

export default function NewHabit() {
	const { name, prefill, firstRun } = useLocalSearchParams<{
		name?: string;
		prefill?: string;
		firstRun?: string;
	}>();
	return (
		<HabitFormScreen
			name={name}
			prefillParam={prefill}
			firstRun={firstRun === "1"}
		/>
	);
}
