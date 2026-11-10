import { ListItem } from "@/components/ui/composite/list-item";
import { suggestionsCopy } from "../../messages";
import type { SuggestionItem } from "../../presenters/suggestions-presenter";
import { HabitBadge } from "../habit-badge";

type SuggestionRowProps = {
	item: SuggestionItem;
	onPick: () => void;
};

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
