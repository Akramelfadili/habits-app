import { fireEvent, render, screen } from "@testing-library/react-native";
import { interactionOpacity, semanticColors } from "@/theme/theme";
import type { ReminderWithConflicts } from "../hooks/use-reminder-queries";
import { ReminderCard } from "./reminder-card";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

function reminder(
	overrides: Partial<ReminderWithConflicts> = {},
): ReminderWithConflicts {
	return {
		id: 1,
		habitId: 1,
		hour: 7,
		minute: 20,
		weekdays: [1, 2, 3, 4, 5],
		enabled: true,
		unscheduledDays: [],
		...overrides,
	};
}

async function renderCard(
	props: Partial<Parameters<typeof ReminderCard>[0]> = {},
) {
	const handlers = {
		onToggleExpanded: jest.fn(),
		onEditTime: jest.fn(),
		onChangeEnabled: jest.fn(),
		onChangeDays: jest.fn(),
		onRemove: jest.fn(),
	};
	await render(
		<ReminderCard
			reminder={reminder()}
			expanded={false}
			{...handlers}
			{...props}
		/>,
	);
	return handlers;
}

describe("ReminderCard", () => {
	it("collapsed: shows time, days and toggle, but no chips", async () => {
		await renderCard();

		expect(screen.getByText("07:20")).toBeTruthy();
		expect(screen.getByText("Weekdays")).toBeTruthy();
		expect(screen.getByLabelText("Reminder at 07:20 on").props.value).toBe(
			true,
		);
		expect(screen.queryByLabelText("Monday")).toBeNull();
		expect(screen.queryByText("Remove")).toBeNull();
	});

	it("tapping the header expands", async () => {
		const handlers = await renderCard();

		await fireEvent.press(screen.getByLabelText("Reminder at 07:20, Weekdays"));
		expect(handlers.onToggleExpanded).toHaveBeenCalledTimes(1);

		expect(screen.queryByText("Change time")).toBeNull();
	});

	it("expanded: its own chips edit its own days; Change time and Remove act on it", async () => {
		const handlers = await renderCard({ expanded: true });

		await fireEvent.press(screen.getByLabelText("Saturday"));
		expect(handlers.onChangeDays).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6]);

		await fireEvent.press(screen.getByText("Change time"));
		expect(handlers.onEditTime).toHaveBeenCalledTimes(1);

		await fireEvent.press(screen.getByText("Remove"));
		expect(handlers.onRemove).toHaveBeenCalledTimes(1);
	});

	it("toggling reports the new state", async () => {
		const handlers = await renderCard();

		await fireEvent(
			screen.getByLabelText("Reminder at 07:20 on"),
			"valueChange",
			false,
		);
		expect(handlers.onChangeEnabled).toHaveBeenCalledWith(false);
	});

	it("flags unscheduled days with a warning banner when expanded", async () => {
		await renderCard({
			expanded: true,
			reminder: reminder({ weekdays: [6, 7], unscheduledDays: [6, 7] }),
		});

		expect(
			screen.getByText(
				"Saturday and Sunday are not scheduled days for this habit — this reminder would fire for nothing.",
			),
		).toBeTruthy();
	});

	it("still flags the conflict when collapsed, via the days subtitle", async () => {
		await renderCard({
			reminder: reminder({ weekdays: [6, 7], unscheduledDays: [6, 7] }),
		});

		expect(screen.queryByTestId("banner")).toBeNull();
		expect(screen.getByText("Sat, Sun")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
	});

	it("fades the whole card when turned off, and only then", async () => {
		await renderCard({ reminder: reminder({ enabled: false }) });
		expect(screen.getByTestId("reminder-card")).toHaveStyle({
			opacity: interactionOpacity.dimmed,
		});
	});

	it("isn't faded when on", async () => {
		await renderCard();
		expect(screen.getByTestId("reminder-card")).not.toHaveStyle({
			opacity: interactionOpacity.dimmed,
		});
	});
});
