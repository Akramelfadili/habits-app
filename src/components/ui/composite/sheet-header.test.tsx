import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { SheetHeader } from "./sheet-header";

describe("SheetHeader", () => {
	it("renders the title as a header", async () => {
		await render(
			<SheetHeader
				title="Tuesday, 8 September"
				actionLabel="Close"
				onAction={() => {}}
			/>,
		);
		expect(
			screen.getByRole("header", { name: "Tuesday, 8 September" }),
		).toBeTruthy();
	});

	it("calls onAction when the trailing action is tapped", async () => {
		const onAction = jest.fn();
		await render(
			<SheetHeader title="Tuesday" actionLabel="Close" onAction={onAction} />,
		);
		await fireEvent.press(screen.getByRole("button", { name: "Close" }));
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it("starts the screen reader on the title once the sheet has settled", async () => {
		jest.useFakeTimers();
		const focus = jest
			.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
			.mockImplementation();
		await render(
			<SheetHeader title="Add time" actionLabel="Cancel" onAction={() => {}} />,
		);
		expect(focus).not.toHaveBeenCalled();
		await act(async () => {
			jest.advanceTimersByTime(500);
		});
		expect(focus).toHaveBeenCalledTimes(1);
		expect(focus.mock.calls[0][1]).toBe("focus");
		focus.mockRestore();
		jest.useRealTimers();
	});
});
