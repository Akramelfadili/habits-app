import { SymbolView } from "expo-symbols";
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type TodayStatePanelProps = PropsWithChildren<{
	icon: SFSymbol;
	/** Day closed's celebratory treatment — filled black circle, white glyph. */
	celebratory?: boolean;
	headline: string;
	subtitle: string;
	/** No habits / Rest day sit vertically centered on the screen; Day closed flows from the top, above the tomorrow preview. */
	centered?: boolean;
}>;

/**
 * The centered icon+headline+subtitle layout shared by Today's three
 * non-populated states — No habits yet, Rest day, Day closed (HAB-05).
 */
export function TodayStatePanel({
	icon,
	celebratory = false,
	headline,
	subtitle,
	centered = true,
	children,
}: TodayStatePanelProps) {
	const { colors } = useTheme();

	return (
		<View style={centered ? styles.centered : styles.top}>
			<View
				style={[
					celebratory ? styles.iconCircle : styles.iconSquare,
					{ backgroundColor: celebratory ? colors.ink : colors.inner },
				]}
			>
				<SymbolView
					name={icon}
					size={celebratory ? 36 : 28}
					tintColor={celebratory ? colors.onAccent : colors.faint}
				/>
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
	iconCircle: {
		width: 88,
		height: 88,
		borderRadius: 44,
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
