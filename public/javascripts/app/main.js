function debug() {
  if (typeof window.console != 'undefined') {
    window.console.log.apply(window.console, arguments);
  }
}

App = {
  app: "myApp"
};

require([
  'application.model',
  'testsuite.model'
  ],
  function() {
    debug("Application loaded");
  }
);