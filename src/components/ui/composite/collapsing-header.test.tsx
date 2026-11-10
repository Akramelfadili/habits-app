import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import Animated, { scrollTo, useSharedValue } from "react-native-reanimated";
import {
	COLLAPSED_BAR_HEIGHT,
	CollapsedHeaderBar,
	PINNED_PADDING_TOP,
	PinnedBelowBar,
	useCollapsingHeader,
} from "./collapsing-header";

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
		nativeEvent: {
			contentOffset: { y },
			contentSize: { height: 2000 },
			layoutMeasurement: { height: 800 },
		},
	});
	await act(async () => {
		jest.advanceTimersByTime(300);
	});
}

const opacityOf = (id: string) =>
	screen.getByTestId(id).props.jestAnimatedStyle?.value?.opacity;

describe("useCollapsingHeader", () => {
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

	it("draws no bottom hairline of its own when a pinned control sits under it", async () => {
		await render(
			<CollapsedHeaderBar
				title="Progress"
				collapsed
				backgroundStyle={{}}
				contentStyle={{}}
				hairline={false}
			/>,
		);
		const background = StyleSheet.flatten(
			screen.getByTestId("collapsed-header-bar-background").props.style,
		);
		expect(background.borderBottomWidth).toBeUndefined();
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

	it("rests at the top when the content is too short to scroll the whole range", async () => {
		await render(<Harness />);
		await fireEvent.scroll(screen.getByTestId("scroller"), {
			nativeEvent: {
				contentOffset: { y: 25 },
				contentSize: { height: 900 },
				layoutMeasurement: { height: 890 },
			},
		});
		await fireEvent(screen.getByTestId("scroller"), "momentumScrollEnd", {
			nativeEvent: { contentOffset: { y: 25 } },
		});
		expect((scrollTo as jest.Mock).mock.calls.at(-1)?.slice(1)).toEqual([
			0,
			0,
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

describe("PinnedBelowBar (Progress's range switcher, P1 → P8)", () => {
	let heights: number[] = [];

	function PinnedHarness() {
		const header = useCollapsingHeader();
		const top = useSharedValue(200);
		return (
			<>
				<PinnedBelowBar
					scrollY={header.scrollY}
					top={top}
					onHeight={(height) => heights.push(height)}
				>
					<Animated.View testID="switcher" />
				</PinnedBelowBar>
				<Animated.ScrollView
					ref={header.scrollRef}
					testID="scroller"
					onScroll={header.onScroll}
					scrollEventThrottle={16}
				/>
			</>
		);
	}

	const translateY = () =>
		screen.getByTestId("pinned-below-bar").props.jestAnimatedStyle?.value
			?.transform?.[0]?.translateY;

	beforeEach(() => {
		jest.useFakeTimers();
		mockReduced = false;
		heights = [];
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	it("sits in its own slot until it is scrolled, then follows the content up", async () => {
		await render(<PinnedHarness />);
		expect(translateY()).toBe(200 - PINNED_PADDING_TOP);
		await scrollTo_(60);
		expect(translateY()).toBe(140 - PINNED_PADDING_TOP);
	});

	it("stops just under the inline bar and stays there however far the content scrolls", async () => {
		await render(<PinnedHarness />);
		await scrollTo_(156);
		expect(translateY()).toBe(COLLAPSED_BAR_HEIGHT);
		await scrollTo_(900);
		expect(translateY()).toBe(COLLAPSED_BAR_HEIGHT);
	});

	it("fades a hairline in only once it has settled under the bar", async () => {
		await render(<PinnedHarness />);
		expect(opacityOf("pinned-below-bar-hairline")).toBe(0);
		await scrollTo_(156);
		expect(opacityOf("pinned-below-bar-hairline")).toBe(1);
	});

	it("reports its own height so the content can keep a slot for it", async () => {
		await render(<PinnedHarness />);
		await fireEvent(screen.getByTestId("pinned-below-bar"), "layout", {
			nativeEvent: { layout: { height: 56, width: 393, x: 0, y: 0 } },
		});
		expect(heights).toContain(56);
	});
});
