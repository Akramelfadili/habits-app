import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { useAsyncAction } from "@/utils/use-async-action";
import { CATEGORY_ROTATION } from "../constants";
import {
	makeCategory,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";
import type { Category, CreateCategoryInput } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { categoriesCopy } from "../messages";
import { AddCategorySheet } from "./add-category-sheet";

const CREATE_FAILED_MESSAGE = categoriesCopy.addSheet.failed;

const music = makeCategory({ id: 11, name: "Music", ...CATEGORY_ROTATION[0] });
const categories = [...TEST_BUILT_IN_CATEGORIES, music];

function Harness({
	create,
	onCreated = jest.fn(),
	onDismiss = jest.fn(),
}: {
	create: (input: CreateCategoryInput) => Promise<Category>;
	onCreated?: (category: Category) => void;
	onDismiss?: () => void;
}) {
	const action = useAsyncAction(create);
	return (
		<AddCategorySheet
			visible
			categories={categories}
			onDismiss={onDismiss}
			onCreate={action.execute}
			onCreated={onCreated}
			isCreating={action.isLoading}
		/>
	);
}

const nameField = () => screen.getByPlaceholderText("e.g. Journaling");
// Found by position: it shows a spinner, no label, while busy.
const addButton = () => {
	const button = screen.getAllByRole("button").at(-1);
	if (!button) throw new Error("No Add button");
	return button;
};
const isAddDisabled = () => addButton().props.accessibilityState.disabled;

describe("AddCategorySheet", () => {
	it("blocks Add with a reason until a name is typed (F2a)", async () => {
		await render(<Harness create={jest.fn()} />);
		expect(isAddDisabled()).toBe(true);
		expect(screen.getByText("Add a name to create this category")).toBeTruthy();
		expect(screen.getByText("Your category")).toBeTruthy();
	});

	it("previews the next rotation pick live, and creates exactly that (F2b)", async () => {
		const created = makeCategory({ id: 12, name: "Journaling" });
		const create = jest.fn().mockResolvedValue(created);
		const onCreated = jest.fn();
		await render(<Harness create={create} onCreated={onCreated} />);

		await fireEvent.changeText(nameField(), "  Journaling ");
		expect(screen.getByTestId("category-preview")).toBeTruthy();
		expect(screen.getByText("Journaling")).toBeTruthy();
		expect(isAddDisabled()).toBe(false);

		await fireEvent.press(addButton());
		await waitFor(() =>
			expect(create).toHaveBeenCalledWith({
				name: "Journaling",
				...CATEGORY_ROTATION[1],
			}),
		);
		expect(onCreated).toHaveBeenCalledWith(created);
	});

	it("flags a duplicate, custom or built-in, hiding the preview (F2c)", async () => {
		await render(<Harness create={jest.fn()} />);

		await fireEvent.changeText(nameField(), "MUSIC ");
		expect(
			screen.getByText("Music already exists. Choose another name."),
		).toBeTruthy();
		expect(screen.queryByTestId("category-preview")).toBeNull();
		expect(isAddDisabled()).toBe(true);
	});

	it("stops at 20 characters, counter from 16, trimming a paste to fit", async () => {
		await render(<Harness create={jest.fn()} />);

		await fireEvent.changeText(nameField(), "x".repeat(15));
		expect(screen.queryByText("15 / 20")).toBeNull();
		await fireEvent.changeText(nameField(), "x".repeat(16));
		expect(screen.getByText("16 / 20")).toBeTruthy();
		await fireEvent.changeText(nameField(), "y".repeat(30));
		expect(nameField().props.value).toBe("y".repeat(20));
		expect(screen.getByText("20 / 20")).toBeTruthy();
	});

	it("on a failed add: stays open, keeps the name, re-enables Add, shows the error", async () => {
		let reject: (error: Error) => void = () => {};
		const create = jest.fn(
			() =>
				new Promise<Category>((_resolve, rejectWith) => {
					reject = rejectWith;
				}),
		);
		const onCreated = jest.fn();
		const onDismiss = jest.fn();
		await render(
			<Harness create={create} onCreated={onCreated} onDismiss={onDismiss} />,
		);

		await fireEvent.changeText(nameField(), "Journaling");
		// Not awaited (the handler settles only when the write rejects); inside act() so the busy state is flushed.
		let pressing: Promise<unknown> = Promise.resolve();
		await act(async () => {
			pressing = fireEvent.press(addButton());
			await waitFor(() => expect(create).toHaveBeenCalled());
		});
		await waitFor(() =>
			expect(addButton().props.accessibilityState).toMatchObject({
				disabled: true,
				busy: true,
			}),
		);

		await act(async () => reject(new Error("disk full")));
		await pressing;

		await waitFor(() =>
			expect(screen.getByText(CREATE_FAILED_MESSAGE)).toBeTruthy(),
		);
		expect(nameField().props.value).toBe("Journaling");
		expect(isAddDisabled()).toBe(false);
		expect(onCreated).not.toHaveBeenCalled();
		expect(onDismiss).not.toHaveBeenCalled();
		expect(screen.getByRole("alert")).toBeTruthy();
		expect(screen.getByTestId("category-preview")).toBeTruthy();

		await fireEvent.changeText(nameField(), "Journaling!");
		expect(screen.queryByText(CREATE_FAILED_MESSAGE)).toBeNull();
	});

	it("Close dismisses without creating", async () => {
		const create = jest.fn();
		const onDismiss = jest.fn();
		await render(<Harness create={create} onDismiss={onDismiss} />);
		await fireEvent.press(screen.getByText("Close"));
		expect(onDismiss).toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
	});

	describe("Return key", () => {
		it("adds the category when Return is pressed on a valid name", async () => {
			const created = makeCategory({ id: 12, name: "Journaling" });
			const create = jest.fn().mockResolvedValue(created);
			const onCreated = jest.fn();
			await render(<Harness create={create} onCreated={onCreated} />);

			await fireEvent.changeText(nameField(), "Journaling");
			expect(nameField().props.returnKeyType).toBe("done");
			await fireEvent(nameField(), "submitEditing");

			await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
			await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
		});

		it("does nothing but put the keyboard away when the name is empty or a duplicate", async () => {
			const create = jest.fn();
			await render(<Harness create={create} />);

			await fireEvent(nameField(), "submitEditing");
			await fireEvent.changeText(nameField(), "Music");
			await fireEvent(nameField(), "submitEditing");

			expect(create).not.toHaveBeenCalled();
		});
	});
});
