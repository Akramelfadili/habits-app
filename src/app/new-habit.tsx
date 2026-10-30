import { useLocalSearchParams } from "expo-router";
import { HabitFormScreen } from "@/modules/habits/screens/habit-form-screen";

export default function NewHabit() {
	const { name, prefill } = useLocalSearchParams<{
		name?: string;
		prefill?: string;
	}>();
	return <HabitFormScreen name={name} prefillParam={prefill} />;
}
