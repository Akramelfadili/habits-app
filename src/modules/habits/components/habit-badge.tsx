import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { CategoryAppearance, Habit } from "../types";
import { categorySymbol } from "./category-symbol";

type HabitBadgeProps = {
	/** The habit whose category is drawn; or give `appearance` for a category with no habit yet (a suggestion). */
	habit?: Habit;
	appearance?: CategoryAppearance;
	/** "compact" is the 28 pt badge on a summary's per-habit rows; "default" the 32 pt row square. */
	size?: "compact" | "default";
	/** Neutral grey instead of the category's colour: an archived habit leaves Today's palette. */
	muted?: boolean;
};

/** A habit's category badge: its icon and colour, never user-chosen. */
export function HabitBadge({
	habit,
	appearance,
	size = "compact",
	muted = false,
}: HabitBadgeProps) {
	const { scheme, colors } = useTheme();
	const look = appearance ?? habit?.category;
	if (!look) return null;
	return (
		<IconBadge
			size={size}
			symbol={categorySymbol(look)}
			accent={
				muted
					? // `track` (not `inner`, which vanishes on a white card) with the muted `sub` ink.
						{ tint: colors.track, ink: colors.sub }
					: {
							tint: habitAccentTint(look.hue, scheme),
							ink: habitAccentInk(look.hue, scheme),
						}
			}
		/>
	);
}
