import { fireEvent, render, screen } from "@testing-library/react-native";
import { PastDayBar } from "./past-day-bar";

describe("PastDayBar (T10)", () => {
	it("says where logs go and offers the way back", async () => {
		const onShowToday = jest.fn();
		await render(
			<PastDayBar dayLabel="Wed 21 Oct" onShowToday={onShowToday} />,
		);
		expect(screen.getByText("Logging for Wed 21 Oct")).toBeTruthy();
		await fireEvent.press(screen.getByRole("button", { name: "Show today" }));
		expect(onShowToday).toHaveBeenCalledTimes(1);
	});
});
