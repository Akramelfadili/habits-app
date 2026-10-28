import { StyleSheet, View } from "react-native";
import { StatCard } from "@/components/ui/composite/stat-card";
import { space } from "@/theme/theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import type { StatTileData } from "../../presenters/progress-presenter";

/**
 * The three stat tiles (V3-10): 2-up gaps of 8 pt side by side, one under another
 * at accessibility sizes (P11). Each tile is one VoiceOver stop.
 */
export function ProgressStatTiles({ tiles }: { tiles: StatTileData[] }) {
	const stacked = useAccessibilityTextSize();

	return (
		<View
			testID="progress-stat-tiles"
			style={stacked ? styles.column : styles.row}
		>
			{tiles.map((tile) => (
				<StatCard
					key={tile.key}
					label={tile.label}
					value={tile.value}
					caption={tile.caption}
					tone={tile.tone}
					muted={tile.muted}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		gap: space[200],
	},
	column: {
		gap: space[300],
	},
});
