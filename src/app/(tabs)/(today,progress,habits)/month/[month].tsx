import { useLocalSearchParams } from "expo-router";
import { ProgressMonthScreen } from "@/modules/habits/screens/progress-month-screen";

export default function ProgressMonthRoute() {
	const { month } = useLocalSearchParams<{ month: string }>();
	return <ProgressMonthScreen month={month} />;
}
