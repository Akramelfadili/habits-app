import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";
import { useLiveRows } from "@/lib/db/use-live-rows";

export async function getSetting(key: string): Promise<string | null> {
	const [row] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, key));
	return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
	await db
		.insert(appSettings)
		.values({ key, value })
		.onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

/** Dev-only escape hatch for resetting a setting back to "never set" — refuses to run outside `__DEV__`. */
export async function deleteSetting(key: string): Promise<void> {
	if (!__DEV__) {
		throw new Error("deleteSetting is dev-only");
	}
	await db.delete(appSettings).where(eq(appSettings.key, key));
}

/**
 * Live-query hook — the only place outside this file that ever sees settings
 * rows. Returns `undefined` until the query has resolved at least once
 * (`useLiveQuery` starts `data` at `[]` before its effect runs, which is
 * otherwise indistinguishable from "resolved, and the key was never set") —
 * callers that want to avoid acting on a loading value before it settles can
 * check for that explicitly rather than treating it the same as `null`.
 */
export function useAppSetting(key: string): string | null | undefined {
	const { data, loaded } = useLiveRows<typeof appSettings.$inferSelect>(
		db.select().from(appSettings).where(eq(appSettings.key, key)),
		[key],
		{ resetOnDepsChange: true },
	);
	if (!loaded) return undefined;
	return data[0]?.value ?? null;
}
