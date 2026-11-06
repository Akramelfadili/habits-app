// Shared way for a test to expect a console.error / console.warn: the message
// is swallowed and the returned mock is there to assert on. Restored by
// jest.restoreAllMocks() (or the test file's own afterEach).

type Method = "error" | "warn";

export function expectConsole(method: Method): jest.SpyInstance {
	return jest.spyOn(console, method).mockImplementation(() => {});
}
