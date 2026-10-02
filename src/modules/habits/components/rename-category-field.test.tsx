import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import {
	makeCategory,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";
import {
	RENAME_FAILED_MESSAGE,
	RenameCategoryField,
} from "./rename-category-field";

const music = makeCategory({ id: 11, name: "Music" });
const garden = makeCategory({ id: 12, name: "Garden" });
const categories = [...TEST_BUILT_IN_CATEGORIES, music, garden];

function renderField(onRename = jest.fn().mockResolvedValue(undefined)) {
	const onDone = jest.fn();
	return render(
		<RenameCategoryField
			category={music}
			categories={categories}
			onRename={onRename}
			onDone={onDone}
		/>,
	).then(() => ({ onRename, onDone }));
}

const field = () => screen.getByLabelText("Rename Music");
const save = () =>
	screen.getByRole("button", { name: "Save new name for Music" });

describe("RenameCategoryField (HAB-25)", () => {
	it("starts from the current name and saves a new one, trimmed", async () => {
		const { onRename, onDone } = await renderField();
		expect(field().props.value).toBe("Music");

		await fireEvent.changeText(field(), "  Piano ");
		await fireEvent.press(save());

		await waitFor(() => expect(onRename).toHaveBeenCalledWith("Piano"));
		expect(onDone).toHaveBeenCalled();
	});

	it("rejects a built-in's name — case and spaces ignored — naming the clash", async () => {
		const { onRename } = await renderField();
		await fireEvent.changeText(field(), " health ");

		expect(
			screen.getByText("You already have Health. Choose a different name."),
		).toBeTruthy();
		expect(save().props.accessibilityState.disabled).toBe(true);
		await fireEvent.press(save());
		expect(onRename).not.toHaveBeenCalled();
	});

	it("rejects another custom's name", async () => {
		await renderField();
		await fireEvent.changeText(field(), "garden");
		expect(save().props.accessibilityState.disabled).toBe(true);
	});

	it("allows its own name in a different case", async () => {
		const { onRename } = await renderField();
		await fireEvent.changeText(field(), "music");

		expect(screen.queryByText(/already have/)).toBeNull();
		await fireEvent.press(save());
		await waitFor(() => expect(onRename).toHaveBeenCalledWith("music"));
	});

	it("blocks an empty name", async () => {
		await renderField();
		await fireEvent.changeText(field(), "   ");
		expect(save().props.accessibilityState.disabled).toBe(true);
	});

	it("stops at 20 characters, trimming a paste to fit", async () => {
		await renderField();
		await fireEvent.changeText(field(), "A very long category name");
		expect(field().props.value).toBe("A very long category");
		expect(screen.getByText("20/20")).toBeTruthy();
	});

	it("saves on the return key", async () => {
		const { onRename } = await renderField();
		await fireEvent.changeText(field(), "Piano");
		await fireEvent(field(), "submitEditing");
		await waitFor(() => expect(onRename).toHaveBeenCalledWith("Piano"));
	});

	it("an unchanged name just leaves edit mode — no write", async () => {
		const { onRename, onDone } = await renderField();
		await fireEvent.press(save());
		await waitFor(() => expect(onDone).toHaveBeenCalled());
		expect(onRename).not.toHaveBeenCalled();
	});

	it("Cancel leaves edit mode without writing", async () => {
		const { onRename, onDone } = await renderField();
		await fireEvent.changeText(field(), "Piano");
		await fireEvent.press(
			screen.getByRole("button", { name: "Cancel renaming Music" }),
		);
		expect(onDone).toHaveBeenCalled();
		expect(onRename).not.toHaveBeenCalled();
	});

	it("a failed write keeps edit mode open with the name and says so", async () => {
		const { onDone } = await renderField(
			jest.fn().mockRejectedValue(new Error("disk full")),
		);
		await fireEvent.changeText(field(), "Piano");
		await fireEvent.press(save());

		expect(await screen.findByText(RENAME_FAILED_MESSAGE)).toBeTruthy();
		expect(field().props.value).toBe("Piano");
		expect(onDone).not.toHaveBeenCalled();
	});
});
