import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ActionCardProps = {
	title: string;
	subtitle: string;
	/** Neutral grey leading badge (E7's archive box). */
	symbol: SFSymbol;
	onPress: () => void;
	disabled?: boolean;
};

/**
 * NEW-25 Action card (design-system.md): an outlined card where the whole
 * card is the button, marked by a trailing chevron — "Archive instead" on the
 * delete sheet (HAB-23, E7). Deliberately not `InsightCard` (VAR-04), whose
 * body is never tappable: merging them would hide a tap target.
 */
export function ActionCard({
	title,
	subtitle,
	symbol,
	onPress,
	disabled = false,
}: ActionCardProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			testID="action-card"
			accessibilityRole="button"
			accessibilityLabel={`${title}. ${subtitle}`}
			accessibilityState={{ disabled }}
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.card,
				{ backgroundColor: colors.card, borderColor: colors.border },
				disabled && { opacity: opacity.disabled },
				pressed && !disabled && { opacity: opacity.pressed },
			]}
		>
			<IconBadge symbol={symbol} />
			<View style={styles.text}>
				<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
				<Text style={[styles.subtitle, { color: colors.sub }]}>{subtitle}</Text>
			</View>
			<SymbolView name="chevron.right" size={14} tintColor={colors.faint} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderRadius: 16,
		borderWidth: 1,
		paddingVertical: 14,
		paddingHorizontal: 16,
	},
	text: {
		flex: 1,
		gap: 2,
	},
	title: {
		fontSize: typeScale.rowLabel,
		fontWeight: "500",
	},
	subtitle: {
		fontSize: typeScale.subtitle,
		lineHeight: 17,
	},
});
