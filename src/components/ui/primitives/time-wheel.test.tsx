import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";

const mockDatePicker = jest.fn();
jest.mock("@expo/ui/swift-ui", () => ({
	Host: ({ children }: { children: ReactNode }) => children,
	DatePicker: (props: unknown) => {
		mockDatePicker(props);
		return null;
	},
}));
jest.mock("@expo/ui/swift-ui/modifiers", () => ({
	datePickerStyle: (style: string) => ({ datePickerStyle: style }),
	labelsHidden: () => ({ labelsHidden: true }),
}));

import { TimeWheel } from "./time-wheel";

describe("TimeWheel", () => {
	beforeEach(() => mockDatePicker.mockClear());

	it("shows the given hour and minute as a wheel-style time-only picker", async () => {
		await render(<TimeWheel hour={7} minute={20} onChange={jest.fn()} />);

		const props = mockDatePicker.mock.calls.at(-1)[0];
		expect(props.selection.getHours()).toBe(7);
		expect(props.selection.getMinutes()).toBe(20);
		expect(props.displayedComponents).toEqual(["hourAndMinute"]);
		expect(props.modifiers).toContainEqual({ datePickerStyle: "wheel" });
	});

	it("reports changes as plain hour and minute", async () => {
		const onChange = jest.fn();
		await render(<TimeWheel hour={7} minute={20} onChange={onChange} />);

		mockDatePicker.mock.calls
			.at(-1)[0]
			.onDateChange(new Date(2026, 0, 1, 21, 5));
		expect(onChange).toHaveBeenCalledWith({ hour: 21, minute: 5 });
	});
});
