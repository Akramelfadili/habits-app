import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { IconBadge } from "../primitives/icon-badge";
import { Container } from "./container";

type FileCardProps = {
	name: string;
	/** "214 KB · 9 habits · 1,284 entries". */
	meta: string;
};

/** NEW-06: the finished export — document badge, file name, size line (HAB-15's ready sheet). */
export function FileCard({ name, meta }: FileCardProps) {
	const { colors } = useTheme();

	return (
		<Container variant="inset">
			<View testID="file-card" style={styles.row}>
				<IconBadge symbol="doc.text" />
				<View style={styles.text}>
					<Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
					<Text style={[styles.meta, { color: colors.sub }]}>{meta}</Text>
				</View>
			</View>
		</Container>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	text: {
		flex: 1,
		gap: 2,
	},
	name: {
		fontSize: typeScale.rowLabel,
		fontWeight: "500",
	},
	meta: {
		fontSize: typeScale.caption,
	},
});
