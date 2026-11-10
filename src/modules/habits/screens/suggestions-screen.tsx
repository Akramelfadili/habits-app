import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { Button } from "@/components/ui/primitives/button";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { LibraryGroup } from "../components/habits/library-group";
import { SuggestionRow } from "../components/suggestions/suggestion-row";
import { leaveFirstRun } from "../first-run-navigation";
import { useFirstRunActions } from "../hooks/use-first-run-actions";
import { useSuggestionsQueries } from "../hooks/use-suggestions-queries";
import { firstRunCopy, suggestionsCopy } from "../messages";
import { suggestionToPrefill } from "../presenters/suggestions-presenter";
import type { Suggestion } from "../suggestions";

type SuggestionsScreenProps = {
	/** Opened from First Run: a saved habit finishes First Run, and Skip for now leads to an empty Today. */
	firstRun?: boolean;
};

/**
 * Browse suggestions: the bundled habits grouped by category, the Break habits last.
 * Tapping one opens Add habit filled in (nothing is created here), and one the person
 * already has says Added. The header's Close is the route's own (`src/app/_layout.tsx`).
 */
export function SuggestionsScreen({
	firstRun = false,
}: SuggestionsScreenProps) {
	const router = useRouter();
	const { colors } = useTheme();
	const { sections } = useSuggestionsQueries();
	const { markFirstRunSeen, isMarking, markError } = useFirstRunActions();

	function pick(suggestion: Suggestion) {
		router.push({
			pathname: "/new-habit",
			params: {
				prefill: JSON.stringify(suggestionToPrefill(suggestion)),
				...(firstRun ? { firstRun: "1" } : {}),
			},
		});
	}

	async function skip() {
		const result = await markFirstRunSeen();
		if (result.ok) leaveFirstRun(router);
	}

	return (
		<ScrollView
			style={{ backgroundColor: colors.bg }}
			contentContainerStyle={styles.content}
		>
			<Text style={[styles.intro, { color: colors.sub }]}>
				{suggestionsCopy.intro}
			</Text>
			{sections.map((section) => (
				<LibraryGroup key={section.key} name={section.title}>
					{section.items.map((item) => (
						<SuggestionRow
							key={item.suggestion.id}
							item={item}
							onPick={() => pick(item.suggestion)}
						/>
					))}
				</LibraryGroup>
			))}
			{firstRun ? (
				<View style={styles.footer}>
					{markError ? (
						<Banner tone="error">{firstRunCopy.continueFailed}</Banner>
					) : null}
					<Button
						label={firstRunCopy.welcome.skip}
						variant="link"
						disabled={isMarking}
						onPress={skip}
					/>
				</View>
			) : null}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingHorizontal: space[500],
		paddingTop: space[300],
		paddingBottom: space[800],
		gap: space[300],
	},
	intro: {
		...textStyles.footnote,
	},
	footer: {
		alignItems: "center",
	},
});
