import { useLocalSearchParams } from "expo-router";
import { EditHabitRouteScreen } from "@/modules/habits/screens/route-param-guards";

export default function EditHabit() {
	const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
	return <EditHabitRouteScreen id={id} focus={focus} />;
}
