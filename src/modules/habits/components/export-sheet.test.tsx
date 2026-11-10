import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useToastStore } from "@/store/toast-store";
import { makeExportSource } from "../test-support/export-fixtures";

const mockSource = makeExportSource();
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockSource.frozenDays,
}));
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({ habits: mockSource.habits, loaded: true }),
}));
jest.mock("../repositories/entry-repository", () => ({
	useAllEntries: () => mockSource.entries,
	useEntryNotes: () => mockSource.notes,
}));
jest.mock("../repositories/reminder-repository", () => ({
	useAllReminders: () => mockSource.reminders,
}));
jest.mock("../repositories/category-repository", () => ({
	useCategories: () => mockSource.categories,
}));
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	useAppSetting: () => null,
}));
jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

const mockRunExport = jest.fn();
const mockShare = jest.fn();
jest.mock("@/lib/file-export/file-export", () => ({
	shareFile: (...args: unknown[]) => mockShare(...args),
}));
jest.mock("../services/export-service", () => {
	class ExportCancelledError extends Error {}
	class ExportFailedError extends Error {
		reason: unknown;
		constructor(reason: unknown) {
			super("failed");
			this.reason = reason;
		}
	}
	return {
		ExportCancelledError,
		ExportFailedError,
		exportFileName: (_today: Date, extension: string) =>
			`habits-2026-10-23.${extension}`,
		runExport: (...args: unknown[]) => mockRunExport(...args),
	};
});

import { useExportStore } from "../hooks/use-export-actions";
import { ExportFailedError } from "../services/export-service";
import { ExportSheet } from "./export-sheet";

const result = {
	uri: "file:///habits-2026-10-23.json",
	name: "habits-2026-10-23.json",
	sizeBytes: 49152,
	mimeType: "application/json",
	habits: 9,
	logs: 1284,
};

beforeEach(() => {
	jest.clearAllMocks();
	useToastStore.setState({ toast: null });
	useExportStore.setState({
		phase: { name: "confirm" },
		openSheets: 0,
		last: null,
		shareFailed: false,
	});
});

describe("ExportSheet — choose a format (EX1)", () => {
	it("offers JSON or CSV, defaults to JSON, and says what each is for", async () => {
		await render(<ExportSheet visible onClose={jest.fn()} />);
		expect(screen.getByText("Export data")).toBeTruthy();
		expect(
			screen.getByRole("tab", { name: "JSON" }).props.accessibilityState
				.selected,
		).toBe(true);
		expect(screen.getByRole("tab", { name: "CSV" })).toBeTruthy();
		expect(
			screen.getByText(
				"JSON has everything, for backup or another app. CSV has one row per log, for spreadsheets.",
			),
		).toBeTruthy();
		expect(screen.getByText("Export JSON")).toBeTruthy();
	});

	it("the button follows the format", async () => {
		await render(<ExportSheet visible onClose={jest.fn()} />);
		await fireEvent.press(screen.getByRole("tab", { name: "CSV" }));
		expect(screen.getByText("Export CSV")).toBeTruthy();
	});

	it("has no archived toggle: archived habits are always included", async () => {
		mockRunExport.mockImplementation(() => new Promise(() => {}));
		await render(<ExportSheet visible onClose={jest.fn()} />);
		expect(screen.queryByText(/archived/i)).toBeNull();
		await fireEvent.press(screen.getByText("Export JSON"));
		expect(mockRunExport.mock.calls[0][0].options).toEqual({
			format: "json",
			includeArchived: true,
			includeNotes: true,
		});
		const sent = mockRunExport.mock.calls[0][0].source;
		expect(sent.habits).toHaveLength(3);
		expect(sent.reminders).toHaveLength(2);
		expect(sent.categories).toHaveLength(11);
		expect(sent.frozenDays).toHaveLength(1);
		expect(sent.entries).toHaveLength(4);
	});

	it("has an Include notes switch, on by default, named for VoiceOver", async () => {
		await render(<ExportSheet visible onClose={jest.fn()} />);
		const toggle = screen.getByRole("switch", {
			name: "Include notes in the export",
		});
		expect(toggle.props.accessibilityState.checked).toBe(true);
	});

	it("turning Include notes off sends includeNotes: false to the export", async () => {
		mockRunExport.mockImplementation(() => new Promise(() => {}));
		await render(<ExportSheet visible onClose={jest.fn()} />);
		await fireEvent.press(
			screen.getByRole("switch", { name: "Include notes in the export" }),
		);
		expect(
			screen.getByRole("switch", { name: "Include notes in the export" }).props
				.accessibilityState.checked,
		).toBe(false);
		await fireEvent.press(screen.getByText("Export JSON"));
		expect(mockRunExport.mock.calls[0][0].options.includeNotes).toBe(false);
	});

	it("Close leaves without exporting", async () => {
		const onClose = jest.fn();
		await render(<ExportSheet visible onClose={onClose} />);
		await fireEvent.press(screen.getByText("Close"));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(mockRunExport).not.toHaveBeenCalled();
	});
});

describe("ExportSheet — writing (EX2)", () => {
	async function startWriting(onClose = jest.fn()) {
		let finish: (value: typeof result) => void = () => {};
		mockRunExport.mockImplementation(
			({ onProgress }) =>
				new Promise((resolve) => {
					onProgress({ done: 62, total: 100 });
					finish = resolve;
				}),
		);
		await render(<ExportSheet visible onClose={onClose} />);
		await fireEvent.press(screen.getByText("Export JSON"));
		return { onClose, finish: (value = result) => finish(value) };
	}

	it("names the file, shows a real percentage, locks the format and reads Exporting…", async () => {
		await startWriting();
		expect(
			screen.getByLabelText("Writing habits-2026-10-23.json, 62 percent"),
		).toBeTruthy();
		expect(screen.getByText("62%")).toBeTruthy();
		expect(
			screen.getByRole("tab", { name: "CSV" }).props.accessibilityState
				.disabled,
		).toBe(true);
		expect(
			screen.getByRole("tab", { name: "JSON" }).props.accessibilityState,
		).toMatchObject({ selected: true, disabled: false });
		expect(
			screen.getByText("Exporting…").parent?.props.accessibilityState.disabled,
		).toBe(true);
		expect(
			screen.getByText(
				"Usually under a second. Closing the sheet keeps it going; a toast says when it’s ready.",
			),
		).toBeTruthy();
	});

	it("closing the sheet keeps the export running, and a toast says when it is ready", async () => {
		const onClose = jest.fn();
		const started = await startWriting(onClose);
		const { rerender } = screen;
		await fireEvent.press(screen.getByText("Close"));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(useExportStore.getState().phase.name).toBe("progress");
		await rerender(<ExportSheet visible={false} onClose={onClose} />);

		await act(async () => {
			started.finish();
		});
		await act(async () => {});
		expect(useExportStore.getState().phase.name).toBe("ready");
		expect(useToastStore.getState().toast?.message).toBe(
			"Export ready · habits-2026-10-23.json",
		);
	});

	it("reopening shows the running export, not a fresh choice", async () => {
		await startWriting();
		await screen.rerender(<ExportSheet visible={false} onClose={jest.fn()} />);
		await screen.rerender(<ExportSheet visible onClose={jest.fn()} />);
		expect(screen.getByText("Exporting…")).toBeTruthy();
	});
});

describe("ExportSheet — ready (EX3)", () => {
	async function ready() {
		mockRunExport.mockResolvedValue(result);
		await render(<ExportSheet visible onClose={jest.fn()} />);
		await fireEvent.press(screen.getByText("Export JSON"));
		await screen.findByText("Share file");
	}

	it("shows the file card with size and counts, Share file and Done, and the temporary-file note", async () => {
		await ready();
		expect(
			screen.getByLabelText(
				"habits-2026-10-23.json, 48 KB · 9 habits · 1,284 logs",
			),
		).toBeTruthy();
		expect(
			screen.getByText(
				"Share opens the iOS share sheet. The file is temporary — export again if it’s gone.",
			),
		).toBeTruthy();
		expect(screen.queryByText(/Save to Files/)).toBeNull();
	});

	it("Share file hands the file to the share sheet", async () => {
		mockShare.mockResolvedValue(undefined);
		await ready();
		await fireEvent.press(screen.getByText("Share file"));
		expect(mockShare).toHaveBeenCalledWith(result.uri, result.mimeType);
	});

	it("a share that cannot open says so inline", async () => {
		mockShare.mockRejectedValue(new Error("none"));
		await ready();
		await fireEvent.press(screen.getByText("Share file"));
		expect(
			await screen.findByText("Couldn’t share the file. Try again."),
		).toBeTruthy();
	});

	it("Done closes and the next open starts at the choice", async () => {
		const onClose = jest.fn();
		mockRunExport.mockResolvedValue(result);
		await render(<ExportSheet visible onClose={onClose} />);
		await fireEvent.press(screen.getByText("Export JSON"));
		await fireEvent.press(await screen.findByText("Done"));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(useExportStore.getState().phase.name).toBe("confirm");
	});
});

describe("ExportSheet — failed (EX4)", () => {
	async function failWith(
		reason: { kind: "storage"; neededBytes: number } | { kind: "unknown" },
	) {
		mockRunExport.mockRejectedValueOnce(new ExportFailedError(reason));
		await render(<ExportSheet visible onClose={jest.fn()} />);
		await fireEvent.press(screen.getByText("Export JSON"));
		await screen.findByText("Export failed");
	}

	it("storage: says why first and that nothing changed, with Retry primary", async () => {
		await failWith({ kind: "storage", neededBytes: 4000 });
		expect(
			screen.getByText(
				"Not enough storage on this iPhone. Nothing was changed — free up space, then retry.",
			),
		).toBeTruthy();
		expect(screen.getByText("Retry")).toBeTruthy();
		expect(screen.getByText("Cancel")).toBeTruthy();
	});

	it("any other failure says nothing was changed too", async () => {
		await failWith({ kind: "unknown" });
		expect(
			screen.getByText(
				"Something went wrong while writing the file. Nothing was changed — try again.",
			),
		).toBeTruthy();
	});

	it("Retry runs it again with the same format and reaches ready", async () => {
		await failWith({ kind: "storage", neededBytes: 4000 });
		mockRunExport.mockResolvedValueOnce(result);
		await fireEvent.press(screen.getByText("Retry"));
		await screen.findByText("Share file");
		expect(mockRunExport).toHaveBeenCalledTimes(2);
	});

	it("Cancel closes without a retry", async () => {
		const onClose = jest.fn();
		mockRunExport.mockRejectedValueOnce(
			new ExportFailedError({ kind: "unknown" }),
		);
		await render(<ExportSheet visible onClose={onClose} />);
		await fireEvent.press(screen.getByText("Export JSON"));
		await fireEvent.press(await screen.findByText("Cancel"));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(useExportStore.getState().phase.name).toBe("confirm");
	});
});

describe("ExportSheet — VoiceOver and focus (08.3, 08.4)", () => {
	let focus: jest.SpyInstance;
	beforeEach(() => {
		jest.useFakeTimers();
		focus = jest
			.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
			.mockImplementation();
	});
	afterEach(() => {
		focus.mockRestore();
		jest.useRealTimers();
	});

	it("the sheet's title is a heading and the screen reader starts on it", async () => {
		await render(<ExportSheet visible onClose={jest.fn()} />);
		expect(screen.getByRole("header", { name: "Export data" })).toBeTruthy();
		await act(async () => {
			jest.advanceTimersByTime(500);
		});
		expect(focus).toHaveBeenCalledWith(expect.anything(), "focus");
	});

	it("reads the format as a labelled choice with the picked one selected", async () => {
		await render(<ExportSheet visible onClose={jest.fn()} />);
		expect(screen.getByLabelText("File format")).toBeTruthy();
		expect(
			screen.getByRole("tab", { name: "JSON" }).props.accessibilityState
				.selected,
		).toBe(true);
	});

	it("moves the screen reader onto the file when the export finishes", async () => {
		mockRunExport.mockResolvedValue(result);
		await render(<ExportSheet visible onClose={jest.fn()} />);
		await act(async () => {
			jest.advanceTimersByTime(500);
		});
		focus.mockClear();
		await fireEvent.press(screen.getByText("Export JSON"));
		await screen.findByText("Share file");
		await act(async () => {
			jest.advanceTimersByTime(200);
		});
		expect(focus).toHaveBeenCalledTimes(1);
		const [target] = focus.mock.calls[0];
		expect(target.props?.accessibilityLabel ?? "").toContain(
			"habits-2026-10-23.json",
		);
	});

	it("moves the screen reader onto the error when the export fails, and the error is an alert", async () => {
		mockRunExport.mockRejectedValueOnce(
			new ExportFailedError({ kind: "unknown" }),
		);
		await render(<ExportSheet visible onClose={jest.fn()} />);
		await fireEvent.press(screen.getByText("Export JSON"));
		await screen.findByText("Export failed");
		// The title's own focus is still 250 ms away: only the error's has fired.
		await act(async () => {
			jest.advanceTimersByTime(150);
		});
		expect(screen.getByRole("alert")).toBeTruthy();
		expect(focus).toHaveBeenCalledTimes(1);
		expect(focus.mock.calls[0][0].props?.accessibilityRole).toBe("alert");
	});
});
