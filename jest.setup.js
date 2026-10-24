// Gesture handler and worklets have no native runtime under Jest — each ships
// its own mock for exactly this (reorderable list, swipeable row). Reanimated is
// set up in jest.setup-after-env.js.
require("react-native-gesture-handler/jestSetup");

jest.mock("react-native-worklets", () =>
	require("react-native-worklets/lib/module/mock"),
);
