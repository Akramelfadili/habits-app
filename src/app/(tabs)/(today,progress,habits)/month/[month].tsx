import { useLocalSearchParams } from "expo-router";
import { ProgressMonthRouteScreen } from "@/modules/habits/screens/route-param-guards";

export default function ProgressMonthRoute() {
	const { month } = useLocalSearchParams<{ month: string }>();
	return <ProgressMonthRouteScreen month={month} />;
}
