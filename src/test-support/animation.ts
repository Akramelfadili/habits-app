import { Animated } from "react-native";

/**
 * Make every `Animated.timing` land on its end value at once, so no frame is
 * left to fire outside act. For tests that keep real timers but do not test
 * the motion itself (motion has its own tests). Undone by
 * `jest.restoreAllMocks()`.
 */
export function jumpAnimationsToTheirEnd(): void {
	jest.spyOn(Animated, "timing").mockImplementation((value, config) => ({
		start: (done) => {
			(value as Animated.Value).setValue(config.toValue as number);
			done?.({ finished: true });
		},
		stop: () => {},
		reset: () => {},
	}));
}
