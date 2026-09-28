import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { Button } from "../primitives/button";

type InsightCardProps = {
	symbol: SFSymbol;
	title: string;
	body: string;
	/**
	 * "warning" is the flagged variant (amber icon square — Weekly Summary's
	 * slipping habit), "success" the celebratory one (filled ink square),
	 * "neutral" a plain informational note.
	 */
	tone?: "warning" | "success" | "neutral";
	/** Optional inline text action under the body ("Reschedule habit →"). */
	action?: { label: string; onPress: () => void };
};

/** One card-sized insight: leading icon square, title, body, optional action (HAB-11). */
export function InsightCard({
	symbol,
	title,
	body,
	tone = "neutral",
	action,
}: InsightCardProps) {
	const { colors } = useTheme();
	const iconColors = {
		warning: { background: colors.warnTint, glyph: colors.warnInk },
		success: { background: colors.ink, glyph: colors.onAccent },
		neutral: { background: colors.inner, glyph: colors.faint },
	}[tone];

	return (
		<View style={[styles.card, { backgroundColor: colors.card }]}>
			<View
				testID="insight-card-icon"
				style={[styles.icon, { backgroundColor: iconColors.background }]}
			>
				<SymbolView name={symbol} size={16} tintColor={iconColors.glyph} />
			</View>
			<View style={styles.text}>
				<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
				<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
				{action ? (
					<View style={styles.action}>
						<Button
							label={action.label}
							variant="inline"
							fullWidth={false}
							onPress={action.onPress}
						/>
					</View>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		alignItems: "flex-start",
		borderRadius: 16,
		padding: 16,
		gap: 14,
	},
	icon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	text: {
		flex: 1,
		gap: 4,
	},
	title: {
		fontSize: typeScale.rowLabel,
		fontWeight: "600",
	},
	body: {
		fontSize: typeScale.subtitle,
		lineHeight: 18,
	},
	action: {
		marginTop: 6,
	},
});
