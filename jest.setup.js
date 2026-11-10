// Gesture handler and worklets have no native runtime under Jest — each ships
// its own mock for exactly this (reorderable list, swipeable row). Reanimated is
// set up in jest.setup-after-env.js.
require("react-native-gesture-handler/jestSetup");

jest.mock("react-native-worklets", () =>
	require("react-native-worklets/lib/module/mock"),
);

// The native change listener does not run here; the shared live tables hear
// writes through the live-query stand-in's notifier instead.
jest.mock("@/lib/db/table-change", () => ({
	onTableChange: require("@/lib/db/test-live-query").onTableChange,
}));
