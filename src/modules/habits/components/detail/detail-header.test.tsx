import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { DetailHeader } from "./detail-header";

let mockLargeText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockLargeText,
}));

beforeEach(() => {
	mockLargeText = false;
});

function renderHeader(onEdit = jest.fn()) {
	return render(
		<DetailHeader
			eyebrow="Fitness · Tue, Thu"
			title="Upper body"
			accessibilityLabel="Upper body, heading. Fitness, Tuesday and Thursday."
			onEdit={onEdit}
		/>,
	).then(() => onEdit);
}

describe("DetailHeader", () => {
	it("is one heading: the eyebrow in caps over the name", async () => {
		await renderHeader();
		expect(screen.getByText("FITNESS · TUE, THU")).toBeTruthy();
		expect(screen.getByText("Upper body")).toBeTruthy();
		expect(
			screen.getByRole("header", {
				name: "Upper body, heading. Fitness, Tuesday and Thursday.",
			}),
		).toBeTruthy();
	});

	it("Edit is a 44 pt pill that opens the editor", async () => {
		const onEdit = await renderHeader();
		const edit = screen.getByRole("button", { name: "Edit" });
		expect(StyleSheet.flatten(edit.props.style).minHeight).toBe(44);
		await fireEvent.press(edit);
		expect(onEdit).toHaveBeenCalledTimes(1);
	});

	it("the name takes two lines, then truncates", async () => {
		await renderHeader();
		expect(screen.getByText("Upper body").props.numberOfLines).toBe(2);
	});

	it("D8: at accessibility sizes the name wraps freely and Edit moves above the title", async () => {
		mockLargeText = true;
		await renderHeader();
		expect(screen.getByText("Upper body").props.numberOfLines).toBeUndefined();
		const block = screen.getByRole("header").parent;
		expect(StyleSheet.flatten(block?.props.style).flexDirection).not.toBe(
			"row",
		);
	});
});
