import { fireEvent, render, screen } from "@testing-library/react-native";
import {
	contrastRatio,
	intensityColor,
	readableInk,
	semanticColors,
	surfaceColors,
} from "@/theme/theme";
import { CompletionCell, notchSize } from "./completion-cell";

const light = { ...surfaceColors.light, ...semanticColors.light };

describe("CompletionCell", () => {
	it.each([0, 1, 2, 3] as const)(
		"fills level %i with the accent mixed into the track",
		async (level) => {
			await render(
				<CompletionCell state={{ kind: "level", level }} size={24} />,
			);
			expect(screen.getByTestId("completion-cell-level")).toHaveStyle({
				backgroundColor: intensityColor(level, "light"),
			});
		},
	);

	it("mixes 0, 28, 58 and 100 % of the accent into the track", () => {
		expect(intensityColor(0, "light")).toBe("rgb(222,221,218)");
		expect(intensityColor(3, "light")).toBe("rgb(26,26,25)");
		expect(intensityColor(1, "light")).not.toBe(intensityColor(2, "light"));
	});

	it("cuts a corner notch from the partial levels only", async () => {
		await render(
			<>
				<CompletionCell state={{ kind: "level", level: 1 }} size={24} />
				<CompletionCell state={{ kind: "level", level: 2 }} size={24} />
				<CompletionCell state={{ kind: "level", level: 0 }} size={24} />
				<CompletionCell state={{ kind: "level", level: 3 }} size={24} />
			</>,
		);
		expect(screen.getAllByTestId("completion-cell-notch")).toHaveLength(2);
	});

	it("sizes the notch at 22 % of the edge, 3 pt at the least", () => {
		expect(notchSize(40)).toBe(9);
		expect(notchSize(24)).toBe(5);
		expect(notchSize(12)).toBe(3);
	});

	it.each([
		[12, 4],
		[16, 5],
		[24, 8],
		[40, 13],
	])("rounds a %i pt cell to floor(size / 3) = %i", async (size, radius) => {
		await render(
			<CompletionCell state={{ kind: "level", level: 3 }} size={size} />,
		);
		expect(screen.getByTestId("completion-cell-level")).toHaveStyle({
			width: size,
			height: size,
			borderRadius: radius,
		});
	});

	it("draws a frozen day violet and dashed, never as a completion tint", async () => {
		await render(<CompletionCell state={{ kind: "frozen" }} size={24} />);
		expect(screen.getByTestId("completion-cell-frozen")).toHaveStyle({
			backgroundColor: light.frozenBg,
			borderColor: light.frozenInk,
			borderStyle: "dashed",
		});
	});

	it("marks a bonus log with a dot on the track", async () => {
		await render(<CompletionCell state={{ kind: "bonus" }} size={24} />);
		expect(screen.getByTestId("completion-cell-bonus")).toHaveStyle({
			backgroundColor: light.track,
		});
		expect(screen.getByTestId("completion-cell-bonus-dot")).toBeTruthy();
	});

	it("draws not-due as a quiet dot without a box, or as a bare number", async () => {
		await render(
			<>
				<CompletionCell state={{ kind: "not-due" }} size={24} />
				<CompletionCell state={{ kind: "not-due" }} size={40} text="12" />
			</>,
		);
		expect(screen.getAllByTestId("completion-cell-not-due")[0]).toHaveStyle({
			backgroundColor: "transparent",
			borderColor: "transparent",
		});
		expect(screen.getAllByTestId("completion-cell-quiet-dot")).toHaveLength(1);
		expect(screen.getByText("12")).toBeTruthy();
	});

	it("keeps before-start dashed, nothing-logged outlined and future a hairline", async () => {
		await render(
			<>
				<CompletionCell state={{ kind: "before-start" }} size={24} />
				<CompletionCell state={{ kind: "nothing-logged" }} size={24} />
				<CompletionCell state={{ kind: "future" }} size={24} />
			</>,
		);
		expect(screen.getByTestId("completion-cell-before-start")).toHaveStyle({
			borderStyle: "dashed",
			borderColor: light.outline,
		});
		// Deliberately not the missed look (filled track): an outline on nothing.
		expect(screen.getByTestId("completion-cell-nothing-logged")).toHaveStyle({
			backgroundColor: "transparent",
			borderStyle: "solid",
			borderColor: light.outline,
		});
		expect(screen.getByTestId("completion-cell-future")).toHaveStyle({
			borderColor: light.border,
		});
	});

	it("draws a paused day hatched and a streak reset with an amber outline", async () => {
		await render(
			<>
				<CompletionCell state={{ kind: "paused" }} size={18} />
				<CompletionCell state={{ kind: "reset" }} size={18} />
			</>,
		);
		const paused = screen.getByTestId("completion-cell-paused");
		expect(paused).toHaveStyle({ backgroundColor: "transparent" });
		expect(paused).toHaveStyle({ overflow: "hidden" });
		const lines = screen.getByTestId("completion-cell-hatch").children;
		expect(lines.length).toBeGreaterThan(5);
		expect(screen.queryByTestId("completion-cell-hatch")).toBeTruthy();
		expect(screen.getByTestId("completion-cell-reset")).toHaveStyle({
			backgroundColor: light.track,
			borderColor: light.warnInk,
		});
	});

	it("rings today and the selected day", async () => {
		await render(
			<>
				<CompletionCell state={{ kind: "level", level: 3 }} size={24} today />
				<CompletionCell state={{ kind: "level", level: 3 }} size={24} />
			</>,
		);
		const [ringed, plain] = screen.getAllByTestId("completion-cell-level");
		expect(ringed.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					boxShadow: expect.stringContaining(light.ink),
				}),
			]),
		);
		expect(JSON.stringify(plain.props.style)).not.toContain("boxShadow");
	});

	it("is a VoiceOver stop only when it has a label, and never when hidden", async () => {
		await render(
			<>
				<CompletionCell
					state={{ kind: "level", level: 3 }}
					size={24}
					accessibilityLabel="Wed, done"
					testID="labelled"
				/>
				<CompletionCell
					state={{ kind: "level", level: 3 }}
					size={16}
					testID="silent"
				/>
				<CompletionCell
					state={{ kind: "level", level: 3 }}
					size={16}
					hidden
					accessibilityLabel="Wed, done"
					testID="hidden"
				/>
			</>,
		);
		expect(screen.getByLabelText("Wed, done")).toBeTruthy();
		expect(screen.getByTestId("labelled").props.accessible).toBe(true);
		expect(screen.getByTestId("silent").props.accessible).toBe(false);
		const hidden = screen.getByTestId("hidden", {
			includeHiddenElements: true,
		});
		expect(hidden.props.accessible).toBe(false);
		expect(hidden.props.accessibilityElementsHidden).toBe(true);
	});

	it("is a 44 pt button only when given onPress", async () => {
		const onPress = jest.fn();
		await render(
			<CompletionCell
				state={{ kind: "level", level: 2 }}
				size={40}
				text="14"
				accessibilityLabel="Tuesday 14 July, 80 percent"
				onPress={onPress}
			/>,
		);
		const day = screen.getByRole("button", {
			name: "Tuesday 14 July, 80 percent",
		});
		expect(day.props.hitSlop).toBe(2);
		await fireEvent.press(day);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("reads its number in whichever of ink and onAccent contrasts more", () => {
		for (const level of [0, 1, 2, 3] as const) {
			const fill = intensityColor(level, "light");
			const ink = readableInk(fill, "light");
			expect(contrastRatio(fill, ink)).toBeGreaterThanOrEqual(
				Math.max(
					contrastRatio(fill, light.ink),
					contrastRatio(fill, light.onAccent),
				) - 0.001,
			);
		}
		expect(
			contrastRatio(intensityColor(3, "light"), light.onAccent),
		).toBeGreaterThan(7);
	});
});
