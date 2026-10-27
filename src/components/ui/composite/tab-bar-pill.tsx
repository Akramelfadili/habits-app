import { BlurView } from "expo-blur";
import { useRef } from "react";
import {
	Animated,
	Easing,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import {
	elevation,
	minTouchTarget,
	motion,
	radius,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import { useReducedTransparency } from "@/utils/use-reduced-transparency";

/**
 * The floating pill tab bar (V3-01 variant B, T-20/21) — the V3 baseline on
 * every frame. It overlays the content, which scrolls under it; every
 * scrolling screen pays `TAB_BAR_BOTTOM_PADDING` for that.
 *
 * Geometry is the mockup's: 56 pt tall, 16 pt side insets, floating 22 pt
 * above the bottom safe-area inset, 4 pt of padding around items that are
 * therefore 48 pt tall. The hit area reaches the pill's edge.
 */

/** The pill's own height, without the gap below it. */
export const PILL_HEIGHT = 56;

/**
 * How far the pill floats above the *screen* edge — not above the safe-area
 * inset. The mockup draws the home indicator at 8 with a 5 pt bar and the
 * pill at 22, i.e. V3-01's "9 above home indicator": a floating bar
 * deliberately sits over the home-indicator strip. It is also the only
 * reading under which T-25's 112 = 56 + 22 + 22 + 12 and T14's "toast bottom
 * 90" come out right.
 */
export const PILL_BOTTOM_INSET = 22;

/** Left and right margin from the screen edge (F-04 space-400). */
export const PILL_SIDE_INSET = space[400];

/** The padding inside the pill — also how far a hit area reaches past its item. */
const PILL_PADDING = space[100];

/** Gap between the last row and the pill's top edge (T-25). */
const PILL_CLEARANCE = 22;

/** The strip under that gap which nothing may occupy (T-25). */
const PILL_SAFE_ZONE = 12;

/**
 * What every scrolling screen inside the tabs pays as bottom padding, so the
 * last row's circle is never under the bar (T-25): 56 + 22 + 22 + 12 = 112.
 */
export const TAB_BAR_BOTTOM_PADDING =
	PILL_HEIGHT + PILL_BOTTOM_INSET + PILL_CLEARANCE + PILL_SAFE_ZONE;

/** Bar A's own height, above the bottom safe-area inset (V3-01 A). */
export const BAR_A_HEIGHT = 56;

/**
 * Where a toast's bottom edge sits: 12 pt above the pill, 16 pt above bar A
 * (T-21, TC). `accessibilityTextSize` is `useAccessibilityTextSize()` — the
 * same switch the bar itself reads.
 */
export function tabBarToastOffset(
	bottomInset: number,
	accessibilityTextSize: boolean,
): number {
	// Bar A sits on the screen edge and carries the inset itself, so its toast
	// clears both. The pill already floats clear of the inset (see
	// PILL_BOTTOM_INSET), so its toast is a flat 90 from the edge.
	return accessibilityTextSize
		? bottomInset + BAR_A_HEIGHT + space[400]
		: PILL_BOTTOM_INSET + PILL_HEIGHT + space[300];
}

/**
 * expo-blur's 1–100 `intensity` is not a blur radius, so the mockup's "20 pt
 * blur" has no exact equivalent; this is its default, and the fill above it
 * (`pillBg`, 88 % light / 94 % dark) is what actually carries the look. Worth
 * an eye on a device — see the phone checklist.
 */
const PILL_BLUR_INTENSITY = 50;

export type TabBarIconName = "today" | "progress" | "habits";

export type TabBarPillItem = {
	/** Stable identity — the navigator's route key. */
	key: string;
	label: string;
	icon: TabBarIconName;
	focused: boolean;
	onPress: () => void;
};

type TabBarPillProps = {
	items: readonly TabBarPillItem[];
	/**
	 * The device's bottom safe-area inset. Only bar A uses it — it sits on the
	 * screen edge and carries the inset as its own padding; the pill floats at
	 * a flat 22 pt over the home indicator (see `PILL_BOTTOM_INSET`).
	 */
	bottomInset: number;
	/**
	 * Inert: no tab can be tapped. True while a sheet or alert is open (H8 — no
	 * tab switching mid-decision) and while the migration runs (SY3). The pill
	 * stays visible and reads as disabled rather than disappearing.
	 */
	disabled?: boolean;
};

export function TabBarPill({
	items,
	bottomInset,
	disabled = false,
}: TabBarPillProps) {
	const { colors, scheme } = useTheme();
	const reducedTransparency = useReducedTransparency();
	const accessibilityTextSize = useAccessibilityTextSize();

	// H10: at AX sizes the pill would cover a much larger share of each
	// (taller) row, and its labels are fixed at 12 pt and cannot grow with the
	// rest — so the predictable full-width bar comes back instead.
	if (accessibilityTextSize) {
		return (
			<View
				testID="tab-bar-a"
				accessibilityRole="tablist"
				pointerEvents={disabled ? "none" : "box-none"}
				style={[
					styles.barA,
					{
						// 4 + a 48 pt row + 4 = the 56 pt bar, then the home indicator.
						paddingBottom: space[100] + bottomInset,
						backgroundColor: colors.card,
						borderTopColor: colors.border,
					},
				]}
			>
				{items.map((item) => (
					<TabBarPillTab
						key={item.key}
						item={item}
						disabled={disabled}
						variant="bar"
					/>
				))}
			</View>
		);
	}

	return (
		<View
			testID="tab-bar-pill"
			accessibilityRole="tablist"
			// Inert, not hidden: the bar is still part of the layout under a sheet.
			pointerEvents={disabled ? "none" : "box-none"}
			style={[
				styles.pill,
				elevation[scheme].pill,
				{
					left: PILL_SIDE_INSET,
					right: PILL_SIDE_INSET,
					bottom: PILL_BOTTOM_INSET,
					borderColor: colors.border,
				},
			]}
		>
			{reducedTransparency ? (
				// 08.5: a solid card, no blur — the same geometry and hairline.
				<View
					testID="tab-bar-pill-solid"
					style={[styles.material, { backgroundColor: colors.card }]}
				/>
			) : (
				<BlurView
					testID="tab-bar-pill-blur"
					intensity={PILL_BLUR_INTENSITY}
					tint={scheme}
					style={styles.material}
				>
					<View
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: colors.pillBg },
						]}
					/>
				</BlurView>
			)}
			{items.map((item) => (
				<TabBarPillTab
					key={item.key}
					item={item}
					disabled={disabled}
					variant="pill"
				/>
			))}
		</View>
	);
}

function TabBarPillTab({
	item,
	disabled,
	variant,
}: {
	item: TabBarPillItem;
	disabled: boolean;
	variant: "pill" | "bar";
}) {
	const { colors, scheme } = useTheme();
	const reducedMotion = useReducedMotion();
	const press = useRef(new Animated.Value(0)).current;

	function animatePress(to: number) {
		Animated.timing(press, {
			toValue: to,
			duration: motion.press.duration,
			easing: Easing.bezier(...motion.press.easing),
			useNativeDriver: true,
		}).start();
	}

	// F-07 press: a large target scales to 98 %; Reduce Motion flashes to 70 %
	// opacity instead and never scales.
	const scale = reducedMotion
		? 1
		: press.interpolate({
				inputRange: [0, 1],
				outputRange: [1, motion.press.scale.max],
			});
	const opacity = reducedMotion
		? press.interpolate({
				inputRange: [0, 1],
				outputRange: [1, motion.press.reduced.opacity],
			})
		: 1;

	// The selected item's filled capsule, and the pressed fill under an
	// unselected one — the two swap tone between schemes (V3-01 B).
	const selectedFill = scheme === "dark" ? colors.track : colors.inner;
	const pressedFill = scheme === "dark" ? colors.inner : colors.track;

	// T-23: over the translucent pill an inactive label needs sub (faint
	// measured 3.9–4.1:1 there). Bar A is an opaque card, where faint passes.
	const inactiveInk = variant === "pill" ? colors.sub : colors.faint;
	const ink = disabled
		? colors.outline
		: item.focused
			? colors.ink
			: inactiveInk;
	const glyphInk = disabled
		? colors.outline
		: item.focused
			? colors.ink
			: colors.faint;

	return (
		<Pressable
			testID={`tab-${item.icon}`}
			accessibilityRole="tab"
			accessibilityLabel={item.label}
			accessibilityState={{ selected: item.focused, disabled }}
			disabled={disabled}
			// Reaches the pill's edge, so there is no dead strip around an item.
			hitSlop={PILL_PADDING}
			onPressIn={() => animatePress(1)}
			onPressOut={() => animatePress(0)}
			onPress={item.onPress}
			style={variant === "pill" ? styles.tab : styles.barATab}
		>
			{/* Bar A marks the selected tab with ink and weight alone — no
			    capsule — so only its pressed fill is drawn. */}
			{variant === "pill" ? (
				<TabCapsule
					visible={item.focused}
					color={selectedFill}
					reducedMotion={reducedMotion}
				/>
			) : null}
			{item.focused && variant === "pill" ? null : (
				<Animated.View
					style={[
						variant === "pill" ? styles.capsule : styles.barACapsule,
						{
							backgroundColor: variant === "pill" ? pressedFill : colors.inner,
							opacity: press,
						},
					]}
				/>
			)}
			<Animated.View
				style={[
					variant === "pill" ? styles.content : styles.barAContent,
					{ opacity, transform: [{ scale }] },
				]}
			>
				<TabGlyph name={item.icon} color={glyphInk} />
				<Text
					// iOS keeps tab labels at a fixed size (F-03, 08.6a); at AX sizes
					// the whole pill gives way to bar A instead.
					allowFontScaling={false}
					style={[
						textStyles.caption,
						styles.label,
						{ color: ink },
						item.focused && styles.labelSelected,
					]}
				>
					{item.label}
				</Text>
			</Animated.View>
		</Pressable>
	);
}

/** The selected capsule, crossfading between items (F-07 "state"). */
function TabCapsule({
	visible,
	color,
	reducedMotion,
}: {
	visible: boolean;
	color: string;
	reducedMotion: boolean;
}) {
	const shown = useRef(new Animated.Value(visible ? 1 : 0)).current;
	const previous = useRef(visible);

	if (previous.current !== visible) {
		previous.current = visible;
		Animated.timing(shown, {
			toValue: visible ? 1 : 0,
			duration: reducedMotion
				? motion.state.reduced.crossfade
				: motion.state.duration,
			easing: Easing.bezier(...motion.state.easing),
			useNativeDriver: true,
		}).start();
	}

	return (
		<Animated.View
			testID="tab-capsule"
			style={[styles.capsule, { backgroundColor: color, opacity: shown }]}
		/>
	);
}

/**
 * The three tab glyphs (F-08, T-17): Today is a ring with a check, Progress
 * three rising bars, Habits a list. Drawn from the mockup's geometry rather
 * than SF Symbols, which are the one icon set that renders as nothing on web
 * — and the tab bar is in every visual baseline.
 */
function TabGlyph({ name, color }: { name: TabBarIconName; color: string }) {
	if (name === "today") {
		return (
			<View style={[glyph.ring, { borderColor: color }]}>
				<View style={[glyph.check, { borderColor: color }]} />
			</View>
		);
	}
	if (name === "progress") {
		return (
			<View style={glyph.bars}>
				{[7, 11, 16].map((height) => (
					<View
						key={height}
						style={[glyph.bar, { height, backgroundColor: color }]}
					/>
				))}
			</View>
		);
	}
	return (
		<View style={glyph.list}>
			{[0, 1, 2].map((row) => (
				<View key={row} style={glyph.listRow}>
					<View style={[glyph.listDot, { backgroundColor: color }]} />
					<View
						style={[
							glyph.listLine,
							{ backgroundColor: color },
							row === 2 && glyph.listLineShort,
						]}
					/>
				</View>
			))}
		</View>
	);
}

/** Icon box: 18 pt wide, so the three glyphs sit on one baseline. */
const GLYPH_BOX = 18;
const STROKE = 2;

const styles = StyleSheet.create({
	pill: {
		position: "absolute",
		height: PILL_HEIGHT,
		borderRadius: radius.pill,
		borderWidth: StyleSheet.hairlineWidth,
		flexDirection: "row",
		alignItems: "stretch",
		padding: PILL_PADDING,
		gap: space[50],
	},
	/** The blurred / solid fill, clipped to the pill. */
	material: {
		...StyleSheet.absoluteFill,
		borderRadius: radius.pill,
		overflow: "hidden",
	},
	tab: {
		flex: 1,
		minHeight: minTouchTarget + space[100],
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.pill,
	},
	capsule: {
		...StyleSheet.absoluteFill,
		borderRadius: radius.pill,
	},
	/**
	 * V3-01 A, the AX fallback: a full-width card with a top hairline, 56 pt
	 * over the bottom inset. Absolute like the pill, so the 112 pt bottom
	 * padding and the scroll-under behaviour are the same in both modes.
	 */
	barA: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		borderTopWidth: StyleSheet.hairlineWidth,
		flexDirection: "row",
		alignItems: "stretch",
		paddingHorizontal: space[200],
		paddingTop: space[100],
		gap: space[100],
	},
	barATab: {
		flex: 1,
		minHeight: minTouchTarget + space[100],
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.m,
	},
	barACapsule: {
		...StyleSheet.absoluteFill,
		borderRadius: radius.m,
	},
	barAContent: {
		alignItems: "center",
		gap: space[150],
	},
	content: {
		alignItems: "center",
		gap: space[100],
	},
	label: {
		textAlign: "center",
	},
	/** The selected tab's label: ink plus the one 600 in the type scale (F-03). */
	labelSelected: {
		fontWeight: "600",
	},
});

const glyph = StyleSheet.create({
	ring: {
		width: GLYPH_BOX,
		height: GLYPH_BOX,
		borderRadius: radius.pill,
		borderWidth: STROKE,
		alignItems: "center",
		justifyContent: "center",
	},
	check: {
		width: 8,
		height: 4,
		borderLeftWidth: STROKE,
		borderBottomWidth: STROKE,
		transform: [{ translateY: -1 }, { rotate: "-45deg" }],
	},
	bars: {
		width: GLYPH_BOX,
		height: GLYPH_BOX,
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
	},
	bar: {
		width: 4,
	},
	list: {
		width: GLYPH_BOX,
		height: 15,
		justifyContent: "space-between",
	},
	listRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[50],
	},
	listDot: {
		width: 3,
		height: 3,
	},
	listLine: {
		flex: 1,
		height: STROKE,
	},
	listLineShort: {
		flex: 0,
		width: 8,
	},
});
