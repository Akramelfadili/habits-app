import type { ReactNode } from "react";
import { ListItem } from "@/components/ui/composite/list-item";
import { Button } from "@/components/ui/primitives/button";
import { habitsCopy } from "../../messages";
import type { Habit } from "../../types";
import { HabitBadge } from "../habit-badge";

type VoiceOverAction = { label: string; onAction: () => void };

type LibraryRowProps = {
	habit: Habit;
	subtitle: string;
	accessibilityLabel: string;
	onPress: () => void;
	// The row stops being a link in reorder mode: a tap would only open Detail mid-drag.
	handle?: ReactNode;
	lifted?: boolean;
	accessibilityActions?: VoiceOverAction[];
};

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
	subtitle: string;
	accessibilityLabel: string;
	onPress: () => void;
	onRestore: () => void;
	disabled?: boolean;
};

// Restore is a sibling of the row's button, never nested inside it.
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
			keepLeading
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
