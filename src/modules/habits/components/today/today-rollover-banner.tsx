import { format } from "date-fns";
import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import type { RolloverNotice } from "../../hooks/use-rollover-queries";
import { todayCopy } from "../../messages";

type TodayRolloverBannerProps = {
	notice: RolloverNotice;
	/** The new day, which the banner names. */
	today: Date;
	onDismiss: () => void;
};

/**
 * SY5: the app stayed open across midnight. Today has moved to the new day by
 * itself; this info banner says so and sums up the day that closed. It is a
 * state that lasts, so it stays until dismissed, and it is spoken when it
 * appears — a screen reader is not looking at the date.
 */
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
