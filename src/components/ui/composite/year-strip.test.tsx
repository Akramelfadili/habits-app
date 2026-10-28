import { render, screen } from "@testing-library/react-native";
import { intensityColor } from "@/theme/theme";
import { YearStrip } from "./year-strip";

describe("YearStrip", () => {
	it("draws twelve 12 × 24 months, a dashed slot where nothing was counted", async () => {
		const months = Array.from({ length: 12 }, (_, index) => ({
			key: `m${index}`,
			level: index < 9 ? (3 as const) : null,
		}));
		await render(
			<YearStrip months={months} accessibilityLabel="Meditate, 2026" />,
		);
		expect(screen.getAllByTestId("year-strip-3")).toHaveLength(9);
		expect(screen.getAllByTestId("year-strip-empty")).toHaveLength(3);
		expect(screen.getAllByTestId("year-strip-3")[0]).toHaveStyle({
			width: 12,
			height: 24,
			backgroundColor: intensityColor(3, "light"),
		});
		expect(screen.getAllByTestId("year-strip-empty")[0]).toHaveStyle({
			borderStyle: "dashed",
		});
	});

	it("is one VoiceOver stop", async () => {
		await render(
			<YearStrip
				months={[{ key: "m", level: 2 }]}
				accessibilityLabel="Meditate, 2026"
			/>,
		);
		expect(screen.getByLabelText("Meditate, 2026").props.accessible).toBe(true);
	});
});
