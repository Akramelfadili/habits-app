import { StyleSheet, View } from "react-native";
import { space } from "@/theme/theme";
import { CompletionCell, type CompletionCellState } from "./completion-cell";

export type CompletionRowsCell = {
	key: string;
	state: CompletionCellState;
	today?: boolean;
	/** The ringed day the detail card is about (Month, P13). */
	selected?: boolean;
	/** A number drawn inside (the calendar's day). */
	text?: string;
	/** VoiceOver ignores the cell (the year map's days, 08.3). */
	hidden?: boolean;
	accessibilityLabel?: string;
	/** Set on a tappable cell (Habit Detail's entry into Edit this day); read-only otherwise. */
	onPress?: () => void;
};

type CompletionRowsProps = {
	/** Rows of cells; `null` is blank space. */
	rows: (CompletionRowsCell | null)[][];
	size: number;
	gap?: number;
	/** Spread each row's cells across the full width instead of packing them left. */
	spread?: boolean;
	testID?: string;
};

/**
 * The plain cell grid under V3-06's layouts and Habit Detail's history: rows of
 * equal squares. It knows nothing about weeks or months — the layouts around it
 * decide what a row is.
 */
export function CompletionRows({
	rows,
	size,
	gap = space[100],
	spread = false,
	testID = "completion-rows",
}: CompletionRowsProps) {
	return (
		<View testID={testID} style={{ gap }}>
			{rows.map((row, rowIndex) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: rows are a fixed positional layout
					key={rowIndex}
					style={[styles.row, { gap }, spread && styles.spread]}
				>
					{row.map((cell, columnIndex) =>
						cell ? (
							<CompletionCell
								key={cell.key}
								state={cell.state}
								size={size}
								today={cell.today}
								selected={cell.selected}
								text={cell.text}
								hidden={cell.hidden}
								accessibilityLabel={cell.accessibilityLabel}
								onPress={cell.onPress}
							/>
						) : (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: blank slots are positional
								key={`blank-${columnIndex}`}
								style={{ width: size, height: size }}
							/>
						),
					)}
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
	},
	spread: {
		justifyContent: "space-between",
	},
});
