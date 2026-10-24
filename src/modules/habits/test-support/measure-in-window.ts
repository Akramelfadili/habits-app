import { type HostInstance, View } from "react-native";

type Frame = { x: number; y: number; width: number; height: number };

/**
 * Jest's host `View` has a `measureInWindow` that never calls back, so anything
 * that waits for a measurement (the Today ⋯ button measures before opening its
 * menu) would hang. This makes it answer synchronously with `frame`; call
 * `.mockRestore()` on the returned spy to undo it.
 */
export function mockMeasureInWindow(
	frame: Frame = { x: 300, y: 60, width: 44, height: 44 },
) {
	return jest
		.spyOn(View.prototype as HostInstance, "measureInWindow")
		.mockImplementation((callback) =>
			callback(frame.x, frame.y, frame.width, frame.height),
		);
}
