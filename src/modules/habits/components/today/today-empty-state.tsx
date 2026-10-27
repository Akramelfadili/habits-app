import { Button } from "@/components/ui/primitives/button";
import type { useTodayDevActions } from "../../hooks/use-today-dev-actions";
import { TodayStatePanel } from "../today-state-panel";
import { TodayDevButtons } from "./today-dev-buttons";

type TodayEmptyStateProps = {
	onAddHabit: () => void;
	dev: ReturnType<typeof useTodayDevActions>;
};

/** No habits at all (HAB-05, HAB-32 T2): one primary action. */
export function TodayEmptyState({ onAddHabit, dev }: TodayEmptyStateProps) {
	return (
		<TodayStatePanel
			icon="circle"
			headline="Nothing to track yet"
			subtitle="Add your first habit and it will show up here every morning."
		>
			<Button label="Add habit" onPress={onAddHabit} />
			<TodayDevButtons dev={dev} />
		</TodayStatePanel>
	);
}
