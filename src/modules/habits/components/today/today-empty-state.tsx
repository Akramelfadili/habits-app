import { EmptyState } from "@/components/ui/composite/empty-state";
import { Button } from "@/components/ui/primitives/button";
import type { useTodayDevActions } from "../../hooks/use-today-dev-actions";
import { todayCopy } from "../../messages";
import { TodayDevButtons } from "./today-dev-buttons";

type TodayEmptyStateProps = {
	onAddHabit: () => void;
	/** The suggestions screen (HAB-46); the link shows only once there is somewhere to go. */
	onBrowseSuggestions?: () => void;
	dev: ReturnType<typeof useTodayDevActions>;
};

/** No habits at all (HAB-05, HAB-32 T2): one primary action and a link to suggestions. */
export function TodayEmptyState({
	onAddHabit,
	onBrowseSuggestions,
	dev,
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
			{onBrowseSuggestions ? (
				<Button
					label={todayCopy.emptySuggestions}
					variant="link"
					onPress={onBrowseSuggestions}
				/>
			) : null}
			<TodayDevButtons dev={dev} />
		</EmptyState>
	);
}
