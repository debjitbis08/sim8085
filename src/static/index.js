// pull in desired CSS/SASS files
require( './styles/main.scss' );
var $ = jQuery = require( '../../node_modules/jquery/dist/jquery.js' );           // <--- remove if Bootstrap's JS not needed
require( '../../node_modules/bootstrap-sass/assets/javascripts/bootstrap.js' );   // <--- remove if Bootstrap's JS not needed

var parser = require( '../core/8085-assembler.js' );
var simulator = require( '../core/8085.js' );
var stateComm = require('./cpuState.js');

require('./8085-mode.js');

window.simulator = simulator;
var execute8085Program = simulator.cwrap('ExecuteProgram', 'number', ['number', 'array', 'number', 'number']);
var load8085Program = simulator.cwrap('LoadProgram', 'number', ['number', 'array', 'number', 'number']);

// inject bundled Elm app into div#main
var Elm = require( '../elm/Main' );
var app = Elm.Main.embed( document.getElementById( 'main' ) );


function initilizeEditor () {
  var assembling;
  var lineWidget = [];
  var highlighedLine = null;

  var editor = CodeMirror.fromTextArea(document.getElementById("coding-area__editor"), {
    lineNumbers: true,
    mode: "8085",
    gutters: ["CodeMirror-assembler-errors", "breakpoints", "CodeMirror-linenumbers"]
  });

  function updateErrors(e) {
    editor.operation(function () {
      var msg = document.createElement("div");
      var icon = msg.appendChild(document.createElement("span"));
      icon.className = "assembler-error-icon glyphicon glyphicon-exclamation-sign";
      msg.appendChild(document.createTextNode(" " + e.message));
      msg.className = "assembler-error";

      lineWidget.push(editor.addLineWidget(e.location.start.line - 1, msg, {coverGutter: false, noHScroll: true}));
    });
  }

  function makeMarker() {
    var marker = document.createElement("div");
    marker.className = 'coding-area__editor__breakpoint-marker';
    return marker;
  }

  editor.on('change', function (cm, change) {
    var code = cm.getValue();
    app.ports.code.send(code);
  });

  editor.on('gutterClick', function(cm, n) {
    var info = cm.lineInfo(n);
    if (info.gutterMarkers && 'breakpoints' in info.gutterMarkers) {
      app.ports.breakpoints.send({ action: 'remove', line: info.line });
    } else {
      app.ports.breakpoints.send({ action: 'add', line: info.line });
    }
    cm.setGutterMarker(n, "breakpoints", info.gutterMarkers ? null : makeMarker());
  });

  app.ports.load.subscribe(function (input) {
    clearTimeout(assembling);
    try {
      lineWidget.forEach(function (w) {
        editor.removeLineWidget(w);
      });

      // Try to assemble Program
      var assembled = parser.parse(input.code);
      app.ports.assembled.send(assembled);
    } catch (e) {
      assembling = setTimeout(function () {
        updateErrors(e);
      }, 500);
      app.ports.error.send({
        name: e.name,
        msg: e.message,
        line: e.location.start.line,
        column: e.location.start.column
      })
    }

    // Allocate memory for simulator
    var statePtr = simulator._Init8085();

    // Load Program to memory
    statePtr = load8085Program(statePtr, assembled.map(function (c) { return c.data; }), assembled.length, input.offset);

    // Get new state and send to UI
    var state = stateComm.getStateFromPtr(simulator, statePtr);
    state.programState = "Loaded";
    app.ports.state.send(state);
  });

  app.ports.run.subscribe(function (input) {
    var assembled = input.assembled;
    var iState = input.state;
    var statePtr = iState.ptr;

    if (input.state.programState == "Loaded") {
      stateComm.setState(simulator, statePtr, input.state);
    }

    statePtr = execute8085Program(statePtr, assembled, assembled.length, 2048);
    var state = stateComm.getStateFromPtr(simulator, statePtr);
    state.programState = "Idle";
    highlighedLine && editor.getDoc().removeLineClass(highlighedLine, "wrap", "coding-area__editor_running-marker");
    app.ports.state.send(state);
  });

  app.ports.runOne.subscribe(function (input) {
    var iState = input.state;
    var statePtr = iState.ptr;

    var status = simulator._Emulate8085Op(statePtr);
    var state = stateComm.getStateFromPtr(simulator, statePtr);
    if (status == 0) {
      state.programState = "Paused";
    } else {
      state.programState = "Idle";
      highlighedLine && editor.getDoc().removeLineClass(highlighedLine, "wrap", "coding-area__editor_running-marker");
    }
    app.ports.state.send(state);
  });

  app.ports.debug.subscribe(function (input) {
    var iState = input.state;
    var statePtr = iState.ptr;

    highlighedLine && editor.getDoc().removeLineClass(highlighedLine, "wrap", "coding-area__editor_running-marker");
    highlighedLine = editor.getDoc().addLineClass(input.nextLine - 1, "wrap", "coding-area__editor_running-marker");

    if (input.state.programState == "Loaded") {
      // TODO: Should only set PC, not whole state
      stateComm.setState(simulator, statePtr, input.state);
    }

  });

  app.ports.nextLine.subscribe(function (line) {
    highlighedLine && editor.getDoc().removeLineClass(highlighedLine, "wrap", "coding-area__editor_running-marker");
    highlighedLine = editor.getDoc().addLineClass(line - 1, "wrap", "coding-area__editor_running-marker");
  });
}

(function waitForEditorContainer() {
  var el = document.getElementById("coding-area__editor")
  if (el) {
    initilizeEditor();
  } else {
    setTimeout(waitForEditorContainer, 100);
  }
}());
