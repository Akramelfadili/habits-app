import { type ReactNode, useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	scrollTo,
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
	barMaxFontMultiplier,
	minTouchTarget,
	motion,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";

/** The solid inline bar's height under the status bar (T5). */
export const COLLAPSED_BAR_HEIGHT = minTouchTarget;

/** Where Today-style tab roots start and how far the header sits from what follows it (T1): the screen's own paddingTop and header gap. */
export const HEADER_CONTENT_PADDING_TOP = space[300];
export const HEADER_BLOCK_GAP = space[200];

/** A bar this close to the end of its range counts as showing: it takes over the taps and VoiceOver. */
const BAR_TAKES_OVER_AT = 0.5;

/** Scroll distance (pt) over which the title collapses, given where the content below the header starts. */
export function collapseRange(contentTop: number) {
	return Math.max(1, contentTop - COLLAPSED_BAR_HEIGHT);
}

/**
 * V3-02's large title collapsing into a solid inline bar (T5), scroll-linked:
 * everything is a function of the scroll offset on the UI thread, with no React
 * state per frame (`collapsed` flips once, when the bar takes over). The title
 * shrinks and fades over the first 60 % of the range, the bar's name fades in
 * from the middle, and its background and hairline arrive in the last 30 %.
 * Scrolling that stops inside the range settles on the nearer end.
 *
 * Reduce Motion (F-07): no interpolation and no settling scroll, only a
 * 150 ms crossfade when the offset passes the middle of the range.
 *
 * The range is where the content below the header meets the bar's bottom
 * edge — the screen reports it with `setRange(collapseRange(top))` once the
 * header is measured, so the bar never covers what is still on screen.
 */
export function useCollapsingHeader() {
	const reduced = useReducedMotion();
	const scrollRef = useAnimatedRef<Animated.ScrollView>();
	const scrollY = useSharedValue(0);
	const maxOffset = useSharedValue(Number.POSITIVE_INFINITY);
	const range = useSharedValue(
		collapseRange(space[800] + COLLAPSED_BAR_HEIGHT),
	);
	const progress = useSharedValue(0);
	const [collapsed, setCollapsed] = useState(false);

	const settle = () => {
		"worklet";
		const y = scrollY.value;
		const end = range.value;
		if (reduced || y <= 0 || y >= end) return;
		// Content too short to scroll the whole range can only rest at the top.
		const target = y < end / 2 || maxOffset.value < end ? 0 : end;
		scrollTo(scrollRef, 0, target, true);
	};

	const onScroll = useAnimatedScrollHandler({
		onScroll: (event) => {
			scrollY.value = event.contentOffset.y;
			maxOffset.value = Math.max(
				0,
				event.contentSize.height - event.layoutMeasurement.height,
			);
		},
		onEndDrag: (event) => {
			// With velocity a momentum phase follows and settles itself.
			if (Math.abs(event.velocity?.y ?? 0) < 0.1) settle();
		},
		onMomentumEnd: () => settle(),
	});

	useAnimatedReaction(
		() =>
			reduced
				? Number(scrollY.value >= range.value / 2)
				: interpolate(
						scrollY.value,
						[0, range.value],
						[0, 1],
						Extrapolation.CLAMP,
					),
		(next, previous) => {
			if (reduced) {
				if (next !== previous) {
					progress.value = withTiming(next, {
						duration: motion.state.reduced.crossfade,
					});
				}
			} else {
				progress.value = next;
			}
		},
	);

	useAnimatedReaction(
		() => progress.value >= BAR_TAKES_OVER_AT,
		(next, previous) => {
			if (next !== previous) scheduleOnRN(setCollapsed, next);
		},
	);

	const setRange = useCallback(
		(next: number) => {
			range.value = next;
		},
		[range],
	);

	/** The large title block: shrinks from its leading edge and fades out. */
	const titleStyle = useAnimatedStyle(() => {
		const out = interpolate(
			progress.value,
			[0, 0.6],
			[0, 1],
			Extrapolation.CLAMP,
		);
		return {
			opacity: 1 - out,
			transform: reduced ? [] : [{ scale: 1 - 0.12 * out }],
			transformOrigin: "left center",
		};
	});

	/** The bar's solid background and hairline: last to arrive. */
	const barBackgroundStyle = useAnimatedStyle(() => ({
		opacity: interpolate(progress.value, [0.7, 1], [0, 1], Extrapolation.CLAMP),
	}));

	/** The bar's name and buttons. */
	const barContentStyle = useAnimatedStyle(() => ({
		opacity: interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
	}));

	/** Back to the large title: re-tapping the selected tab (08.4). */
	const scrollToTop = useCallback(() => {
		scrollRef.current?.scrollTo({ y: 0, animated: !reduced });
	}, [scrollRef, reduced]);

	return {
		scrollRef,
		scrollToTop,
		scrollY,
		onScroll,
		setRange,
		collapsed,
		titleStyle,
		barBackgroundStyle,
		barContentStyle,
	};
}

type CollapsedHeaderBarProps = {
	/** The screen's name, centred (T5). */
	title: string;
	/** True once the bar has taken over from the large title. */
	collapsed: boolean;
	backgroundStyle: object;
	contentStyle: object;
	testID?: string;
	/** Trailing header buttons (`HeaderCircleButton`), shown with the bar. */
	trailing?: ReactNode;
	/**
	 * The bar's bottom hairline. Off when a pinned control sits right under the
	 * bar (Progress's range switcher): that block draws the one hairline below
	 * itself, so the control is not boxed between two.
	 */
	hairline?: boolean;
};

/**
 * The solid inline bar (T5). A zero-height wrapper hangs it from the safe-area
 * line, so it sits exactly one bar-height below the status bar whatever the
 * parent's padding does to absolute children. Render it before the scroller (the scroller fills the rest of the column, so a zero-height sibling after it would land at the bottom); `zIndex` keeps it on top.
 */
export function CollapsedHeaderBar({
	title,
	collapsed,
	backgroundStyle,
	contentStyle,
	trailing,
	hairline = true,
	testID = "collapsed-header-bar",
}: CollapsedHeaderBarProps) {
	const { colors } = useTheme();

	return (
		<View style={styles.anchor} pointerEvents="box-none">
			<View testID={testID} pointerEvents="box-none" style={styles.bar}>
				<Animated.View
					testID={`${testID}-background`}
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						hairline && styles.background,
						{ backgroundColor: colors.bg, borderBottomColor: colors.border },
						backgroundStyle,
					]}
				/>
				<Animated.View
					pointerEvents={collapsed ? "box-none" : "none"}
					accessibilityElementsHidden={!collapsed}
					importantForAccessibility={collapsed ? "auto" : "no-hide-descendants"}
					style={[styles.content, contentStyle]}
				>
					<Text
						accessibilityRole="header"
						// A navigation bar holds its type size, like iOS's own (08.6).
						maxFontSizeMultiplier={barMaxFontMultiplier}
						style={[styles.title, { color: colors.ink }]}
					>
						{title}
					</Text>
					<View style={styles.trailing}>{trailing}</View>
				</Animated.View>
			</View>
		</View>
	);
}

type PinnedBelowBarProps = {
	children: ReactNode;
	/** The scroll offset from `useCollapsingHeader`. */
	scrollY: SharedValue<number>;
	/**
	 * Where the content's own slot for this control starts, in scroll-content
	 * coordinates. The control follows the content up to just under the bar,
	 * then stays there.
	 */
	top: SharedValue<number>;
	/** The control's own height, reported so the screen can keep its slot in the content. */
	onHeight: (height: number) => void;
	testID?: string;
};

/** Air between the bar and a pinned control; the control's own slot starts this far below the layer's top. */
export const PINNED_PADDING_TOP = space[200];

/**
 * A control that scrolls with the content until it meets the inline bar, then
 * pins just under it (Progress's range switcher, P1 → P8). One element, moved
 * on the UI thread — a translation of the scroll offset clamped at the bar's
 * bottom edge — so it is never drawn twice. Render it right after the bar and
 * before the scroller, like the bar itself, and leave an empty slot of its
 * height in the content.
 */
export function PinnedBelowBar({
	children,
	scrollY,
	top,
	onHeight,
	testID = "pinned-below-bar",
}: PinnedBelowBarProps) {
	const { colors } = useTheme();
	const layer = useAnimatedStyle(() => ({
		transform: [
			{
				translateY: Math.max(
					top.value - PINNED_PADDING_TOP - scrollY.value,
					COLLAPSED_BAR_HEIGHT,
				),
			},
		],
	}));
	// A hairline arrives as the control settles under the bar, so content can
	// be seen to pass beneath it.
	const hairline = useAnimatedStyle(() => ({
		opacity: interpolate(
			top.value - PINNED_PADDING_TOP - scrollY.value - COLLAPSED_BAR_HEIGHT,
			[0, space[100]],
			[1, 0],
			Extrapolation.CLAMP,
		),
	}));

	return (
		<View style={styles.pinnedAnchor} pointerEvents="box-none">
			<Animated.View
				testID={testID}
				pointerEvents="box-none"
				onLayout={({ nativeEvent }) => onHeight(nativeEvent.layout.height)}
				style={[styles.pinned, { backgroundColor: colors.bg }, layer]}
			>
				{children}
				<Animated.View
					testID={`${testID}-hairline`}
					pointerEvents="none"
					style={[
						styles.pinnedHairline,
						{ backgroundColor: colors.border },
						hairline,
					]}
				/>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	pinnedAnchor: {
		height: 0,
		zIndex: 1,
	},
	pinned: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		paddingHorizontal: space[500],
		paddingTop: PINNED_PADDING_TOP,
		paddingBottom: space[200],
	},
	pinnedHairline: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		height: StyleSheet.hairlineWidth,
	},
	anchor: {
		height: 0,
		zIndex: 1,
	},
	bar: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: COLLAPSED_BAR_HEIGHT,
	},
	background: {
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	content: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: space[500],
	},
	title: {
		...textStyles.body,
		fontWeight: "500",
	},
	trailing: {
		position: "absolute",
		right: space[500],
		top: 0,
		bottom: 0,
		justifyContent: "center",
	},
});
