import { StyleSheet, View } from "react-native";
import { space } from "@/theme/theme";
import { CompletionCell, type CompletionCellState } from "./completion-cell";

export type CompletionRowsCell = {
	key: string;
	state: CompletionCellState;
	today?: boolean;
	selected?: boolean;
	text?: string;
	hidden?: boolean;
	accessibilityLabel?: string;
	onPress?: () => void;
};

type CompletionRowsProps = {
	rows: (CompletionRowsCell | null)[][];
	size: number;
	gap?: number;
	spread?: boolean;
	testID?: string;
};

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
