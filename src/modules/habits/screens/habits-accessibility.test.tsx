import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { ReactTestRendererJSON } from "react-test-renderer";
import type { HabitsLibrary } from "../hooks/use-habits-queries";
import { detailCopy, habitsCopy } from "../messages";
import { groupHabitsByCategory } from "../presenters/today-screen-helpers";
import { builtInCategory, makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const water = makeHabit({
	id: 1,
	name: "Drink water",
	category: builtInCategory("Health"),
});
const run = makeHabit({
	id: 6,
	name: "Morning run",
	category: builtInCategory("Fitness"),
	archivedAt: new Date(2026, 9, 12),
});
const groups = groupHabitsByCategory([water], []);
const mockLibrary: HabitsLibrary = {
	isLoaded: true,
	groups,
	active: [water],
	archived: [run],
	streakByHabitId: new Map(),
	bestStreakByHabitId: new Map(),
	categoryCount: 12,
};
jest.mock("../hooks/use-habits-queries", () => ({
	useHabitsQueries: () => mockLibrary,
}));
jest.mock("../hooks/use-habits-actions", () => ({
	useHabitsActions: () => ({
		reorderHabits: jest.fn(),
		archive: jest.fn(),
		restore: jest.fn(),
		isRestoring: false,
	}),
}));

import { HabitsScreen } from "./habits-screen";

/** What VoiceOver stops on, in reading order: every labelled element. */
function readingOrder(): string[] {
	const out: string[] = [];
	const walk = (node: ReactTestRendererJSON | string | null) => {
		if (!node || typeof node === "string") return;
		const props = node.props as Record<string, unknown>;
		if (typeof props.accessibilityLabel === "string") {
			out.push(props.accessibilityLabel);
		}
		for (const child of node.children ?? []) {
			walk(child as ReactTestRendererJSON | string);
		}
	};
	const tree = screen.toJSON();
	for (const root of Array.isArray(tree) ? tree : [tree]) walk(root);
	return out;
}

describe("the Habits tab for VoiceOver (08.3, 08.4)", () => {
	it("reads header, Settings, Add habit, the search field, then the content top to bottom", async () => {
		await render(<HabitsScreen />, { wrapper: GestureHandlerRootView });
		const order = readingOrder();
		const at = (label: string) => order.indexOf(label);
		expect(at("Habits, 1 active, 1 archived")).toBeGreaterThanOrEqual(0);
		expect(at("Habits, 1 active, 1 archived")).toBeLessThan(
			at("Search habits"),
		);
		expect(at("Search habits")).toBeLessThan(at("Reorder habits"));
		expect(at("Reorder habits")).toBeLessThan(at("Drink water, Health, daily"));
		expect(at("Drink water, Health, daily")).toBeLessThan(
			at("Archived, 1, collapsed"),
		);
		expect(at("Archived, 1, collapsed")).toBeLessThan(at("Categories, 12"));
	});

	it("a lifted row only gains a shadow: no scale, which Reduce Motion would have to undo", async () => {
		await render(<HabitsScreen />, { wrapper: GestureHandlerRootView });
		const rows = screen.getAllByTestId("list-item");
		for (const row of rows) {
			expect(StyleSheet.flatten(row.props.style).transform).toBeUndefined();
		}
	});
});

function leaves(value: unknown, out: string[] = []): string[] {
	if (typeof value === "string") out.push(value);
	else if (typeof value === "function") {
		try {
			leaves(value("Read 20 min", 3, "glasses"), out);
		} catch {
			// a builder that wants other arguments is covered where it is used
		}
	} else if (value && typeof value === "object") {
		for (const child of Object.values(value)) leaves(child, out);
	}
	return out;
}

describe("the Habits and Detail copy (D7, D12)", () => {
	const all = [...leaves(habitsCopy), ...leaves(detailCopy)];

	it("is not empty", () => {
		expect(all.length).toBeGreaterThan(80);
	});

	it("never says failed, Oops or Success", () => {
		for (const text of all)
			expect(text).not.toMatch(/fail(?!ure)|oops|success/i);
	});

	it("never shows a time of day in the history wording", () => {
		for (const text of leaves(detailCopy.history)) {
			expect(text).not.toMatch(/\d\d:\d\d/);
		}
	});

	it("uses the typographic apostrophe, as the frames do", () => {
		for (const text of all) expect(text).not.toMatch(/\w'\w/);
	});
});
