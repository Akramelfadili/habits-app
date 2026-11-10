import { StyleSheet, Text, View } from "react-native";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { CompletionCell, type CompletionCellState } from "./completion-cell";

const SWATCH = 12;

export type LegendEntry = {
	state: CompletionCellState;
	label: string;
};

type CompletionLegendProps = {
	entries: LegendEntry[];
	scale?: { less: string; more: string; frozenLabel: string };
};

// Words sit beside every swatch so colour is never the only signal.
export function CompletionLegend({ entries, scale }: CompletionLegendProps) {
	const { colors } = useTheme();
	const label = [styles.label, { color: colors.sub }];

	return (
		<View testID="completion-legend" style={styles.row}>
			{scale ? (
				<>
					<View style={styles.item}>
						<Text style={label}>{scale.less}</Text>
						{([0, 1, 2, 3] as const).map((level) => (
							<CompletionCell
								key={level}
								state={{ kind: "level", level }}
								size={SWATCH}
							/>
						))}
						<Text style={label}>{scale.more}</Text>
					</View>
					<View style={styles.item}>
						<CompletionCell state={{ kind: "frozen" }} size={SWATCH} />
						<Text style={label}>{scale.frozenLabel}</Text>
					</View>
				</>
			) : null}
			{entries.map(({ state, label: text }) => (
				<View key={text} style={styles.item}>
					<CompletionCell state={state} size={SWATCH} />
					<Text style={label}>{text}</Text>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: space[300],
		rowGap: space[150],
	},
	item: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[100],
	},
	label: {
		...textStyles.caption,
	},
});
