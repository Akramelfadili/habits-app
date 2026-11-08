// Jest runs in one fixed zone, whatever the machine's (docs/how-to/dev-tooling.md
// § "Time zones in tests"). America/Los_Angeles differs from CI's UTC and from a
// European laptop, and its negative offset is where a day-key bug shows first.
// `make test-tz` reruns the date tests in other zones through JEST_TZ. Workers
// are started after this runs, so they inherit TZ.
module.exports = async () => {
	process.env.TZ = process.env.JEST_TZ || "America/Los_Angeles";
};
