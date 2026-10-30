import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../../test-support/habit-builder";
import { ArchivedSection } from "./archived-section";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const run = makeHabit({
	id: 6,
	name: "Morning run",
	archivedAt: new Date(2026, 9, 12),
});
const entries = [
	{
		habit: run,
		subtitle: "Archived 12 Oct · best streak 41",
		accessibilityLabel: "Morning run, archived 12 October",
	},
];

function renderSection(
	props: Partial<React.ComponentProps<typeof ArchivedSection>> = {},
) {
	const handlers = {
		onToggle: jest.fn(),
		onOpen: jest.fn(),
		onRestore: jest.fn(),
	};
	return render(
		<ArchivedSection
			entries={entries}
			expanded={false}
			{...handlers}
			{...props}
		/>,
	).then(() => handlers);
}

describe("ArchivedSection", () => {
	it("is absent when nothing is archived", async () => {
		await renderSection({ entries: [] });
		expect(screen.queryByText(/ARCHIVED/)).toBeNull();
	});

	it("collapsed (H1): the count and Show, and no rows", async () => {
		const { onToggle } = await renderSection();
		expect(screen.getByText("ARCHIVED · 1")).toBeTruthy();
		expect(screen.queryByText("Morning run")).toBeNull();
		await fireEvent.press(
			screen.getByRole("button", { name: "Archived, 1, collapsed" }),
		);
		expect(onToggle).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Show")).toBeTruthy();
	});

	it("expanded (H5): the rows, Hide, and what a restore does", async () => {
		await renderSection({ expanded: true });
		expect(screen.getByText("Hide")).toBeTruthy();
		expect(screen.getByText("Morning run")).toBeTruthy();
		expect(screen.getByText("Archived 12 Oct · best streak 41")).toBeTruthy();
		expect(
			screen.getByText(
				"A restored habit starts a fresh streak. Paused days stay paused.",
			),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Archived, 1, expanded" }).props
				.accessibilityState,
		).toEqual({ expanded: true });
	});

	it("Restore is instant: one press, no confirmation", async () => {
		const { onRestore, onOpen } = await renderSection({ expanded: true });
		await fireEvent.press(
			screen.getByRole("button", { name: "Restore Morning run" }),
		);
		expect(onRestore).toHaveBeenCalledWith(run);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("the row opens Detail", async () => {
		const { onOpen } = await renderSection({ expanded: true });
		await fireEvent.press(
			screen.getByRole("button", { name: "Morning run, archived 12 October" }),
		);
		expect(onOpen).toHaveBeenCalledWith(run);
	});

	it("every Restore waits while one is running", async () => {
		const { onRestore } = await renderSection({
			expanded: true,
			restoring: true,
		});
		await fireEvent.press(
			screen.getByRole("button", { name: "Restore Morning run" }),
		);
		expect(onRestore).not.toHaveBeenCalled();
	});
});
