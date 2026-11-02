import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { radius, space, squareRadius, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type AddRowProps = {
	label: string;
	onPress: () => void;
	/** Trailing count, e.g. "3 of 4". */
	count?: string;
	/** A line under the label — C6's "Group habits your own way". */
	subtitle?: string;
	/** At a cap — faded and inert. Pair with a caption saying why. */
	disabled?: boolean;
	/**
	 * Closes out a list *inside* a card (Manage Categories' "Add category",
	 * HAB-25) — no dashed outline of its own, the card is the boundary.
	 */
	embedded?: boolean;
};

const BADGE = 32;

/**
 * Dashed "add another" row that closes out a list of cards (Reminders'
 * "Add a time", HAB-12): a + badge, label, and an optional trailing count.
 */
export function AddRow({
	label,
	onPress,
	count,
	subtitle,
	disabled = false,
	embedded = false,
}: AddRowProps) {
	const { colors, opacity } = useTheme();
	const spoken = [label, subtitle, count].filter(Boolean).join(", ");

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={spoken}
			accessibilityState={{ disabled }}
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.row,
				{ borderColor: colors.outline },
				embedded && styles.embedded,
				disabled && { opacity: opacity.disabled },
				pressed && !disabled && { opacity: opacity.pressed },
			]}
		>
			<View style={[styles.badge, { backgroundColor: colors.inner }]}>
				<SymbolView name="plus" size={14} tintColor={colors.ink} />
			</View>
			<View style={styles.text}>
				<Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
				{subtitle ? (
					<Text style={[styles.subtitle, { color: colors.sub }]}>
						{subtitle}
					</Text>
				) : null}
			</View>
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
		borderRadius: radius.l,
		borderWidth: 1.5,
		borderStyle: "dashed",
		paddingVertical: space[300],
		paddingHorizontal: space[400],
		gap: space[300],
	},
	embedded: {
		borderWidth: 0,
		borderRadius: 0,
		minHeight: 60,
		paddingVertical: space[250],
		paddingHorizontal: space[350],
	},
	badge: {
		width: BADGE,
		height: BADGE,
		borderRadius: squareRadius(BADGE),
		alignItems: "center",
		justifyContent: "center",
	},
	text: {
		flex: 1,
	},
	label: {
		...textStyles.body,
	},
	subtitle: {
		...textStyles.footnote,
	},
	count: {
		...textStyles.footnote,
	},
});
