import { readLaunchRequest } from "./launch-request";

let mockExists = true;
let mockText = "";
jest.mock("expo-file-system", () => ({
	Paths: { document: "file:///doc/" },
	File: class {
		get exists() {
			return mockExists;
		}
		textSync() {
			return mockText;
		}
	},
}));

describe("readLaunchRequest", () => {
	const original = process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
	beforeEach(() => {
		mockExists = true;
		mockText = JSON.stringify({ route: "/?fixtures=empty", clock: "c" });
	});
	afterEach(() => {
		if (original === undefined)
			delete process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
		else process.env.EXPO_PUBLIC_DEVICE_VALIDATION = original;
	});

	it("reads nothing in a normal build, even when the file exists", () => {
		delete process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
		expect(readLaunchRequest()).toBeNull();
	});

	it("reads the route and clock on the validation build", () => {
		process.env.EXPO_PUBLIC_DEVICE_VALIDATION = "1";
		expect(readLaunchRequest()).toEqual({
			route: "/?fixtures=empty",
			clock: "c",
		});
	});

	it("opens normally without a file, with bad JSON or without a route", () => {
		process.env.EXPO_PUBLIC_DEVICE_VALIDATION = "1";
		mockExists = false;
		expect(readLaunchRequest()).toBeNull();
		mockExists = true;
		mockText = "{nope";
		expect(readLaunchRequest()).toBeNull();
		mockText = JSON.stringify({ clock: "c" });
		expect(readLaunchRequest()).toBeNull();
	});
});
