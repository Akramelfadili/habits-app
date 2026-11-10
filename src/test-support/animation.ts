import { Animated } from "react-native";

// Lands every `Animated.timing` at once so no frame fires outside act, for tests that keep real timers.
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
