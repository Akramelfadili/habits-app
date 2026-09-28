import { useLocalSearchParams } from "expo-router";
import { RemindersScreen } from "@/modules/habits/screens/reminders-screen";

export default function Reminders() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <RemindersScreen habitId={Number(id)} />;
}
