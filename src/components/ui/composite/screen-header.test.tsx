import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";

let mockLargeText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockLargeText,
}));

import { ROUTE_FOCUS_DELAY_MS, ScreenHeader } from "./screen-header";

// Every render schedules the route-entry focus timer. Faked before the first
// render, it can never fire into a later test or depend on how loaded the
// machine is.
beforeEach(() => {
	jest.useFakeTimers();
	mockLargeText = false;
});
afterEach(() => jest.useRealTimers());

describe("ScreenHeader", () => {
	it("reads eyebrow and title as one heading", async () => {
		await render(
			<ScreenHeader eyebrow="Upper body · Tue, Thu" title="Reminders" />,
		);
		expect(
			screen.getByRole("header", { name: "Reminders, Upper body · Tue, Thu" }),
		).toBeTruthy();
		expect(screen.getByText("UPPER BODY · TUE, THU")).toBeTruthy();
	});

	it("takes a custom spoken label and works without an eyebrow", async () => {
		await render(
			<ScreenHeader title="Settings" accessibilityLabel="Settings, 3 groups" />,
		);
		expect(
			screen.getByRole("header", { name: "Settings, 3 groups" }),
		).toBeTruthy();
	});

	it("puts the buttons after the title, and above it at accessibility sizes", async () => {
		const { rerender } = await render(
			<ScreenHeader title="Reminders">
				<Text>BUTTON</Text>
			</ScreenHeader>,
		);
		const order = () => {
			const rendered = JSON.stringify(screen.toJSON());
			return rendered.indexOf("BUTTON") > rendered.indexOf("Reminders");
		};
		expect(order()).toBe(true);
		mockLargeText = true;
		await rerender(
			<ScreenHeader title="Reminders">
				<Text>BUTTON</Text>
			</ScreenHeader>,
		);
		expect(order()).toBe(false);
	});
});

describe("ScreenHeader focus on route entry", () => {
	afterEach(() => jest.restoreAllMocks());

	it("puts the screen reader on the title once the push has settled", async () => {
		const send = jest
			.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
			.mockImplementation();
		await render(<ScreenHeader title="Reminders" />);
		expect(send).not.toHaveBeenCalled();
		await act(async () => jest.advanceTimersByTime(ROUTE_FOCUS_DELAY_MS));
		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0][1]).toBe("focus");
	});
});
