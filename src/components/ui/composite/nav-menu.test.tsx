import { fireEvent, render, screen } from "@testing-library/react-native";
import { Profiler } from "react";
import { StyleSheet, Text, View } from "react-native";
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

	describe("placement", () => {
		const popoverTop = () =>
			StyleSheet.flatten(
				screen.getByText("SUMMARIES").parent?.parent?.props.style,
			).top;

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it("renders once, already at its final position, when the overlay is not offset", async () => {
			jest
				.spyOn(View.prototype, "measureInWindow")
				.mockImplementation((callback) => callback(0, 0, 390, 844));
			let commits = 0;
			await render(
				<Profiler id="menu" onRender={() => commits++}>
					<NavMenu anchorBottom={100} label="Summaries" onClose={jest.fn()}>
						<Text>Row</Text>
					</NavMenu>
				</Profiler>,
			);
			expect(popoverTop()).toBe(108);

			await fireEvent(
				screen.getByLabelText("Close menu").parent as never,
				"layout",
				{
					nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } },
				},
			);

			expect(commits).toBe(1);
			expect(popoverTop()).toBe(108);
		});

		it("corrects once, on layout, when the overlay starts below the window top", async () => {
			jest
				.spyOn(View.prototype, "measureInWindow")
				.mockImplementation((callback) => callback(0, 20, 390, 800));
			await render(
				<NavMenu anchorBottom={100} label="Summaries" onClose={jest.fn()}>
					<Text>Row</Text>
				</NavMenu>,
			);
			expect(popoverTop()).toBe(108);

			await fireEvent(
				screen.getByLabelText("Close menu").parent as never,
				"layout",
				{
					nativeEvent: { layout: { x: 0, y: 20, width: 390, height: 800 } },
				},
			);

			expect(popoverTop()).toBe(88);
		});
	});
});
