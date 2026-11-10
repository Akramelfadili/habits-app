import { useToday } from "@/lib/today/use-today";
import { useLoggedDays } from "../repositories/entry-repository";
import { useHabitsList } from "../repositories/habit-repository";

export function useProgressShellQueries() {
	const today = useToday();
	const { habits, loaded } = useHabitsList();
	const logged = useLoggedDays();
	return {
		today,
		loaded: loaded && logged.loaded,
		hasHabits: habits.length > 0,
		hasLogs: logged.count > 0,
	};
}
