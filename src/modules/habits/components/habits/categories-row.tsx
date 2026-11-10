import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitsCopy } from "../../messages";

type CategoriesRowProps = {
	count: number;
	onPress: () => void;
};

/**
 * The Categories entry at the foot of the Habits tab: the one way to the category list now that the
 * `⋯` menu is gone, so it stays on screen even with no habits. The count sits where a value does
 * and is read with the label.
 */
export function CategoriesRow({ count, onPress }: CategoriesRowProps) {
	return (
		<Container variant="flat">
			<ListItem
				title={habitsCopy.categories}
				value={String(count)}
				leading={<IconBadge symbol="square.grid.2x2" />}
				navigable
				accessibilityLabel={habitsCopy.categoriesLabel(count)}
				onPress={onPress}
			/>
		</Container>
	);
}
