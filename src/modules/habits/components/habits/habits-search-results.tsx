import { StyleSheet, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { EmptyState } from "@/components/ui/composite/empty-state";
import { Button } from "@/components/ui/primitives/button";
import { space } from "@/theme/theme";
import { habitsCopy } from "../../messages";
import {
	nameFromQuery,
	resultRowSubtitle,
} from "../../presenters/habits-library-presenter";
import type { Habit } from "../../types";
import type { ArchivedEntry } from "./archived-section";
import { ArchivedLibraryRow, LibraryRow } from "./library-row";
import { LibrarySectionHeader } from "./library-section-header";

type HabitsSearchResultsProps = {
	query: string;
	active: readonly Habit[];
	archived: readonly ArchivedEntry[];
	onOpen: (habit: Habit) => void;
	onRestore: (habit: Habit) => void;
	onAdd: (name: string) => void;
	restoring?: boolean;
};

export function HabitsSearchResults({
	query,
	active,
	archived,
	onOpen,
	onRestore,
	onAdd,
	restoring = false,
}: HabitsSearchResultsProps) {
	if (active.length === 0 && archived.length === 0) {
		const name = nameFromQuery(query);
		return (
			<EmptyState
				centered={false}
				icon="circle.dashed"
				headline={habitsCopy.noResults.title(query.trim())}
				subtitle={habitsCopy.noResults.body}
			>
				<Button
					variant="link"
					fullWidth={false}
					label={habitsCopy.noResults.add(name)}
					onPress={() => onAdd(name)}
				/>
			</EmptyState>
		);
	}

	return (
		<View style={styles.results}>
			{active.length > 0 ? (
				<View style={styles.section}>
					<LibrarySectionHeader
						label={habitsCopy.activeHeader(active.length)}
					/>
					<Container variant="flat">
						{active.map((habit) => (
							<LibraryRow
								key={habit.id}
								habit={habit}
								subtitle={resultRowSubtitle(habit)}
								accessibilityLabel={`${habit.name}, ${resultRowSubtitle(habit)}`}
								onPress={() => onOpen(habit)}
							/>
						))}
					</Container>
				</View>
			) : null}
			{archived.length > 0 ? (
				<View style={styles.section}>
					<LibrarySectionHeader
						label={habitsCopy.archived.header(archived.length)}
					/>
					<Container variant="flat">
						{archived.map(({ habit, accessibilityLabel }) => (
							<ArchivedLibraryRow
								key={habit.id}
								habit={habit}
								subtitle={resultRowSubtitle(habit)}
								accessibilityLabel={accessibilityLabel}
								disabled={restoring}
								onPress={() => onOpen(habit)}
								onRestore={() => onRestore(habit)}
							/>
						))}
					</Container>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	results: {
		gap: space[500],
	},
	section: {
		gap: space[150],
	},
});
