import { fireEvent, render, screen } from "@testing-library/react-native";
import { ArchivedBanner } from "./archived-banner";

function renderBanner(
	overrides: Partial<React.ComponentProps<typeof ArchivedBanner>> = {},
) {
	const props = {
		title: "Archived on 2 September",
		detail: "Hidden from Today. All 41 logs kept.",
		onRestore: jest.fn(),
		...overrides,
	};
	return render(<ArchivedBanner {...props} />).then(() => props);
}

describe("ArchivedBanner", () => {
	it("default: states the archive date and keeps Restore at hand", async () => {
		const props = await renderBanner();
		expect(screen.getByText("Archived on 2 September")).toBeTruthy();
		expect(
			screen.getByText("Hidden from Today. All 41 logs kept."),
		).toBeTruthy();

		await fireEvent.press(screen.getByText("Restore"));
		expect(props.onRestore).toHaveBeenCalledTimes(1);
	});

	it("dismissed: collapses in place, leaving nothing on screen", async () => {
		await renderBanner({ state: "dismissed" });
		expect(screen.queryByTestId("archived-banner")).toBeNull();
		expect(screen.queryByText("Restore")).toBeNull();
	});

	it("disabled: Restore can't be pressed again mid-restore", async () => {
		const props = await renderBanner({ disabled: true });
		await fireEvent.press(screen.getByText("Restore"));
		expect(props.onRestore).not.toHaveBeenCalled();
	});
});
