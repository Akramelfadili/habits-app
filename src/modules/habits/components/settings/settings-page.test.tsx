import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { SettingsPage } from "./settings-page";

describe("SettingsPage", () => {
	it("draws the large title as a heading, then its groups", async () => {
		await render(
			<SettingsPage title="Freezes">
				<Text>a group</Text>
			</SettingsPage>,
		);
		expect(screen.getByRole("header", { name: "Freezes" })).toBeTruthy();
		expect(screen.getByText("a group")).toBeTruthy();
	});
});
