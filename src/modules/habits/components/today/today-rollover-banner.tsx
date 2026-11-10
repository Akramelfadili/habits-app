import { format } from "date-fns";
import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import type { RolloverNotice } from "../../hooks/use-rollover-queries";
import { todayCopy } from "../../messages";

type TodayRolloverBannerProps = {
	notice: RolloverNotice;
	today: Date;
	onDismiss: () => void;
};

// Spoken when it appears: a screen reader is not looking at the date.
export function TodayRolloverBanner({
	notice,
	today,
	onDismiss,
}: TodayRolloverBannerProps) {
	const title = todayCopy.rollover.title(format(today, "EEEE"));
	const body = todayCopy.rollover.body(
		format(notice.day, "EEEE"),
		notice.summary.completed,
		notice.summary.total,
	);

	useEffect(() => {
		AccessibilityInfo.announceForAccessibility(`${title}. ${body}`);
	}, [title, body]);

	return (
		<Banner
			tone="neutral"
			symbol="info.circle"
			title={title}
			button={{ label: todayCopy.rollover.dismiss, onPress: onDismiss }}
		>
			{body}
		</Banner>
	);
}
