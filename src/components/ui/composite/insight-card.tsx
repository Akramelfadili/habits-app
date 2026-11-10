import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import {
	iconSize,
	radius,
	space,
	squareRadius,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { Button } from "../primitives/button";

/** V3-32's icon square on a card: 32 pt. */
const ICON = 32;

export type InsightCardProps = {
	symbol: SFSymbol;
	title: string;
	body: string;
	/**
	 * "warning" (amber icon square: a slipping habit), "success" (an improved
	 * range: ink glyph on the quiet square), "neutral" (nothing to fix, an
	 * informational note: faint glyph). Colour is never the only signal: each
	 * has its own glyph and its own words.
	 */
	tone?: "warning" | "success" | "neutral";
	/** An inline text action under the body ("Change frequency ›"); only the link is tappable, never the body. */
	action?: { label: string; onPress: () => void };
	/**
	 * Set by the pager: this card is "Insight 1 of 3". VoiceOver reads the label
	 * first and swiping up or down steps to the next or previous card.
	 */
	position?: {
		label: string;
		onStep: (direction: 1 | -1) => void;
	};
};

/** V3-12 · insight card: icon square, title, body, an optional link. Padding 14, radius 20, a hairline, no shadow. */
export function InsightCard({
	symbol,
	title,
	body,
	tone = "neutral",
	action,
	position,
}: InsightCardProps) {
	const { colors } = useTheme();
	const iconColors = {
		warning: { background: colors.warnTint, glyph: colors.warnInk },
		success: { background: colors.inner, glyph: colors.ink },
		neutral: { background: colors.inner, glyph: colors.faint },
	}[tone];

	const text = (
		<View
			testID="insight-card-text"
			accessible
			accessibilityLabel={`${position ? `${position.label}. ` : ""}${title}. ${body}`}
			{...(position
				? {
						accessibilityRole: "adjustable" as const,
						accessibilityActions: [
							{ name: "increment" as const },
							{ name: "decrement" as const },
						],
						onAccessibilityAction: ({
							nativeEvent,
						}: {
							nativeEvent: { actionName: string };
						}) =>
							position.onStep(nativeEvent.actionName === "increment" ? 1 : -1),
					}
				: {})}
			style={styles.text}
		>
			<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
			<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
		</View>
	);

	return (
		<View
			testID="insight-card"
			style={[
				styles.card,
				{ backgroundColor: colors.card, borderColor: colors.border },
			]}
		>
			<View
				testID="insight-card-icon"
				style={[styles.icon, { backgroundColor: iconColors.background }]}
			>
				<SymbolView
					name={symbol}
					size={iconSize.m}
					tintColor={iconColors.glyph}
				/>
			</View>
			<View style={styles.content}>
				{text}
				{action ? (
					<Button
						label={action.label}
						variant="inline"
						fullWidth={false}
						onPress={action.onPress}
					/>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		alignItems: "flex-start",
		borderRadius: radius.l,
		borderWidth: StyleSheet.hairlineWidth,
		padding: space[350],
		gap: space[300],
	},
	icon: {
		width: ICON,
		height: ICON,
		borderRadius: squareRadius(ICON),
		alignItems: "center",
		justifyContent: "center",
	},
	content: {
		flex: 1,
		// A row child may not grow past its row: the text wraps instead.
		minWidth: 0,
		gap: space[100],
	},
	text: {
		gap: space[50],
	},
	title: {
		...textStyles.callout,
		fontWeight: "500",
	},
	body: {
		...textStyles.footnote,
	},
});
