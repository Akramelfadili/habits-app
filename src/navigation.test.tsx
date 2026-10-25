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
import { renderRouter, screen, testRouter } from "expo-router/testing-library";
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
jest.mock("@/modules/habits/screens/weekly-summary-screen", () => ({
	WeeklySummaryScreen: mockStub("week"),
}));
jest.mock("@/modules/habits/screens/monthly-summary-screen", () => ({
	MonthlySummaryScreen: mockStub("month"),
}));
jest.mock("@/modules/habits/screens/yearly-summary-screen", () => ({
	YearlySummaryScreen: mockStub("year"),
}));
jest.mock("@/modules/habits/screens/manage-habits-screen", () => ({
	ManageHabitsScreen: mockStub("manage"),
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

describe("the three tab roots", () => {
	it.each([
		["/", "(today)", "today"],
		["/(progress)/week", "(progress)", "week"],
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
		["Progress", "/(progress)/week", "(progress)"],
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

	it("Month and Year, replacing Week inside Progress", async () => {
		const app = await renderApp("/(progress)/week");
		await testRouter.replace("/month");
		expect(screen.getByText("month")).toBeTruthy();
		expect(tabGroup(app)).toBe("(progress)");
		await testRouter.replace("/year");
		expect(tabGroup(app)).toBe("(progress)");
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
