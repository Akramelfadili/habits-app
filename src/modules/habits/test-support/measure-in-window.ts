import { type HostInstance, View } from "react-native";

type Frame = { x: number; y: number; width: number; height: number };

// Jest's host `View.measureInWindow` never calls back, so anything awaiting a measurement
// (the Today menu button) would hang; this answers synchronously.
export function mockMeasureInWindow(
	frame: Frame = { x: 300, y: 60, width: 44, height: 44 },
) {
	return jest
		.spyOn(View.prototype as HostInstance, "measureInWindow")
		.mockImplementation((callback) =>
			callback(frame.x, frame.y, frame.width, frame.height),
		);
}
