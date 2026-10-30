import { SymbolView } from "expo-symbols";
import type { Ref } from "react";
import {
	type HostInstance,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

/**
 * Long names wrap to this many lines, then end in "…" — the full text stays in
 * the accessibility label, so nothing is lost to a screen reader and no control
 * is pushed out of the row (audit A5-15). At accessibility text sizes nothing
 * truncates at all (08.6).
 */
const TITLE_LINES = 2;
const SUBTITLE_LINES = 2;

/** V3-23 / T-18: a flat 60 pt row — 44 pt control plus `space[200]` above and below. */
const ROW_MIN_HEIGHT = minTouchTarget + 2 * space[200];

type ListItemProps = {
	title: string;
	subtitle?: string;
	/** Sits right after the title on the same line — a scope chip ("All habits", HAB-15). */
	titleAccessory?: React.ReactNode;
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
	 * With `dimmed`: keep `leading` at full opacity and fade only the text (H2).
	 * An archived habit's muted icon square would otherwise vanish on a white card.
	 */
	keepLeading?: boolean;
	/**
	 * Held mid-drag in a reorderable list (V3-23 "Reorder · lifted"): the E2
	 * shadow, and in dark a lighter surface, since height reads as lightness
	 * there (F-06).
	 */
	lifted?: boolean;
	/** Overrides the default accessibility label (the title). */
	accessibilityLabel?: string;
	/** The row does something that cannot be undone ("Delete habit"): its title reads in the danger ink. */
	destructive?: boolean;
	/** What a tap does, for VoiceOver ("Opens details."). */
	accessibilityHint?: string;
	/** The row's button, for a sheet that starts the screen reader's focus on it (`useInitialFocus`). */
	buttonRef?: Ref<HostInstance>;
	/**
	 * Extra VoiceOver actions on the row — the accessible route to anything a
	 * gesture does (e.g. swipe-to-archive, HAB-13).
	 */
	accessibilityActions?: { label: string; onAction: () => void }[];
};

export function ListItem({
	title,
	subtitle,
	titleAccessory,
	onPress,
	navigable = false,
	leading,
	value,
	trailing,
	embedded = false,
	dimmed = false,
	keepLeading = false,
	lifted = false,
	accessibilityLabel,
	destructive = false,
	accessibilityHint,
	buttonRef,
	accessibilityActions,
}: ListItemProps) {
	const { colors, scheme, elevation, opacity } = useTheme();
	const titleColor = destructive ? colors.dangerBg : colors.ink;
	const largeText = useAccessibilityTextSize();

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
				lifted && [
					styles.lifted,
					{ backgroundColor: scheme === "dark" ? colors.inner : colors.card },
					elevation.lifted,
				],
			]}
		>
			<Pressable
				ref={buttonRef}
				accessibilityRole={onPress ? "button" : undefined}
				accessibilityLabel={accessibilityLabel}
				accessibilityHint={accessibilityHint}
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
					!embedded && (largeText ? styles.paddedLarge : styles.padded),
					trailing ? styles.paddedBeforeTrailing : null,
					// V3-23 "Pressed": the inset surface, not a fade.
					pressed && onPress && { backgroundColor: colors.inner },
				]}
			>
				<View
					testID="list-item-content"
					style={[
						styles.content,
						// Accessibility sizes stack: the icon, then the text, then the value.
						largeText && styles.contentStacked,
						dimmed && !keepLeading && { opacity: opacity.dimmed },
					]}
				>
					{leading}
					<View
						style={[
							styles.text,
							dimmed && keepLeading && { opacity: opacity.dimmed },
						]}
					>
						{titleAccessory ? (
							<View style={styles.titleRow}>
								<Text
									numberOfLines={largeText ? undefined : TITLE_LINES}
									style={[
										styles.title,
										styles.shrinkable,
										{ color: titleColor },
									]}
								>
									{title}
								</Text>
								{titleAccessory}
							</View>
						) : (
							<Text
								numberOfLines={largeText ? undefined : TITLE_LINES}
								style={[styles.title, { color: titleColor }]}
							>
								{title}
							</Text>
						)}
						{subtitle ? (
							<Text
								numberOfLines={largeText ? undefined : SUBTITLE_LINES}
								style={[styles.subtitle, { color: colors.sub }]}
							>
								{subtitle}
							</Text>
						) : null}
					</View>
					{value ? (
						<Text
							numberOfLines={largeText ? undefined : 1}
							style={[
								styles.value,
								largeText && styles.valueStacked,
								{ color: colors.sub },
							]}
						>
							{value}
						</Text>
					) : null}
				</View>
				{trailing ? null : chevron}
			</Pressable>
			{trailing ? (
				<View style={[styles.trailing, !embedded && styles.trailingPadded]}>
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
		borderRadius: radius.m,
	},
	lifted: {
		// Held mid-drag: nothing else on the row changes size.
		zIndex: 1,
	},
	pressable: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
		borderRadius: radius.m,
	},
	padded: {
		minHeight: ROW_MIN_HEIGHT,
		paddingVertical: space[250],
		paddingHorizontal: space[350],
	},
	paddedLarge: {
		minHeight: ROW_MIN_HEIGHT,
		paddingVertical: space[400],
		paddingHorizontal: space[400],
	},
	paddedBeforeTrailing: {
		paddingRight: space[300],
	},
	content: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
	contentStacked: {
		flexDirection: "column",
		alignItems: "flex-start",
		gap: space[200],
	},
	embedded: {
		borderRadius: 0,
	},
	trailing: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
	trailingPadded: {
		paddingRight: space[350],
	},
	text: {
		flex: 1,
		gap: space[50],
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[200],
	},
	title: {
		...textStyles.body,
	},
	subtitle: {
		...textStyles.footnote,
	},
	value: {
		...textStyles.callout,
		flexShrink: 1,
		maxWidth: "45%",
		textAlign: "right",
	},
	valueStacked: {
		maxWidth: "100%",
		textAlign: "left",
	},
	shrinkable: {
		flexShrink: 1,
	},
});
