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

export const COLLAPSED_BAR_HEIGHT = minTouchTarget;

export const HEADER_CONTENT_PADDING_TOP = space[300];
export const HEADER_BLOCK_GAP = space[200];

const BAR_TAKES_OVER_AT = 0.5;

export function collapseRange(contentTop: number) {
	return Math.max(1, contentTop - COLLAPSED_BAR_HEIGHT);
}

// Everything is a function of the scroll offset on the UI thread, with no React state per frame
// (`collapsed` flips once, when the bar takes over).
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
			// `previous` is null on the first run: setting `collapsed` again would be a stray render
			// after mount, but a first run already past the threshold must count.
			if (next !== (previous ?? false)) {
				scheduleOnRN(setCollapsed, next);
			}
		},
	);

	const setRange = useCallback(
		(next: number) => {
			range.value = next;
		},
		[range],
	);

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

	const barBackgroundStyle = useAnimatedStyle(() => ({
		opacity: interpolate(progress.value, [0.7, 1], [0, 1], Extrapolation.CLAMP),
	}));

	const barContentStyle = useAnimatedStyle(() => ({
		opacity: interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
	}));

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
	title: string;
	collapsed: boolean;
	backgroundStyle: object;
	contentStyle: object;
	testID?: string;
	trailing?: ReactNode;
	// Off when a pinned control sits under the bar: that block draws the one hairline, so the control isn't boxed between two.
	hairline?: boolean;
};

// A zero-height wrapper hangs the bar from the safe-area line whatever the parent's padding does to
// absolute children. Render it before the scroller, or the zero-height sibling lands at the bottom.
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
	scrollY: SharedValue<number>;
	top: SharedValue<number>;
	onHeight: (height: number) => void;
	testID?: string;
};

export const PINNED_PADDING_TOP = space[200];

// One element moved on the UI thread, so it is never drawn twice; the content keeps an empty slot of its height.
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
