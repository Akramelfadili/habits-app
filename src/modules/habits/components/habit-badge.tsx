import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { Habit } from "../types";
import { categorySymbol } from "./category-symbol";

/** A habit's 28px category badge for summary rows (NEW-21) — its icon and colour, never user-chosen (HAB-24). */
export function HabitBadge({ habit }: { habit: Habit }) {
	const { scheme } = useTheme();
	return (
		<IconBadge
			size="compact"
			symbol={categorySymbol(habit.category)}
			accent={{
				tint: habitAccentTint(habit.category.hue, scheme),
				ink: habitAccentInk(habit.category.hue, scheme),
			}}
		/>
	);
}
