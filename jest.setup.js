// Gesture handler and Reanimated/worklets have no native runtime under Jest —
// each ships its own mock for exactly this (reorderable list, swipeable row).
require("react-native-gesture-handler/jestSetup");

jest.mock("react-native-worklets", () =>
	require("react-native-worklets/lib/module/mock"),
);
jest.mock("react-native-reanimated", () =>
	require("react-native-reanimated/mock"),
);
