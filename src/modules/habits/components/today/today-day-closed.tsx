import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { celebratoryHeadline } from "../../presenters/today-screen-helpers";
import type { Habit } from "../../types";
import { categorySymbol } from "../category-symbol";
import { TodayStatePanel } from "../today-state-panel";

type TodayDayClosedProps = {
	total: number;
	tomorrowPreview: readonly Habit[];
	tomorrowReminderTimeByHabitId: ReadonlyMap<number, string>;
};

/** Day closed (HAB-05): everything due is done; a preview of tomorrow. */
export function TodayDayClosed({
	total,
	tomorrowPreview,
	tomorrowReminderTimeByHabitId,
}: TodayDayClosedProps) {
	const { scheme } = useTheme();

	return (
		<>
			<TodayStatePanel
				celebratory
				centered={false}
				icon="checkmark"
				headline={celebratoryHeadline(total)}
				subtitle="Nothing else is scheduled today."
			/>
			{tomorrowPreview.length > 0 ? (
				<Container>
					<SectionLabel>Tomorrow</SectionLabel>
					{tomorrowPreview.map((habit) => (
						<ListItem
							key={habit.id}
							embedded
							title={habit.name}
							leading={
								<IconBadge
									symbol={categorySymbol(habit.category)}
									accent={{
										tint: habitAccentTint(habit.category.hue, scheme),
										ink: habitAccentInk(habit.category.hue, scheme),
									}}
								/>
							}
							// No reminder → no trailing text at all (no dash, no "none").
							value={tomorrowReminderTimeByHabitId.get(habit.id)}
						/>
					))}
				</Container>
			) : null}
		</>
	);
}
