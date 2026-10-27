import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { Button } from "@/components/ui/primitives/button";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { habitAccentInk, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { pluralise } from "@/utils/format";
import { builtInAppearance, type FirstRunSuggestion } from "../constants";
import { useFirstRunActions } from "../hooks/use-first-run-actions";
import { useFirstRunQueries } from "../hooks/use-first-run-queries";

function defaultSelectedIds(suggestions: FirstRunSuggestion[]): Set<string> {
	return new Set(suggestions.filter((s) => s.preselected).map((s) => s.id));
}

export function FirstRunScreen() {
	const { colors, scheme } = useTheme();
	const { suggestions } = useFirstRunQueries();
	const { addSuggestedHabits, skipFirstRun, isAdding, isSkipping } =
		useFirstRunActions();
	const [selectedIds, setSelectedIds] = useState(() =>
		defaultSelectedIds(suggestions),
	);

	function toggle(id: string) {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	function handleAdd() {
		const selected = suggestions.filter((s) => selectedIds.has(s.id));
		if (selected.length === 0) return;
		addSuggestedHabits(selected);
	}

	function handleSkip() {
		skipFirstRun();
	}

	const count = selectedIds.size;
	const isBusy = isAdding || isSkipping;

	return (
		<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.header}>
					<Text
						accessibilityRole="header"
						style={[styles.title, { color: colors.ink }]}
					>
						Pick a couple to start
					</Text>
					<Text style={[styles.subtitle, { color: colors.sub }]}>
						Two is enough for the first week. You can add more any time.
					</Text>
				</View>

				{suggestions.map((suggestion) => {
					const checked = selectedIds.has(suggestion.id);
					return (
						<Container key={suggestion.id} selected={checked}>
							<ListItem
								embedded
								title={suggestion.name}
								subtitle={suggestion.subtitle}
								onPress={() => toggle(suggestion.id)}
								leading={
									<View
										style={[
											styles.dot,
											{
												backgroundColor: habitAccentInk(
													builtInAppearance(suggestion.category).hue,
													scheme,
												),
											},
										]}
									/>
								}
								trailing={
									<Checkbox
										checked={checked}
										onPress={() => toggle(suggestion.id)}
										accessibilityLabel={suggestion.name}
									/>
								}
							/>
						</Container>
					);
				})}
			</ScrollView>

			<View style={styles.footer}>
				<Button
					label={
						count === 0 ? "Add habits" : `Add ${pluralise(count, "habit")}`
					}
					onPress={handleAdd}
					disabled={count === 0}
					loading={isAdding}
				/>
				<Button
					label="Start from scratch"
					variant="link"
					fullWidth={false}
					onPress={handleSkip}
					disabled={isBusy}
				/>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 12,
		gap: 12,
	},
	header: {
		gap: 6,
		paddingBottom: 8,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	subtitle: {
		fontSize: typeScale.subtitle,
	},
	dot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	footer: {
		paddingHorizontal: 16,
		paddingTop: 8,
		// First Run still renders inside the Today tab, so the floating pill
		// overlays it and would sit on top of "Add N habits" (HAB-46 takes the
		// tabs away from first launch in V3-5; until then it pays the same
		// clearance as every other screen under the bar).
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		alignItems: "center",
		gap: 4,
	},
});
