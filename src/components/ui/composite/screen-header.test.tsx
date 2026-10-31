import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

let mockLargeText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockLargeText,
}));

import { ScreenHeader } from "./screen-header";

beforeEach(() => {
	mockLargeText = false;
});

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
