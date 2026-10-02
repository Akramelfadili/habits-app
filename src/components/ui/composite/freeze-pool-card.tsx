import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HeatmapCell } from "./heatmap-cell";

type FreezePoolCardProps = {
	/** Freezes in the shared pool per month. */
	poolSize: number;
	/** How many were used — each is a frozen swatch, the rest stay open. */
	used: number;
	title: string;
	/** "7 and 22 August · pool refilled 1 September". */
	body: string;
};

const SWATCH = 30;

/**
 * The monthly freeze-pool card (VAR-15): the pool as swatches (30px, radius
 * 10 — the same frozen cell as the Streak-at-risk sheet's pool) beside what
 * was used. Informational — nothing on it is tappable, and it sits outside the
 * ranked insights' three.
 */
export function FreezePoolCard({
	poolSize,
	used,
	title,
	body,
}: FreezePoolCardProps) {
	const { colors } = useTheme();

	return (
		<View
			accessible
			accessibilityLabel={`${title}. ${body}`}
			style={[styles.card, { backgroundColor: colors.card }]}
		>
			<View style={styles.swatches}>
				{Array.from({ length: poolSize }, (_, index) => (
					<HeatmapCell
						// biome-ignore lint/suspicious/noArrayIndexKey: the pool's slots are positional
						key={index}
						state={index < used ? { kind: "frozen" } : { kind: "outside" }}
						accent={null}
						size={SWATCH}
					/>
				))}
			</View>
			<View style={styles.text}>
				<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
				<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 16,
		padding: 16,
		gap: 14,
	},
	swatches: {
		flexDirection: "row",
		gap: 6,
	},
	text: {
		flex: 1,
		gap: 2,
	},
	title: {
		fontSize: typeScale.rowLabel,
		fontWeight: "600",
	},
	body: {
		fontSize: typeScale.subtitle,
		lineHeight: 18,
	},
});
