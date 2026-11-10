import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { habitsCopy } from "../../messages";
import type { Habit } from "../../types";
import { ArchivedLibraryRow } from "./library-row";
import { LibrarySectionHeader } from "./library-section-header";

export type ArchivedEntry = {
	habit: Habit;
	subtitle: string;
	accessibilityLabel: string;
};

type ArchivedSectionProps = {
	entries: readonly ArchivedEntry[];
	/** Collapsed by default; opens in place. */
	expanded: boolean;
	onToggle: () => void;
	onOpen: (habit: Habit) => void;
	onRestore: (habit: Habit) => void;
	/** A restore is running: every Restore waits. */
	restoring?: boolean;
};

/**
 * A header with Show / Hide, and, open, the archived habits dimmed, each with an instant Restore,
 * under one line saying what a restore does (a fresh streak; paused days stay paused). Nothing
 * archived means no section at all.
 */
export function ArchivedSection({
	entries,
	expanded,
	onToggle,
	onOpen,
	onRestore,
	restoring = false,
}: ArchivedSectionProps) {
	const { colors } = useTheme();
	if (entries.length === 0) return null;

	return (
		<View style={styles.section}>
			<LibrarySectionHeader
				label={habitsCopy.archived.header(entries.length)}
				actionLabel={
					expanded ? habitsCopy.archived.hide : habitsCopy.archived.show
				}
				actionAccessibilityLabel={habitsCopy.archived.toggleLabel(
					entries.length,
					expanded,
				)}
				expanded={expanded}
				onAction={onToggle}
			/>
			{expanded ? (
				<>
					<Container variant="flat">
						{entries.map(({ habit, subtitle, accessibilityLabel }) => (
							<ArchivedLibraryRow
								key={habit.id}
								habit={habit}
								subtitle={subtitle}
								accessibilityLabel={accessibilityLabel}
								disabled={restoring}
								onPress={() => onOpen(habit)}
								onRestore={() => onRestore(habit)}
							/>
						))}
					</Container>
					<Text style={[styles.note, { color: colors.sub }]}>
						{habitsCopy.archived.note}
					</Text>
				</>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	section: {
		gap: space[150],
	},
	note: {
		...textStyles.footnote,
		paddingHorizontal: space[100],
	},
});
