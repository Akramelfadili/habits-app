import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type ListItemProps = {
	title: string;
	subtitle?: string;
	onPress?: () => void;
	/** Renders a trailing chevron — used when the row navigates elsewhere. */
	navigable?: boolean;
	leading?: React.ReactNode;
	/** Trailing value text, shown before the chevron (e.g. a form row's current value). */
	value?: string;
	/** Trailing control (e.g. a compact SegmentedControl), shown after the value. */
	trailing?: React.ReactNode;
	/**
	 * The row sits inside a Container card that already provides padding and
	 * background (form rows) — drop the row's own so content aligns with the card.
	 */
	embedded?: boolean;
	/**
	 * Fades the row's content (not its trailing control) — the design system's
	 * dimmed list-item state, e.g. Retro log's not-yet-done habits (HAB-10).
	 */
	dimmed?: boolean;
	/** Overrides the default accessibility label (the title). */
	accessibilityLabel?: string;
};

export function ListItem({
	title,
	subtitle,
	onPress,
	navigable = false,
	leading,
	value,
	trailing,
	embedded = false,
	dimmed = false,
	accessibilityLabel,
}: ListItemProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			accessibilityRole={onPress ? "button" : undefined}
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
			style={({ pressed }) => [
				styles.row,
				embedded ? styles.embedded : { backgroundColor: colors.card },
				pressed && onPress && { opacity: opacity.pressed },
			]}
		>
			<View
				testID="list-item-content"
				style={[styles.content, dimmed && { opacity: opacity.dimmed }]}
			>
				{leading}
				<View style={styles.text}>
					<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
					{subtitle ? (
						<Text style={[styles.subtitle, { color: colors.sub }]}>
							{subtitle}
						</Text>
					) : null}
				</View>
				{value ? (
					<Text style={[styles.value, { color: colors.sub }]}>{value}</Text>
				) : null}
			</View>
			{trailing}
			{navigable ? (
				<SymbolView name="chevron.right" size={14} tintColor={colors.faint} />
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 14,
	},
	content: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	embedded: {
		paddingVertical: 0,
		paddingHorizontal: 0,
		borderRadius: 0,
	},
	text: {
		flex: 1,
		gap: 2,
	},
	title: {
		fontSize: 15,
		fontWeight: "500",
	},
	subtitle: {
		fontSize: 12.5,
	},
	value: {
		fontSize: 15,
	},
});
