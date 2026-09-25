import { useLocalSearchParams } from "expo-router";
import { HabitFormScreen } from "@/modules/habits/screens/habit-form-screen";

export default function EditHabit() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <HabitFormScreen habitId={Number(id)} />;
}
