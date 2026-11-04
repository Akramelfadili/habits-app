/**
 * Route-level guard for the V3 navigation shell (HAB-27, ADR 006): the three
 * tabs are groups of one shared stack, so Detail — pushed from any of them —
 * opens inside the tab it came from, that tab stays selected, and Back
 * returns to that tab's root.
 *
 * It renders the real `src/app` tree (layouts, anchors, group syntax) with
 * only the module screens stubbed. It lives here, not under `src/app/`,
 * because every `.tsx` in the app directory is picked up as a route.
 */
import { act } from "@testing-library/react-native";
import { renderRouter, screen, testRouter } from "expo-router/testing-library";
import { useFirstRunOfferStore } from "@/modules/habits/first-run-offer-store";
import { useThemePreferenceStore } from "@/theme/theme-preference-store";

jest.mock("expo-blur", () => {
	const { View } = require("react-native");
	return { BlurView: View };
});

/** Each screen becomes its own marker, so the rendered route is readable. */
function mockStub(name: string) {
	return function Stub() {
		const { Text } = require("react-native");
		return <Text>{name}</Text>;
	};
}

jest.mock("@/modules/habits/screens/today-screen", () => ({
	TodayScreen: mockStub("today"),
}));
jest.mock("@/modules/habits/screens/progress-screen", () => ({
	ProgressScreen: mockStub("progress"),
}));
jest.mock("@/modules/habits/screens/progress-month-screen", () => ({
	ProgressMonthScreen: mockStub("progress-month"),
}));
jest.mock("@/modules/habits/screens/habits-screen", () => ({
	HabitsScreen: mockStub("manage"),
}));
jest.mock("@/modules/habits/screens/manage-categories-screen", () => ({
	ManageCategoriesScreen: mockStub("categories"),
}));
jest.mock("@/modules/habits/screens/settings-screen", () => ({
	SettingsScreen: mockStub("settings"),
}));
jest.mock("@/modules/habits/screens/reminders-screen", () => ({
	RemindersScreen: mockStub("reminders"),
}));
jest.mock("@/modules/habits/screens/habit-detail-screen", () => ({
	HabitDetailScreen: mockStub("detail"),
}));
jest.mock("@/modules/habits/screens/first-run-screen", () => ({
	FirstRunScreen: mockStub("first-run"),
}));
jest.mock("@/modules/habits/screens/suggestions-screen", () => ({
	SuggestionsScreen: mockStub("suggestions"),
}));
jest.mock("@/modules/habits/screens/habit-form-screen", () => ({
	HabitFormScreen: mockStub("habit-form"),
}));
// The root layout holds the database, splash and notification wiring; the
// shell under test is the tabs layout and the shared stack below it. SQLite
// has no native runtime under Jest, and nothing here reads data anyway.
jest.mock("@/lib/db/client", () => ({ db: {}, expoDb: {} }));
jest.mock("@/lib/db/database-provider", () => ({
	DatabaseProvider: ({ children }: { children: React.ReactNode }) => children,
}));
// Where the app opens (HAB-46): the tabs, or First Run with no tab bar.
let mockGate: "loading" | "first-run" | "done" = "done";
let mockNeedsSeenMark = false;
let mockHabitCount: number | undefined = 1;
const mockMarkFirstRunSeen = jest.fn();
jest.mock("@/modules/habits/hooks/use-first-run-queries", () => ({
	useFirstRunQueries: () => ({
		gate: mockGate,
		needsSeenMark: mockNeedsSeenMark,
		habitCount: mockHabitCount,
	}),
}));
jest.mock("@/modules/habits/hooks/use-first-run-actions", () => ({
	useFirstRunActions: () => ({
		markFirstRunSeen: (...args: unknown[]) => mockMarkFirstRunSeen(...args),
	}),
}));
jest.mock("@/modules/habits/hooks/use-startup-actions", () => ({
	useStartupActions: () => {},
}));
jest.mock("@/theme/theme-preference", () => ({
	loadThemePreference: async () => {},
}));
jest.mock("@/lib/notifications/notifications", () => ({
	configureNotificationHandler: () => {},
}));

// ThemeGate holds the splash — and renders nothing — until the stored
// Appearance choice has been read.
beforeEach(() => {
	useThemePreferenceStore.setState({ isLoaded: true });
	mockGate = "done";
	mockNeedsSeenMark = false;
	mockHabitCount = 1;
	useFirstRunOfferStore.setState({ habit: null, landing: false });
	mockMarkFirstRunSeen.mockReset().mockResolvedValue({ ok: true });
});

async function renderApp(initialUrl: string) {
	return renderRouter("src/app", { initialUrl });
}

/** The group segment the shell is currently inside, e.g. "(today)". */
function tabGroup(app: { getSegments(): string[] }) {
	return app
		.getSegments()
		.find((segment) => /^\((today|progress|habits)\)$/.test(segment));
}

describe("First Run opens instead of the tabs (HAB-46)", () => {
	it("a new install lands on First Run and no tab bar is drawn", async () => {
		mockGate = "first-run";
		const app = await renderApp("/");
		expect(screen.getByText("first-run")).toBeTruthy();
		expect(app.getPathname()).toBe("/first-run");
		expect(tabGroup(app)).toBeUndefined();
		for (const tab of ["Today", "Progress", "Habits"]) {
			expect(screen.queryByText(tab)).toBeNull();
		}
	});

	it("lands on First Run from any tab root, not only Today", async () => {
		mockGate = "first-run";
		const app = await renderApp("/(habits)/manage");
		expect(app.getPathname()).toBe("/first-run");
	});

	it("the first-habit form is a First Run screen too, still without tabs", async () => {
		mockGate = "first-run";
		const app = await renderApp("/");
		await testRouter.push("/first-run/habit");
		expect(screen.getByText("habit-form")).toBeTruthy();
		expect(tabGroup(app)).toBeUndefined();
		expect(screen.queryByText("Progress")).toBeNull();
	});

	it("an install that has been through First Run opens the tabs, with the bar", async () => {
		const app = await renderApp("/");
		expect(tabGroup(app)).toBe("(today)");
		expect(screen.getByText("today")).toBeTruthy();
		expect(screen.getByText("Progress")).toBeTruthy();
	});

	it("shows the tabs while the gate is still loading, so the skeleton has its bar (SY1)", async () => {
		mockGate = "loading";
		const app = await renderApp("/");
		expect(tabGroup(app)).toBe("(today)");
	});

	it("writes the seen flag once for an install that has habits but predates it", async () => {
		mockNeedsSeenMark = true;
		await renderApp("/");
		expect(mockMarkFirstRunSeen).toHaveBeenCalledTimes(1);
	});

	it("writes nothing when the flag is already there", async () => {
		await renderApp("/");
		expect(mockMarkFirstRunSeen).not.toHaveBeenCalled();
	});
});

describe("FR3 and FR4 are drawn without the tab bar (owner's decision)", () => {
	it("the empty Today right after leaving First Run has no bar (FR4)", async () => {
		mockHabitCount = 0;
		useFirstRunOfferStore.setState({ landing: true });
		await renderApp("/");
		expect(screen.getByText("today")).toBeTruthy();
		expect(screen.queryByText("Progress")).toBeNull();
	});

	it("the bar is back as soon as a first habit exists, and stays", async () => {
		mockHabitCount = 0;
		useFirstRunOfferStore.setState({ landing: true });
		await renderApp("/");
		expect(screen.queryByText("Progress")).toBeNull();
		mockHabitCount = 1;
		await act(async () => {
			useFirstRunOfferStore.setState({ landing: true, habit: null });
		});
		await renderApp("/");
		expect(screen.getByText("Progress")).toBeTruthy();
		expect(useFirstRunOfferStore.getState().landing).toBe(false);
	});

	it("the reminder question (FR3) hides the bar while it is open", async () => {
		useFirstRunOfferStore.setState({ habit: { id: 1 } as never });
		await renderApp("/");
		expect(screen.queryByText("Progress")).toBeNull();
		await act(async () => useFirstRunOfferStore.getState().clear());
		expect(screen.getByText("Progress")).toBeTruthy();
	});

	it("an ordinary empty Today (never left First Run this session) keeps its bar", async () => {
		mockHabitCount = 0;
		await renderApp("/");
		expect(screen.getByText("Progress")).toBeTruthy();
	});
});

describe("Browse suggestions is a root screen (HAB-46, BS1)", () => {
	it("opens from First Run, still without a tab bar", async () => {
		mockGate = "first-run";
		const app = await renderApp("/");
		await testRouter.push("/suggestions?firstRun=1");
		expect(screen.getByText("suggestions")).toBeTruthy();
		expect(tabGroup(app)).toBeUndefined();
		expect(screen.queryByText("Progress")).toBeNull();
	});

	it("opens from a tab and Close returns to it", async () => {
		const app = await renderApp("/(habits)/manage");
		await testRouter.push("/suggestions");
		expect(screen.getByText("suggestions")).toBeTruthy();
		await testRouter.back();
		expect(tabGroup(app)).toBe("(habits)");
		expect(screen.getByText("manage")).toBeTruthy();
	});
});

describe("the three tab roots", () => {
	it.each([
		["/", "(today)", "today"],
		["/(progress)/progress", "(progress)", "progress"],
		["/(habits)/manage", "(habits)", "manage"],
	])("%s is the %s root and shows %s", async (url, group, marker) => {
		const app = await renderApp(url);
		expect(tabGroup(app)).toBe(group);
		expect(screen.getByText(marker)).toBeTruthy();
	});
});

describe("Detail opens inside the tab it came from (D4)", () => {
	it.each([
		["Today", "/", "(today)"],
		["Progress", "/(progress)/progress", "(progress)"],
		["Habits", "/(habits)/manage", "(habits)"],
	])("from %s", async (_tab, root, group) => {
		const app = await renderApp(root);
		expect(tabGroup(app)).toBe(group);

		await testRouter.push("/habit/1");
		expect(screen.getByText("detail")).toBeTruthy();
		// The push stayed in the group it started in: the tab is still selected.
		expect(tabGroup(app)).toBe(group);

		await testRouter.back();
		expect(tabGroup(app)).toBe(group);
		expect(app.getPathname()).toBe(root.replace(/^\/\([a-z]+\)/, "") || "/");
	});
});

describe("a Year month is a pushed route inside Progress (P13)", () => {
	it("opens in the Progress tab and Back returns to Progress's root", async () => {
		const app = await renderApp("/(progress)/progress");
		await testRouter.push("/month/2026-07-01");
		expect(screen.getByText("progress-month")).toBeTruthy();
		expect(tabGroup(app)).toBe("(progress)");
		expect(app.getPathname()).toBe("/month/2026-07-01");
		await testRouter.back();
		expect(screen.getByText("progress")).toBeTruthy();
		expect(tabGroup(app)).toBe("(progress)");
		expect(app.getPathname()).toBe("/progress");
	});

	it("passes the month through to the screen", async () => {
		const app = await renderApp("/(progress)/progress");
		await testRouter.push("/month/2026-07-01");
		expect(app.getPathname()).toBe("/month/2026-07-01");
	});
});

describe("the other shared routes stay in their tab", () => {
	it("Reminders, pushed from Detail inside Habits", async () => {
		const app = await renderApp("/(habits)/manage");
		await testRouter.push("/habit/1");
		await testRouter.push("/reminders/1");
		expect(screen.getByText("reminders")).toBeTruthy();
		expect(tabGroup(app)).toBe("(habits)");
	});

	it("Settings and Categories, from the Habits gear", async () => {
		const app = await renderApp("/(habits)/manage");
		await testRouter.push("/settings");
		expect(tabGroup(app)).toBe("(habits)");
		await testRouter.push("/categories");
		expect(screen.getByText("categories")).toBeTruthy();
		expect(tabGroup(app)).toBe("(habits)");
	});
});

describe("Add and Edit habit are root modals, outside the tabs", () => {
	it.each([
		["/new-habit", "habit-form"],
		["/edit-habit/1", "habit-form"],
	])("%s", async (url, marker) => {
		const app = await renderApp(url);
		await app.findByText(marker);
		expect(tabGroup(app)).toBeUndefined();
	});
});
