import { fireEvent, render, screen } from "@testing-library/react-native";
import { LibrarySectionHeader } from "./library-section-header";

describe("LibrarySectionHeader", () => {
	it("a plain header is one heading, shown in caps, with no button", async () => {
		await render(<LibrarySectionHeader label="Active · 7" />);
		expect(screen.getByRole("header")).toBeTruthy();
		expect(screen.getByText("ACTIVE · 7")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("an action sits at the far edge and fires", async () => {
		const onAction = jest.fn();
		await render(
			<LibrarySectionHeader
				label="Active · 7"
				actionLabel="Reorder"
				onAction={onAction}
			/>,
		);
		await fireEvent.press(screen.getByRole("button", { name: "Reorder" }));
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it("the action can carry the section's name for VoiceOver, and its expanded state", async () => {
		await render(
			<LibrarySectionHeader
				label="Archived · 2"
				actionLabel="Show"
				actionAccessibilityLabel="Archived, 2, collapsed"
				expanded={false}
				onAction={jest.fn()}
			/>,
		);
		const button = screen.getByRole("button", {
			name: "Archived, 2, collapsed",
		});
		expect(button.props.accessibilityState).toEqual({ expanded: false });
		expect(screen.getByText("Show")).toBeTruthy();
	});

	it("the action is at least 44 pt each way", async () => {
		await render(
			<LibrarySectionHeader
				label="Active · 7"
				actionLabel="Reorder"
				onAction={jest.fn()}
			/>,
		);
		const style = screen.getByRole("button").props.style;
		const flat = Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
		expect([flat.minHeight, flat.minWidth]).toEqual([44, 44]);
	});
});
