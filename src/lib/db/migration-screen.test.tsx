import { render, screen } from "@testing-library/react-native";
import { migrationCopy } from "@/modules/habits/messages";

const mockHide = jest.fn();
jest.mock("expo-splash-screen", () => ({ hide: () => mockHide() }));

import { MigrationScreen } from "./migration-screen";

beforeEach(() => jest.clearAllMocks());

describe("MigrationScreen (SY3)", () => {
	it("drops the splash, which would otherwise cover it until the database is ready", async () => {
		await render(<MigrationScreen copy={migrationCopy.updating} />);
		expect(mockHide).toHaveBeenCalledTimes(1);
	});

	it("is a heading, a line of why, an indeterminate bar and the keep-open line", async () => {
		await render(<MigrationScreen copy={migrationCopy.updating} />);
		expect(screen.getByRole("header").props.children).toBe(
			"Updating your data",
		);
		expect(screen.getByLabelText("Updating your habits")).toBeTruthy();
		const bar = screen.getByTestId("progress-bar");
		expect(bar.props.accessibilityState).toEqual({ busy: true });
		expect(bar.props.accessibilityValue).toBeUndefined();
		expect(
			screen.getByText("Keep the app open. No habits or history are deleted."),
		).toBeTruthy();
	});

	it("offers no way to cancel: the run is all or nothing", async () => {
		await render(<MigrationScreen copy={migrationCopy.updating} />);
		expect(screen.queryAllByRole("button")).toHaveLength(0);
	});
});
