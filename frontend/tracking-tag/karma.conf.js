module.exports = function(config) {
  config.set({
    // Base path for resolving patterns
    basePath: '',

    // Frameworks to use
    frameworks: ['jasmine', 'webpack'],

    // List of files/patterns to load in the browser
    files: [
      'src/**/*.js',
      'spec/**/*.spec.js'
    ],

    // List of files/patterns to exclude
    exclude: [],

    // Preprocess matching files before serving them to the browser
    preprocessors: {
      'src/**/*.js': ['webpack', 'sourcemap', 'coverage'],
      'spec/**/*.spec.js': ['webpack', 'sourcemap']
    },

    // Webpack configuration
    webpack: {
      mode: 'development',
      devtool: 'inline-source-map',
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env']
              }
            }
          },
          {
            test: /\.js$/,
            include: /src/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env'],
                plugins: ['istanbul']
              }
            },
            enforce: 'post'
          }
        ]
      }
    },

    // Webpack middleware configuration
    webpackMiddleware: {
      stats: 'errors-only',
      noInfo: true
    },

    // Test results reporter
    reporters: ['progress', 'kjhtml', 'coverage'],

    // Coverage reporter configuration
    coverageReporter: {
      type: 'html',
      dir: 'coverage/',
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcov' }
      ],
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    },

    // Web server port
    port: 9876,

    // Enable/disable colors in the output (reporters and logs)
    colors: true,

    // Level of logging
    logLevel: config.LOG_INFO,

    // Enable/disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Start these browsers
    browsers: ['ChromeHeadless'],

    // Custom launchers
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      }
    },

    // Continuous Integration mode
    singleRun: true,

    // Concurrency level (how many browsers are started simultaneously)
    concurrency: Infinity,

    // Client configuration
    client: {
      clearContext: false, // Leave Jasmine Spec Runner output visible in browser
      jasmine: {
        random: true,
        seed: '4321',
        stopSpecOnExpectationFailure: false,
        failSpecWithNoExpectations: false,
        stopOnSpecFailure: false,
        timeoutInterval: 30000
      }
    },

    // Browser timeout
    browserTimeout: 60000,
    browserDisconnectTimeout: 30000,
    browserNoActivityTimeout: 60000,

    // Plugins
    plugins: [
      'karma-jasmine',
      'karma-chrome-headless',
      'karma-webpack',
      'karma-coverage',
      'karma-jasmine-html-reporter',
      'karma-sourcemap-loader'
    ]
  });
};