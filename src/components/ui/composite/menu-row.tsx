import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { useTheme } from "@/theme/use-theme";
import { IconBadge } from "../primitives/icon-badge";

type MenuRowProps = {
	symbol: SFSymbol;
	title: string;
	/** Live context under the title — "7 active · 2 archived". */
	subline: string;
	onPress: () => void;
	/**
	 * Why the row can't be used right now. Setting it disables the row and
	 * replaces the subline, so the menu keeps its shape instead of hiding rows.
	 */
	disabledReason?: string;
};

/** One row of a navigation menu (NEW-14): badge, title, context line, chevron. */
export function MenuRow({
	symbol,
	title,
	subline,
	onPress,
	disabledReason,
}: MenuRowProps) {
	const { colors, opacity } = useTheme();
	const disabled = disabledReason !== undefined;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${title}, ${disabled ? disabledReason : subline}`}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.row,
				pressed && { opacity: opacity.pressed },
			]}
		>
			<View style={disabled ? { opacity: opacity.dimmed } : undefined}>
				<IconBadge symbol={symbol} />
			</View>
			<View style={styles.text}>
				<Text
					style={[
						styles.title,
						{ color: disabled ? colors.faint : colors.ink },
					]}
				>
					{title}
				</Text>
				<Text style={[styles.subline, { color: colors.sub }]}>
					{disabled ? disabledReason : subline}
				</Text>
			</View>
			{disabled ? null : (
				<SymbolView name="chevron.right" size={14} tintColor={colors.faint} />
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		minHeight: 44,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	text: {
		flex: 1,
		gap: 2,
	},
	title: {
		fontSize: 15,
		fontWeight: "500",
	},
	subline: {
		fontSize: 12,
	},
});
