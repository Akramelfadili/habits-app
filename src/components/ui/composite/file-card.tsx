import type { Ref } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { IconBadge } from "../primitives/icon-badge";
import { Container } from "./container";

type FileCardProps = {
	name: string;
	meta: string;
	/** The card's element, for a sheet that moves the screen reader onto the finished file (`useInitialFocus`). */
	cardRef?: Ref<HostInstance>;
};

/** The finished export: a document square, the file name and its size line. */
export function FileCard({ name, meta, cardRef }: FileCardProps) {
	const { colors } = useTheme();

	return (
		<Container variant="outlined">
			<View
				ref={cardRef}
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
