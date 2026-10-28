import { useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	ScrollView,
	type ScrollViewInstance,
	StyleSheet,
	View,
} from "react-native";
import { radius, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { InsightCard, type InsightCardProps } from "./insight-card";

type InsightPagerProps = {
	/** Up to three, ranked: slipping → improved → nothing to fix. */
	insights: Omit<InsightCardProps, "position">[];
	/** "Insight 1 of 3" — read before the card by VoiceOver. */
	positionLabel: (index: number, count: number) => string;
};

const DOT = space[150];

/**
 * V3-12's pager: one insight on screen, the rest a swipe away, dots under it.
 * Cards are 20 pt-radius surfaces side by side; a single insight shows no dots.
 * For VoiceOver each card reads "Insight 1 of 3" and is adjustable.
 */
export function InsightPager({ insights, positionLabel }: InsightPagerProps) {
	const { colors } = useTheme();
	const scroller = useRef<ScrollViewInstance>(null);
	const [width, setWidth] = useState(0);
	const [index, setIndex] = useState(0);
	const count = insights.length;

	const goTo = (next: number) => {
		const clamped = Math.min(count - 1, Math.max(0, next));
		setIndex(clamped);
		scroller.current?.scrollTo({ x: clamped * width, animated: true });
	};

	const onEnd = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
		if (width > 0) setIndex(Math.round(nativeEvent.contentOffset.x / width));
	};

	if (count === 0) return null;
	if (count === 1) return <InsightCard {...insights[0]} />;

	return (
		<View
			testID="insight-pager"
			style={styles.pager}
			onLayout={({ nativeEvent }: LayoutChangeEvent) =>
				setWidth(nativeEvent.layout.width)
			}
		>
			<ScrollView
				ref={scroller}
				testID="insight-pager-scroll"
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={onEnd}
			>
				{insights.map((insight, page) => (
					<View
						key={insight.title}
						style={width > 0 ? { width } : styles.firstPage}
					>
						<InsightCard
							{...insight}
							position={{
								label: positionLabel(page, count),
								onStep: (direction) => goTo(page + direction),
							}}
						/>
					</View>
				))}
			</ScrollView>
			<View
				testID="insight-pager-dots"
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={styles.dots}
			>
				{insights.map((insight, page) => (
					<View
						key={insight.title}
						testID={page === index ? "insight-dot-active" : "insight-dot"}
						style={[
							styles.dot,
							{
								backgroundColor: page === index ? colors.ink : colors.outline,
							},
						]}
					/>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	pager: {
		gap: space[200],
	},
	firstPage: {
		width: "100%",
	},
	dots: {
		flexDirection: "row",
		justifyContent: "center",
		gap: space[150],
	},
	dot: {
		width: DOT,
		height: DOT,
		borderRadius: radius.pill,
	},
});
