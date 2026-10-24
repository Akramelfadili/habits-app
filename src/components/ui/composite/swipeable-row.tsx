import { type PropsWithChildren, useRef } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { ReduceMotion } from "react-native-reanimated";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";

type SwipeableRowProps = PropsWithChildren<{
	/** The action revealed by swiping left, e.g. "Archive". */
	actionLabel: string;
	onAction: () => void;
}>;

/** The reveal/close spring, snapped instantly when Reduce Motion is on. */
export function swipeAnimationOptions(
	reducedMotion: boolean,
): Record<string, unknown> | undefined {
	return reducedMotion ? { reduceMotion: ReduceMotion.Always } : undefined;
}

/**
 * A row that reveals one trailing action on a left swipe (Manage & Archive's
 * archive, HAB-13). The gesture isn't discoverable to VoiceOver, so the
 * row inside should also offer the same action through `ListItem`'s
 * `accessibilityActions`.
 */
export function SwipeableRow({
	actionLabel,
	onAction,
	children,
}: SwipeableRowProps) {
	const { colors, opacity } = useTheme();
	const swipeable = useRef<SwipeableMethods>(null);
	const reducedMotion = useReducedMotion();

	function handleAction() {
		swipeable.current?.close();
		onAction();
	}

	return (
		<ReanimatedSwipeable
			ref={swipeable}
			friction={2}
			animationOptions={swipeAnimationOptions(reducedMotion)}
			rightThreshold={40}
			overshootRight={false}
			renderRightActions={() => (
				<Pressable
					accessibilityRole="button"
					onPress={handleAction}
					style={({ pressed }) => [
						styles.action,
						{ backgroundColor: colors.ink },
						pressed && { opacity: opacity.pressed },
					]}
				>
					<Text style={[styles.actionLabel, { color: colors.onAccent }]}>
						{actionLabel}
					</Text>
				</Pressable>
			)}
		>
			{children}
		</ReanimatedSwipeable>
	);
}

const styles = StyleSheet.create({
	action: {
		justifyContent: "center",
		paddingHorizontal: 20,
		borderRadius: 14,
		marginLeft: 8,
	},
	actionLabel: {
		fontSize: typeScale.rowLabel,
		fontWeight: "500",
	},
});
