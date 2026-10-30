import { render, screen } from "@testing-library/react-native";
import { MiniMonth } from "./mini-month";

describe("MiniMonth", () => {
	it("draws a month's days at 16 pt, leaving the padding blank", async () => {
		await render(
			<MiniMonth
				weeks={[
					[
						null,
						{ key: "1", state: { kind: "level", level: 3 } },
						{ key: "2", state: { kind: "level", level: 0 } },
						null,
						null,
						null,
						null,
					],
				]}
			/>,
		);
		expect(screen.getAllByTestId("completion-cell-level")).toHaveLength(2);
		expect(screen.getAllByTestId("completion-cell-level")[0]).toHaveStyle({
			width: 16,
			height: 16,
		});
	});
});
