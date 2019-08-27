var Application = require("spectron").Application;
var should = require("chai").should();
spawn = require("child_process").spawn;
const cli = require("openfin-cli");

describe("application launch", function() {
  var runtimeVersion = "6.66.39.43"; // need to match the version of Runtime being tested
  var app, client, notificationButton, cpuInfoButton, cpuInfoExitButton;
  var timeout = 60000;
  var waitForUI = 50;

  this.timeout(timeout);

  before(function() {
    if (process.platform === "darwin" || process.platform === "linux") {
      cli({
        flags: {
          launch: true,
          config: "./config.json"
        }
      });
    } else if (process.platform === "win32") {
      var args = [
        "/c",
        "openfin-installer.exe",
        "--config=https://demoappdirectory.openf.in/desktop/config/apps/OpenFin/HelloOpenFin/app.json"
      ];
      spawn("cmd.exe", args);
    } else {
      spawn(
        config.desiredCapabilities.chromeOptions.binary,
        config.desiredCapabilities.chromeOptions.args
      );
    }

    app = new Application({
      connectionRetryCount: 1,
      connectionRetryTimeout: timeout,
      startTimeout: timeout,
      waitTimeout: timeout,
      debuggerAddress: "localhost:9090"
    });

    return app.start().then(
      function() {
        app.isRunning().should.equal(true);
        client = app.client;
        client.timeouts("page load", timeout);
      },
      function(err) {
        console.error(err);
      }
    );
  });

  /**
   * Select a Window
   * @param windowHandle handle of the window
   * @param callback callback with window title if selection is successful
   */
  function switchWindow(windowHandle, callback) {
    client.switchTab(windowHandle).then(function() {
      client.title().then(function(result) {
        callback(result.value);
      });
    });
  }

  /**
   * Select the window with specified title
   * @param windowTitle window title
   * @param done done callback for Mocha
   */
  function switchWindowByTitle(windowTitle, done) {
    client.getTabIds().then(function(handles) {
      var handleIndex = 0;
      var checkTitle = function(title) {
        if (title === windowTitle) {
          done();
        } else {
          handleIndex++;
          if (handleIndex < handles.length) {
            switchWindow(handles[handleIndex], checkTitle);
          } else {
            // the window may not be loaded yet, so call itself again
            switchWindowByTitle(windowTitle, done);
          }
        }
      };
      switchWindow(handles[handleIndex], checkTitle);
    });
  }

  /**
   *  Check if OpenFin Javascript API fin.desktop.System.getVersion exits
   *
   **/
  function checkFinGetVersion(callback) {
    executeAsyncJavascript(
      "var callback = arguments[arguments.length - 1];" +
        "if (fin && fin.desktop && fin.desktop.System && fin.desktop.System.getVersion) { callback(true); } else { callback(false); }",
      function(err, result) {
        if (err) {
          callback(false);
        } else {
          callback(result.value);
        }
      }
    );
  }

  /**
   *  Wait for OpenFin Javascript API to be injected
   *
   **/
  function waitForFinDesktop(readyCallback) {
    var callback = function(ready) {
      if (ready === true) {
        readyCallback();
      } else {
        client.pause(waitForUI, function() {
          waitForFinDesktop(readyCallback);
        });
      }
    };
    checkFinGetVersion(callback);
  }

  /**
   * Inject a snippet of JavaScript into the page for execution in the context of the currently selected window.
   * The executed script is assumed to be asynchronous and must signal that is done by invoking the provided callback, which is always
   * provided as the final argument to the function. The value to this callback will be returned to the client.
   *
   * @param script
   * @param resultCallback callback with result of the javascript code
   */
  function executeAsyncJavascript(script, resultCallback) {
    client.executeAsync(script).then(
      function(result) {
        console.log("executeAsyncJavascript returns ", result);
        resultCallback(undefined, result);
      },
      function(err) {
        console.error(err);
        resultCallback(err, undefined);
      }
    );
  }

  /**
   * Inject a snippet of JavaScript into the page for execution in the context of the currently selected frame. The executed script is assumed
   * to be synchronous and the result of evaluating the script is returned to the client.
   *
   * @param script
   * @param resultCallback callback with result of the javascript code
   */
  function executeJavascript(script, resultCallback) {
    client.execute(script).then(
      function() {
        resultCallback();
      },
      function(err) {
        resultCallback(err);
      }
    );
  }

  it("Switch to Hello OpenFin Main window", function(done) {
    switchWindowByTitle("Hello OpenFin", done);
  });

  it("Find notification button", function(done) {
    client.element("#desktop-notification").then(function(result) {
      should.exist(result.value);
      notificationButton = result.value;
      // pause here for notification service to be ready
      client.pause(waitForUI).then(function() {
        done();
      });
    });
  });

  it("Click notification button", function(done) {
    should.exist(notificationButton);
    client.elementIdClick(notificationButton.ELEMENT).then(function(result) {
      done();
    });
  });

  it("Find CPU Info button", function(done) {
    client.element("#cpu-info").then(function(result) {
      should.exist(result.value);
      cpuInfoButton = result.value;
      done();
    });
  });

  it("Click CPU Info button", function(done) {
    should.exist(cpuInfoButton);
    client.elementIdClick(cpuInfoButton.ELEMENT).then(function(result) {
      // pause here for visual
      client.pause(waitForUI).then(function() {
        done();
      });
    });
  });

  it("Switch to CPU Info window", function(done) {
    switchWindowByTitle("Hello OpenFin CPU Info", done);
  });

  it("Find Exit button for CPU Info window", function(done) {
    client.element("#close-app").then(
      function(result) {
        should.exist(result.value);
        cpuInfoExitButton = result.value;
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("Click CPU Info Exit button", function(done) {
    should.exist(cpuInfoExitButton);
    client.elementIdClick(cpuInfoExitButton.ELEMENT).then(function(result) {
      done();
    });
  });

  it("Exit OpenFin Runtime", function(done) {
    should.exist(client);
    // need to put a short delay here so execute request gets proper return to ChromeDriver
    executeJavascript(
      "setTimeout(function() { fin.desktop.System.exit(); }, 2000);",
      function() {
        done();
      }
    );
  });
});
