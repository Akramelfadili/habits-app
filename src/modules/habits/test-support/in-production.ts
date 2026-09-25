/** Runs `fn` as a production build would see it (`__DEV__ === false`). */
export async function inProduction(fn: () => Promise<void>) {
	Reflect.set(globalThis, "__DEV__", false);
	try {
		await fn();
	} finally {
		Reflect.set(globalThis, "__DEV__", true);
	}
}
