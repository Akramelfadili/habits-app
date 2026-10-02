import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { makeExportSource } from "../test-support/export-fixtures";

jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockSource.frozenDays,
}));
const mockSource = makeExportSource();
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => mockSource.habits,
}));
jest.mock("../repositories/entry-repository", () => ({
	useAllEntries: () => mockSource.entries,
	useEntryNotes: () => mockSource.notes,
}));
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	useAppSetting: () => null,
}));
jest.mock("@/lib/notifications/use-notification-permission", () => ({
	useNotificationPermission: () => "granted",
}));
jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockRunExport = jest.fn();
const mockShare = jest.fn();
const mockSave = jest.fn();
jest.mock("@/lib/file-export/file-export", () => ({
	shareFile: (...args: unknown[]) => mockShare(...args),
	saveFileToFolder: (...args: unknown[]) => mockSave(...args),
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
		runExport: (...args: unknown[]) => mockRunExport(...args),
	};
});

import { ExportFailedError } from "../services/export-service";
import { ExportSheet } from "./export-sheet";

const result = {
	uri: "file:///habits-2026-09-16.csv",
	name: "habits-2026-09-16.csv",
	sizeBytes: 219136,
	mimeType: "text/csv",
	habits: 3,
	logs: 4,
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe("ExportSheet (HAB-15)", () => {
	it("confirm states exactly what goes in the file", async () => {
		await render(<ExportSheet visible onClose={() => {}} />);
		expect(screen.getByText("2 active · 1 archived")).toBeTruthy();
		expect(screen.getByText("4 logs · 1 notes")).toBeTruthy();
		expect(screen.getByText("2 Sep – 15 Sep 2026")).toBeTruthy();
		expect(screen.getByText("Export 4 entries")).toBeTruthy();
	});

	it("the archived toggle updates the counts and the button", async () => {
		await render(<ExportSheet visible onClose={() => {}} />);
		await fireEvent(
			screen.getByLabelText("Include archived habits"),
			"valueChange",
			false,
		);
		expect(screen.getByText("2 active")).toBeTruthy();
		expect(screen.getByText("Export 3 entries")).toBeTruthy();
	});

	it("exports with the chosen format and archived option, then offers Share and Save", async () => {
		mockRunExport.mockResolvedValue(result);
		await render(<ExportSheet visible onClose={() => {}} />);
		await fireEvent.press(screen.getByText("JSON"));
		await fireEvent.press(screen.getByText("Export 4 entries"));

		expect(mockRunExport).toHaveBeenCalledWith(
			expect.objectContaining({
				options: { format: "json", includeArchived: true },
			}),
		);
		expect(await screen.findByText("Export ready")).toBeTruthy();
		expect(screen.getByText("habits-2026-09-16.csv")).toBeTruthy();
		expect(screen.getByText("214 KB · 3 habits · 4 entries")).toBeTruthy();

		await fireEvent.press(screen.getByText("Share file…"));
		expect(mockShare).toHaveBeenCalledWith(result.uri, "text/csv");
		await fireEvent.press(screen.getByText("Save to Files"));
		expect(mockSave).toHaveBeenCalledWith(result.uri);
	});

	it("a failure says why and confirms nothing changed; Try again keeps the options", async () => {
		mockRunExport.mockRejectedValueOnce(
			new ExportFailedError({ kind: "storage", neededBytes: 219136 }),
		);
		await render(<ExportSheet visible onClose={() => {}} />);
		await fireEvent.press(screen.getByText("JSON"));
		await fireEvent.press(screen.getByText("Export 4 entries"));

		expect(await screen.findByText("Export didn't finish")).toBeTruthy();
		expect(
			screen.getByText(
				"This iPhone is out of storage. The file needs about 214 KB free.",
			),
		).toBeTruthy();
		expect(
			screen.getByText(
				"Nothing was changed — your habits and logs are untouched.",
			),
		).toBeTruthy();

		mockRunExport.mockResolvedValueOnce(result);
		await act(async () => {
			await fireEvent.press(screen.getByText("Try again"));
		});
		expect(mockRunExport).toHaveBeenLastCalledWith(
			expect.objectContaining({
				options: { format: "json", includeArchived: true },
			}),
		);
		expect(await screen.findByText("Export ready")).toBeTruthy();
	});

	it("Cancel on the confirm step closes without exporting", async () => {
		const onClose = jest.fn();
		await render(<ExportSheet visible onClose={onClose} />);
		await fireEvent.press(screen.getByText("Cancel"));
		expect(onClose).toHaveBeenCalled();
		expect(mockRunExport).not.toHaveBeenCalled();
	});
});
