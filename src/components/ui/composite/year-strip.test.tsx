import { render, screen } from "@testing-library/react-native";
import { YearStrip, type YearStripMonth } from "./year-strip";

const INITIALS = "JFMAMJJASOND".split("");

function months(): YearStripMonth[] {
	return INITIALS.map((initial, index) => ({
		key: `m${index}`,
		initial,
		current: index === 9,
		state:
			index < 2
				? { kind: "before-start" }
				: index < 9
					? { kind: "level", level: index % 2 === 0 ? 1 : 3 }
					: index === 9
						? { kind: "level", level: 2 }
						: { kind: "future" },
	}));
}

describe("YearStrip", () => {
	it("draws twelve 24 pt month cells with their initials, partial months notched", async () => {
		await render(
			<YearStrip months={months()} accessibilityLabel="Meditate, 2026" />,
		);
		expect(
			screen.getAllByTestId(/^completion-cell-/, {
				includeHiddenElements: true,
			}),
		).toBeTruthy();
		const level = screen.getAllByTestId("completion-cell-level", {
			includeHiddenElements: true,
		});
		expect(level[0]).toHaveStyle({ width: 24, height: 24 });
		expect(
			screen.getAllByTestId("completion-cell-before-start", {
				includeHiddenElements: true,
			}),
		).toHaveLength(2);
		expect(
			screen.getAllByTestId("completion-cell-future", {
				includeHiddenElements: true,
			}),
		).toHaveLength(2);
		expect(
			screen.getAllByTestId("completion-cell-notch", {
				includeHiddenElements: true,
			}).length,
		).toBeGreaterThan(0);
	});

	it("sets the current month's initial in ink and heavier", async () => {
		await render(
			<YearStrip months={months()} accessibilityLabel="Meditate, 2026" />,
		);
		expect(screen.getByText("O", { includeHiddenElements: true })).toHaveStyle({
			fontWeight: "600",
		});
	});

	it("is one VoiceOver stop", async () => {
		await render(
			<YearStrip months={months()} accessibilityLabel="Meditate, 2026" />,
		);
		expect(screen.getByLabelText("Meditate, 2026").props.accessible).toBe(true);
	});
});
