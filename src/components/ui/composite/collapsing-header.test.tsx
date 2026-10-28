import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Animated, { scrollTo } from "react-native-reanimated";
import { CollapsedHeaderBar, useCollapsingHeader } from "./collapsing-header";

jest.mock("react-native-reanimated", () => ({
	...jest.requireActual("react-native-reanimated"),
	__esModule: true,
	scrollTo: jest.fn(),
}));

let mockReduced = false;
jest.mock("@/utils/use-reduced-motion", () => ({
	useReducedMotion: () => mockReduced,
}));

let renders = 0;
let setRange: (range: number) => void = () => {};

function Harness() {
	const header = useCollapsingHeader();
	renders += 1;
	setRange = header.setRange;
	return (
		<>
			<Animated.ScrollView
				ref={header.scrollRef}
				testID="scroller"
				onScroll={header.onScroll}
				scrollEventThrottle={16}
			>
				<Animated.View testID="title" style={header.titleStyle} />
			</Animated.ScrollView>
			<CollapsedHeaderBar
				title="Today"
				collapsed={header.collapsed}
				backgroundStyle={header.barBackgroundStyle}
				contentStyle={header.barContentStyle}
			/>
		</>
	);
}

async function scrollTo_(y: number) {
	await fireEvent.scroll(screen.getByTestId("scroller"), {
		nativeEvent: { contentOffset: { y } },
	});
	await act(async () => {
		jest.advanceTimersByTime(300);
	});
}

const opacityOf = (id: string) =>
	screen.getByTestId(id).props.jestAnimatedStyle?.value?.opacity;

describe("useCollapsingHeader (V3-02, T5)", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockReduced = false;
		renders = 0;
		(scrollTo as jest.Mock).mockClear();
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	const range = 32;

	it("starts as the large title with no bar", async () => {
		await render(<Harness />);
		expect(opacityOf("title")).toBe(1);
		expect(screen.queryByRole("header", { name: "Today" })).toBeNull();
	});

	it("shrinks and fades the title as a function of the offset, not in one jump", async () => {
		await render(<Harness />);
		await scrollTo_(range * 0.3);
		const quarter = opacityOf("title");
		await scrollTo_(range * 0.45);
		const half = opacityOf("title");
		await scrollTo_(range);

		expect(quarter).toBeGreaterThan(half);
		expect(half).toBeGreaterThan(0);
		expect(opacityOf("title")).toBe(0);
	});

	it("brings the bar's background and hairline in only at the end of the range", async () => {
		await render(<Harness />);
		await scrollTo_(range * 0.5);
		expect(opacityOf("collapsed-header-bar-background")).toBe(0);
		await scrollTo_(range * 0.85);
		const arriving = opacityOf("collapsed-header-bar-background");
		expect(arriving).toBeGreaterThan(0);
		expect(arriving).toBeLessThan(1);
		await scrollTo_(range);
		expect(opacityOf("collapsed-header-bar-background")).toBe(1);
	});

	it("re-renders only when the bar takes over, not once per scroll frame", async () => {
		await render(<Harness />);
		const before = renders;
		for (let y = 1; y <= 14; y += 1) await scrollTo_(y);
		expect(renders).toBe(before);

		await scrollTo_(range);
		expect(renders).toBe(before + 1);
		expect(screen.queryByRole("header", { name: "Today" })).not.toBeNull();
	});

	it("uses the measured range: the bar waits until the content below the header reaches it", async () => {
		await render(<Harness />);
		await act(async () => setRange(100));
		await scrollTo_(40);
		expect(screen.queryByRole("header", { name: "Today" })).toBeNull();
		await scrollTo_(100);
		expect(screen.queryByRole("header", { name: "Today" })).not.toBeNull();
	});

	it("settles on the nearer end when scrolling stops inside the range", async () => {
		await render(<Harness />);
		await scrollTo_(10);
		await fireEvent(screen.getByTestId("scroller"), "scrollEndDrag", {
			nativeEvent: { contentOffset: { y: 10 }, velocity: { y: 0 } },
		});
		expect((scrollTo as jest.Mock).mock.calls.at(-1)?.slice(1)).toEqual([
			0,
			0,
			true,
		]);

		await scrollTo_(25);
		await fireEvent(screen.getByTestId("scroller"), "momentumScrollEnd", {
			nativeEvent: { contentOffset: { y: 25 } },
		});
		expect((scrollTo as jest.Mock).mock.calls.at(-1)?.slice(1)).toEqual([
			0,
			range,
			true,
		]);
	});

	it("leaves a flick to its momentum and a stop at either end alone", async () => {
		await render(<Harness />);
		await scrollTo_(10);
		await fireEvent(screen.getByTestId("scroller"), "scrollEndDrag", {
			nativeEvent: { contentOffset: { y: 10 }, velocity: { y: 2 } },
		});
		await scrollTo_(0);
		await fireEvent(screen.getByTestId("scroller"), "momentumScrollEnd", {
			nativeEvent: { contentOffset: { y: 0 } },
		});
		await scrollTo_(range + 20);
		await fireEvent(screen.getByTestId("scroller"), "momentumScrollEnd", {
			nativeEvent: { contentOffset: { y: range + 20 } },
		});
		expect(scrollTo).not.toHaveBeenCalled();
	});

	describe("Reduce Motion", () => {
		it("does not interpolate: nothing changes before the middle of the range, then a crossfade", async () => {
			mockReduced = true;
			await render(<Harness />);
			await scrollTo_(range * 0.4);
			expect(opacityOf("title")).toBe(1);

			await scrollTo_(range * 0.6);
			expect(opacityOf("title")).toBe(0);
		});

		it("never scrolls the list by itself", async () => {
			mockReduced = true;
			await render(<Harness />);
			await scrollTo_(10);
			await fireEvent(screen.getByTestId("scroller"), "scrollEndDrag", {
				nativeEvent: { contentOffset: { y: 10 }, velocity: { y: 0 } },
			});
			expect(scrollTo).not.toHaveBeenCalled();
		});
	});
});
