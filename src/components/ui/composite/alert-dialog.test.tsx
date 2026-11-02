import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet } from "react-native";
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

describe("AlertDialog — the offer layout (FR3)", () => {
	it("moves the screen reader onto the primary action when it opens (08.3)", async () => {
		jest.useFakeTimers();
		const send = jest
			.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
			.mockImplementation(() => {});
		try {
			await render(
				<AlertDialog
					visible
					layout="offer"
					title="Remind you each day?"
					message="m"
					actions={[
						{ label: "Allow reminders", onPress: jest.fn(), tone: "primary" },
						{ label: "Not now", onPress: jest.fn(), tone: "primary" },
					]}
					onRequestClose={jest.fn()}
				/>,
			);
			await act(() => jest.advanceTimersByTime(500));
			expect(send).toHaveBeenCalledWith(expect.anything(), "focus");
		} finally {
			send.mockRestore();
			jest.useRealTimers();
		}
	});

	const offer = (allow = jest.fn(), notNow = jest.fn()) => [
		{ label: "Allow reminders", onPress: allow, tone: "primary" as const },
		{ label: "Not now", onPress: notNow, tone: "primary" as const },
	];

	it("shows the question with the yes first and the no under it, both reachable as buttons", async () => {
		await render(
			<AlertDialog
				visible
				layout="offer"
				title="Remind you each day?"
				message="A nudge at 09:00 to log Drink water."
				actions={offer()}
				onRequestClose={jest.fn()}
			/>,
		);
		expect(screen.getAllByRole("button")).toHaveLength(2);
		expect(screen.getByText("Remind you each day?")).toBeTruthy();
		expect(screen.getByText("Allow reminders")).toBeTruthy();
		expect(screen.getByText("Not now")).toBeTruthy();
	});

	it("runs the chosen action", async () => {
		const allow = jest.fn();
		const notNow = jest.fn();
		await render(
			<AlertDialog
				visible
				layout="offer"
				title="t"
				message="m"
				actions={offer(allow, notNow)}
				onRequestClose={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByText("Not now"));
		expect(notNow).toHaveBeenCalledTimes(1);
		expect(allow).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByText("Allow reminders"));
		expect(allow).toHaveBeenCalledTimes(1);
	});
});
