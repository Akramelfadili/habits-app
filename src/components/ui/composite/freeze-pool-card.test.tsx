import { render, screen } from "@testing-library/react-native";
import { FreezePoolCard } from "./freeze-pool-card";

describe("FreezePoolCard", () => {
	it("draws one frozen swatch per freeze used and leaves the rest open", async () => {
		await render(
			<FreezePoolCard
				poolSize={2}
				used={1}
				title="One freeze used"
				body="7 August · pool refilled 1 September"
			/>,
		);
		expect(screen.getAllByTestId("heatmap-cell-frozen")).toHaveLength(1);
		expect(screen.getAllByTestId("heatmap-cell-outside")).toHaveLength(1);
		expect(screen.getByText("One freeze used")).toBeTruthy();
	});

	it("is informational — nothing on it is tappable", async () => {
		await render(
			<FreezePoolCard
				poolSize={2}
				used={2}
				title="Both freezes used"
				body="7 and 22 August · pool refilled 1 September"
			/>,
		);
		expect(screen.queryAllByRole("button")).toHaveLength(0);
		expect(
			screen.getByLabelText(
				"Both freezes used. 7 and 22 August · pool refilled 1 September",
			),
		).toBeTruthy();
	});
});
