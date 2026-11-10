import { InsightPager } from "@/components/ui/composite/insight-pager";
import { progressCopy } from "../../messages";
import type { InsightCardData } from "../../presenters/progress-presenter";

type ProgressInsightsProps = {
	insights: InsightCardData[];
	onChangeFrequency: (habitId: number) => void;
};

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
