// Reanimated 4.7 runs its web implementation under Jest (see jest.resolver.js);
// this installs its fake timers and style matchers — its documented setup,
// which replaces the old `react-native-reanimated/mock`. Needs `expect`, so it
// runs after the test framework, unlike jest.setup.js.
require("react-native-reanimated").setUpTests();
