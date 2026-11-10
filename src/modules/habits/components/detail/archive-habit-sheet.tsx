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
	isArchiving?: boolean;
	onArchive: () => void;
	onCancel: () => void;
};

export function ArchiveHabitSheet({
	visible,
	habitName,
	isArchiving = false,
	onArchive,
	onCancel,
}: ArchiveHabitSheetProps) {
	const { colors } = useTheme();
	// A sheet starts the screen reader on its title. Archiving is reversible, so unlike Delete there is
	// no safer action to lean towards.
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
