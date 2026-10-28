import { SymbolView } from "expo-symbols";
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type TodayStatePanelProps = PropsWithChildren<{
	icon: SFSymbol;
	headline: string;
	subtitle: string;
	/** Vertically centered on the screen by default; `false` flows from the top (inside a card on Habit Detail). */
	centered?: boolean;
}>;

/**
 * The centered icon+headline+subtitle layout shared by the non-populated
 * states — No habits yet and Rest day (HAB-05), and the other screens' empty
 * panels.
 */
export function TodayStatePanel({
	icon,
	headline,
	subtitle,
	centered = true,
	children,
}: TodayStatePanelProps) {
	const { colors } = useTheme();

	return (
		<View style={centered ? styles.centered : styles.top}>
			<View style={[styles.iconSquare, { backgroundColor: colors.inner }]}>
				<SymbolView name={icon} size={28} tintColor={colors.faint} />
			</View>
			<Text style={[styles.headline, { color: colors.ink }]}>{headline}</Text>
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
		paddingHorizontal: 32,
		gap: 12,
	},
	top: {
		alignItems: "center",
		paddingHorizontal: 32,
		paddingTop: 24,
		gap: 12,
	},
	iconSquare: {
		width: 64,
		height: 64,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 4,
	},
	headline: {
		fontSize: typeScale.section,
		fontWeight: "500",
	},
	subtitle: {
		fontSize: typeScale.subtitle,
		textAlign: "center",
	},
});
