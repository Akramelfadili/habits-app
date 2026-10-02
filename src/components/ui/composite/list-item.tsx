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
	/**
	 * Denser padding for rows stacked in a `tight` list card (Manage &
	 * Archive's reorder and archived rows, HAB-13).
	 */
	compact?: boolean;
	/**
	 * Held mid-drag in a reorderable list (design-system "List item —
	 * reorder", HAB-13) — shown on the recessed surface, lifted off the card.
	 */
	lifted?: boolean;
	/** Overrides the default accessibility label (the title). */
	accessibilityLabel?: string;
	/**
	 * Extra VoiceOver actions on the row — the accessible route to anything a
	 * gesture does (e.g. swipe-to-archive, HAB-13).
	 */
	accessibilityActions?: { label: string; onAction: () => void }[];
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
	compact = false,
	lifted = false,
	accessibilityLabel,
	accessibilityActions,
}: ListItemProps) {
	const { colors, opacity } = useTheme();

	const chevron = navigable ? (
		<SymbolView name="chevron.right" size={14} tintColor={colors.faint} />
	) : null;

	// `trailing` sits beside the pressable area, not inside it — a trailing
	// control (Restore, a drag grip, a toggle) is its own touch target, and
	// nesting it in the row's button is invalid on web.
	return (
		<View
			testID="list-item"
			style={[
				styles.row,
				embedded ? styles.embedded : { backgroundColor: colors.card },
				lifted && { backgroundColor: colors.inner },
			]}
		>
			<Pressable
				accessibilityRole={onPress ? "button" : undefined}
				accessibilityLabel={accessibilityLabel}
				accessibilityActions={accessibilityActions?.map(({ label }) => ({
					name: label,
					label,
				}))}
				onAccessibilityAction={(event) =>
					accessibilityActions
						?.find(({ label }) => label === event.nativeEvent.actionName)
						?.onAction()
				}
				onPress={onPress}
				style={({ pressed }) => [
					styles.pressable,
					!embedded && (compact ? styles.compactPadded : styles.padded),
					trailing ? styles.paddedBeforeTrailing : null,
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
				{trailing ? null : chevron}
			</Pressable>
			{trailing ? (
				<View
					style={[
						styles.trailing,
						!embedded &&
							(compact ? styles.compactTrailingPadded : styles.trailingPadded),
					]}
				>
					{trailing}
					{chevron}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 14,
	},
	pressable: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	padded: {
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
	compactPadded: {
		paddingVertical: 8,
		paddingHorizontal: 10,
	},
	paddedBeforeTrailing: {
		paddingRight: 12,
	},
	content: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	embedded: {
		borderRadius: 0,
	},
	trailing: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	trailingPadded: {
		paddingRight: 16,
	},
	compactTrailingPadded: {
		paddingRight: 10,
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
