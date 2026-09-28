import { useLocalSearchParams } from "expo-router";
import { HabitDetailScreen } from "@/modules/habits/screens/habit-detail-screen";

export default function HabitDetail() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <HabitDetailScreen habitId={Number(id)} />;
}
