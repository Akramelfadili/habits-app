import { buildDeviceState } from "../dev/device-state";
import { replaceAllData } from "../repositories/dev-state-repository";

/**
 * Device validation only: writes the data a visual-check route's `?fixtures=`
 * scenario shows into the database. `search` is that route's query string.
 */
export async function loadDeviceState(search: string): Promise<void> {
	await replaceAllData(buildDeviceState(search));
}
