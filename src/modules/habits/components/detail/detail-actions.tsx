import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { useTheme } from "@/theme/use-theme";
import { detailCopy } from "../../messages";

type DetailActionsProps = {
	canArchive: boolean;
	onArchive: () => void;
	onDelete: () => void;
};

/**
 * The last things on Habit Detail: Archive habit (hide from Today, keep history) and Delete habit,
 * after everything that informs them. Both open a confirm sheet. Delete reads in the danger ink with
 * a minus in its square, so it says what it is in a shape and in words as well as in colour.
 */
export function DetailActions({
	canArchive,
	onArchive,
	onDelete,
}: DetailActionsProps) {
	const { colors } = useTheme();

	return (
		<Container variant="flat">
			{canArchive ? (
				<ListItem
					title={detailCopy.archive.row}
					subtitle={detailCopy.archive.rowBody}
					leading={<IconBadge symbol="archivebox" />}
					navigable
					onPress={onArchive}
				/>
			) : null}
			<ListItem
				title={detailCopy.delete.row}
				destructive
				leading={<IconBadge minusColor={colors.dangerBg} />}
				navigable
				onPress={onDelete}
			/>
		</Container>
	);
}
