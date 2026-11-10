import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { CompletionCell } from "./completion-cell";
import type { CompletionRowsCell } from "./completion-rows";

/** A week matrix cell: 24 pt, below 44 by design, not tappable. */
const MATRIX_CELL = 24;
const BLOCK_CELL = 40;
const TOTAL_WIDTH = 32;

export type MatrixDayHeader = {
	key: string;
	letter: string;
	today: boolean;
	accessibilityLabel: string;
	onPress?: () => void;
};

export type MatrixRowData = {
	key: string;
	name: string;
	dot: string;
	total: string;
	met?: boolean;
	/**
	 * One VoiceOver stop per habit: its name and total, then every day as "Wed, done". The cells
	 * themselves are not separate stops.
	 */
	accessibilityLabel: string;
	cells: CompletionRowsCell[];
};

type WeekMatrixProps = {
	days: MatrixDayHeader[];
	rows: MatrixRowData[];
};

/**
 * Habits down, Monday → Sunday across, a row total on the right. Cells are 24 pt and read-only; each
 * day header is a 44 pt-high target that opens Edit this day. 28 pt wide because that is the cell
 * pitch: a wider target would overlap its neighbour.
 */
export function WeekMatrix({ days, rows }: WeekMatrixProps) {
	const { colors } = useTheme();

	return (
		<View testID="week-matrix" style={styles.matrix}>
			<View style={styles.line}>
				<View style={styles.nameColumn} />
				<View style={styles.cells}>
					{days.map((day) => (
						<Pressable
							key={day.key}
							testID={`week-matrix-day-${day.key}`}
							accessibilityRole="button"
							accessibilityLabel={day.accessibilityLabel}
							disabled={!day.onPress}
							onPress={day.onPress}
							hitSlop={{
								top: (minTouchTarget - textStyles.caption.lineHeight) / 2,
								bottom: (minTouchTarget - textStyles.caption.lineHeight) / 2,
								left: space[50],
								right: space[50],
							}}
							style={styles.dayHeader}
						>
							<Text
								allowFontScaling={false}
								style={[
									styles.letter,
									{ color: day.today ? colors.ink : colors.faint },
									day.today && styles.today,
								]}
							>
								{day.letter}
							</Text>
						</Pressable>
					))}
				</View>
				<View style={styles.totalColumn} />
			</View>
			{rows.map((row) => (
				<View
					key={row.key}
					testID={`week-matrix-row-${row.key}`}
					accessible
					accessibilityLabel={row.accessibilityLabel}
					style={styles.line}
				>
					<View style={[styles.nameColumn, styles.name]}>
						<View style={[styles.dot, { backgroundColor: row.dot }]} />
						<Text
							numberOfLines={2}
							style={[styles.nameText, { color: colors.ink }]}
						>
							{row.name}
						</Text>
					</View>
					<View style={styles.cells}>
						{row.cells.map((cell) => (
							<CompletionCell
								key={cell.key}
								state={cell.state}
								size={MATRIX_CELL}
								today={cell.today}
							/>
						))}
					</View>
					<Text
						style={[
							styles.total,
							{ color: row.met ? colors.ink : colors.sub },
							row.met && styles.met,
						]}
					>
						{row.total}
					</Text>
				</View>
			))}
		</View>
	);
}

export type WeekBlockCell = CompletionRowsCell & {
	accessibilityHint?: string;
	letter: string;
};

export type WeekBlockData = {
	key: string;
	name: string;
	dot: string;
	subline?: string;
	total: string;
	met?: boolean;
	/** A habit badge in front of the name (the one-habit card). */
	leading?: ReactNode;
	cells: WeekBlockCell[];
};

type WeekBlocksProps = {
	blocks: WeekBlockData[];
};

/**
 * List layout: one block per habit, name and total, then seven 40 pt cells with their date. It is
 * the one-habit card and what the matrix becomes at AX3, so nothing clips at large text. Every cell
 * is its own VoiceOver stop ("Wed, done").
 */
export function WeekBlocks({ blocks }: WeekBlocksProps) {
	const { colors } = useTheme();

	return (
		<View testID="week-blocks" style={styles.blocks}>
			{blocks.map((block) => (
				<View
					key={block.key}
					testID={`week-block-${block.key}`}
					style={styles.block}
				>
					<View style={styles.blockHeader}>
						{block.leading}
						<View style={styles.blockTitle}>
							<View style={styles.name}>
								{block.leading ? null : (
									<View style={[styles.dot, { backgroundColor: block.dot }]} />
								)}
								<Text style={[styles.blockName, { color: colors.ink }]}>
									{block.name}
								</Text>
							</View>
							{block.subline ? (
								<Text style={[styles.subline, { color: colors.sub }]}>
									{block.subline}
								</Text>
							) : null}
						</View>
						<Text
							style={[
								styles.total,
								styles.blockTotal,
								{ color: block.met ? colors.ink : colors.sub },
								block.met && styles.met,
							]}
						>
							{block.total}
						</Text>
					</View>
					<View style={styles.blockRow}>
						{block.cells.map((cell) => (
							<View key={cell.key} style={styles.blockColumn}>
								<Text
									accessibilityElementsHidden
									importantForAccessibility="no-hide-descendants"
									style={[styles.letter, { color: colors.faint }]}
								>
									{cell.letter}
								</Text>
								<CompletionCell
									state={cell.state}
									size={BLOCK_CELL}
									today={cell.today}
									text={cell.text}
									accessibilityLabel={cell.accessibilityLabel}
									onPress={cell.onPress}
									accessibilityHint={cell.accessibilityHint}
								/>
							</View>
						))}
					</View>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	matrix: {
		gap: space[200],
	},
	line: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[100],
	},
	nameColumn: {
		flex: 1,
	},
	name: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[150],
	},
	nameText: {
		...textStyles.footnote,
		flex: 1,
	},
	dot: {
		width: space[200],
		height: space[200],
		borderRadius: space[100],
	},
	cells: {
		flexDirection: "row",
		gap: space[100],
	},
	dayHeader: {
		width: MATRIX_CELL,
		alignItems: "center",
		justifyContent: "center",
	},
	letter: {
		...textStyles.caption,
		textAlign: "center",
	},
	today: {
		fontWeight: "600",
	},
	totalColumn: {
		width: TOTAL_WIDTH,
	},
	total: {
		...textStyles.footnote,
		width: TOTAL_WIDTH,
		textAlign: "right",
		fontVariant: ["tabular-nums"],
	},
	met: {
		fontWeight: "600",
	},
	blocks: {
		gap: space[500],
	},
	block: {
		gap: space[200],
	},
	blockHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
	blockTitle: {
		flex: 1,
		gap: space[50],
	},
	blockName: {
		...textStyles.body,
		flexShrink: 1,
	},
	subline: {
		...textStyles.footnote,
	},
	blockTotal: {
		width: undefined,
		// The name wraps before the total does: "2 / 3" never breaks in two.
		flexShrink: 0,
	},
	blockRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	blockColumn: {
		alignItems: "center",
		gap: space[100],
		width: BLOCK_CELL,
	},
});
