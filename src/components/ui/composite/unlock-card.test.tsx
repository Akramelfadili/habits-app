import { render, screen } from "@testing-library/react-native";
import { UnlockCard } from "./unlock-card";

describe("UnlockCard", () => {
	it("says when it unlocks, why, and how far along it is", async () => {
		await render(
			<UnlockCard
				title="Insights unlock in 4 days"
				body="They need 7 days of logs. Your first 3 days are below."
				progress={3 / 7}
				progressLabel="3 of 7 days"
			/>,
		);
		expect(
			screen.getByRole("header", { name: "Insights unlock in 4 days" }),
		).toBeTruthy();
		expect(
			screen.getByText(
				"They need 7 days of logs. Your first 3 days are below.",
			),
		).toBeTruthy();
		expect(screen.getByText("3 of 7 days")).toBeTruthy();
		expect(screen.getByTestId("progress-bar")).toHaveProp(
			"accessibilityValue",
			expect.objectContaining({ now: 43 }),
		);
	});

	it("can carry a remaining label beside the progress one", async () => {
		await render(
			<UnlockCard
				title="t"
				body="b"
				progress={0.4}
				progressLabel="12 of 30 days"
				remainingLabel="18 to go"
			/>,
		);
		expect(screen.getByText("18 to go")).toBeTruthy();
	});
});
