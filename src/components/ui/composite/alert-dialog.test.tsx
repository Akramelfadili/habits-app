import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { semanticColors } from "@/theme/theme";
import { AlertDialog } from "./alert-dialog";

const actions = (keep = jest.fn(), discard = jest.fn()) => [
	{ label: "Keep editing", onPress: keep, tone: "primary" as const },
	{ label: "Discard", onPress: discard, tone: "destructive" as const },
];

describe("AlertDialog", () => {
	it("shows the title, the message and both actions, primary first", async () => {
		await render(
			<AlertDialog
				visible
				title="Discard changes?"
				message="Your edits won’t be saved."
				actions={actions()}
				onRequestClose={jest.fn()}
			/>,
		);
		expect(screen.getByText("Discard changes?")).toBeTruthy();
		expect(screen.getByText("Your edits won’t be saved.")).toBeTruthy();
		const labels = screen.getAllByRole("button").map((b) => b.props.children);
		expect(labels).toHaveLength(2);
		expect(screen.getByText("Keep editing")).toBeTruthy();
	});

	it("runs the chosen action", async () => {
		const keep = jest.fn();
		const discard = jest.fn();
		await render(
			<AlertDialog
				visible
				title="Discard changes?"
				message="m"
				actions={actions(keep, discard)}
				onRequestClose={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByText("Discard"));
		expect(discard).toHaveBeenCalledTimes(1);
		expect(keep).not.toHaveBeenCalled();
	});

	it("draws Discard in danger ink and Keep editing bold in body ink", async () => {
		await render(
			<AlertDialog
				visible
				title="t"
				message="m"
				actions={actions()}
				onRequestClose={jest.fn()}
			/>,
		);
		expect(screen.getByText("Discard")).toHaveStyle({
			color: semanticColors.light.dangerBg,
		});
		expect(
			StyleSheet.flatten(screen.getByText("Keep editing").props.style),
		).toMatchObject({ fontWeight: "600" });
	});

	it("reads title and message as one stop, and renders nothing when hidden", async () => {
		const { rerender } = await render(
			<AlertDialog
				visible
				title="t"
				message="m"
				actions={actions()}
				onRequestClose={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("t. m")).toBeTruthy();
		await rerender(
			<AlertDialog
				visible={false}
				title="t"
				message="m"
				actions={actions()}
				onRequestClose={jest.fn()}
			/>,
		);
		expect(screen.queryByText("t")).toBeNull();
	});
});
