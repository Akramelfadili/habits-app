import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { motion, space, squareRadius, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";

type TodayAllDoneCardProps = {
	title: string;
	body: string;
};

const SQUARE = 40;
// The check is two bars because SF Symbols render nothing on web.
const CHECK_WIDTH = 14;
const CHECK_HEIGHT = 8;
const CHECK_STROKE = 2;

export function TodayAllDoneCard({ title, body }: TodayAllDoneCardProps) {
	const { colors } = useTheme();
	const reduceMotion = useReducedMotion();
	const reveal = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

	useEffect(() => {
		if (reduceMotion) {
			reveal.setValue(1);
			return;
		}
		const run = Animated.timing(reveal, {
			toValue: 1,
			duration: motion.celebrate.duration,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		});
		run.start();
		return () => run.stop();
	}, [reduceMotion, reveal]);

	return (
		<Container
			variant="outlined"
			padding="snug"
			testID="today-all-done"
			accessible
			accessibilityLabel={`${title}. ${body}`}
		>
			<View style={styles.content}>
				<View style={[styles.square, { backgroundColor: colors.accent }]}>
					<Animated.View
						testID="today-all-done-check"
						style={[
							styles.reveal,
							{
								width: reveal.interpolate({
									inputRange: [0, 1],
									outputRange: [0, CHECK_WIDTH],
								}),
							},
						]}
					>
						<View style={[styles.check, { borderColor: colors.onAccent }]} />
					</Animated.View>
				</View>
				<View style={styles.text}>
					<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
					<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
				</View>
			</View>
		</Container>
	);
}

const styles = StyleSheet.create({
	content: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
	square: {
		width: SQUARE,
		height: SQUARE,
		borderRadius: squareRadius(SQUARE),
		alignItems: "center",
		justifyContent: "center",
	},
	reveal: {
		height: CHECK_HEIGHT * 2,
		overflow: "hidden",
		alignItems: "flex-start",
		justifyContent: "center",
	},
	check: {
		width: CHECK_WIDTH,
		height: CHECK_HEIGHT,
		borderLeftWidth: CHECK_STROKE,
		borderBottomWidth: CHECK_STROKE,
		transform: [{ rotate: "-45deg" }],
		marginTop: -CHECK_HEIGHT / 2,
	},
	text: {
		flex: 1,
		gap: space[50],
	},
	title: {
		...textStyles.body,
		fontWeight: "500",
	},
	body: {
		...textStyles.footnote,
	},
});
