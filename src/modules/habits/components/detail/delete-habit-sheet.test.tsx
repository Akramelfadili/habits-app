import { fireEvent, render, screen } from "@testing-library/react-native";
import { DeleteHabitSheet } from "./delete-habit-sheet";

function renderSheet(
	props: Partial<React.ComponentProps<typeof DeleteHabitSheet>> = {},
) {
	const handlers = {
		onCancel: jest.fn(),
		onArchive: jest.fn(),
		onDelete: jest.fn(),
	};
	return render(
		<DeleteHabitSheet
			visible
			habitName="Read 20 min"
			logCount={214}
			canArchive
			isDeleting={false}
			failed={false}
			{...handlers}
			{...props}
		/>,
	).then(() => handlers);
}

describe("DeleteHabitSheet (DC1)", () => {
	it("names the habit and what is lost: its logs, counted", async () => {
		await renderSheet();
		expect(screen.getByText("Delete Read 20 min?")).toBeTruthy();
		expect(
			screen.getByText(
				"Deletes Read 20 min and its 214 logs. Archiving keeps them and can be undone.",
			),
		).toBeTruthy();
	});

	it("says '1 log' for one, and that there are none for none", async () => {
		const { rerender } = await render(
			<DeleteHabitSheet
				visible
				habitName="Read 20 min"
				logCount={1}
				canArchive
				isDeleting={false}
				failed={false}
				onCancel={jest.fn()}
				onArchive={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText(/and its 1 log\./)).toBeTruthy();
		await rerender(
			<DeleteHabitSheet
				visible
				habitName="Read 20 min"
				logCount={0}
				canArchive
				isDeleting={false}
				failed={false}
				onCancel={jest.fn()}
				onArchive={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText(/It has no logs yet\./)).toBeTruthy();
	});

	it("Archive instead first (with default focus), then Delete permanently with its hint, then Cancel", async () => {
		await renderSheet();
		const order = screen
			.getAllByText(/^(Archive instead|Delete permanently|Cancel)$/)
			.map((node) => node.props.children);
		expect(order).toEqual(["Archive instead", "Delete permanently", "Cancel"]);
		expect(screen.getByText("Hide from Today, keep history")).toBeTruthy();
		expect(
			screen.getByText("One tap deletes. This can’t be undone."),
		).toBeTruthy();
	});

	it("routes Archive instead, Delete and Cancel", async () => {
		const { onArchive, onDelete, onCancel } = await renderSheet();
		await fireEvent.press(
			screen.getByRole("button", { name: /^Archive instead/ }),
		);
		expect(onArchive).toHaveBeenCalledTimes(1);
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(onDelete).toHaveBeenCalledTimes(1);
		await fireEvent.press(screen.getByText("Cancel"));
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("an archived habit has nothing to offer instead, and the copy does not claim it", async () => {
		await renderSheet({ canArchive: false });
		expect(screen.queryByText("Archive instead")).toBeNull();
		expect(
			screen.getByText(
				"Deletes Read 20 min and its 214 logs. This can’t be undone.",
			),
		).toBeTruthy();
	});

	it("DC3: deleting — the label, the hint, Cancel disabled, nothing fires", async () => {
		const { onDelete, onCancel } = await renderSheet({ isDeleting: true });
		expect(screen.getByText("Deleting…")).toBeTruthy();
		expect(
			screen.getByText("Keep the app open — this takes a moment."),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
		await fireEvent.press(screen.getByText("Deleting…"));
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onDelete).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it("DC4: a failure is a banner in the sheet, and Delete permanently is still there", async () => {
		const { onDelete } = await renderSheet({ failed: true });
		expect(screen.getByRole("alert")).toHaveProp(
			"accessibilityLabel",
			"Couldn’t delete. Nothing was changed. Try again.",
		);
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it("the banner is not shown while a new try is running", async () => {
		await renderSheet({ failed: true, isDeleting: true });
		expect(screen.queryByRole("alert")).toBeNull();
	});
});
