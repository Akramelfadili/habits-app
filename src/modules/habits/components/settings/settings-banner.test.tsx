import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { NotificationsOffBanner } from "./settings-banner";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("NotificationsOffBanner", () => {
	it("says the given sentence under 'Notifications are off' and opens iOS Settings", async () => {
		const open = jest.spyOn(Linking, "openSettings").mockResolvedValue();
		await render(<NotificationsOffBanner body="Nothing will arrive." />);
		expect(screen.getByText("Notifications are off")).toBeTruthy();
		expect(screen.getByText("Nothing will arrive.")).toBeTruthy();
		await fireEvent.press(screen.getByText("Open Settings"));
		expect(open).toHaveBeenCalledTimes(1);
		open.mockRestore();
	});
});
