import { render, screen } from "@testing-library/react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import {
	EditHabitRouteScreen,
	ProgressMonthRouteScreen,
} from "./route-param-guards";

jest.mock("expo-router", () => ({
	Redirect: ({ href }: { href: string }) => {
		const { Text } = require("react-native");
		return <Text>{`redirect:${href}`}</Text>;
	},
}));
jest.mock("./habit-form-screen", () => ({
	HabitFormScreen: ({
		habitId,
		focus,
	}: {
		habitId: number;
		focus?: string;
	}) => {
		const { Text } = require("react-native");
		return <Text>{`form:${habitId}:${focus ?? "-"}`}</Text>;
	},
}));
jest.mock("./progress-month-screen", () => ({
	ProgressMonthScreen: ({ month }: { month: string }) => {
		const { Text } = require("react-native");
		return <Text>{`month:${month}`}</Text>;
	},
}));

const warnings = () =>
	getLogEntries().filter((entry) => entry.event === "route.invalid_param");

beforeEach(() => clearLog());

describe("EditHabitRouteScreen", () => {
	it("hands a positive integer id to the form as a number", async () => {
		await render(<EditHabitRouteScreen id="12" focus="frequency" />);
		expect(screen.getByText("form:12:frequency")).toBeTruthy();
		expect(warnings()).toHaveLength(0);
	});

	it("drops a focus it does not know", async () => {
		await render(<EditHabitRouteScreen id="3" focus="name" />);
		expect(screen.getByText("form:3:-")).toBeTruthy();
	});

	it.each(["-3", "abc", "0", "1.5", ""])(
		"sends id %p to Today and logs why, not what",
		async (id) => {
			await render(<EditHabitRouteScreen id={id} focus={undefined} />);
			expect(screen.getByText("redirect:/")).toBeTruthy();
			expect(screen.queryByText(/^form:/)).toBeNull();
			const logged = warnings();
			expect(logged).toHaveLength(1);
			expect(logged[0].level).toBe("warn");
			expect(logged[0].fields).toEqual({
				scope: "edit-habit",
				reason: id === "" ? "missing" : "not_positive_integer",
			});
		},
	);
});

describe("ProgressMonthRouteScreen", () => {
	it("hands a real yyyy-MM-dd day to the month screen", async () => {
		await render(<ProgressMonthRouteScreen month="2026-07-01" />);
		expect(screen.getByText("month:2026-07-01")).toBeTruthy();
		expect(warnings()).toHaveLength(0);
	});

	it.each([
		["garbage", "bad_format"],
		["2026-02-31", "invalid_date"],
	])("sends %s to Today with reason %s", async (month, reason) => {
		await render(<ProgressMonthRouteScreen month={month} />);
		expect(screen.getByText("redirect:/")).toBeTruthy();
		expect(warnings().map((entry) => entry.fields)).toEqual([
			{ scope: "month", reason },
		]);
	});
});
