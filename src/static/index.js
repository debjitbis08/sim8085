// pull in desired CSS/SASS files
require( './styles/main.scss' );
var $ = jQuery = require( '../../node_modules/jquery/dist/jquery.js' );           // <--- remove if Bootstrap's JS not needed
require( '../../node_modules/bootstrap-sass/assets/javascripts/bootstrap.js' );   // <--- remove if Bootstrap's JS not needed

var parser = require( '../core/8085-assembler.js' );
var _8085Module = require( '../core/8085.js' );
console.log(_8085Module);
var simulator = _8085Module();
console.log(simulator);
var stateComm = require('./cpuState.js');
var Tour = require("./tour.js");

require('./8085-mode.js');

window.simulator = simulator;
var execute8085Program = simulator.cwrap('ExecuteProgram', 'number', ['number', 'number']);
var execute8085ProgramUntil = simulator.cwrap('ExecuteProgramUntil', 'number', ['number', 'number', 'number', 'number']);
var load8085Program = simulator.cwrap('LoadProgram', 'number', ['number', 'array', 'number', 'number']);

var statePtr = simulator._Init8085();

// inject bundled Elm app into div#main
var Elm = require( '../elm/Main' );
var app = Elm.Main.embed(document.getElementById( 'main' ), {
  initialCode: localStorage.getItem("code")
});

var RUNNING_LINE_CLASS = "coding-area__editor_running-marker";

var assembling;
var lineWidget = [];
var highlighedLine = null;

(function waitForEditorContainer() {
  var el = document.getElementById("coding-area__editor")
  if (el) {
    initilizeEditor();
  } else {
    setTimeout(waitForEditorContainer, 100);
  }
}());

function showError (type) {
  var randomId = Math.random().toString(32).substr(2);
  var id = "execution-error-alert-" + randomId;
  $("body").append(
    jQuery("#execution-error-alert-template")
      .clone()
      .attr("id", id)
      .removeClass("hidden")
      .show()
    );

  var messageContainer = document.querySelector("#" + id + " #execution-error-message-content");
  if (type === "UNKNOWN_INST") {
    messageContainer.innerHTML = "This is most probably due to some unimplemented intruction in the simulator itself. Currently, the instructions RIM, RST, IN, DI are not supported. Please look at the JavaScript console to know more details."
  } else if (type === "INFINITE_LOOP") {
    messageContainer.innerHTML = "Looks like you have an infinite loop in your code. Did you forget the HLT instruction?"
  } else {
    messageContainer.innerHTML = "An unknown error occured during execution of your program."
  }
  setTimeout(function () {
    $("#" + id).alert("close");
  }, 8000);
}

function showInfo (msg) {
  var tmpl = jQuery("#info-alert-template");
  var randomId = Math.random().toString(32).substr(2);
  var id = "info-alert-" + randomId;
  $("body").append(
    jQuery(tmpl.html())
      .attr("id", id)
      .removeClass("hidden")
      .show()
    );

  var messageContainer = document.querySelector("#" + id + " .info-alert__message");
  messageContainer.innerHTML = msg;

  setTimeout(function () {
    $("#" + id).alert("close");
  }, 8000);
}

function initilizeEditor () {
  var editor = CodeMirror.fromTextArea(document.getElementById("coding-area__editor"), {
    lineNumbers: true,
    mode: "8085",
    gutters: ["CodeMirror-assembler-errors", "breakpoints", "CodeMirror-linenumbers"]
  });

  editor.on('change', saveCode);
  editor.on('gutterClick', updateBreakpoints);

  app.ports.load.subscribe(load.bind(null, editor));

  app.ports.run.subscribe(runProgram.bind(null, editor));

  app.ports.runOne.subscribe(runSingleInstruction.bind(null, editor));

  app.ports.runTill.subscribe(runTill.bind(null, editor));

  app.ports.debug.subscribe(startDebug.bind(null, editor));

  app.ports.nextLine.subscribe(function (line) {
    removeLineHighlight(editor);
    addLineHighlight(editor, line);
  });

  app.ports.editorDisabled.subscribe(editor.setOption.bind(editor, "readOnly"));

  app.ports.updateState.subscribe(function (o) {
    stateComm.setState(simulator, statePtr, o.state);
  });

  Tour.start();

  var iframe = document.getElementById('nofocusvideo');
  // $f == Froogaloop
  var player = $f(iframe);

  $('.help-modal').on('hidden.bs.modal', function () {
    player.api('pause');
  });
}

function removeLineHighlight(editor) {
    highlighedLine && editor.getDoc().removeLineClass(highlighedLine, "wrap", RUNNING_LINE_CLASS);
}

function addLineHighlight(editor, lineNo) {
    highlighedLine = editor.getDoc().addLineClass(lineNo - 1, "wrap", RUNNING_LINE_CLASS);
}

function setEditorReadOnlyOption(editor, state) {
    editor.setOption("readOnly", state);
}

function makeMarker() {
  var marker = document.createElement("div");
  marker.className = 'coding-area__editor__breakpoint-marker';
  return marker;
}

function saveCode(cm) {
    var code = cm.getValue();
    app.ports.code.send(code);
    localStorage.setItem("code", code);
}

// Update breakpoints on gutter click
function updateBreakpoints(cm, n) {
    var info = cm.lineInfo(n);
    if (info.gutterMarkers && 'breakpoints' in info.gutterMarkers) {
      app.ports.breakpoints.send({ action: 'remove', line: info.line });
    } else {
      app.ports.breakpoints.send({ action: 'add', line: info.line });
    }
    cm.setGutterMarker(n, "breakpoints", info.gutterMarkers ? null : makeMarker());
}

function runProgram (editor, input) {
    var inputState = input.state;
    var statePtr = inputState.ptr;
    var errorStatus = 0;

    if (input.programState == "Loaded") {
      stateComm.setState(simulator, statePtr, inputState);
    }

    try {
      statePtr = execute8085Program(statePtr, input.loadAt);
    } catch (e) {
      if (e.status === 1) showError("UNKNOWN_INST");
      else if (e.status === 2) showError("INFINITE_LOOP");
      else showError("UNKNOWN");
      errorStatus = e.status;
    }

    removeLineHighlight(editor);
    setEditorReadOnlyOption(editor, false);

    if (errorStatus === 0) {
      var outputState = stateComm.getStateFromPtr(simulator, statePtr);
      app.ports.runSuccess.send(outputState);
    } else {
      app.ports.runError.send(errorStatus);
    }
}

function runTill (editor, input) {
    var inputState = input.state;
    var statePtr = inputState.ptr;
    var errorStatus = 0;

    if (input.programState == "Loaded") {
      stateComm.setState(simulator, statePtr, inputState);
    }

    try {
      var status = execute8085ProgramUntil(statePtr, input.loadAt, input.state.pc, input.pauseAt);
    } catch (e) {
      errorStatus = e.status;
    }

    var outputState = stateComm.getStateFromPtr(simulator, statePtr);
    // removeLineHighlight(editor);
    // setEditorReadOnlyOption(editor, false);

    /*
    if (errorStatus === 0) {
      var outputState = stateComm.getStateFromPtr(simulator, statePtr);
      app.ports.runSuccess.send(outputState);
    } else {
      app.ports.runError.send(errorStatus);
    }
    */

      if (errorStatus > 0) {
        app.ports.runOneFinished.send({ status: errorStatus, state: null });
      } else if (status > 0) {
        app.ports.runOneFinished.send({ status: status, state: outputState });
        removeLineHighlight(editor);
        setEditorReadOnlyOption(editor, false);
      } else {
        app.ports.runOneSuccess.send({ status: status, state: outputState });
      }
}

function runSingleInstruction(editor, input) {
  var iState = input.state;
  var statePtr = iState.ptr;
  var errorStatus = 0;

  try {
    var status = simulator._Emulate8085Op(statePtr, input.offset);
  } catch (e) {
    errorStatus = e.status;
  }
  var outputState = stateComm.getStateFromPtr(simulator, statePtr);

  if (errorStatus > 0) {
    app.ports.runOneFinished.send({ status: errorStatus, state: null });
  } else if (status > 0) {
    app.ports.runOneFinished.send({ status: status, state: outputState });
    removeLineHighlight(editor);
    setEditorReadOnlyOption(editor, false);
  } else {
    app.ports.runOneSuccess.send({ status: status, state: outputState });
  }
}

function startDebug(editor, input) {
  var iState = input.state;
  var statePtr = iState.ptr;

  removeLineHighlight(editor);
  addLineHighlight(editor, input.nextLine);

  if (input.programState == "Loaded") {
    // TODO: Should only set PC, not whole state
    stateComm.setState(simulator, statePtr, input.state);
  }
}

function updateErrors(editor, e) {
  editor.operation(function () {
    var msg = document.createElement("div");
    var icon = msg.appendChild(document.createElement("span"));
    icon.className = "assembler-error-icon glyphicon glyphicon-exclamation-sign";
    msg.appendChild(document.createTextNode(" " + e.message));
    msg.className = "assembler-error";

    lineWidget.push(editor.addLineWidget(e.location.start.line - 1, msg, {coverGutter: false, noHScroll: true}));
  });
}

function assembleProgram(editor, code) {
    clearTimeout(assembling);
    try {
      // Try to assemble Program
      var assembled = parser.parse(code);
    } catch (e) {
      assembling = setTimeout(function () {
        updateErrors(editor, e);
      }, 500);

      app.ports.loadError.send({
        name: e.name,
        msg: e.message,
        line: e.location.start.line,
        column: e.location.start.column
      });
      return null;
    }

    return assembled;
}

function load(editor, input) {
    lineWidget.forEach(function (w) {
      editor.removeLineWidget(w);
    });

    var assembled = assembleProgram(editor, input.code);

    if (!assembled) {
      return;
    }

    assembled = assembled.map(function (a) { a.breakHere = false; return a; });

    // var memoryBeforeInit = stateComm.getStateFromPtr(simulator, statePtr)

    // Allocate memory for simulator
    // var statePtr = simulator._Init8085();

    // Load Program to memory
    statePtr = load8085Program(statePtr, assembled.map(function (c) { return c.data; }), assembled.length, input.offset);

    // Get new state and send to UI
    var state = stateComm.getStateFromPtr(simulator, statePtr);
    app.ports.loadSuccess.send({ statePtr: statePtr, memory: state.memory, assembled: assembled });

    setEditorReadOnlyOption(editor, true);
    showInfo("Your code has been compiled and loaded to memory location 0x0800. Now you need to execute it to see the results.");
}
