import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { surfaceColors } from "@/theme/theme";

jest.mock("expo-blur", () => {
	const { View } = require("react-native");
	return { BlurView: View };
});

import {
	PILL_BOTTOM_INSET,
	PILL_HEIGHT,
	PILL_SIDE_INSET,
	TabBarPill,
	type TabBarPillItem,
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
	// Let the two accessibility hooks settle before anything is asserted.
	await act(async () => {});
	return result;
}

function styleOf(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe("TabBarPill (V3-01 B)", () => {
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
	});

	afterEach(() => jest.restoreAllMocks());

	it("floats 22 pt above the bottom inset, 16 pt in from each edge, 56 tall", async () => {
		await renderPill();

		expect(styleOf("tab-bar-pill")).toMatchObject({
			position: "absolute",
			height: PILL_HEIGHT,
			left: PILL_SIDE_INSET,
			right: PILL_SIDE_INSET,
			bottom: 34 + PILL_BOTTOM_INSET,
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

	// T-23: faint measured 3.9–4.1:1 over the translucent pill; sub passes.
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
			fireEvent(tab, "pressIn");
			fireEvent(tab, "pressOut");
		});
		await fireEvent.press(tab);

		expect(onProgress).toHaveBeenCalledTimes(1);
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
