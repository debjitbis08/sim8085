// pull in desired CSS/SASS files
require( './styles/main.scss' );
// var $ = jQuery = require( '../../node_modules/jquery/dist/jquery.js' );           // <--- remove if Bootstrap's JS not needed
// require( '../../node_modules/bootstrap-sass/assets/javascripts/bootstrap.js' );   // <--- remove if Bootstrap's JS not needed

var parser = require( '../core/8085-assembler.js' );
var simulator = require( '../core/8085.js' );

window.simulator = simulator;
var execute8085Program = simulator.cwrap('ExecuteProgram', 'number', ['array', 'number', 'number']);

// inject bundled Elm app into div#main
var Elm = require( '../elm/Main' );
var app = Elm.Main.embed( document.getElementById( 'main' ) );

function initilizeEditor () {
  var editor = CodeMirror.fromTextArea(document.getElementById("coding-area__editor"), {
    lineNumbers: true
  });

  editor.on('change', function (instance, change) {
    var code = instance.getValue();
    var assembled = parser.parse(instance.getValue());
    app.ports.code.send(code);
    app.ports.assembled.send(assembled);
    // console.log(execute8085Program(assembled, assembled.length, 2048))
  });

  app.ports.run.subscribe(function (assembled) {
    var statePtr = execute8085Program(assembled, assembled.length, 2048);
    var flags = simulator.getValue(statePtr + 12, 'i8', 0).toString(2);
    function getFlagValue(flags, pos) {
      var stringPos = (flags.length - 1) - pos;
      return stringPos < 0 ? false : !!(parseInt(flags[stringPos], 2));
    }
    var state = {
      a: simulator.getValue(statePtr + 0, 'i8', 0),
      b: simulator.getValue(statePtr + 1, 'i8', 0),
      c: simulator.getValue(statePtr + 2, 'i8', 0),
      d: simulator.getValue(statePtr + 3, 'i8', 0),
      e: simulator.getValue(statePtr + 4, 'i8', 0),
      h: simulator.getValue(statePtr + 5, 'i8', 0),
      l: simulator.getValue(statePtr + 6, 'i8', 0),
      sp: simulator.getValue(statePtr + 8, 'i16', 0),
      pc: simulator.getValue(statePtr + 10, 'i16', 0),
      flags: {
        z: getFlagValue(flags, 0),
        s: getFlagValue(flags, 1),
        p: getFlagValue(flags, 2),
        cy: getFlagValue(flags, 3),
        ac: getFlagValue(flags, 4)
      },
      memory: (function () {
        var memoryPtr = statePtr + 24;
        var arr = [];
        var i = 0;
        while (i < 65536) {
          arr.push(simulator.getValue(memoryPtr + i, 'i8', 0));
          i++;
        }
        return arr;
      })()
    };
    app.ports.state.send(state);
    console.log(state);
  });
}

setTimeout(initilizeEditor, 6000);
