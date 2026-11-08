const mockFiles = new Map<string, string>();
const mockDirs = new Set<string>();
let mockFailMoveTo: string | undefined;

jest.mock("expo-file-system", () => {
	const join = (parts: unknown[]) =>
		parts
			.map((part) =>
				typeof part === "string" ? part : (part as { uri: string }).uri,
			)
			.join("/");
	class File {
		uri: string;
		constructor(...parts: unknown[]) {
			this.uri = join(parts);
		}
		get exists() {
			return mockFiles.has(this.uri);
		}
		get size() {
			return (mockFiles.get(this.uri) ?? "").length;
		}
		get name() {
			return this.uri.split("/").pop() as string;
		}
		get parentDirectory() {
			return new Directory(this.uri.split("/").slice(0, -1).join("/"));
		}
		delete() {
			mockFiles.delete(this.uri);
		}
		move(target: File) {
			if (mockFailMoveTo && target.uri.endsWith(mockFailMoveTo)) {
				throw new Error("EIO");
			}
			mockFiles.set(target.uri, mockFiles.get(this.uri) ?? "");
			mockFiles.delete(this.uri);
		}
	}
	class Directory {
		uri: string;
		constructor(...parts: unknown[]) {
			this.uri = join(parts);
		}
		get exists() {
			return mockDirs.has(this.uri);
		}
		create() {
			mockDirs.add(this.uri);
		}
		list() {
			return [...mockFiles.keys()]
				.filter((uri) => uri.startsWith(`${this.uri}/`))
				.map((uri) => new File(uri));
		}
	}
	return { File, Directory };
});

import {
	createBackupFiles,
	renameDatabaseFile,
	toFileUri,
} from "./database-files";

const DB = "/data/SQLite/habits.db";

beforeEach(() => {
	mockFiles.clear();
	mockDirs.clear();
	mockFailMoveTo = undefined;
	mockFiles.set("file:///data/SQLite/habits.db", "main");
});

describe("toFileUri", () => {
	it("adds the scheme once", () => {
		expect(toFileUri("/a/b")).toBe("file:///a/b");
		expect(toFileUri("file:///a/b")).toBe("file:///a/b");
	});
});

describe("createBackupFiles", () => {
	it("creates a backups folder next to the database and works inside it", () => {
		const files = createBackupFiles(DB);
		expect(mockDirs.has("file:///data/SQLite/backups")).toBe(true);
		expect(files.pathFor("a.db")).toBe("/data/SQLite/backups/a.db");

		mockFiles.set("file:///data/SQLite/backups/a.db.partial", "xyz");
		files.rename("a.db.partial", "a.db");
		expect(files.names()).toEqual(["a.db"]);
		expect(files.sizeOf("a.db")).toBe(3);
		files.remove("a.db");
		files.remove("missing.db");
		expect(files.names()).toEqual([]);
		expect(mockFiles.has("file:///data/SQLite/habits.db")).toBe(true);
	});
});

describe("renameDatabaseFile", () => {
	it("renames in the same folder and keeps the content", () => {
		renameDatabaseFile(DB, "habits.corrupt-1.db");
		expect(mockFiles.get("file:///data/SQLite/habits.corrupt-1.db")).toBe(
			"main",
		);
		expect(mockFiles.has("file:///data/SQLite/habits.db")).toBe(false);
	});

	it("never overwrites an existing file", () => {
		mockFiles.set("file:///data/SQLite/habits.corrupt-1.db", "older");
		expect(() => renameDatabaseFile(DB, "habits.corrupt-1.db")).toThrow();
		expect(mockFiles.get("file:///data/SQLite/habits.db")).toBe("main");
		expect(mockFiles.get("file:///data/SQLite/habits.corrupt-1.db")).toBe(
			"older",
		);
	});

	it("takes the -wal and -shm companions along, so none is replayed into a fresh file", () => {
		mockFiles.set("file:///data/SQLite/habits.db-wal", "wal");
		mockFiles.set("file:///data/SQLite/habits.db-shm", "shm");
		renameDatabaseFile(DB, "habits.corrupt-1.db");
		expect([...mockFiles.keys()].sort()).toEqual([
			"file:///data/SQLite/habits.corrupt-1.db",
			"file:///data/SQLite/habits.corrupt-1.db-shm",
			"file:///data/SQLite/habits.corrupt-1.db-wal",
		]);
	});

	it("puts everything back when a rename fails part-way", () => {
		mockFiles.set("file:///data/SQLite/habits.db-wal", "wal");
		mockFailMoveTo = "habits.corrupt-1.db";
		expect(() => renameDatabaseFile(DB, "habits.corrupt-1.db")).toThrow("EIO");
		expect([...mockFiles.keys()].sort()).toEqual([
			"file:///data/SQLite/habits.db",
			"file:///data/SQLite/habits.db-wal",
		]);
		expect(mockFiles.get("file:///data/SQLite/habits.db")).toBe("main");
	});

	it("refuses when a companion's target already exists", () => {
		mockFiles.set("file:///data/SQLite/habits.db-wal", "wal");
		mockFiles.set("file:///data/SQLite/habits.corrupt-1.db-wal", "older");
		expect(() => renameDatabaseFile(DB, "habits.corrupt-1.db")).toThrow();
		expect(mockFiles.has("file:///data/SQLite/habits.db")).toBe(true);
	});
});
