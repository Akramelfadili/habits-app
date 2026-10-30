import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { builtInCategory, makeHabit } from "../../test-support/habit-builder";
import { ArchivedLibraryRow, LibraryRow } from "./library-row";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const water = makeHabit({
	id: 1,
	name: "Drink water",
	category: builtInCategory("Health"),
});

describe("LibraryRow", () => {
	function renderRow(
		props: Partial<React.ComponentProps<typeof LibraryRow>> = {},
	) {
		const onPress = jest.fn();
		return render(
			<LibraryRow
				habit={water}
				subtitle="Daily · 8 glasses"
				accessibilityLabel="Drink water, Health, daily, 8 glasses"
				onPress={onPress}
				{...props}
			/>,
		).then(() => onPress);
	}

	it("shows the name and how it repeats, and opens Detail", async () => {
		const onPress = await renderRow();
		expect(screen.getByText("Drink water")).toBeTruthy();
		expect(screen.getByText("Daily · 8 glasses")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", {
				name: "Drink water, Health, daily, 8 glasses",
			}),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("tells VoiceOver what a tap does", async () => {
		await renderRow();
		expect(screen.getByRole("button").props.accessibilityHint).toBe(
			"Opens details.",
		);
	});

	it("offers VoiceOver's Reorder and Archive on the row", async () => {
		const onReorder = jest.fn();
		const onArchive = jest.fn();
		await renderRow({
			accessibilityActions: [
				{ label: "Reorder", onAction: onReorder },
				{ label: "Archive", onAction: onArchive },
			],
		});
		const row = screen.getByRole("button");
		expect(
			row.props.accessibilityActions.map((a: { name: string }) => a.name),
		).toEqual(["Reorder", "Archive"]);
		await fireEvent(row, "accessibilityAction", {
			nativeEvent: { actionName: "Archive" },
		});
		expect(onArchive).toHaveBeenCalledTimes(1);
	});

	it("in reorder mode the grip replaces the chevron and the row stops being a link", async () => {
		const onPress = await renderRow({ handle: <Text>grip</Text> });
		expect(screen.getByText("grip")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
		expect(onPress).not.toHaveBeenCalled();
	});
});

describe("ArchivedLibraryRow", () => {
	const archived = makeHabit({
		id: 6,
		name: "Morning run",
		archivedAt: new Date(2026, 9, 12),
	});

	it("shows when it left Today, with Restore as its own button", async () => {
		const onPress = jest.fn();
		const onRestore = jest.fn();
		await render(
			<ArchivedLibraryRow
				habit={archived}
				subtitle="Archived 12 Oct · best streak 41"
				accessibilityLabel="Morning run, archived 12 October"
				onPress={onPress}
				onRestore={onRestore}
			/>,
		);
		expect(screen.getByText("Archived 12 Oct · best streak 41")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", { name: "Restore Morning run" }),
		);
		expect(onRestore).toHaveBeenCalledTimes(1);
		expect(onPress).not.toHaveBeenCalled();
	});

	it("a tap on the row opens Detail, not Restore", async () => {
		const onPress = jest.fn();
		const onRestore = jest.fn();
		await render(
			<ArchivedLibraryRow
				habit={archived}
				subtitle="Archived 12 Oct"
				accessibilityLabel="Morning run, archived 12 October"
				onPress={onPress}
				onRestore={onRestore}
			/>,
		);
		await fireEvent.press(
			screen.getByRole("button", { name: "Morning run, archived 12 October" }),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(onRestore).not.toHaveBeenCalled();
	});

	it("Restore waits while a restore is running", async () => {
		const onRestore = jest.fn();
		await render(
			<ArchivedLibraryRow
				habit={archived}
				subtitle="Archived 12 Oct"
				accessibilityLabel="Morning run, archived 12 October"
				onPress={jest.fn()}
				onRestore={onRestore}
				disabled
			/>,
		);
		await fireEvent.press(
			screen.getByRole("button", { name: "Restore Morning run" }),
		);
		expect(onRestore).not.toHaveBeenCalled();
	});
});
