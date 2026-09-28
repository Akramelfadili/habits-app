// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from "./0000_wooden_cerise.sql";
import m0001 from "./0001_fearless_daredevil.sql";
import m0002 from "./0002_fearless_mandrill.sql";
import m0003 from "./0003_lyrical_golden_guardian.sql";
import m0004 from "./0004_lush_groot.sql";
import m0005 from "./0005_sparkling_scourge.sql";
import m0006 from "./0006_aspiring_boomer.sql";
import journal from "./meta/_journal.json";

export default {
	journal,
	migrations: {
		m0000,
		m0001,
		m0002,
		m0003,
		m0004,
		m0005,
		m0006,
	},
};
