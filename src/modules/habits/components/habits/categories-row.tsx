import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitsCopy } from "../../messages";

type CategoriesRowProps = {
	count: number;
	onPress: () => void;
};

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
