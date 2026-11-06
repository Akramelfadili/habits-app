// Reanimated 4.7 runs its web implementation under Jest (see jest.resolver.js);
// this installs its fake timers and style matchers — its documented setup,
// which replaces the old `react-native-reanimated/mock`. Needs `expect`, so it
// runs after the test framework, unlike jest.setup.js.
require("react-native-reanimated").setUpTests();

// Any console.error / console.warn a test did not announce with
// expectConsole() (src/test-support/console.ts) fails that test.
require("./src/test-support/console").installConsoleGuard();
