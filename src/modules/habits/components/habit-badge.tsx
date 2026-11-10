import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { CategoryAppearance, Habit } from "../types";
import { categorySymbol } from "./category-symbol";

type HabitBadgeProps = {
	habit?: Habit;
	appearance?: CategoryAppearance;
	size?: "compact" | "default";
	muted?: boolean;
};

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
