import { InsightPager } from "@/components/ui/composite/insight-pager";
import { progressCopy } from "../../messages";
import type { InsightCardData } from "../../presenters/progress-presenter";

type ProgressInsightsProps = {
	insights: InsightCardData[];
	/** A slipping card's link: Edit habit, scrolled to Frequency. */
	onChangeFrequency: (habitId: number) => void;
};

/** The ranked insights (HAB-38): one card on screen, a pager for up to three. */
export function ProgressInsights({
	insights,
	onChangeFrequency,
}: ProgressInsightsProps) {
	return (
		<InsightPager
			positionLabel={progressCopy.positionOf}
			insights={insights.map(({ action, ...card }) => ({
				...card,
				action: action
					? {
							label: action.label,
							onPress: () => onChangeFrequency(action.habitId),
						}
					: undefined,
			}))}
		/>
	);
}
