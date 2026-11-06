import { act } from "@testing-library/react-native";

/**
 * Run a write inside an awaited act(), for tests where a mounted hook is
 * subscribed to the table (the live-query stand-in sets state when it changes),
 * so React does not warn about an update outside act.
 */
export async function inAct<T>(write: () => Promise<T>): Promise<T> {
	let result!: T;
	await act(async () => {
		result = await write();
	});
	return result;
}
