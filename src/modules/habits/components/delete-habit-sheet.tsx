import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { Sheet } from "@/components/ui/composite/sheet";
import { Button } from "@/components/ui/primitives/button";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import {
	archiveInsteadBody,
	deleteConsequence,
	deleteHeadline,
} from "./delete-habit-sheet-helpers";

type DeleteHabitSheetProps = {
	visible: boolean;
	habitName: string;
	/** Every logged day the delete would erase. */
	loggedDays: number;
	currentStreak: number;
	/** False for a habit that's already archived — there's nothing to offer instead. */
	canArchive: boolean;
	onKeep: () => void;
	onArchive: () => void;
	onDelete: () => void;
	isWorking?: boolean;
};

/**
 * Delete confirmation (HAB-13, design-system.md): warning icon, headline,
 * consequence copy, the "Archive instead" option surfaced above everything,
 * primary "Keep habit", and "Delete permanently" demoted to a small red text
 * link at the very bottom. That ordering — safe option dominant, destructive
 * option smallest — is deliberate; don't "simplify" it to a filled red
 * button. Non-dismissible: leaving means picking one of the three.
 */
export function DeleteHabitSheet({
	visible,
	habitName,
	loggedDays,
	currentStreak,
	canArchive,
	onKeep,
	onArchive,
	onDelete,
	isWorking = false,
}: DeleteHabitSheetProps) {
	const { colors } = useTheme();

	return (
		<Sheet visible={visible} onDismiss={onKeep} dismissible={false}>
			<View style={styles.copy}>
				<IconBadge
					size="large"
					symbol="exclamationmark"
					accent={{ tint: colors.warnTint, ink: colors.warnInk }}
				/>
				<Text style={[styles.headline, { color: colors.ink }]}>
					{deleteHeadline(habitName)}
				</Text>
				<Text style={[styles.body, { color: colors.sub }]}>
					{deleteConsequence(loggedDays)}
				</Text>
			</View>

			{canArchive ? (
				<Container variant="inset">
					<ListItem
						embedded
						leading={
							<IconBadge
								symbol="archivebox"
								accent={{ tint: colors.card, ink: colors.sub }}
							/>
						}
						title="Archive instead"
						subtitle={archiveInsteadBody(currentStreak)}
					/>
				</Container>
			) : null}

			<Button label="Keep habit" onPress={onKeep} disabled={isWorking} />
			{canArchive ? (
				<Button
					label="Archive instead — keeps history"
					variant="secondary"
					onPress={onArchive}
					disabled={isWorking}
				/>
			) : null}
			<Button
				label="Delete permanently"
				variant="destructive"
				onPress={onDelete}
				disabled={isWorking}
			/>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	copy: {
		gap: 8,
		paddingHorizontal: 4,
	},
	headline: {
		fontSize: typeScale.section,
		fontWeight: "600",
		marginTop: 4,
	},
	body: {
		fontSize: typeScale.subtitle,
		lineHeight: 18,
	},
});
