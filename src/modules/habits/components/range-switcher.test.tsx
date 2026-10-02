import { fireEvent, render, screen } from "@testing-library/react-native";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ replace: mockReplace }),
}));

import { RangeSwitcher } from "./range-switcher";

beforeEach(() => mockReplace.mockClear());

describe("RangeSwitcher (HAB-16)", () => {
	it("marks the screen being shown", async () => {
		await render(<RangeSwitcher value="month" />);
		expect(
			screen.getByText("Month").parent?.props.accessibilityState.selected,
		).toBe(true);
		expect(
			screen.getByText("Week").parent?.props.accessibilityState.selected,
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

	it("shows Year disabled until HAB-17 builds it", async () => {
		await render(<RangeSwitcher value="week" />);
		await fireEvent.press(screen.getByText("Year"));
		expect(mockReplace).not.toHaveBeenCalled();
		expect(
			screen.getByText("Year").parent?.props.accessibilityState.disabled,
		).toBe(true);
	});
});
