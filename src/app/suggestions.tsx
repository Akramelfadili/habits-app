import { useLocalSearchParams } from "expo-router";
import { SuggestionsScreen } from "@/modules/habits/screens/suggestions-screen";

export default function Suggestions() {
	const { firstRun } = useLocalSearchParams<{ firstRun?: string }>();
	return <SuggestionsScreen firstRun={firstRun === "1"} />;
}
