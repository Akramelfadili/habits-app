import { EmptyState } from "@/components/ui/composite/empty-state";
import { Button } from "@/components/ui/primitives/button";
import { todayCopy } from "../../messages";

type TodayEmptyStateProps = {
	onAddHabit: () => void;
	/** The suggestions screen (HAB-46). */
	onBrowseSuggestions: () => void;
};

/** No habits at all (HAB-05, HAB-32 T2): one primary action and a link to suggestions. */
export function TodayEmptyState({
	onAddHabit,
	onBrowseSuggestions,
}: TodayEmptyStateProps) {
	return (
		<EmptyState
			centered={false}
			icon="circle.dashed"
			headline={todayCopy.emptyTitle}
			subtitle={todayCopy.emptyBody}
		>
			<Button
				label={todayCopy.emptyAdd}
				fullWidth={false}
				onPress={onAddHabit}
			/>
			<Button
				label={todayCopy.emptySuggestions}
				variant="link"
				onPress={onBrowseSuggestions}
			/>
		</EmptyState>
	);
}
