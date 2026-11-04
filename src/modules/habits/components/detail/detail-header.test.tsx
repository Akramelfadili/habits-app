import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet } from "react-native";
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
			accessibilityLabel="Upper body. Fitness, Tuesday and Thursday."
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
				name: "Upper body. Fitness, Tuesday and Thursday.",
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

describe("DetailHeader focus on route entry (08.4)", () => {
	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it("puts the screen reader on the title once the push has settled", async () => {
		jest.useFakeTimers();
		const send = jest
			.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
			.mockImplementation();
		await renderHeader();
		jest.advanceTimersByTime(400);
		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0][1]).toBe("focus");
	});
});
