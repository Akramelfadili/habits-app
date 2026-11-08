// jest-expo's native environment plus one hook: a test can switch the process
// time zone (docs/how-to/dev-tooling.md § "Time zones in tests").
//
// Jest hands each test file a *copy* of process.env, so `process.env.TZ = …`
// inside a test never reaches Node and the zone does not change. This file
// runs in the outer realm, where `process` is the real one: Node re-reads TZ
// when it is assigned there. `withTimeZone` (src/test-support/time-zone.ts)
// calls the hook; the zone is put back when the file ends, so a worker's next
// file starts in the globalSetup zone again.
const ExpoNativeEnvironment = require("jest-expo/src/preset/nativeEnvironment");

class TimeZoneEnvironment extends ExpoNativeEnvironment {
	constructor(config, context) {
		super(config, context);
		this.initialTimeZone = process.env.TZ;
		this.global.__setProcessTimeZone = (zone) => {
			if (zone === undefined) delete process.env.TZ;
			else process.env.TZ = zone;
			return zone;
		};
		this.global.__getProcessTimeZone = () => process.env.TZ;
	}

	async teardown() {
		if (this.initialTimeZone === undefined) delete process.env.TZ;
		else process.env.TZ = this.initialTimeZone;
		await super.teardown();
	}
}

module.exports = TimeZoneEnvironment;
