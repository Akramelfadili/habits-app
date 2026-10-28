import { type ReactNode, useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	scrollTo,
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { minTouchTarget, motion, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";

/** The solid inline bar's height under the status bar (T5). */
export const COLLAPSED_BAR_HEIGHT = minTouchTarget;

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
		scrollTo(scrollRef, 0, y < end / 2 ? 0 : end, true);
	};

	const onScroll = useAnimatedScrollHandler({
		onScroll: (event) => {
			scrollY.value = event.contentOffset.y;
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

	return {
		scrollRef,
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
						styles.background,
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

const styles = StyleSheet.create({
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
