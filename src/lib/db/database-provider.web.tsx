import type { PropsWithChildren } from "react";

/**
 * Web-only stand-in for `database-provider.tsx`. Web has no SQLite (repositories
 * swap to in-memory fixtures via their own `.web.ts` files), so there's nothing
 * to migrate — and importing `./client` here would crash on expo-sqlite's
 * missing web binding.
 */
export function DatabaseProvider({ children }: PropsWithChildren) {
	return children;
}
