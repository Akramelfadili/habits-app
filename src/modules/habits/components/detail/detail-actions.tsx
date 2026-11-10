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
