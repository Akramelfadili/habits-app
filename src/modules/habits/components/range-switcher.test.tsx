import { fireEvent, render, screen } from "@testing-library/react-native";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ replace: mockReplace }),
}));

import { RangeSwitcher } from "./range-switcher";

beforeEach(() => mockReplace.mockClear());

describe("RangeSwitcher (HAB-16, HAB-17)", () => {
	it("marks the screen being shown", async () => {
		await render(<RangeSwitcher value="month" />);
		expect(
			screen.getByText("Month").parent?.parent?.props.accessibilityState
				.selected,
		).toBe(true);
		expect(
			screen.getByText("Week").parent?.parent?.props.accessibilityState
				.selected,
		).toBe(false);
	});

	it("replaces the screen with its sibling so Back stays Today", async () => {
		await render(<RangeSwitcher value="week" />);
		await fireEvent.press(screen.getByText("Month"));
		expect(mockReplace).toHaveBeenCalledWith("/habits/month");
	});

	it("goes back to Week from Month", async () => {
		await render(<RangeSwitcher value="month" />);
		await fireEvent.press(screen.getByText("Week"));
		expect(mockReplace).toHaveBeenCalledWith("/habits/week");
	});

	it("does nothing when the current range is tapped", async () => {
		await render(<RangeSwitcher value="week" />);
		await fireEvent.press(screen.getByText("Week"));
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("replaces the screen with Yearly from Week, Month and Year alike", async () => {
		for (const value of ["week", "month"] as const) {
			mockReplace.mockClear();
			const { unmount } = await render(<RangeSwitcher value={value} />);
			await fireEvent.press(screen.getByText("Year"));
			expect(mockReplace).toHaveBeenCalledWith("/habits/year");
			await unmount();
		}
	});

	it("enables Year and marks it when Yearly is shown", async () => {
		await render(<RangeSwitcher value="year" />);
		const year =
			screen.getByText("Year").parent?.parent?.props.accessibilityState;
		expect(year.selected).toBe(true);
		expect(year.disabled).toBeFalsy();
		await fireEvent.press(screen.getByText("Month"));
		expect(mockReplace).toHaveBeenCalledWith("/habits/month");
		await fireEvent.press(screen.getByText("Week"));
		expect(mockReplace).toHaveBeenCalledWith("/habits/week");
	});

	it("never pushes — switching replaces, so Back keeps reading Today", async () => {
		await render(<RangeSwitcher value="year" />);
		await fireEvent.press(screen.getByText("Month"));
		expect(mockReplace).toHaveBeenCalledTimes(1);
	});
});
