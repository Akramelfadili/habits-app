import { useEffect, useRef, useState } from "react";
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
import { useReducedMotion } from "@/utils/use-reduced-motion";
import { InsightCard, type InsightCardProps } from "./insight-card";

type InsightPagerProps = {
	insights: Omit<InsightCardProps, "position">[];
	positionLabel: (index: number, count: number) => string;
};

const DOT = space[150];

export function InsightPager({ insights, positionLabel }: InsightPagerProps) {
	const { colors } = useTheme();
	const reduceMotion = useReducedMotion();
	const scroller = useRef<ScrollViewInstance>(null);
	const [width, setWidth] = useState(0);
	const [index, setIndex] = useState(0);
	const count = insights.length;
	const signature = insights.map((insight) => insight.title).join("|");
	// biome-ignore lint/correctness/useExhaustiveDependencies: `signature` is the trigger
	useEffect(() => {
		setIndex(0);
		scroller.current?.scrollTo({ x: 0, animated: false });
	}, [signature]);

	const goTo = (next: number) => {
		const clamped = Math.min(count - 1, Math.max(0, next));
		setIndex(clamped);
		scroller.current?.scrollTo({ x: clamped * width, animated: !reduceMotion });
	};

	const onEnd = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
		if (width > 0) setIndex(Math.round(nativeEvent.contentOffset.x / width));
	};

	const first = insights[0];
	if (!first) return null;
	if (count === 1) return <InsightCard {...first} />;

	return (
		<View
			testID="insight-pager"
			style={styles.pager}
			onLayout={({ nativeEvent }: LayoutChangeEvent) =>
				setWidth(nativeEvent.layout.width)
			}
		>
			{width > 0 ? (
				<ScrollView
					ref={scroller}
					testID="insight-pager-scroll"
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					onMomentumScrollEnd={onEnd}
				>
					{insights.map((insight, page) => (
						<View key={`${insight.title}|${insight.body}`} style={{ width }}>
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
			) : (
				// A "100%" page inside a horizontal scroller has no width before the pager is measured (its text
				// ran off the edge), so until then the first card sits in the pager's own column.
				<InsightCard
					{...first}
					position={{
						label: positionLabel(0, count),
						onStep: (direction) => goTo(direction),
					}}
				/>
			)}
			<View
				testID="insight-pager-dots"
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={styles.dots}
			>
				{insights.map((insight, page) => (
					<View
						key={`${insight.title}|${insight.body}`}
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
