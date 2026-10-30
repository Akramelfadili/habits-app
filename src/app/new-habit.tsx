import { useLocalSearchParams } from "expo-router";
import { HabitFormScreen } from "@/modules/habits/screens/habit-form-screen";

export default function NewHabit() {
	const { name } = useLocalSearchParams<{ name?: string }>();
	return <HabitFormScreen name={name} />;
}
