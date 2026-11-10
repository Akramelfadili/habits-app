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

export const PILL_HEIGHT = 56;

// Measured from the *screen* edge, not the safe-area inset: the pill deliberately sits over the
// home-indicator strip, which is the only reading where the 112 bottom padding and 90 toast offset work.
export const PILL_BOTTOM_INSET = 22;

export const PILL_SIDE_INSET = space[400];

const PILL_PADDING = space[100];

const PILL_CLEARANCE = 22;

const PILL_SAFE_ZONE = 12;

export const TAB_BAR_BOTTOM_PADDING =
	PILL_HEIGHT + PILL_BOTTOM_INSET + PILL_CLEARANCE + PILL_SAFE_ZONE;

export const BAR_A_HEIGHT = 56;

export function tabBarToastOffset(
	bottomInset: number,
	accessibilityTextSize: boolean,
): number {
	// Bar A carries the inset itself, so its toast clears both; the pill already floats clear of it.
	return accessibilityTextSize
		? bottomInset + BAR_A_HEIGHT + space[400]
		: PILL_BOTTOM_INSET + PILL_HEIGHT + space[300];
}

// expo-blur's 1–100 `intensity` is not a blur radius, so the mockup's 20 pt blur has no exact
// equivalent; the `pillBg` fill is what carries the look.
const PILL_BLUR_INTENSITY = 50;

export type TabBarIconName = "today" | "progress" | "habits";

export type TabBarPillItem = {
	key: string;
	label: string;
	icon: TabBarIconName;
	focused: boolean;
	onPress: () => void;
};

type TabBarPillProps = {
	items: readonly TabBarPillItem[];
	bottomInset: number;
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

	// At AX sizes the pill would cover a much larger share of each (taller) row, and its labels are
	// fixed at 12 pt and cannot grow with the rest, so the predictable full-width bar comes back instead.
	if (accessibilityTextSize) {
		return (
			<View
				testID="tab-bar-a"
				accessibilityRole="tablist"
				pointerEvents={disabled ? "none" : "box-none"}
				style={[
					styles.barA,
					{
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

	const selectedFill = scheme === "dark" ? colors.track : colors.inner;
	const pressedFill = scheme === "dark" ? colors.inner : colors.track;

	// Over the translucent pill an inactive label needs sub (faint measured 3.9–4.1:1 there). Bar A is
	// an opaque card, where faint passes.
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
					// iOS keeps tab labels at a fixed size; at AX sizes the whole pill gives way to bar A instead.
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

// Drawn rather than SF Symbols, which render as nothing on web, and the tab bar is in every visual baseline.
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
