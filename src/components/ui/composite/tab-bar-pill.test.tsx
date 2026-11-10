import { act, fireEvent, render, screen } from "@testing-library/react-native";
import {
	AccessibilityInfo,
	StyleSheet,
	useWindowDimensions,
} from "react-native";
import { surfaceColors } from "@/theme/theme";

jest.mock("react-native/Libraries/Utilities/useWindowDimensions");

jest.mock("expo-blur", () => {
	const { View } = require("react-native");
	return { BlurView: View };
});

import {
	BAR_A_HEIGHT,
	PILL_BOTTOM_INSET,
	PILL_HEIGHT,
	PILL_SIDE_INSET,
	TAB_BAR_BOTTOM_PADDING,
	TabBarPill,
	type TabBarPillItem,
	tabBarToastOffset,
} from "./tab-bar-pill";

const onToday = jest.fn();
const onProgress = jest.fn();
const onHabits = jest.fn();

function items(focused: "today" | "progress" | "habits"): TabBarPillItem[] {
	return [
		{
			key: "t",
			label: "Today",
			icon: "today",
			focused: focused === "today",
			onPress: onToday,
		},
		{
			key: "p",
			label: "Progress",
			icon: "progress",
			focused: focused === "progress",
			onPress: onProgress,
		},
		{
			key: "h",
			label: "Habits",
			icon: "habits",
			focused: focused === "habits",
			onPress: onHabits,
		},
	];
}

async function renderPill(
	props: Partial<React.ComponentProps<typeof TabBarPill>> = {},
) {
	const result = await render(
		<TabBarPill items={items("today")} bottomInset={34} {...props} />,
	);
	await act(async () => {});
	return result;
}

function setFontScale(fontScale: number) {
	jest
		.mocked(useWindowDimensions)
		.mockReturnValue({ width: 393, height: 852, scale: 3, fontScale });
}

function styleOf(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe("TabBarPill", () => {
	beforeEach(() => {
		onToday.mockClear();
		onProgress.mockClear();
		onHabits.mockClear();
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockResolvedValue(false);
		jest
			.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
			.mockResolvedValue(false);
		setFontScale(1);
	});

	afterEach(() => jest.restoreAllMocks());

	it("floats 22 pt above the bottom inset, 16 pt in from each edge, 56 tall", async () => {
		await renderPill();

		expect(styleOf("tab-bar-pill")).toMatchObject({
			position: "absolute",
			height: PILL_HEIGHT,
			left: PILL_SIDE_INSET,
			right: PILL_SIDE_INSET,
			// A flat 22 from the screen edge: the pill floats over the home indicator rather than above the
			// safe-area inset.
			bottom: PILL_BOTTOM_INSET,
		});
		expect(PILL_SIDE_INSET).toBe(16);
		expect(PILL_BOTTOM_INSET).toBe(22);
	});

	it("gives every tab a 48 pt row and a hit area reaching the pill's edge", async () => {
		await renderPill();

		for (const icon of ["today", "progress", "habits"]) {
			const tab = screen.getByTestId(`tab-${icon}`);
			expect(
				StyleSheet.flatten(tab.props.style).minHeight,
			).toBeGreaterThanOrEqual(48);
			// The pill's own 4 pt padding, given back as hit area.
			expect(tab.props.hitSlop).toBe(4);
		}
	});

	it("marks only the focused tab selected, in ink at weight 600", async () => {
		await renderPill({ items: items("progress") });

		const progress = screen.getByTestId("tab-progress");
		expect(progress.props.accessibilityState).toMatchObject({ selected: true });
		expect(
			screen.getByTestId("tab-today").props.accessibilityState,
		).toMatchObject({
			selected: false,
		});

		const label = screen.getByText("Progress");
		expect(StyleSheet.flatten(label.props.style)).toMatchObject({
			color: surfaceColors.light.ink,
			fontWeight: "600",
		});
	});

	// Faint measured 3.9–4.1:1 over the translucent pill; sub passes.
	it("reads inactive labels in sub ink at weight 500", async () => {
		await renderPill();

		expect(
			StyleSheet.flatten(screen.getByText("Habits").props.style),
		).toMatchObject({ color: surfaceColors.light.sub, fontWeight: "500" });
	});

	it("never scales its labels with Dynamic Type", async () => {
		await renderPill();

		for (const label of ["Today", "Progress", "Habits"]) {
			expect(screen.getByText(label).props.allowFontScaling).toBe(false);
		}
	});

	it("presses a tab once, and does not re-announce the one already selected", async () => {
		await renderPill();

		await fireEvent.press(screen.getByTestId("tab-habits"));
		expect(onHabits).toHaveBeenCalledTimes(1);

		await fireEvent.press(screen.getByTestId("tab-today"));
		// The press still fires; it's the layout that decides not to navigate.
		expect(onToday).toHaveBeenCalledTimes(1);
	});

	it("survives a press-in / press-out cycle without firing twice", async () => {
		await renderPill();
		const tab = screen.getByTestId("tab-progress");

		await act(async () => {
			await fireEvent(tab, "pressIn");
			await fireEvent(tab, "pressOut");
		});
		await fireEvent.press(tab);

		expect(onProgress).toHaveBeenCalledTimes(1);
	});

	// 56 pill + 22 float + 22 clearance + 12 safe zone. It only decomposes because the float is
	// measured from the screen edge, so the clearance under the pill is a real 34 on every device.
	it("asks every scrolling screen for 112 pt of bottom padding", () => {
		expect(TAB_BAR_BOTTOM_PADDING).toBe(112);
		expect(TAB_BAR_BOTTOM_PADDING - (PILL_BOTTOM_INSET + PILL_HEIGHT)).toBe(34);
	});

	it("puts a toast 12 pt above the pill and 16 pt above bar A", () => {
		// The pill's toast has an absolute bottom of 90, inset or not.
		expect(tabBarToastOffset(0, false)).toBe(90);
		expect(tabBarToastOffset(34, false)).toBe(90);
		expect(tabBarToastOffset(34, true)).toBe(34 + BAR_A_HEIGHT + 16);
	});

	describe("inert (H8 sheets, SY3 migration)", () => {
		it("takes no taps and says so", async () => {
			await renderPill({ disabled: true });

			const tab = screen.getByTestId("tab-today");
			expect(tab.props.accessibilityState).toMatchObject({ disabled: true });
			await fireEvent.press(tab);
			expect(onToday).not.toHaveBeenCalled();
		});

		it("stays visible, in outline ink", async () => {
			await renderPill({ disabled: true });

			expect(screen.getByTestId("tab-bar-pill")).toBeTruthy();
			expect(
				StyleSheet.flatten(screen.getByText("Today").props.style).color,
			).toBe(surfaceColors.light.outline);
		});
	});

	describe("accessibility text sizes fall back to bar A (H10)", () => {
		it("keeps the pill at every standard Dynamic Type size", async () => {
			for (const fontScale of [0.82, 1, 1.23, 1.35]) {
				setFontScale(fontScale);
				const view = await render(
					<TabBarPill items={items("today")} bottomInset={34} />,
				);
				await act(async () => {});
				expect(screen.queryByTestId("tab-bar-pill")).toBeTruthy();
				expect(screen.queryByTestId("tab-bar-a")).toBeNull();
				await view.unmount();
			}
		});

		it("swaps the pill for the full-width bar from AX1 up", async () => {
			for (const fontScale of [1.65, 2.35, 3.12]) {
				setFontScale(fontScale);
				const view = await render(
					<TabBarPill items={items("today")} bottomInset={34} />,
				);
				await act(async () => {});
				expect(screen.queryByTestId("tab-bar-pill")).toBeNull();
				expect(screen.queryByTestId("tab-bar-a")).toBeTruthy();
				await view.unmount();
			}
		});

		it("is a card with a top hairline, 56 pt over the bottom inset", async () => {
			setFontScale(2.35);
			await renderPill();

			expect(styleOf("tab-bar-a")).toMatchObject({
				position: "absolute",
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: surfaceColors.light.card,
				borderTopColor: surfaceColors.light.border,
				paddingTop: 4,
				paddingBottom: 4 + 34,
			});
			expect(
				StyleSheet.flatten(screen.getByTestId("tab-today").props.style)
					.minHeight,
			).toBe(48);
			expect(4 + 48 + 4).toBe(BAR_A_HEIGHT);
		});

		// Bar A is an opaque card: faint passes there, so its inactive ink stays.
		it("reads inactive labels in faint, and keeps the labels unscaled", async () => {
			setFontScale(2.35);
			await renderPill();

			expect(
				StyleSheet.flatten(screen.getByText("Habits").props.style).color,
			).toBe(surfaceColors.light.faint);
			expect(screen.getByText("Habits").props.allowFontScaling).toBe(false);
		});

		it("still marks and presses the right tab", async () => {
			setFontScale(2.35);
			await renderPill({ items: items("habits") });

			expect(
				screen.getByTestId("tab-habits").props.accessibilityState,
			).toMatchObject({ selected: true });
			await fireEvent.press(screen.getByTestId("tab-progress"));
			expect(onProgress).toHaveBeenCalledTimes(1);
		});

		it("is inert under a sheet too", async () => {
			setFontScale(2.35);
			await renderPill({ disabled: true });

			await fireEvent.press(screen.getByTestId("tab-progress"));
			expect(onProgress).not.toHaveBeenCalled();
		});
	});

	describe("Reduce Transparency (08.5)", () => {
		it("blurs a translucent card by default", async () => {
			await renderPill();

			expect(screen.getByTestId("tab-bar-pill-blur")).toBeTruthy();
			expect(screen.queryByTestId("tab-bar-pill-solid")).toBeNull();
		});

		it("falls back to a solid card with no blur", async () => {
			jest
				.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
				.mockResolvedValue(true);

			await renderPill();

			expect(screen.queryByTestId("tab-bar-pill-blur")).toBeNull();
			expect(styleOf("tab-bar-pill-solid")).toMatchObject({
				backgroundColor: surfaceColors.light.card,
			});
		});
	});
});
