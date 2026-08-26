import fs from 'fs';
import { parse } from 'jsonc-parser';
import { createDefaultPreset, pathsToModuleNameMapper } from 'ts-jest';

/** @type {any} */
const errors = [];
const jsonText = fs.readFileSync('./tsconfig.json', 'utf-8');
const tsconfig = parse(jsonText, errors, {
  allowTrailingComma: true,
  disallowComments: false,
  allowEmptyContent: false,
});

if (errors.length > 0) {
  console.error('Parse errors:', errors);
  process.exit(1);
}

/**
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
const config = {
  ...createDefaultPreset(),

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest',

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ['<rootDir>/toolbox/tests/setup.ts'],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),

  /**
   * ts-jest does not support `"moduleResolution": "Bundler"` (the value used in tsconfig.json, which
   * is correct for Vite). When ts-jest encounters it, it silently falls back to `"node"` (a.k.a.
   * `node10`), which TypeScript 6+ flags as deprecated (TS5107), causing all test suites to fail.
   *
   * The fix: override `moduleResolution` to `"node16"` specifically for ts-jest (the right value for
   * a Node.js/Jest environment), and add `ignoreDeprecations: "6.0"` to silence any remaining
   * deprecation noise from the ts-jest tsconfig override.
   *
   * The main tsconfig.json is untouched and continues to use `"Bundler"` as intended.
   */
  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.[jt]sx?$': ['ts-jest', { tsconfig: { moduleResolution: 'node16', ignoreDeprecations: '6.0' } }],
  },

  // All imported modules in your tests should be mocked automatically
  // automock: false,

  // Stop running tests after `n` failures
  // bail: 0,

  // The directory where Jest should store its cached dependency information
  // cacheDirectory: "/private/var/folders/yv/tfvrv22n3rn8g7_2dzx2n8lc0000gn/T/jest_dx",

  // Automatically clear mock calls, instances, contexts and results before every test
  // clearMocks: false,

  // Indicates whether the coverage information should be collected while executing the test
  // collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  // collectCoverageFrom: undefined,

  // The directory where Jest should output its coverage files
  // coverageDirectory: undefined,

  // An array of regexp pattern strings used to skip coverage collection
  // coveragePathIgnorePatterns: [
  //   "/node_modules/"
  // ],

  // Indicates which provider should be used to instrument code for coverage
  // coverageProvider: "babel",

  // A list of reporter names that Jest uses when writing coverage reports
  // coverageReporters: [
  //   "json",
  //   "text",
  //   "lcov",
  //   "clover"
  // ],

  // An object that configures minimum threshold enforcement for coverage results
  // coverageThreshold: undefined,

  // A path to a custom dependency extractor
  // dependencyExtractor: undefined,

  // Make calling deprecated APIs throw helpful error messages
  // errorOnDeprecated: false,

  // The default configuration for fake timers
  // fakeTimers: {
  //   "enableGlobally": false
  // },

  // Force coverage collection from ignored files using an array of glob patterns
  // forceCoverageMatch: [],

  // A path to a module which exports an async function that is triggered once before all test suites
  // globalSetup: undefined,

  // A path to a module which exports an async function that is triggered once after all test suites
  // globalTeardown: undefined,

  // A set of global variables that need to be available in all test environments
  // globals: {},

  // The maximum amount of workers used to run your tests. Can be specified as % or a number. E.g. maxWorkers: 10% will use 10% of your CPU amount + 1 as the maximum worker number. maxWorkers: 2 will use a maximum of 2 workers.
  // maxWorkers: "50%",

  // An array of directory names to be searched recursively up from the requiring module's location
  // moduleDirectories: [
  //   "node_modules"
  // ],

  // An array of file extensions your modules use
  // moduleFileExtensions: [
  //   "js",
  //   "mjs",
  //   "cjs",
  //   "jsx",
  //   "ts",
  //   "tsx",
  //   "json",
  //   "node"
  // ],

  // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  // modulePathIgnorePatterns: [],

  // Activates notifications for test results
  // notify: false,

  // An enum that specifies notification mode. Requires { notify: true }
  // notifyMode: "failure-change",

  // Run tests from one or more projects
  // projects: undefined,

  // Use this configuration option to add custom reporters to Jest
  // reporters: undefined,

  // Automatically reset mock state before every test
  // resetMocks: false,

  // Reset the module registry before running each individual test
  // resetModules: false,

  // A path to a custom resolver
  // resolver: undefined,

  // Automatically restore mock state and implementation before every test
  // restoreMocks: false,

  // The root directory that Jest should scan for tests and modules within
  // rootDir: undefined,

  // A list of paths to directories that Jest should use to search for files in
  // roots: [
  //   "<rootDir>"
  // ],

  // Allows you to use a custom runner instead of Jest's default test runner
  // runner: "jest-runner",

  // The paths to modules that run some code to configure or set up the testing environment before each test
  // setupFiles: [],

  // The number of seconds after which a test is considered as slow and reported as such in the results.
  // slowTestThreshold: 5,

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  // snapshotSerializers: [],

  // Options that will be passed to the testEnvironment
  // testEnvironmentOptions: {},

  // Adds a location field to test results
  // testLocationInResults: false,

  // The glob patterns Jest uses to detect test files
  // testMatch: [
  //   "**/__tests__/**/*.[jt]s?(x)",
  //   "**/?(*.)+(spec|test).[tj]s?(x)"
  // ],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  // testPathIgnorePatterns: [
  //   "/node_modules/"
  // ],

  // The regexp pattern or array of patterns that Jest uses to detect test files
  // testRegex: [],

  // This option allows the use of a custom results processor
  // testResultsProcessor: undefined,

  // This option allows use of a custom test runner
  // testRunner: "jest-circus/runner",

  // Transform ESM-only packages (e.g. @faker-js/faker, kysely).
  // Two patterns are needed for pnpm's nested layout:
  //   node_modules/.pnpm/<pkg@ver>/node_modules/<pkg>/...
  // Pattern 1 ignores non-.pnpm and non-faker/kysely flat paths.
  // Pattern 2 ignores non-faker/kysely packages inside .pnpm.
  transformIgnorePatterns: [
    '/node_modules/(?!\\.pnpm|@faker-js/faker|kysely)',
    '/node_modules/\\.pnpm/(?!@faker-js\\+faker|kysely)',
  ],

  // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
  // unmockedModulePathPatterns: undefined,

  // Indicates whether each individual test should be reported during the run
  // verbose: undefined,

  // An array of regexp patterns that are matched against all source file paths before re-running tests in watch mode
  // watchPathIgnorePatterns: [],

  // Whether to use watchman for file crawling
  // watchman: true,

  // Exit with code 0 even if no test files are found
  passWithNoTests: true,
};

export default config;
