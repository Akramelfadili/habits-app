import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { useTheme } from "@/theme/use-theme";

type IconBadgeProps = {
	symbol: SFSymbol;
	/** Accent tint + ink for a habit's icon; omit for the neutral grey badge (form rows). */
	accent?: { tint: string; ink: string };
};

/** Non-interactive leading icon square for list rows (design-system "List row"). */
export function IconBadge({ symbol, accent }: IconBadgeProps) {
	const { colors } = useTheme();

	return (
		<View
			style={[styles.badge, { backgroundColor: accent?.tint ?? colors.inner }]}
		>
			<SymbolView
				name={symbol}
				size={16}
				tintColor={accent?.ink ?? colors.sub}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	badge: {
		width: 32,
		height: 32,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
});
