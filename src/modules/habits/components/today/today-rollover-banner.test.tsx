import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { TodayRolloverBanner } from "./today-rollover-banner";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

const notice = (completed: number, total: number) => ({
	day: new Date(2026, 9, 23),
	summary: { completed, total },
});
const saturday = new Date(2026, 9, 24);

beforeEach(() => {
	jest
		.spyOn(AccessibilityInfo, "announceForAccessibility")
		.mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("TodayRolloverBanner (SY5)", () => {
	it("says the new day, sums up the closed one and points at the week strip", async () => {
		await render(
			<TodayRolloverBanner
				notice={notice(4, 5)}
				today={saturday}
				onDismiss={jest.fn()}
			/>,
		);
		expect(screen.getByText("It’s Saturday now")).toBeTruthy();
		expect(
			screen.getByText(
				"Friday closed at midnight with 4 of 5 done. You can still log Friday from the week strip.",
			),
		).toBeTruthy();
	});

	it("does not claim a tally when nothing was due", async () => {
		await render(
			<TodayRolloverBanner
				notice={notice(0, 0)}
				today={saturday}
				onDismiss={jest.fn()}
			/>,
		);
		expect(
			screen.getByText(/Friday closed at midnight with nothing due/),
		).toBeTruthy();
		expect(screen.queryByText(/of 0/)).toBeNull();
	});

	it("is dismissible", async () => {
		const onDismiss = jest.fn();
		await render(
			<TodayRolloverBanner
				notice={notice(4, 5)}
				today={saturday}
				onDismiss={onDismiss}
			/>,
		);
		await fireEvent.press(screen.getByText("Dismiss"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("is announced when it appears", async () => {
		await render(
			<TodayRolloverBanner
				notice={notice(4, 5)}
				today={saturday}
				onDismiss={jest.fn()}
			/>,
		);
		expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
			expect.stringContaining("It’s Saturday now. Friday closed at midnight"),
		);
	});
});
