import { SymbolView } from "expo-symbols";
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { space, squareRadius, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type EmptyStateProps = PropsWithChildren<{
	icon: SFSymbol;
	headline: string;
	subtitle: string;
	/** Vertically centered on the screen by default; `false` flows from the top (inside a card on Habit Detail). */
	centered?: boolean;
}>;

/** The 56 pt icon square (radius round(56 × 0.31) = 17). */
const SQUARE = 56;
const GLYPH = 24;

/**
 * An icon square, a title, one line of why, then whatever the caller adds (the primary action, a
 * link). Shared by Today's empty and rest-day states and the other screens' empty panels.
 */
export function EmptyState({
	icon,
	headline,
	subtitle,
	centered = true,
	children,
}: EmptyStateProps) {
	const { colors } = useTheme();

	return (
		<View style={centered ? styles.centered : styles.top}>
			<View style={[styles.iconSquare, { backgroundColor: colors.inner }]}>
				<SymbolView name={icon} size={GLYPH} tintColor={colors.faint} />
			</View>
			<Text
				accessibilityRole="header"
				style={[styles.headline, { color: colors.ink }]}
			>
				{headline}
			</Text>
			<Text style={[styles.subtitle, { color: colors.sub }]}>{subtitle}</Text>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	centered: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: space[800],
		gap: space[300],
	},
	top: {
		alignItems: "center",
		paddingHorizontal: space[800],
		paddingTop: space[600],
		gap: space[300],
	},
	iconSquare: {
		width: SQUARE,
		height: SQUARE,
		borderRadius: squareRadius(SQUARE),
		alignItems: "center",
		justifyContent: "center",
		marginBottom: space[100],
	},
	headline: {
		...textStyles.title,
		textAlign: "center",
	},
	subtitle: {
		...textStyles.footnote,
		textAlign: "center",
	},
});
