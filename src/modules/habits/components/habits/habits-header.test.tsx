import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

jest.mock("expo-symbols", () => {
	const { View: MockView } = require("react-native");
	return { SymbolView: MockView };
});
let mockLargeText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockLargeText,
}));

import { HabitsHeader } from "./habits-header";

async function renderHeader(
	props: Partial<React.ComponentProps<typeof HabitsHeader>> = {},
) {
	const handlers = {
		onOpenSettings: jest.fn(),
		onAddHabit: jest.fn(),
		onDone: jest.fn(),
	};
	await render(
		<HabitsHeader
			eyebrow="7 active · 2 archived"
			accessibilityLabel="Habits, 7 active, 2 archived"
			reordering={false}
			{...handlers}
			{...props}
		/>,
	);
	return handlers;
}

beforeEach(() => {
	mockLargeText = false;
});

describe("HabitsHeader", () => {
	it("is one heading: the counts over the title, read as 'Habits, 7 active, 2 archived'", async () => {
		await renderHeader();
		expect(screen.getByLabelText("Habits, 7 active, 2 archived")).toBeTruthy();
		expect(screen.getByText("7 ACTIVE · 2 ARCHIVED")).toBeTruthy();
		expect(screen.getByText("Habits")).toBeTruthy();
	});

	it("offers exactly the gear and the +", async () => {
		await renderHeader();
		expect(screen.getAllByRole("button")).toHaveLength(2);
	});

	// The gear is the only way into Settings now (D3).
	it("opens Settings from the gear", async () => {
		const { onOpenSettings, onAddHabit } = await renderHeader();
		await fireEvent.press(screen.getByRole("button", { name: "Settings" }));
		expect(onOpenSettings).toHaveBeenCalledTimes(1);
		expect(onAddHabit).not.toHaveBeenCalled();
	});

	it("opens Add habit from the +", async () => {
		const { onOpenSettings, onAddHabit } = await renderHeader();
		await fireEvent.press(screen.getByRole("button", { name: "Add habit" }));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
		expect(onOpenSettings).not.toHaveBeenCalled();
	});

	it("reordering swaps the two circles for Done (H4)", async () => {
		const { onDone } = await renderHeader({
			reordering: true,
			eyebrow: "Reorder · drag within a category",
		});
		expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Add habit" })).toBeNull();
		await fireEvent.press(screen.getByRole("button", { name: "Done" }));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("a collapsed header takes no taps and leaves VoiceOver (the inline bar has them)", async () => {
		await renderHeader({ collapsed: true });
		const block = screen.getByLabelText("Habits, 7 active, 2 archived", {
			hidden: true,
		}).parent?.parent;
		expect(block?.props.pointerEvents).toBe("none");
		expect(block?.props.accessibilityElementsHidden).toBe(true);
	});

	it("at accessibility sizes the buttons move above the title (H10)", async () => {
		mockLargeText = true;
		await renderHeader();
		const title = screen.getByLabelText("Habits, 7 active, 2 archived");
		const row = title.parent;
		expect(StyleSheet.flatten(row?.props.style).flexDirection).not.toBe("row");
	});
});
