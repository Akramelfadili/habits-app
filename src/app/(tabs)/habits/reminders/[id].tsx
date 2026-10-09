import { useLocalSearchParams } from "expo-router";
import { RemindersScreen } from "@/modules/habits/screens/reminders-screen";

export default function Reminders() {
	const { id, addTime } = useLocalSearchParams<{
		id: string;
		addTime?: string;
	}>();
	return <RemindersScreen habitId={Number(id)} addTime={addTime} />;
}
