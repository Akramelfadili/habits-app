import { fireEvent, render, screen } from "@testing-library/react-native";
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
});
