import { ListItem } from "@/components/ui/composite/list-item";
import { suggestionsCopy } from "../../messages";
import type { SuggestionItem } from "../../presenters/suggestions-presenter";
import { HabitBadge } from "../habit-badge";

type SuggestionRowProps = {
	item: SuggestionItem;
	/** Opens Add habit with this suggestion filled in. Not called for an Added one. */
	onPick: () => void;
};

/**
 * One suggestion (BS1, V3-23): its category's icon square, the name and a line
 * saying how it repeats. A suggestion the person already has says "Added" in
 * the value slot and is not a control: nothing to open, no chevron — the word,
 * not a faded colour, carries the state.
 */
export function SuggestionRow({ item, onPick }: SuggestionRowProps) {
	const { suggestion, subtitle, added, appearance } = item;
	return (
		<ListItem
			title={suggestion.name}
			subtitle={subtitle}
			leading={<HabitBadge appearance={appearance} size="default" />}
			navigable={!added}
			value={added ? suggestionsCopy.added : undefined}
			accessibilityLabel={
				added
					? suggestionsCopy.addedLabel(suggestion.name, subtitle)
					: suggestionsCopy.rowLabel(suggestion.name, subtitle)
			}
			accessibilityHint={added ? undefined : suggestionsCopy.rowHint}
			onPress={added ? undefined : onPick}
		/>
	);
}
