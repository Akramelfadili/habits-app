import { render, screen } from "@testing-library/react-native";
import { CompletionLegend } from "./completion-legend";

describe("CompletionLegend", () => {
	it("names every state it swatches, so colour is never the only signal", async () => {
		await render(
			<CompletionLegend
				entries={[
					{ state: { kind: "level", level: 3 }, label: "Done" },
					{ state: { kind: "level", level: 1 }, label: "Partial" },
					{ state: { kind: "frozen" }, label: "Frozen" },
					{ state: { kind: "nothing-logged" }, label: "Not logged yet" },
				]}
			/>,
		);
		for (const label of ["Done", "Partial", "Frozen", "Not logged yet"]) {
			expect(screen.getByText(label)).toBeTruthy();
		}
		expect(screen.getAllByTestId("completion-cell-notch")).toHaveLength(1);
	});

	it("draws Less to More as four steps, two of them notched, and a live frozen label", async () => {
		await render(
			<CompletionLegend
				entries={[]}
				scale={{ less: "Less", more: "More", frozenLabel: "2 freezes left" }}
			/>,
		);
		expect(screen.getAllByTestId("completion-cell-level")).toHaveLength(4);
		expect(screen.getAllByTestId("completion-cell-notch")).toHaveLength(2);
		expect(screen.getByTestId("completion-cell-frozen")).toBeTruthy();
		expect(screen.getByText("2 freezes left")).toBeTruthy();
		expect(screen.getByText("Less")).toBeTruthy();
		expect(screen.getByText("More")).toBeTruthy();
	});
});
