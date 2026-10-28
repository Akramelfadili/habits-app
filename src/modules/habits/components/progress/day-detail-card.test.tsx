import { fireEvent, render, screen } from "@testing-library/react-native";
import { DayDetailCard } from "./day-detail-card";

const detail = {
	title: "Tuesday, 14 July",
	summary: "4 of 5 done · 80%",
	editable: true,
	accessibilityLabel: "Tuesday 14 July, 4 of 5 done · 80%",
	rows: [
		{ key: "1", name: "Drink water", dot: "#00aa88", state: "8 of 8" },
		{ key: "2", name: "No social media", dot: "#2277dd", state: "Resisted" },
		{ key: "3", name: "Read 20 min", dot: "#cc7700", state: "Missed" },
	],
};

describe("DayDetailCard (P13)", () => {
	it("shows the date, the count and each habit's state", async () => {
		await render(
			<DayDetailCard detail={detail} onClose={jest.fn()} onEdit={jest.fn()} />,
		);
		expect(screen.getByText("Tuesday, 14 July")).toBeTruthy();
		expect(screen.getByText("4 of 5 done · 80%")).toBeTruthy();
		expect(screen.getByLabelText("Read 20 min, Missed")).toBeTruthy();
		expect(screen.getByText("Resisted")).toBeTruthy();
	});

	it("opens Edit this day, and closes", async () => {
		const onEdit = jest.fn();
		const onClose = jest.fn();
		await render(
			<DayDetailCard detail={detail} onClose={onClose} onEdit={onEdit} />,
		);
		await fireEvent.press(
			screen.getByRole("button", { name: "Edit this day" }),
		);
		await fireEvent.press(screen.getByText("Close"));
		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("offers no Edit this day for a day that has not happened", async () => {
		await render(
			<DayDetailCard
				detail={{ ...detail, editable: false }}
				onClose={jest.fn()}
				onEdit={jest.fn()}
			/>,
		);
		expect(screen.queryByRole("button", { name: "Edit this day" })).toBeNull();
	});
});
