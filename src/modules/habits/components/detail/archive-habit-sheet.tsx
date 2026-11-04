import { useRef } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import { Sheet } from "@/components/ui/composite/sheet";
import { Button } from "@/components/ui/primitives/button";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { detailCopy } from "../../messages";

type ArchiveHabitSheetProps = {
	visible: boolean;
	habitName: string;
	/** The archive is running: both buttons wait and the sheet cannot be swiped away. */
	isArchiving?: boolean;
	onArchive: () => void;
	onCancel: () => void;
};

/**
 * Archive habit (DC5, H8): reversible, so one tap — Archive habit as the primary
 * and Cancel under it. It says what archiving keeps, so people choose it over
 * deleting. Afterwards Detail pops and a toast offers Undo; this sheet only asks.
 */
export function ArchiveHabitSheet({
	visible,
	habitName,
	isArchiving = false,
	onArchive,
	onCancel,
}: ArchiveHabitSheetProps) {
	const { colors } = useTheme();
	// 08.4: a sheet starts the screen reader on its title. Archiving is
	// reversible, so unlike Delete there is no safer action to lean towards.
	const titleRef = useRef<HostInstance>(null);
	useInitialFocus(titleRef, visible);

	return (
		<Sheet visible={visible} onDismiss={onCancel} dismissible={!isArchiving}>
			<View style={styles.copy}>
				<Text
					ref={titleRef}
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					{detailCopy.confirm.archiveTitle(habitName)}
				</Text>
				<Text style={[styles.body, { color: colors.sub }]}>
					{detailCopy.confirm.archiveBody}
				</Text>
			</View>
			<Button
				label={detailCopy.confirm.archiveConfirm}
				disabled={isArchiving}
				onPress={onArchive}
			/>
			<Button
				label={detailCopy.confirm.cancel}
				variant="secondary"
				disabled={isArchiving}
				onPress={onCancel}
			/>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	copy: {
		gap: space[200],
		paddingHorizontal: space[100],
	},
	title: {
		...textStyles.title,
	},
	body: {
		...textStyles.footnote,
	},
});
