import { StyleSheet, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { radius, squareRadius } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { detailCopy } from "../../messages";

type DetailActionsProps = {
	/** An archived habit has nothing to archive: Delete is all there is. */
	canArchive: boolean;
	onArchive: () => void;
	onDelete: () => void;
};

/**
 * The last things on Habit Detail (D2): Archive habit (hide from Today, keep
 * history) and Delete habit, after everything that informs them. Both open a
 * confirm sheet. Delete reads in the danger ink with a minus in its square, so
 * it says what it is in a shape and in words as well as in colour.
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
				leading={
					<View style={[styles.square, { backgroundColor: colors.inner }]}>
						<View style={[styles.bar, { backgroundColor: colors.dangerBg }]} />
					</View>
				}
				navigable
				onPress={onDelete}
			/>
		</Container>
	);
}

/** The icon square's size and radius rule (V3-32), drawn here because no SF Symbol is a bare minus. */
const SQUARE = 32;
const styles = StyleSheet.create({
	square: {
		width: SQUARE,
		height: SQUARE,
		borderRadius: squareRadius(SQUARE),
		alignItems: "center",
		justifyContent: "center",
	},
	bar: {
		width: 12,
		height: 2,
		borderRadius: radius.xs,
	},
});
