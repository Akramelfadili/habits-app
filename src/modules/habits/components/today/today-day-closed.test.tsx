import { render, screen } from "@testing-library/react-native";
import { makeHabit } from "../../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { TodayDayClosed } from "./today-day-closed";

const run = makeHabit({ id: 1, name: "Run" });

describe("TodayDayClosed", () => {
	it("celebrates and previews tomorrow with its reminder time", async () => {
		await render(
			<TodayDayClosed
				total={3}
				tomorrowPreview={[run]}
				tomorrowReminderTimeByHabitId={new Map([[1, "07:20"]])}
			/>,
		);
		expect(screen.getByText("All three done")).toBeTruthy();
		expect(screen.getByText("Run")).toBeTruthy();
		expect(screen.getByText("07:20")).toBeTruthy();
	});

	it("omits the preview card when nothing is due tomorrow", async () => {
		await render(
			<TodayDayClosed
				total={1}
				tomorrowPreview={[]}
				tomorrowReminderTimeByHabitId={new Map()}
			/>,
		);
		expect(screen.queryByText("Tomorrow")).toBeNull();
	});
});
