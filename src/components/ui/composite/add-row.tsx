import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

type AddRowProps = {
	label: string;
	onPress: () => void;
	/** Trailing count, e.g. "3 of 4". */
	count?: string;
	/** At a cap — faded and inert. Pair with a caption saying why. */
	disabled?: boolean;
};

/**
 * Dashed "add another" row that closes out a list of cards (Reminders'
 * "Add a time", HAB-12): a + badge, label, and an optional trailing count.
 */
export function AddRow({
	label,
	onPress,
	count,
	disabled = false,
}: AddRowProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={count ? `${label}, ${count}` : label}
			accessibilityState={{ disabled }}
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.row,
				{ borderColor: colors.border },
				disabled && { opacity: opacity.disabled },
				pressed && !disabled && { opacity: opacity.pressed },
			]}
		>
			<View style={[styles.badge, { backgroundColor: colors.inner }]}>
				<SymbolView name="plus" size={14} tintColor={colors.ink} />
			</View>
			<Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
			{count ? (
				<Text style={[styles.count, { color: colors.faint }]}>{count}</Text>
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 16,
		borderWidth: 1.5,
		borderStyle: "dashed",
		paddingVertical: 14,
		paddingHorizontal: 16,
		gap: 12,
	},
	badge: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
	},
	label: {
		flex: 1,
		fontSize: typeScale.rowLabel,
	},
	count: {
		fontSize: typeScale.subtitle,
	},
});
