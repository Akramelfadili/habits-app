import { StyleSheet, Text, View } from "react-native";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { IconBadge } from "../primitives/icon-badge";
import { Container } from "./container";

type FileCardProps = {
	name: string;
	/** "48 KB · 9 habits · 1,284 logs". */
	meta: string;
};

/** V3-30: the finished export — a document square, the file name and its size line (EX3). */
export function FileCard({ name, meta }: FileCardProps) {
	const { colors } = useTheme();

	return (
		<Container variant="outlined">
			<View
				testID="file-card"
				accessible
				accessibilityLabel={`${name}, ${meta}`}
				style={styles.row}
			>
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
		gap: space[300],
	},
	text: {
		flex: 1,
		gap: space[50],
	},
	name: {
		...textStyles.body,
	},
	meta: {
		...textStyles.footnote,
	},
});
