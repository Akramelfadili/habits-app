import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { NavMenu, NavMenuDivider } from "./nav-menu";

describe("NavMenu", () => {
	it("shows its label and rows, announced as a modal", async () => {
		await render(
			<NavMenu anchorBottom={100} label="Summaries" onClose={jest.fn()}>
				<Text>Row</Text>
				<NavMenuDivider />
			</NavMenu>,
		);
		expect(screen.getByText("SUMMARIES")).toBeTruthy();
		expect(screen.getByText("Row")).toBeTruthy();
		expect(
			screen.getByLabelText("Close menu").parent?.props
				.accessibilityViewIsModal,
		).toBe(true);
	});

	it("closes from the scrim", async () => {
		const onClose = jest.fn();
		await render(
			<NavMenu anchorBottom={100} label="Summaries" onClose={onClose}>
				<Text>Row</Text>
			</NavMenu>,
		);
		await fireEvent.press(screen.getByLabelText("Close menu"));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
