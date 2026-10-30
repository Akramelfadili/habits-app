import { builtInCategory, makeHabit } from "../test-support/habit-builder";
import {
	archivedRowLabel,
	archivedRowSubtitle,
	libraryCountsLabel,
	libraryEyebrow,
	libraryRowLabel,
	libraryRowSubtitle,
	matchHabits,
	nameFromQuery,
	resultRowSubtitle,
	searchTerm,
} from "./habits-library-presenter";

const water = makeHabit({
	id: 1,
	name: "Drink water",
	category: builtInCategory("Health"),
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});

describe("libraryRowSubtitle (H1)", () => {
	it("names the cadence and a quantity target", () => {
		expect(libraryRowSubtitle(water)).toBe("Daily · 8 glasses");
	});

	it("words a per-week habit, and a weekday habit, as the frames do", () => {
		expect(
			libraryRowSubtitle(
				makeHabit({ frequency: { type: "per-week", timesPerWeek: 3 } }),
			),
		).toBe("3× per week");
		expect(
			libraryRowSubtitle(
				makeHabit({ frequency: { type: "weekdays", days: [2, 4] } }),
			),
		).toBe("Tue, Thu");
	});

	it("adds a running streak of two days or more, never one", () => {
		const daily = makeHabit({ frequency: { type: "daily" } });
		expect(libraryRowSubtitle(daily, 13)).toBe("Daily · 13-day streak");
		expect(libraryRowSubtitle(daily, 1)).toBe("Daily");
		expect(libraryRowSubtitle(daily, 0)).toBe("Daily");
	});

	it("only a daily Build habit names a streak: per-week, weekday and Break habits count differently", () => {
		expect(
			libraryRowSubtitle(
				makeHabit({ frequency: { type: "per-week", timesPerWeek: 3 } }),
				5,
			),
		).toBe("3× per week");
		expect(
			libraryRowSubtitle(
				makeHabit({ frequency: { type: "weekdays", days: [2, 4] } }),
				5,
			),
		).toBe("Tue, Thu");
		expect(libraryRowSubtitle(makeHabit({ direction: "break" }), 21)).toBe(
			"Break · daily",
		);
	});

	it("a quantity habit shows its target, not a streak", () => {
		expect(libraryRowSubtitle(water, 13)).toBe("Daily · 8 glasses");
	});

	it("says Break first, and lowercases the cadence after it", () => {
		expect(libraryRowSubtitle(makeHabit({ direction: "break" }))).toBe(
			"Break · daily",
		);
	});
});

describe("libraryRowLabel (08.3)", () => {
	it("reads name, category, cadence and target as one stop", () => {
		expect(libraryRowLabel(water)).toBe(
			"Drink water, Health, daily, 8 glasses",
		);
	});

	it("says break for a Break habit", () => {
		expect(
			libraryRowLabel(
				makeHabit({
					name: "No phone in bed",
					category: builtInCategory("Home"),
					direction: "break",
				}),
			),
		).toBe("No phone in bed, Home, break, daily");
	});
});

describe("resultRowSubtitle (H2)", () => {
	it("an active result names its category and how it repeats", () => {
		expect(
			resultRowSubtitle(makeHabit({ category: builtInCategory("Health") })),
		).toBe("Health · daily");
		expect(
			resultRowSubtitle(
				makeHabit({
					category: builtInCategory("Home"),
					direction: "break",
				}),
			),
		).toBe("Home · break");
	});

	it("an archived result says since when", () => {
		expect(
			resultRowSubtitle(
				makeHabit({
					category: builtInCategory("Fitness"),
					archivedAt: new Date(2026, 9, 12),
				}),
			),
		).toBe("Fitness · archived 12 Oct");
	});
});

describe("archived rows (H5)", () => {
	it("says when it left Today and its best streak", () => {
		expect(archivedRowSubtitle(new Date(2026, 9, 12), 41)).toBe(
			"Archived 12 Oct · best streak 41",
		);
	});

	it("leaves the streak out when there never was one", () => {
		expect(archivedRowSubtitle(new Date(2026, 9, 12), 0)).toBe(
			"Archived 12 Oct",
		);
	});

	it("reads as 'Morning run, archived 12 October'", () => {
		expect(
			archivedRowLabel(
				makeHabit({ name: "Morning run", archivedAt: new Date(2026, 9, 12) }),
			),
		).toBe("Morning run, archived 12 October");
	});
});

describe("search", () => {
	const rows = [
		{ habit: makeHabit({ id: 1, name: "Drink water" }) },
		{ habit: makeHabit({ id: 2, name: "No phone in bed" }) },
		{ habit: makeHabit({ id: 3, name: "Café break" }) },
	];

	it("matches a name anywhere in it, whatever the case", () => {
		expect(matchHabits(rows, "IN").map((row) => row.habit.id)).toEqual([1, 2]);
	});

	it("folds accents both ways", () => {
		expect(matchHabits(rows, "cafe").map((row) => row.habit.id)).toEqual([3]);
		expect(matchHabits(rows, "café").map((row) => row.habit.id)).toEqual([3]);
	});

	it("an empty or blank query matches everything", () => {
		expect(matchHabits(rows, "   ")).toHaveLength(3);
	});

	it("keeps the order it was given", () => {
		expect(matchHabits(rows, "e").map((row) => row.habit.id)).toEqual([
			1, 2, 3,
		]);
	});

	it("trims what it searched for and capitalises the name it offers to add", () => {
		expect(searchTerm("  yoga ")).toBe("yoga");
		expect(nameFromQuery("  yoga ")).toBe("Yoga");
	});
});

describe("the header's counts", () => {
	it("eyebrow: active and archived, active only, or none", () => {
		expect(libraryEyebrow(7, 2)).toBe("7 active · 2 archived");
		expect(libraryEyebrow(7, 0)).toBe("7 active");
		expect(libraryEyebrow(0, 0)).toBe("No habits");
	});

	it("VoiceOver reads them as '7 active, 1 archived'", () => {
		expect(libraryCountsLabel(7, 1)).toBe("7 active, 1 archived");
		expect(libraryCountsLabel(7, 0)).toBe("7 active");
		expect(libraryCountsLabel(0, 0)).toBe("No habits");
	});
});
