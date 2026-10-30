import { fireEvent, render, screen } from "@testing-library/react-native";
import { builtInCategory, makeHabit } from "../../test-support/habit-builder";
import { HabitsSearchResults } from "./habits-search-results";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const water = makeHabit({
	id: 1,
	name: "Drink water",
	category: builtInCategory("Health"),
});
const phone = makeHabit({
	id: 2,
	name: "No phone in bed",
	category: builtInCategory("Home"),
	direction: "break",
});
const run = makeHabit({
	id: 6,
	name: "Morning run",
	category: builtInCategory("Fitness"),
	archivedAt: new Date(2026, 9, 12),
});

function renderResults(
	props: Partial<React.ComponentProps<typeof HabitsSearchResults>> = {},
) {
	const handlers = {
		onOpen: jest.fn(),
		onRestore: jest.fn(),
		onAdd: jest.fn(),
	};
	return render(
		<HabitsSearchResults
			query="in"
			active={[water, phone]}
			archived={[
				{
					habit: run,
					subtitle: "",
					accessibilityLabel: "Morning run, archived 12 October",
				},
			]}
			{...handlers}
			{...props}
		/>,
	).then(() => handlers);
}

describe("HabitsSearchResults (H2)", () => {
	it("splits the matches by status, each with its category and cadence", async () => {
		await renderResults();
		expect(screen.getByText("ACTIVE · 2")).toBeTruthy();
		expect(screen.getByText("ARCHIVED · 1")).toBeTruthy();
		expect(screen.getByText("Health · daily")).toBeTruthy();
		expect(screen.getByText("Home · break")).toBeTruthy();
		expect(screen.getByText("Fitness · archived 12 Oct")).toBeTruthy();
	});

	it("an archived result is restored in place", async () => {
		const { onRestore } = await renderResults();
		await fireEvent.press(
			screen.getByRole("button", { name: "Restore Morning run" }),
		);
		expect(onRestore).toHaveBeenCalledWith(run);
	});

	it("leaves out a status with no matches", async () => {
		await renderResults({ archived: [] });
		expect(screen.queryByText(/ARCHIVED/)).toBeNull();
		expect(screen.getByText("ACTIVE · 2")).toBeTruthy();
	});

	it("a result opens Detail", async () => {
		const { onOpen } = await renderResults();
		await fireEvent.press(
			screen.getByRole("button", { name: "Drink water, Health · daily" }),
		);
		expect(onOpen).toHaveBeenCalledWith(water);
	});
});

describe("HabitsSearchResults — nothing matches (H3)", () => {
	it("says what was searched, that archived habits were too, and offers to add it", async () => {
		const { onAdd } = await renderResults({
			query: "yoga",
			active: [],
			archived: [],
		});
		expect(screen.getByText("No habits match “yoga”")).toBeTruthy();
		expect(
			screen.getByText("Search looks through active and archived habits."),
		).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", { name: "Add “Yoga” as a habit" }),
		);
		expect(onAdd).toHaveBeenCalledWith("Yoga");
	});

	it("trims the query it names and offers", async () => {
		const { onAdd } = await renderResults({
			query: "  yoga  ",
			active: [],
			archived: [],
		});
		expect(screen.getByText("No habits match “yoga”")).toBeTruthy();
		await fireEvent.press(screen.getByText("Add “Yoga” as a habit"));
		expect(onAdd).toHaveBeenCalledWith("Yoga");
	});
});
