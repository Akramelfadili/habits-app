import type { ReactNode } from "react";
import { ListItem } from "@/components/ui/composite/list-item";
import { Button } from "@/components/ui/primitives/button";
import { habitsCopy } from "../../messages";
import type { Habit } from "../../types";
import { HabitBadge } from "../habit-badge";

type VoiceOverAction = { label: string; onAction: () => void };

type LibraryRowProps = {
	habit: Habit;
	/** "Daily · 8 glasses" — see `libraryRowSubtitle`. */
	subtitle: string;
	/** "Drink water, Health, daily, 8 glasses" — what VoiceOver reads as the row (08.3). */
	accessibilityLabel: string;
	onPress: () => void;
	/**
	 * Reorder mode (H4): the drag grip, which replaces the chevron. The row stops
	 * being a link while it is on screen — a tap on it would only open Detail
	 * mid-drag.
	 */
	handle?: ReactNode;
	/** Held mid-drag: the E2 lift. */
	lifted?: boolean;
	/** VoiceOver's Reorder and Archive (08.3): the gestures a screen reader cannot make. */
	accessibilityActions?: VoiceOverAction[];
};

/**
 * One active habit in the library (H1, V3-13 over V3-23): its category's icon
 * square, name, a line saying how it repeats, a chevron to Detail. In reorder
 * mode the grip takes the chevron's place.
 */
export function LibraryRow({
	habit,
	subtitle,
	accessibilityLabel,
	onPress,
	handle,
	lifted = false,
	accessibilityActions,
}: LibraryRowProps) {
	return (
		<ListItem
			title={habit.name}
			subtitle={subtitle}
			leading={<HabitBadge habit={habit} size="default" />}
			navigable={handle === undefined}
			trailing={handle}
			lifted={lifted}
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={handle === undefined ? habitsCopy.rowHint : undefined}
			accessibilityActions={handle === undefined ? accessibilityActions : []}
			onPress={handle === undefined ? onPress : undefined}
		/>
	);
}

type ArchivedLibraryRowProps = {
	habit: Habit;
	/** "Archived 12 Oct · best streak 41". */
	subtitle: string;
	accessibilityLabel: string;
	onPress: () => void;
	onRestore: () => void;
	/** A restore is in flight: Restore cannot be pressed twice. */
	disabled?: boolean;
};

/**
 * One archived habit (H5, H2): dimmed, with the date it left Today and an
 * instant Restore. The row still opens Detail; Restore is its own 44 pt target
 * beside it, never nested inside the row's button.
 */
export function ArchivedLibraryRow({
	habit,
	subtitle,
	accessibilityLabel,
	onPress,
	onRestore,
	disabled = false,
}: ArchivedLibraryRowProps) {
	return (
		<ListItem
			dimmed
			title={habit.name}
			subtitle={subtitle}
			leading={<HabitBadge habit={habit} size="default" muted />}
			trailing={
				<Button
					label={habitsCopy.archived.restore}
					accessibilityLabel={habitsCopy.archived.restoreLabel(habit.name)}
					variant="compact"
					fullWidth={false}
					disabled={disabled}
					onPress={onRestore}
				/>
			}
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={habitsCopy.rowHint}
			onPress={onPress}
		/>
	);
}
