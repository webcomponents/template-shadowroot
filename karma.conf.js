module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',
    // list of files / patterns to load in the browser
    files: [
      { pattern: 'test/*.js', type: 'module' }
    ],
    exclude: [],

    plugins: [
      // load plugin
      require.resolve('@open-wc/karma-esm'),

      // fallback: resolve any karma- plugins
      'karma-*',
    ],
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['esm', 'jasmine', 'detectBrowsers'],
    esm: {
      // if you are using 'bare module imports' you will need this option
      nodeResolve: true,
    },
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],
    port: 9876,
    colors: true,
    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    customLaunchers: {
      ChromeWithDeclarativeShadowDOM: {
        base: 'ChromeCanaryHeadless',
        browserName: 'ChromeWithDeclarativeShadowDOM',
        flags: ['--enable-blink-features=DeclarativeShadowDOM']
      }
    },

    detectBrowsers: {
      enabled: true,
      usePhantomJS: false,
      preferHeadless: true,

      // post processing of browsers list
      // here you can edit the list of browsers used by karma
      postDetection: function(availableBrowsers) {
        // This is for fast headless testing, filter out the non-headless
        // browsers.
        availableBrowsers = availableBrowsers.filter(b => /headless/i.test(b));
        if (availableBrowsers.includes('ChromeCanaryHeadless')) {
          availableBrowsers.push('ChromeWithDeclarativeShadowDOM');
        }
        return availableBrowsers;
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
}
