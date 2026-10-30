import { act, renderHook } from "@testing-library/react-native";
import { motion } from "@/theme/theme";
import { useFillAnimation } from "./use-fill-animation";

let mockReduced = false;
jest.mock("./use-reduced-motion", () => ({
	useReducedMotion: () => mockReduced,
}));

const read = (value: { __getValue: () => number }) => value.__getValue();

describe("useFillAnimation", () => {
	beforeEach(() => {
		mockReduced = false;
		jest.useFakeTimers();
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	it("starts at the value it is given", async () => {
		const { result } = await renderHook(() => useFillAnimation(0.4));
		expect(read(result.current as never)).toBeCloseTo(0.4);
	});

	it("eases to a new value over the fill token's duration", async () => {
		const { result, rerender } = await renderHook(
			({ value }: { value: number }) => useFillAnimation(value),
			{ initialProps: { value: 0 } },
		);
		await rerender({ value: 1 });
		await act(async () => {
			jest.advanceTimersByTime(motion.fill.duration / 4);
		});
		const partway = read(result.current as never);
		expect(partway).toBeGreaterThan(0);
		expect(partway).toBeLessThan(1);
		await act(async () => {
			jest.advanceTimersByTime(motion.fill.duration);
		});
		expect(read(result.current as never)).toBeCloseTo(1);
	});

	it("jumps straight to the value with Reduce Motion", async () => {
		mockReduced = true;
		const { result, rerender } = await renderHook(
			({ value }: { value: number }) => useFillAnimation(value),
			{ initialProps: { value: 0 } },
		);
		await rerender({ value: 0.75 });
		expect(read(result.current as never)).toBeCloseTo(0.75);
	});
});
