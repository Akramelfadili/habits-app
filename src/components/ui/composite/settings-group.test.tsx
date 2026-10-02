import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { SettingsGroup } from "./settings-group";

describe("SettingsGroup", () => {
	it("titles its card and shows the footnote beneath", async () => {
		await render(
			<SettingsGroup title="Reminders" footnote="Applies to every habit.">
				<Text>row</Text>
			</SettingsGroup>,
		);
		expect(screen.getByText("Reminders")).toBeTruthy();
		expect(screen.getByText("row")).toBeTruthy();
		expect(screen.getByText("Applies to every habit.")).toBeTruthy();
	});

	it("omits the footnote when there isn't one", async () => {
		await render(
			<SettingsGroup title="Appearance">
				<Text>row</Text>
			</SettingsGroup>,
		);
		expect(screen.queryByText("Applies to every habit.")).toBeNull();
	});
});
