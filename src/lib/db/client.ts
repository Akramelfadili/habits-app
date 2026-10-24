import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { log } from "@/lib/logger/logger";
import * as schema from "./schema";

function openDatabase() {
	try {
		return openDatabaseSync("habits.db", { enableChangeListener: true });
	} catch (error) {
		// Opening runs at import, before any screen exists, so there is nothing to
		// show an error on — log it (the global handler then reports the crash).
		log.error("db", "could not open the database", error);
		throw error;
	}
}

export const expoDb = openDatabase();

export const db = drizzle(expoDb, { schema });
