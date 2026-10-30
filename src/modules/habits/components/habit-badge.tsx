import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { Habit } from "../types";
import { categorySymbol } from "./category-symbol";

type HabitBadgeProps = {
	habit: Habit;
	/** "compact" is the 28 pt badge on a summary's per-habit rows (NEW-21); "default" the 32 pt row square (V3-32). */
	size?: "compact" | "default";
	/** Neutral grey instead of the category's colour — an archived habit leaves Today's palette (H5). */
	muted?: boolean;
};

/** A habit's category badge — its icon and colour, never user-chosen (HAB-24). */
export function HabitBadge({
	habit,
	size = "compact",
	muted = false,
}: HabitBadgeProps) {
	const { scheme } = useTheme();
	return (
		<IconBadge
			size={size}
			symbol={categorySymbol(habit.category)}
			accent={
				muted
					? undefined
					: {
							tint: habitAccentTint(habit.category.hue, scheme),
							ink: habitAccentInk(habit.category.hue, scheme),
						}
			}
		/>
	);
}
