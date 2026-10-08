import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type PlaceholderTabScreenProps = {
	/** Display name of the not-yet-built module, e.g. "To-dos". */
	moduleName: string;
};

/** Stand-in tab content for a module that doesn't exist yet (docs/architecture.md). */
export function PlaceholderTabScreen({
	moduleName,
}: PlaceholderTabScreenProps) {
	const { colors } = useTheme();

	return (
		<View style={[styles.screen, { backgroundColor: colors.bg }]}>
			<Text style={{ color: colors.sub }}>{moduleName} coming soon.</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
