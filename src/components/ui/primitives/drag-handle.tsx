import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import { iconSize } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/**
 * The three-line grip on a reorderable list row (design-system "List item —
 * reorder"). Visual only: `ReorderableList` wraps it in the drag gesture and
 * owns its accessibility actions.
 */
export function DragHandle() {
	const { colors } = useTheme();

	return (
		<View testID="drag-handle" style={styles.base}>
			<SymbolView
				name="line.3.horizontal"
				size={iconSize.l}
				tintColor={colors.sub}
				fallback={
					<View style={styles.fallback}>
						{[0, 1, 2].map((line) => (
							<View
								key={line}
								style={[styles.line, { backgroundColor: colors.sub }]}
							/>
						))}
					</View>
				}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	base: {
		width: 28,
		height: 28,
		alignItems: "center",
		justifyContent: "center",
	},
	fallback: {
		gap: 3,
	},
	line: {
		width: 16,
		height: 1.5,
		borderRadius: 1,
	},
});
