import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react-native";

jest.mock("../../services/habit-create-service", () => ({
	createHabitWithReminders: jest.fn(),
}));
jest.mock("../../repositories/habit-repository", () => ({
	deleteAllHabits: jest.fn(),
}));
jest.mock("../../services/reminder-service", () => ({
	updateHabitAndSyncReminders: jest.fn(),
}));
jest.mock("../../dev/dev-seeds", () => ({
	seedStreakAtRiskHabit: jest.fn(),
	seedHabitWithHistory: jest.fn(),
}));
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	setSetting: jest.fn(),
	deleteSetting: jest.fn(),
}));

import { useTodayDevActions } from "../../hooks/use-today-dev-actions";
import { inProduction } from "../../test-support/in-production";
import { TodayDevButtons } from "./today-dev-buttons";
import { TodayEmptyState } from "./today-empty-state";

/** The real hooks feeding the real buttons, as Today wires them. */
function Wired({ populated }: { populated: boolean }) {
	const dev = useTodayDevActions();
	return populated ? (
		<TodayDevButtons dev={dev} withClearAll />
	) : (
		<TodayEmptyState
			onAddHabit={jest.fn()}
			onBrowseSuggestions={jest.fn()}
			dev={dev}
		/>
	);
}

describe("the (dev) buttons on Today", () => {
	it("render in a development build — so the production checks below are not vacuous", async () => {
		await render(<Wired populated />);
		expect(screen.getByText("Clear all habits (dev)")).toBeTruthy();
		expect(screen.getByText("Seed streak-at-risk habit (dev)")).toBeTruthy();
		expect(screen.getByText("Seed habit with history (dev)")).toBeTruthy();
		expect(screen.getByText("Reset First Run (dev)")).toBeTruthy();
	});

	it.each([
		["the populated list", true],
		["the empty state", false],
	])("never render in a production build (%s)", async (_where, populated) => {
		await inProduction(async () => {
			await render(<Wired populated={populated} />);
			expect(screen.queryByText(/\(dev\)/)).toBeNull();
		});
	});

	it("are the only place a '(dev)' button label is written, so none can be added ungated", () => {
		const root = path.resolve(__dirname, "../../..");
		const offenders: string[] = [];
		const walk = (dir: string) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) walk(full);
				else if (
					/\.tsx?$/.test(entry.name) &&
					!/\.test\.tsx?$/.test(entry.name) &&
					/label=["'][^"']*\(dev\)/.test(fs.readFileSync(full, "utf8")) &&
					!full.endsWith("today-dev-buttons.tsx")
				) {
					offenders.push(path.relative(root, full));
				}
			}
		};
		walk(root);
		expect(offenders).toEqual([]);
	});
});
