import { render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { UnlockCard } from "./unlock-card";

describe("UnlockCard", () => {
	it("says when it unlocks, why, and how far along it is", async () => {
		await render(
			<UnlockCard
				title="Monthly view unlocks on 4 October"
				body="You've tracked for 12 days."
				progress={0.4}
				progressLabel="12 of 30 days"
				remainingLabel="18 to go"
			/>,
		);
		expect(screen.getByText("Monthly view unlocks on 4 October")).toBeTruthy();
		expect(screen.getByText("You've tracked for 12 days.")).toBeTruthy();
		expect(screen.getByText("12 of 30 days")).toBeTruthy();
		expect(screen.getByText("18 to go")).toBeTruthy();
		expect(screen.getByTestId("progress-bar")).toHaveProp(
			"accessibilityValue",
			expect.objectContaining({ now: 40 }),
		);
	});
});
