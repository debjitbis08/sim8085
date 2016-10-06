var Module = {
  ENVIRONMENT: 'WEB'
};

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

if (Module['ENVIRONMENT']) {
  if (Module['ENVIRONMENT'] === 'WEB') {
    ENVIRONMENT_IS_WEB = true;
  } else if (Module['ENVIRONMENT'] === 'WORKER') {
    ENVIRONMENT_IS_WORKER = true;
  } else if (Module['ENVIRONMENT'] === 'NODE') {
    ENVIRONMENT_IS_NODE = true;
  } else if (Module['ENVIRONMENT'] === 'SHELL') {
    ENVIRONMENT_IS_SHELL = true;
  } else {
    throw new Error('The provided Module[\'ENVIRONMENT\'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.');
  }
} else {
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}


if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = console.log;
  if (!Module['printErr']) Module['printErr'] = console.warn;

  var nodeFS;
  var nodePath;

  Module['read'] = function read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');

    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
      } else {
        onerror();
      }
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.warn(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try { func = eval('_' + ident); } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if ((!opts || !opts.async) && typeof EmterpreterAsync === 'object') {
      assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling ccall');
    }
    if (opts && opts.async) assert(!returnType, 'async ccalls cannot return values');
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }

  // sources of useful functions. we create this lazily as it can trigger a source decompression on this entire file
  var JSsource = null;
  function ensureJSsource() {
    if (!JSsource) {
      JSsource = {};
      for (var fun in JSfuncs) {
        if (JSfuncs.hasOwnProperty(fun)) {
          // Elements of toCsource are arrays of three items:
          // the code, and the return value
          JSsource[fun] = parseJSFunc(JSfuncs[fun]);
        }
      }
    }
  }
  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      ensureJSsource();
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=(' + convertCode.returnValue + ');';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    funcstr += "if (typeof EmterpreterAsync === 'object') { assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling cwrap') }";
    if (!numericArgs) {
      // If we had a stack, restore it
      ensureJSsource();
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}


function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
      return func;
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  Runtime.warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  return func;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var buffer;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
  assert(buffer.byteLength === TOTAL_MEMORY, 'provided buffer should be ' + TOTAL_MEMORY + ' bytes, but it is ' + buffer.byteLength);
} else {
  buffer = new ArrayBuffer(TOTAL_MEMORY);
}
updateGlobalBufferViews();


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
if (HEAPU8[0] !== 255 || HEAPU8[3] !== 0) throw 'Typed arrays 2 must be run on a little-endian system';

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



var /* show errors on likely calls to FS when it was not included */ FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;

// === Body ===

var ASM_CONSTS = [];




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 6992;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([12,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,76,23,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,48,52,120,32,0,78,79,80,0,76,88,73,32,32,32,32,66,44,35,36,37,48,50,120,37,48,50,120,0,83,84,65,88,32,32,32,66,0,73,78,88,32,32,32,32,66,0,73,78,82,32,32,32,32,66,0,68,67,82,32,32,32,32,66,0,77,86,73,32,32,32,32,66,44,35,36,37,48,50,120,0,82,76,67,0,68,65,68,32,32,32,32,66,0,76,68,65,88,32,32,32,66,0,68,67,88,32,32,32,32,66,0,73,78,82,32,32,32,32,67,0,68,67,82,32,32,32,32,67,0,77,86,73,32,32,32,32,67,44,35,36,37,48,50,120,0,82,82,67,0,76,88,73,32,32,32,32,68,44,35,36,37,48,50,120,37,48,50,120,0,83,84,65,88,32,32,32,68,0,73,78,88,32,32,32,32,68,0,73,78,82,32,32,32,32,68,0,68,67,82,32,32,32,32,68,0,77,86,73,32,32,32,32,68,44,35,36,37,48,50,120,0,82,65,76,0,68,65,68,32,32,32,32,68,0,76,68,65,88,32,32,32,68,0,68,67,88,32,32,32,32,68,0,73,78,82,32,32,32,32,69,0,68,67,82,32,32,32,32,69,0,77,86,73,32,32,32,32,69,44,35,36,37,48,50,120,0,82,65,82,0,76,88,73,32,32,32,32,72,44,35,36,37,48,50,120,37,48,50,120,0,83,72,76,68,32,32,32,36,37,48,50,120,37,48,50,120,0,73,78,88,32,32,32,32,72,0,73,78,82,32,32,32,32,72,0,68,67,82,32,32,32,32,72,0,77,86,73,32,32,32,32,72,44,35,36,37,48,50,120,0,68,65,65,0,68,65,68,32,32,32,32,72,0,76,72,76,68,32,32,32,36,37,48,50,120,37,48,50,120,0,68,67,88,32,32,32,32,72,0,73,78,82,32,32,32,32,76,0,68,67,82,32,32,32,32,76,0,77,86,73,32,32,32,32,76,44,35,36,37,48,50,120,0,67,77,65,0,76,88,73,32,32,32,32,83,80,44,35,36,37,48,50,120,37,48,50,120,0,83,84,65,32,32,32,32,36,37,48,50,120,37,48,50,120,0,73,78,88,32,32,32,32,83,80,0,73,78,82,32,32,32,32,77,0,68,67,82,32,32,32,32,77,0,77,86,73,32,32,32,32,77,44,35,36,37,48,50,120,0,83,84,67,0,68,65,68,32,32,32,32,83,80,0,76,68,65,32,32,32,32,36,37,48,50,120,37,48,50,120,0,68,67,88,32,32,32,32,83,80,0,73,78,82,32,32,32,32,65,0,68,67,82,32,32,32,32,65,0,77,86,73,32,32,32,32,65,44,35,36,37,48,50,120,0,67,77,67,0,77,79,86,32,32,32,32,66,44,66,0,77,79,86,32,32,32,32,66,44,67,0,77,79,86,32,32,32,32,66,44,68,0,77,79,86,32,32,32,32,66,44,69,0,77,79,86,32,32,32,32,66,44,72,0,77,79,86,32,32,32,32,66,44,76,0,77,79,86,32,32,32,32,66,44,77,0,77,79,86,32,32,32,32,66,44,65,0,77,79,86,32,32,32,32,67,44,66,0,77,79,86,32,32,32,32,67,44,67,0,77,79,86,32,32,32,32,67,44,68,0,77,79,86,32,32,32,32,67,44,69,0,77,79,86,32,32,32,32,67,44,72,0,77,79,86,32,32,32,32,67,44,76,0,77,79,86,32,32,32,32,67,44,77,0,77,79,86,32,32,32,32,67,44,65,0,77,79,86,32,32,32,32,68,44,66,0,77,79,86,32,32,32,32,68,44,67,0,77,79,86,32,32,32,32,68,44,68,0,77,79,86,32,32,32,32,68,46,69,0,77,79,86,32,32,32,32,68,44,72,0,77,79,86,32,32,32,32,68,44,76,0,77,79,86,32,32,32,32,68,44,77,0,77,79,86,32,32,32,32,68,44,65,0,77,79,86,32,32,32,32,69,44,66,0,77,79,86,32,32,32,32,69,44,67,0,77,79,86,32,32,32,32,69,44,68,0,77,79,86,32,32,32,32,69,44,69,0,77,79,86,32,32,32,32,69,44,72,0,77,79,86,32,32,32,32,69,44,76,0,77,79,86,32,32,32,32,69,44,77,0,77,79,86,32,32,32,32,69,44,65,0,77,79,86,32,32,32,32,72,44,66,0,77,79,86,32,32,32,32,72,44,67,0,77,79,86,32,32,32,32,72,44,68,0,77,79,86,32,32,32,32,72,46,69,0,77,79,86,32,32,32,32,72,44,72,0,77,79,86,32,32,32,32,72,44,76,0,77,79,86,32,32,32,32,72,44,77,0,77,79,86,32,32,32,32,72,44,65,0,77,79,86,32,32,32,32,76,44,66,0,77,79,86,32,32,32,32,76,44,67,0,77,79,86,32,32,32,32,76,44,68,0,77,79,86,32,32,32,32,76,44,69,0,77,79,86,32,32,32,32,76,44,72,0,77,79,86,32,32,32,32,76,44,76,0,77,79,86,32,32,32,32,76,44,77,0,77,79,86,32,32,32,32,76,44,65,0,77,79,86,32,32,32,32,77,44,66,0,77,79,86,32,32,32,32,77,44,67,0,77,79,86,32,32,32,32,77,44,68,0,77,79,86,32,32,32,32,77,46,69,0,77,79,86,32,32,32,32,77,44,72,0,77,79,86,32,32,32,32,77,44,76,0,72,76,84,0,77,79,86,32,32,32,32,77,44,65,0,77,79,86,32,32,32,32,65,44,66,0,77,79,86,32,32,32,32,65,44,67,0,77,79,86,32,32,32,32,65,44,68,0,77,79,86,32,32,32,32,65,44,69,0,77,79,86,32,32,32,32,65,44,72,0,77,79,86,32,32,32,32,65,44,76,0,77,79,86,32,32,32,32,65,44,77,0,77,79,86,32,32,32,32,65,44,65,0,65,68,68,32,32,32,32,66,0,65,68,68,32,32,32,32,67,0,65,68,68,32,32,32,32,68,0,65,68,68,32,32,32,32,69,0,65,68,68,32,32,32,32,72,0,65,68,68,32,32,32,32,76,0,65,68,68,32,32,32,32,77,0,65,68,68,32,32,32,32,65,0,65,68,67,32,32,32,32,66,0,65,68,67,32,32,32,32,67,0,65,68,67,32,32,32,32,68,0,65,68,67,32,32,32,32,69,0,65,68,67,32,32,32,32,72,0,65,68,67,32,32,32,32,76,0,65,68,67,32,32,32,32,77,0,65,68,67,32,32,32,32,65,0,83,85,66,32,32,32,32,66,0,83,85,66,32,32,32,32,67,0,83,85,66,32,32,32,32,68,0,83,85,66,32,32,32,32,69,0,83,85,66,32,32,32,32,72,0,83,85,66,32,32,32,32,76,0,83,85,66,32,32,32,32,77,0,83,85,66,32,32,32,32,65,0,83,66,66,32,32,32,32,66,0,83,66,66,32,32,32,32,67,0,83,66,66,32,32,32,32,68,0,83,66,66,32,32,32,32,69,0,83,66,66,32,32,32,32,72,0,83,66,66,32,32,32,32,76,0,83,66,66,32,32,32,32,77,0,83,66,66,32,32,32,32,65,0,65,78,65,32,32,32,32,66,0,65,78,65,32,32,32,32,67,0,65,78,65,32,32,32,32,68,0,65,78,65,32,32,32,32,69,0,65,78,65,32,32,32,32,72,0,65,78,65,32,32,32,32,76,0,65,78,65,32,32,32,32,77,0,65,78,65,32,32,32,32,65,0,88,82,65,32,32,32,32,66,0,88,82,65,32,32,32,32,67,0,88,82,65,32,32,32,32,68,0,88,82,65,32,32,32,32,69,0,88,82,65,32,32,32,32,72,0,88,82,65,32,32,32,32,76,0,88,82,65,32,32,32,32,77,0,88,82,65,32,32,32,32,65,0,79,82,65,32,32,32,32,66,0,79,82,65,32,32,32,32,67,0,79,82,65,32,32,32,32,68,0,79,82,65,32,32,32,32,69,0,79,82,65,32,32,32,32,72,0,79,82,65,32,32,32,32,76,0,79,82,65,32,32,32,32,77,0,79,82,65,32,32,32,32,65,0,67,77,80,32,32,32,32,66,0,67,77,80,32,32,32,32,67,0,67,77,80,32,32,32,32,68,0,67,77,80,32,32,32,32,69,0,67,77,80,32,32,32,32,72,0,67,77,80,32,32,32,32,76,0,67,77,80,32,32,32,32,77,0,67,77,80,32,32,32,32,65,0,82,78,90,0,80,79,80,32,32,32,32,66,0,74,78,90,32,32,32,32,36,37,48,50,120,37,48,50,120,0,74,77,80,32,32,32,32,36,37,48,50,120,37,48,50,120,0,67,78,90,32,32,32,32,36,37,48,50,120,37,48,50,120,0,80,85,83,72,32,32,32,66,0,65,68,73,32,32,32,32,35,36,37,48,50,120,0,82,83,84,32,32,32,32,48,0,82,90,0,82,69,84,0,74,90,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,67,90,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,67,65,76,76,32,32,32,36,37,48,50,120,37,48,50,120,0,65,67,73,32,32,32,32,35,36,37,48,50,120,0,82,83,84,32,32,32,32,49,0,82,78,67,0,80,79,80,32,32,32,32,68,0,74,78,67,32,32,32,32,36,37,48,50,120,37,48,50,120,0,79,85,84,32,32,32,32,35,36,37,48,50,120,0,67,78,67,32,32,32,32,36,37,48,50,120,37,48,50,120,0,80,85,83,72,32,32,32,68,0,83,85,73,32,32,32,32,35,36,37,48,50,120,0,82,83,84,32,32,32,32,50,0,82,67,0,74,67,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,73,78,32,32,32,32,32,35,36,37,48,50,120,0,67,67,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,83,66,73,32,32,32,32,35,36,37,48,50,120,0,82,83,84,32,32,32,32,51,0,82,80,79,0,80,79,80,32,32,32,32,72,0,74,80,79,32,32,32,32,36,37,48,50,120,37,48,50,120,0,88,84,72,76,0,67,80,79,32,32,32,32,36,37,48,50,120,37,48,50,120,0,80,85,83,72,32,32,32,72,0,65,78,73,32,32,32,32,35,36,37,48,50,120,0,82,83,84,32,32,32,32,52,0,82,80,69,0,80,67,72,76,0,74,80,69,32,32,32,32,36,37,48,50,120,37,48,50,120,0,88,67,72,71,0,67,80,69,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,88,82,73,32,32,32,32,35,36,37,48,50,120,0,82,83,84,32,32,32,32,53,0,82,80,0,80,79,80,32,32,32,32,80,83,87,0,74,80,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,68,73,0,67,80,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,80,85,83,72,32,32,32,80,83,87,0,79,82,73,32,32,32,32,35,36,37,48,50,120,0,82,83,84,32,32,32,32,54,0,82,77,0,83,80,72,76,0,74,77,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,69,73,0,67,77,32,32,32,32,32,36,37,48,50,120,37,48,50,120,0,67,80,73,32,32,32,32,35,36,37,48,50,120,0,82,83,84,32,32,32,32,55,0,69,114,114,111,114,58,32,85,110,105,109,112,108,101,109,101,110,116,101,100,32,105,110,115,116,114,117,99,116,105,111,110,10,0,10,0,69,114,114,111,114,58,32,73,110,118,97,108,105,100,32,105,110,115,116,114,117,99,116,105,111,110,10,0,80,67,58,32,37,117,10,0,77,101,109,111,114,121,32,97,116,32,80,67,58,32,37,117,10,0,69,109,117,108,97,116,105,110,103,32,105,110,115,116,114,117,99,116,105,111,110,32,97,116,32,37,100,10,0,69,109,117,108,97,116,105,110,103,32,105,110,115,116,114,117,99,116,105,111,110,32,37,100,10,0,69,120,101,99,117,116,105,110,103,32,73,78,82,32,65,0,83,116,97,116,101,32,80,116,114,58,32,37,112,44,32,83,80,32,80,116,114,58,32,37,112,10,0,79,102,102,115,101,116,32,37,117,10,0,77,101,109,111,114,121,32,97,116,32,111,102,102,115,101,116,32,37,117,10,0,77,101,109,111,114,121,32,97,116,32,111,102,102,115,101,116,32,43,32,49,32,37,117,10,0,37,99,0,37,99,32,32,0,65,32,36,37,48,50,120,32,66,32,36,37,48,50,120,32,67,32,36,37,48,50,120,32,68,32,36,37,48,50,120,32,69,32,36,37,48,50,120,32,72,32,36,37,48,50,120,32,76,32,36,37,48,50,120,32,83,80,32,37,48,52,120,32,80,67,32,37,48,52,120,10,0,17,0,10,0,17,17,17,0,0,0,0,5,0,0,0,0,0,0,9,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,15,10,17,17,17,3,10,7,0,1,19,9,11,11,0,0,9,6,11,0,0,11,0,6,17,0,0,0,17,17,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,10,10,17,17,17,0,10,0,0,2,0,9,11,0,0,0,9,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,13,0,0,0,0,9,14,0,0,0,0,0,14,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,15,0,0,0,0,9,16,0,0,0,0,0,16,0,0,16,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,10,0,0,0,0,9,11,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70,45,43,32,32,32,48,88,48,120,0,84,33,34,25,13,1,2,3,17,75,28,12,16,4,11,29,18,30,39,104,110,111,112,113,98,32,5,6,15,19,20,21,26,8,22,7,40,36,23,24,9,10,14,27,31,37,35,131,130,125,38,42,43,60,61,62,63,67,71,74,77,88,89,90,91,92,93,94,95,96,97,99,100,101,102,103,105,106,107,108,114,115,116,121,122,123,124,0,73,108,108,101,103,97,108,32,98,121,116,101,32,115,101,113,117,101,110,99,101,0,68,111,109,97,105,110,32,101,114,114,111,114,0,82,101,115,117,108,116,32,110,111,116,32,114,101,112,114,101,115,101,110,116,97,98,108,101,0,78,111,116,32,97,32,116,116,121,0,80,101,114,109,105,115,115,105,111,110,32,100,101,110,105,101,100,0,79,112,101,114,97,116,105,111,110,32,110,111,116,32,112,101,114,109,105,116,116,101,100,0,78,111,32,115,117,99,104,32,102,105,108,101,32,111,114,32,100,105,114,101,99,116,111,114,121,0,78,111,32,115,117,99,104,32,112,114,111,99,101,115,115,0,70,105,108,101,32,101,120,105,115,116,115,0,86,97,108,117,101,32,116,111,111,32,108,97,114,103,101,32,102,111,114,32,100,97,116,97,32,116,121,112,101,0,78,111,32,115,112,97,99,101,32,108,101,102,116,32,111,110,32,100,101,118,105,99,101,0,79,117,116,32,111,102,32,109,101,109,111,114,121,0,82,101,115,111,117,114,99,101,32,98,117,115,121,0,73,110,116,101,114,114,117,112,116,101,100,32,115,121,115,116,101,109,32,99,97,108,108,0,82,101,115,111,117,114,99,101,32,116,101,109,112,111,114,97,114,105,108,121,32,117,110,97,118,97,105,108,97,98,108,101,0,73,110,118,97,108,105,100,32,115,101,101,107,0,67,114,111,115,115,45,100,101,118,105,99,101,32,108,105,110,107,0,82,101,97,100,45,111,110,108,121,32,102,105,108,101,32,115,121,115,116,101,109,0,68,105,114,101,99,116,111,114,121,32,110,111,116,32,101,109,112,116,121,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,112,101,101,114,0,79,112,101,114,97,116,105,111,110,32,116,105,109,101,100,32,111,117,116,0,67,111,110,110,101,99,116,105,111,110,32,114,101,102,117,115,101,100,0,72,111,115,116,32,105,115,32,100,111,119,110,0,72,111,115,116,32,105,115,32,117,110,114,101,97,99,104,97,98,108,101,0,65,100,100,114,101,115,115,32,105,110,32,117,115,101,0,66,114,111,107,101,110,32,112,105,112,101,0,73,47,79,32,101,114,114,111,114,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,32,111,114,32,97,100,100,114,101,115,115,0,66,108,111,99,107,32,100,101,118,105,99,101,32,114,101,113,117,105,114,101,100,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,0,78,111,116,32,97,32,100,105,114,101,99,116,111,114,121,0,73,115,32,97,32,100,105,114,101,99,116,111,114,121,0,84,101,120,116,32,102,105,108,101,32,98,117,115,121,0,69,120,101,99,32,102,111,114,109,97,116,32,101,114,114,111,114,0,73,110,118,97,108,105,100,32,97,114,103,117,109,101,110,116,0,65,114,103,117,109,101,110,116,32,108,105,115,116,32,116,111,111,32,108,111,110,103,0,83,121,109,98,111,108,105,99,32,108,105,110,107,32,108,111,111,112,0,70,105,108,101,110,97,109,101,32,116,111,111,32,108,111,110,103,0,84,111,111,32,109,97,110,121,32,111,112,101,110,32,102,105,108,101,115,32,105,110,32,115,121,115,116,101,109,0,78,111,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,115,32,97,118,97,105,108,97,98,108,101,0,66,97,100,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,0,78,111,32,99,104,105,108,100,32,112,114,111,99,101,115,115,0,66,97,100,32,97,100,100,114,101,115,115,0,70,105,108,101,32,116,111,111,32,108,97,114,103,101,0,84,111,111,32,109,97,110,121,32,108,105,110,107,115,0,78,111,32,108,111,99,107,115,32,97,118,97,105,108,97,98,108,101,0,82,101,115,111,117,114,99,101,32,100,101,97,100,108,111,99,107,32,119,111,117,108,100,32,111,99,99,117,114,0,83,116,97,116,101,32,110,111,116,32,114,101,99,111,118,101,114,97,98,108,101,0,80,114,101,118,105,111,117,115,32,111,119,110,101,114,32,100,105,101,100,0,79,112,101,114,97,116,105,111,110,32,99,97,110,99,101,108,101,100,0,70,117,110,99,116,105,111,110,32,110,111,116,32,105,109,112,108,101,109,101,110,116,101,100,0,78,111,32,109,101,115,115,97,103,101,32,111,102,32,100,101,115,105,114,101,100,32,116,121,112,101,0,73,100,101,110,116,105,102,105,101,114,32,114,101,109,111,118,101,100,0,68,101,118,105,99,101,32,110,111,116,32,97,32,115,116,114,101,97,109,0,78,111,32,100,97,116,97,32,97,118,97,105,108,97,98,108,101,0,68,101,118,105,99,101,32,116,105,109,101,111,117,116,0,79,117,116,32,111,102,32,115,116,114,101,97,109,115,32,114,101,115,111,117,114,99,101,115,0,76,105,110,107,32,104,97,115,32,98,101,101,110,32,115,101,118,101,114,101,100,0,80,114,111,116,111,99,111,108,32,101,114,114,111,114,0,66,97,100,32,109,101,115,115,97,103,101,0,70,105,108,101,32,100,101,115,99,114,105,112,116,111,114,32,105,110,32,98,97,100,32,115,116,97,116,101,0,78,111,116,32,97,32,115,111,99,107,101,116,0,68,101,115,116,105,110,97,116,105,111,110,32,97,100,100,114,101,115,115,32,114,101,113,117,105,114,101,100,0,77,101,115,115,97,103,101,32,116,111,111,32,108,97,114,103,101,0,80,114,111,116,111,99,111,108,32,119,114,111,110,103,32,116,121,112,101,32,102,111,114,32,115,111,99,107,101,116,0,80,114,111,116,111,99,111,108,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,80,114,111,116,111,99,111,108,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,83,111,99,107,101,116,32,116,121,112,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,78,111,116,32,115,117,112,112,111,114,116,101,100,0,80,114,111,116,111,99,111,108,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,65,100,100,114,101,115,115,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,98,121,32,112,114,111,116,111,99,111,108,0,65,100,100,114,101,115,115,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,78,101,116,119,111,114,107,32,105,115,32,100,111,119,110,0,78,101,116,119,111,114,107,32,117,110,114,101,97,99,104,97,98,108,101,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,110,101,116,119,111,114,107,0,67,111,110,110,101,99,116,105,111,110,32,97,98,111,114,116,101,100,0,78,111,32,98,117,102,102,101,114,32,115,112,97,99,101,32,97,118,97,105,108,97,98,108,101,0,83,111,99,107,101,116,32,105,115,32,99,111,110,110,101,99,116,101,100,0,83,111,99,107,101,116,32,110,111,116,32,99,111,110,110,101,99,116,101,100,0,67,97,110,110,111,116,32,115,101,110,100,32,97,102,116,101,114,32,115,111,99,107,101,116,32,115,104,117,116,100,111,119,110,0,79,112,101,114,97,116,105,111,110,32,97,108,114,101,97,100,121,32,105,110,32,112,114,111,103,114,101,115,115,0,79,112,101,114,97,116,105,111,110,32,105,110,32,112,114,111,103,114,101,115,115,0,83,116,97,108,101,32,102,105,108,101,32,104,97,110,100,108,101,0,82,101,109,111,116,101,32,73,47,79,32,101,114,114,111,114,0,81,117,111,116,97,32,101,120,99,101,101,100,101,100,0,78,111,32,109,101,100,105,117,109,32,102,111,117,110,100,0,87,114,111,110,103,32,109,101,100,105,117,109,32,116,121,112,101,0,78,111,32,101,114,114,111,114,32,105,110,102,111,114,109,97,116,105,111,110,0,0,40,110,117,108,108,41,0,45,48,88,43,48,88,32,48,88,45,48,120,43,48,120,32,48,120,0,105,110,102,0,73,78,70,0,110,97,110,0,78,65,78,0,46,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);





/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


   
  Module["_i64Subtract"] = _i64Subtract;

   
  Module["_i64Add"] = _i64Add;

   
  Module["_memset"] = _memset;

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { Runtime.dynCall('vi', routine, [arg]) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _abort() {
      Module['abort']();
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  
  var SYSCALLS={varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }

  function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in NO_FILESYSTEM
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) {
        ___syscall146.buffers = [null, [], []]; // 1 => stdout, 2 => stderr
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr+j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
/* flush anything remaining in the buffer during shutdown */ __ATEXIT__.push(function() { var fflush = Module["_fflush"]; if (fflush) fflush(0); var printChar = ___syscall146.printChar; if (!printChar) return; var buffers = ___syscall146.buffers; if (buffers[1].length) printChar(1, 10); if (buffers[2].length) printChar(2, 10); });;
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "nullFunc_ii": nullFunc_ii, "nullFunc_iiii": nullFunc_iiii, "nullFunc_vi": nullFunc_vi, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "invoke_vi": invoke_vi, "_pthread_cleanup_pop": _pthread_cleanup_pop, "_sysconf": _sysconf, "_pthread_self": _pthread_self, "_abort": _abort, "___setErrNo": ___setErrNo, "___syscall6": ___syscall6, "_sbrk": _sbrk, "_time": _time, "_pthread_cleanup_push": _pthread_cleanup_push, "_emscripten_memcpy_big": _emscripten_memcpy_big, "___syscall54": ___syscall54, "___syscall140": ___syscall140, "_exit": _exit, "__exit": __exit, "___syscall146": ___syscall146, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var nullFunc_ii=env.nullFunc_ii;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_vi=env.nullFunc_vi;
  var invoke_ii=env.invoke_ii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vi=env.invoke_vi;
  var _pthread_cleanup_pop=env._pthread_cleanup_pop;
  var _sysconf=env._sysconf;
  var _pthread_self=env._pthread_self;
  var _abort=env._abort;
  var ___setErrNo=env.___setErrNo;
  var ___syscall6=env.___syscall6;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var _pthread_cleanup_push=env._pthread_cleanup_push;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var ___syscall54=env.___syscall54;
  var ___syscall140=env.___syscall140;
  var _exit=env._exit;
  var __exit=env.__exit;
  var ___syscall146=env.___syscall146;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS

function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _parity($x,$size) {
 $x = $x|0;
 $size = $size|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $i = 0, $p = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $size;
 $p = 0;
 $2 = $0;
 $3 = $1;
 $4 = 1 << $3;
 $5 = (($4) - 1)|0;
 $6 = $2 & $5;
 $0 = $6;
 $i = 0;
 while(1) {
  $7 = $i;
  $8 = $1;
  $9 = ($7|0)<($8|0);
  if (!($9)) {
   break;
  }
  $10 = $0;
  $11 = $10 & 1;
  $12 = ($11|0)!=(0);
  if ($12) {
   $13 = $p;
   $14 = (($13) + 1)|0;
   $p = $14;
  }
  $15 = $0;
  $16 = $15 >> 1;
  $0 = $16;
  $17 = $i;
  $18 = (($17) + 1)|0;
  $i = $18;
 }
 $19 = $p;
 $20 = $19 & 1;
 $21 = (0)==($20|0);
 $22 = $21&1;
 STACKTOP = sp;return ($22|0);
}
function _Disassemble8085Op($codebuffer,$pc) {
 $codebuffer = $codebuffer|0;
 $pc = $pc|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $code = 0, $opbytes = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer102 = 0, $vararg_buffer104 = 0, $vararg_buffer106 = 0, $vararg_buffer108 = 0, $vararg_buffer11 = 0, $vararg_buffer111 = 0, $vararg_buffer113 = 0, $vararg_buffer115 = 0, $vararg_buffer119 = 0, $vararg_buffer123 = 0, $vararg_buffer125 = 0, $vararg_buffer127 = 0, $vararg_buffer129 = 0, $vararg_buffer13 = 0;
 var $vararg_buffer132 = 0, $vararg_buffer134 = 0, $vararg_buffer136 = 0, $vararg_buffer138 = 0, $vararg_buffer142 = 0, $vararg_buffer144 = 0, $vararg_buffer146 = 0, $vararg_buffer148 = 0, $vararg_buffer15 = 0, $vararg_buffer151 = 0, $vararg_buffer153 = 0, $vararg_buffer155 = 0, $vararg_buffer157 = 0, $vararg_buffer159 = 0, $vararg_buffer161 = 0, $vararg_buffer163 = 0, $vararg_buffer165 = 0, $vararg_buffer167 = 0, $vararg_buffer169 = 0, $vararg_buffer171 = 0;
 var $vararg_buffer173 = 0, $vararg_buffer175 = 0, $vararg_buffer177 = 0, $vararg_buffer179 = 0, $vararg_buffer18 = 0, $vararg_buffer181 = 0, $vararg_buffer183 = 0, $vararg_buffer185 = 0, $vararg_buffer187 = 0, $vararg_buffer189 = 0, $vararg_buffer191 = 0, $vararg_buffer193 = 0, $vararg_buffer195 = 0, $vararg_buffer197 = 0, $vararg_buffer199 = 0, $vararg_buffer20 = 0, $vararg_buffer201 = 0, $vararg_buffer203 = 0, $vararg_buffer205 = 0, $vararg_buffer207 = 0;
 var $vararg_buffer209 = 0, $vararg_buffer211 = 0, $vararg_buffer213 = 0, $vararg_buffer215 = 0, $vararg_buffer217 = 0, $vararg_buffer219 = 0, $vararg_buffer22 = 0, $vararg_buffer221 = 0, $vararg_buffer223 = 0, $vararg_buffer225 = 0, $vararg_buffer227 = 0, $vararg_buffer229 = 0, $vararg_buffer231 = 0, $vararg_buffer233 = 0, $vararg_buffer235 = 0, $vararg_buffer237 = 0, $vararg_buffer239 = 0, $vararg_buffer24 = 0, $vararg_buffer241 = 0, $vararg_buffer243 = 0;
 var $vararg_buffer245 = 0, $vararg_buffer247 = 0, $vararg_buffer249 = 0, $vararg_buffer251 = 0, $vararg_buffer253 = 0, $vararg_buffer255 = 0, $vararg_buffer257 = 0, $vararg_buffer259 = 0, $vararg_buffer26 = 0, $vararg_buffer261 = 0, $vararg_buffer263 = 0, $vararg_buffer265 = 0, $vararg_buffer267 = 0, $vararg_buffer269 = 0, $vararg_buffer271 = 0, $vararg_buffer273 = 0, $vararg_buffer275 = 0, $vararg_buffer277 = 0, $vararg_buffer279 = 0, $vararg_buffer28 = 0;
 var $vararg_buffer281 = 0, $vararg_buffer283 = 0, $vararg_buffer285 = 0, $vararg_buffer287 = 0, $vararg_buffer289 = 0, $vararg_buffer291 = 0, $vararg_buffer293 = 0, $vararg_buffer295 = 0, $vararg_buffer297 = 0, $vararg_buffer299 = 0, $vararg_buffer3 = 0, $vararg_buffer30 = 0, $vararg_buffer301 = 0, $vararg_buffer303 = 0, $vararg_buffer305 = 0, $vararg_buffer307 = 0, $vararg_buffer309 = 0, $vararg_buffer311 = 0, $vararg_buffer313 = 0, $vararg_buffer315 = 0;
 var $vararg_buffer317 = 0, $vararg_buffer319 = 0, $vararg_buffer32 = 0, $vararg_buffer321 = 0, $vararg_buffer323 = 0, $vararg_buffer325 = 0, $vararg_buffer327 = 0, $vararg_buffer329 = 0, $vararg_buffer331 = 0, $vararg_buffer333 = 0, $vararg_buffer335 = 0, $vararg_buffer337 = 0, $vararg_buffer339 = 0, $vararg_buffer341 = 0, $vararg_buffer343 = 0, $vararg_buffer345 = 0, $vararg_buffer347 = 0, $vararg_buffer349 = 0, $vararg_buffer35 = 0, $vararg_buffer351 = 0;
 var $vararg_buffer353 = 0, $vararg_buffer355 = 0, $vararg_buffer357 = 0, $vararg_buffer359 = 0, $vararg_buffer361 = 0, $vararg_buffer363 = 0, $vararg_buffer365 = 0, $vararg_buffer367 = 0, $vararg_buffer369 = 0, $vararg_buffer37 = 0, $vararg_buffer371 = 0, $vararg_buffer373 = 0, $vararg_buffer375 = 0, $vararg_buffer377 = 0, $vararg_buffer379 = 0, $vararg_buffer381 = 0, $vararg_buffer383 = 0, $vararg_buffer385 = 0, $vararg_buffer387 = 0, $vararg_buffer389 = 0;
 var $vararg_buffer39 = 0, $vararg_buffer391 = 0, $vararg_buffer393 = 0, $vararg_buffer395 = 0, $vararg_buffer397 = 0, $vararg_buffer399 = 0, $vararg_buffer401 = 0, $vararg_buffer403 = 0, $vararg_buffer405 = 0, $vararg_buffer407 = 0, $vararg_buffer409 = 0, $vararg_buffer411 = 0, $vararg_buffer413 = 0, $vararg_buffer417 = 0, $vararg_buffer421 = 0, $vararg_buffer425 = 0, $vararg_buffer427 = 0, $vararg_buffer43 = 0, $vararg_buffer430 = 0, $vararg_buffer432 = 0;
 var $vararg_buffer434 = 0, $vararg_buffer436 = 0, $vararg_buffer440 = 0, $vararg_buffer444 = 0, $vararg_buffer448 = 0, $vararg_buffer45 = 0, $vararg_buffer452 = 0, $vararg_buffer455 = 0, $vararg_buffer457 = 0, $vararg_buffer459 = 0, $vararg_buffer461 = 0, $vararg_buffer465 = 0, $vararg_buffer468 = 0, $vararg_buffer47 = 0, $vararg_buffer472 = 0, $vararg_buffer474 = 0, $vararg_buffer477 = 0, $vararg_buffer479 = 0, $vararg_buffer481 = 0, $vararg_buffer483 = 0;
 var $vararg_buffer487 = 0, $vararg_buffer49 = 0, $vararg_buffer490 = 0, $vararg_buffer494 = 0, $vararg_buffer498 = 0, $vararg_buffer501 = 0, $vararg_buffer503 = 0, $vararg_buffer505 = 0, $vararg_buffer507 = 0, $vararg_buffer51 = 0, $vararg_buffer511 = 0, $vararg_buffer513 = 0, $vararg_buffer517 = 0, $vararg_buffer519 = 0, $vararg_buffer522 = 0, $vararg_buffer524 = 0, $vararg_buffer526 = 0, $vararg_buffer528 = 0, $vararg_buffer532 = 0, $vararg_buffer534 = 0;
 var $vararg_buffer538 = 0, $vararg_buffer54 = 0, $vararg_buffer542 = 0, $vararg_buffer545 = 0, $vararg_buffer547 = 0, $vararg_buffer549 = 0, $vararg_buffer551 = 0, $vararg_buffer555 = 0, $vararg_buffer557 = 0, $vararg_buffer56 = 0, $vararg_buffer561 = 0, $vararg_buffer563 = 0, $vararg_buffer566 = 0, $vararg_buffer568 = 0, $vararg_buffer570 = 0, $vararg_buffer572 = 0, $vararg_buffer576 = 0, $vararg_buffer578 = 0, $vararg_buffer58 = 0, $vararg_buffer582 = 0;
 var $vararg_buffer586 = 0, $vararg_buffer589 = 0, $vararg_buffer60 = 0, $vararg_buffer62 = 0, $vararg_buffer64 = 0, $vararg_buffer66 = 0, $vararg_buffer68 = 0, $vararg_buffer7 = 0, $vararg_buffer71 = 0, $vararg_buffer73 = 0, $vararg_buffer75 = 0, $vararg_buffer79 = 0, $vararg_buffer83 = 0, $vararg_buffer85 = 0, $vararg_buffer87 = 0, $vararg_buffer89 = 0, $vararg_buffer9 = 0, $vararg_buffer92 = 0, $vararg_buffer94 = 0, $vararg_buffer96 = 0;
 var $vararg_buffer98 = 0, $vararg_ptr101 = 0, $vararg_ptr118 = 0, $vararg_ptr122 = 0, $vararg_ptr141 = 0, $vararg_ptr416 = 0, $vararg_ptr42 = 0, $vararg_ptr420 = 0, $vararg_ptr424 = 0, $vararg_ptr439 = 0, $vararg_ptr443 = 0, $vararg_ptr447 = 0, $vararg_ptr451 = 0, $vararg_ptr464 = 0, $vararg_ptr471 = 0, $vararg_ptr486 = 0, $vararg_ptr493 = 0, $vararg_ptr497 = 0, $vararg_ptr510 = 0, $vararg_ptr516 = 0;
 var $vararg_ptr531 = 0, $vararg_ptr537 = 0, $vararg_ptr541 = 0, $vararg_ptr554 = 0, $vararg_ptr560 = 0, $vararg_ptr575 = 0, $vararg_ptr581 = 0, $vararg_ptr585 = 0, $vararg_ptr6 = 0, $vararg_ptr78 = 0, $vararg_ptr82 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 2080|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer589 = sp + 2048|0;
 $vararg_buffer586 = sp + 2040|0;
 $vararg_buffer582 = sp + 2032|0;
 $vararg_buffer578 = sp + 2024|0;
 $vararg_buffer576 = sp + 2016|0;
 $vararg_buffer572 = sp + 2008|0;
 $vararg_buffer570 = sp + 2000|0;
 $vararg_buffer568 = sp + 1992|0;
 $vararg_buffer566 = sp + 1984|0;
 $vararg_buffer563 = sp + 1976|0;
 $vararg_buffer561 = sp + 1968|0;
 $vararg_buffer557 = sp + 1960|0;
 $vararg_buffer555 = sp + 1952|0;
 $vararg_buffer551 = sp + 1944|0;
 $vararg_buffer549 = sp + 1936|0;
 $vararg_buffer547 = sp + 1928|0;
 $vararg_buffer545 = sp + 1920|0;
 $vararg_buffer542 = sp + 1912|0;
 $vararg_buffer538 = sp + 1904|0;
 $vararg_buffer534 = sp + 1896|0;
 $vararg_buffer532 = sp + 1888|0;
 $vararg_buffer528 = sp + 1880|0;
 $vararg_buffer526 = sp + 1872|0;
 $vararg_buffer524 = sp + 1864|0;
 $vararg_buffer522 = sp + 1856|0;
 $vararg_buffer519 = sp + 1848|0;
 $vararg_buffer517 = sp + 1840|0;
 $vararg_buffer513 = sp + 1832|0;
 $vararg_buffer511 = sp + 1824|0;
 $vararg_buffer507 = sp + 1816|0;
 $vararg_buffer505 = sp + 1808|0;
 $vararg_buffer503 = sp + 1800|0;
 $vararg_buffer501 = sp + 1792|0;
 $vararg_buffer498 = sp + 1784|0;
 $vararg_buffer494 = sp + 1776|0;
 $vararg_buffer490 = sp + 1768|0;
 $vararg_buffer487 = sp + 1760|0;
 $vararg_buffer483 = sp + 1752|0;
 $vararg_buffer481 = sp + 1744|0;
 $vararg_buffer479 = sp + 1736|0;
 $vararg_buffer477 = sp + 1728|0;
 $vararg_buffer474 = sp + 1720|0;
 $vararg_buffer472 = sp + 1712|0;
 $vararg_buffer468 = sp + 1704|0;
 $vararg_buffer465 = sp + 1696|0;
 $vararg_buffer461 = sp + 1688|0;
 $vararg_buffer459 = sp + 1680|0;
 $vararg_buffer457 = sp + 1672|0;
 $vararg_buffer455 = sp + 1664|0;
 $vararg_buffer452 = sp + 1656|0;
 $vararg_buffer448 = sp + 1648|0;
 $vararg_buffer444 = sp + 1640|0;
 $vararg_buffer440 = sp + 1632|0;
 $vararg_buffer436 = sp + 1624|0;
 $vararg_buffer434 = sp + 1616|0;
 $vararg_buffer432 = sp + 1608|0;
 $vararg_buffer430 = sp + 1600|0;
 $vararg_buffer427 = sp + 1592|0;
 $vararg_buffer425 = sp + 1584|0;
 $vararg_buffer421 = sp + 1576|0;
 $vararg_buffer417 = sp + 1568|0;
 $vararg_buffer413 = sp + 1560|0;
 $vararg_buffer411 = sp + 1552|0;
 $vararg_buffer409 = sp + 1544|0;
 $vararg_buffer407 = sp + 1536|0;
 $vararg_buffer405 = sp + 1528|0;
 $vararg_buffer403 = sp + 1520|0;
 $vararg_buffer401 = sp + 1512|0;
 $vararg_buffer399 = sp + 1504|0;
 $vararg_buffer397 = sp + 1496|0;
 $vararg_buffer395 = sp + 1488|0;
 $vararg_buffer393 = sp + 1480|0;
 $vararg_buffer391 = sp + 1472|0;
 $vararg_buffer389 = sp + 1464|0;
 $vararg_buffer387 = sp + 1456|0;
 $vararg_buffer385 = sp + 1448|0;
 $vararg_buffer383 = sp + 1440|0;
 $vararg_buffer381 = sp + 1432|0;
 $vararg_buffer379 = sp + 1424|0;
 $vararg_buffer377 = sp + 1416|0;
 $vararg_buffer375 = sp + 1408|0;
 $vararg_buffer373 = sp + 1400|0;
 $vararg_buffer371 = sp + 1392|0;
 $vararg_buffer369 = sp + 1384|0;
 $vararg_buffer367 = sp + 1376|0;
 $vararg_buffer365 = sp + 1368|0;
 $vararg_buffer363 = sp + 1360|0;
 $vararg_buffer361 = sp + 1352|0;
 $vararg_buffer359 = sp + 1344|0;
 $vararg_buffer357 = sp + 1336|0;
 $vararg_buffer355 = sp + 1328|0;
 $vararg_buffer353 = sp + 1320|0;
 $vararg_buffer351 = sp + 1312|0;
 $vararg_buffer349 = sp + 1304|0;
 $vararg_buffer347 = sp + 1296|0;
 $vararg_buffer345 = sp + 1288|0;
 $vararg_buffer343 = sp + 1280|0;
 $vararg_buffer341 = sp + 1272|0;
 $vararg_buffer339 = sp + 1264|0;
 $vararg_buffer337 = sp + 1256|0;
 $vararg_buffer335 = sp + 1248|0;
 $vararg_buffer333 = sp + 1240|0;
 $vararg_buffer331 = sp + 1232|0;
 $vararg_buffer329 = sp + 1224|0;
 $vararg_buffer327 = sp + 1216|0;
 $vararg_buffer325 = sp + 1208|0;
 $vararg_buffer323 = sp + 1200|0;
 $vararg_buffer321 = sp + 1192|0;
 $vararg_buffer319 = sp + 1184|0;
 $vararg_buffer317 = sp + 1176|0;
 $vararg_buffer315 = sp + 1168|0;
 $vararg_buffer313 = sp + 1160|0;
 $vararg_buffer311 = sp + 1152|0;
 $vararg_buffer309 = sp + 1144|0;
 $vararg_buffer307 = sp + 1136|0;
 $vararg_buffer305 = sp + 1128|0;
 $vararg_buffer303 = sp + 1120|0;
 $vararg_buffer301 = sp + 1112|0;
 $vararg_buffer299 = sp + 1104|0;
 $vararg_buffer297 = sp + 1096|0;
 $vararg_buffer295 = sp + 1088|0;
 $vararg_buffer293 = sp + 1080|0;
 $vararg_buffer291 = sp + 1072|0;
 $vararg_buffer289 = sp + 1064|0;
 $vararg_buffer287 = sp + 1056|0;
 $vararg_buffer285 = sp + 1048|0;
 $vararg_buffer283 = sp + 1040|0;
 $vararg_buffer281 = sp + 1032|0;
 $vararg_buffer279 = sp + 1024|0;
 $vararg_buffer277 = sp + 1016|0;
 $vararg_buffer275 = sp + 1008|0;
 $vararg_buffer273 = sp + 1000|0;
 $vararg_buffer271 = sp + 992|0;
 $vararg_buffer269 = sp + 984|0;
 $vararg_buffer267 = sp + 976|0;
 $vararg_buffer265 = sp + 968|0;
 $vararg_buffer263 = sp + 960|0;
 $vararg_buffer261 = sp + 952|0;
 $vararg_buffer259 = sp + 944|0;
 $vararg_buffer257 = sp + 936|0;
 $vararg_buffer255 = sp + 928|0;
 $vararg_buffer253 = sp + 920|0;
 $vararg_buffer251 = sp + 912|0;
 $vararg_buffer249 = sp + 904|0;
 $vararg_buffer247 = sp + 896|0;
 $vararg_buffer245 = sp + 888|0;
 $vararg_buffer243 = sp + 880|0;
 $vararg_buffer241 = sp + 872|0;
 $vararg_buffer239 = sp + 864|0;
 $vararg_buffer237 = sp + 856|0;
 $vararg_buffer235 = sp + 848|0;
 $vararg_buffer233 = sp + 840|0;
 $vararg_buffer231 = sp + 832|0;
 $vararg_buffer229 = sp + 824|0;
 $vararg_buffer227 = sp + 816|0;
 $vararg_buffer225 = sp + 808|0;
 $vararg_buffer223 = sp + 800|0;
 $vararg_buffer221 = sp + 792|0;
 $vararg_buffer219 = sp + 784|0;
 $vararg_buffer217 = sp + 776|0;
 $vararg_buffer215 = sp + 768|0;
 $vararg_buffer213 = sp + 760|0;
 $vararg_buffer211 = sp + 752|0;
 $vararg_buffer209 = sp + 744|0;
 $vararg_buffer207 = sp + 736|0;
 $vararg_buffer205 = sp + 728|0;
 $vararg_buffer203 = sp + 720|0;
 $vararg_buffer201 = sp + 712|0;
 $vararg_buffer199 = sp + 704|0;
 $vararg_buffer197 = sp + 696|0;
 $vararg_buffer195 = sp + 688|0;
 $vararg_buffer193 = sp + 680|0;
 $vararg_buffer191 = sp + 672|0;
 $vararg_buffer189 = sp + 664|0;
 $vararg_buffer187 = sp + 656|0;
 $vararg_buffer185 = sp + 648|0;
 $vararg_buffer183 = sp + 640|0;
 $vararg_buffer181 = sp + 632|0;
 $vararg_buffer179 = sp + 624|0;
 $vararg_buffer177 = sp + 616|0;
 $vararg_buffer175 = sp + 608|0;
 $vararg_buffer173 = sp + 600|0;
 $vararg_buffer171 = sp + 592|0;
 $vararg_buffer169 = sp + 584|0;
 $vararg_buffer167 = sp + 576|0;
 $vararg_buffer165 = sp + 568|0;
 $vararg_buffer163 = sp + 560|0;
 $vararg_buffer161 = sp + 552|0;
 $vararg_buffer159 = sp + 544|0;
 $vararg_buffer157 = sp + 536|0;
 $vararg_buffer155 = sp + 528|0;
 $vararg_buffer153 = sp + 520|0;
 $vararg_buffer151 = sp + 512|0;
 $vararg_buffer148 = sp + 504|0;
 $vararg_buffer146 = sp + 496|0;
 $vararg_buffer144 = sp + 488|0;
 $vararg_buffer142 = sp + 480|0;
 $vararg_buffer138 = sp + 472|0;
 $vararg_buffer136 = sp + 464|0;
 $vararg_buffer134 = sp + 456|0;
 $vararg_buffer132 = sp + 448|0;
 $vararg_buffer129 = sp + 440|0;
 $vararg_buffer127 = sp + 432|0;
 $vararg_buffer125 = sp + 424|0;
 $vararg_buffer123 = sp + 416|0;
 $vararg_buffer119 = sp + 408|0;
 $vararg_buffer115 = sp + 400|0;
 $vararg_buffer113 = sp + 392|0;
 $vararg_buffer111 = sp + 384|0;
 $vararg_buffer108 = sp + 376|0;
 $vararg_buffer106 = sp + 368|0;
 $vararg_buffer104 = sp + 360|0;
 $vararg_buffer102 = sp + 352|0;
 $vararg_buffer98 = sp + 344|0;
 $vararg_buffer96 = sp + 336|0;
 $vararg_buffer94 = sp + 328|0;
 $vararg_buffer92 = sp + 320|0;
 $vararg_buffer89 = sp + 312|0;
 $vararg_buffer87 = sp + 304|0;
 $vararg_buffer85 = sp + 296|0;
 $vararg_buffer83 = sp + 288|0;
 $vararg_buffer79 = sp + 280|0;
 $vararg_buffer75 = sp + 272|0;
 $vararg_buffer73 = sp + 264|0;
 $vararg_buffer71 = sp + 256|0;
 $vararg_buffer68 = sp + 248|0;
 $vararg_buffer66 = sp + 240|0;
 $vararg_buffer64 = sp + 232|0;
 $vararg_buffer62 = sp + 224|0;
 $vararg_buffer60 = sp + 216|0;
 $vararg_buffer58 = sp + 208|0;
 $vararg_buffer56 = sp + 200|0;
 $vararg_buffer54 = sp + 192|0;
 $vararg_buffer51 = sp + 184|0;
 $vararg_buffer49 = sp + 176|0;
 $vararg_buffer47 = sp + 168|0;
 $vararg_buffer45 = sp + 160|0;
 $vararg_buffer43 = sp + 152|0;
 $vararg_buffer39 = sp + 144|0;
 $vararg_buffer37 = sp + 136|0;
 $vararg_buffer35 = sp + 128|0;
 $vararg_buffer32 = sp + 120|0;
 $vararg_buffer30 = sp + 112|0;
 $vararg_buffer28 = sp + 104|0;
 $vararg_buffer26 = sp + 96|0;
 $vararg_buffer24 = sp + 88|0;
 $vararg_buffer22 = sp + 80|0;
 $vararg_buffer20 = sp + 72|0;
 $vararg_buffer18 = sp + 64|0;
 $vararg_buffer15 = sp + 56|0;
 $vararg_buffer13 = sp + 48|0;
 $vararg_buffer11 = sp + 40|0;
 $vararg_buffer9 = sp + 32|0;
 $vararg_buffer7 = sp + 24|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $0 = $codebuffer;
 $1 = $pc;
 $2 = $1;
 $3 = $0;
 $4 = (($3) + ($2)|0);
 $code = $4;
 $opbytes = 1;
 $5 = $1;
 HEAP32[$vararg_buffer>>2] = $5;
 (_printf(124,$vararg_buffer)|0);
 $6 = $code;
 $7 = HEAP8[$6>>0]|0;
 $8 = $7&255;
 do {
  switch ($8|0) {
  case 0:  {
   (_printf(130,$vararg_buffer1)|0);
   break;
  }
  case 1:  {
   $9 = $code;
   $10 = ((($9)) + 2|0);
   $11 = HEAP8[$10>>0]|0;
   $12 = $11&255;
   $13 = $code;
   $14 = ((($13)) + 1|0);
   $15 = HEAP8[$14>>0]|0;
   $16 = $15&255;
   HEAP32[$vararg_buffer3>>2] = $12;
   $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
   HEAP32[$vararg_ptr6>>2] = $16;
   (_printf(134,$vararg_buffer3)|0);
   $opbytes = 3;
   break;
  }
  case 2:  {
   (_printf(154,$vararg_buffer7)|0);
   break;
  }
  case 3:  {
   (_printf(163,$vararg_buffer9)|0);
   break;
  }
  case 4:  {
   (_printf(172,$vararg_buffer11)|0);
   break;
  }
  case 5:  {
   (_printf(181,$vararg_buffer13)|0);
   break;
  }
  case 6:  {
   $17 = $code;
   $18 = ((($17)) + 1|0);
   $19 = HEAP8[$18>>0]|0;
   $20 = $19&255;
   HEAP32[$vararg_buffer15>>2] = $20;
   (_printf(190,$vararg_buffer15)|0);
   $opbytes = 2;
   break;
  }
  case 7:  {
   (_printf(206,$vararg_buffer18)|0);
   break;
  }
  case 8:  {
   (_printf(130,$vararg_buffer20)|0);
   break;
  }
  case 9:  {
   (_printf(210,$vararg_buffer22)|0);
   break;
  }
  case 10:  {
   (_printf(219,$vararg_buffer24)|0);
   break;
  }
  case 11:  {
   (_printf(228,$vararg_buffer26)|0);
   break;
  }
  case 12:  {
   (_printf(237,$vararg_buffer28)|0);
   break;
  }
  case 13:  {
   (_printf(246,$vararg_buffer30)|0);
   break;
  }
  case 14:  {
   $21 = $code;
   $22 = ((($21)) + 1|0);
   $23 = HEAP8[$22>>0]|0;
   $24 = $23&255;
   HEAP32[$vararg_buffer32>>2] = $24;
   (_printf(255,$vararg_buffer32)|0);
   $opbytes = 2;
   break;
  }
  case 15:  {
   (_printf(271,$vararg_buffer35)|0);
   break;
  }
  case 16:  {
   (_printf(130,$vararg_buffer37)|0);
   break;
  }
  case 17:  {
   $25 = $code;
   $26 = ((($25)) + 2|0);
   $27 = HEAP8[$26>>0]|0;
   $28 = $27&255;
   $29 = $code;
   $30 = ((($29)) + 1|0);
   $31 = HEAP8[$30>>0]|0;
   $32 = $31&255;
   HEAP32[$vararg_buffer39>>2] = $28;
   $vararg_ptr42 = ((($vararg_buffer39)) + 4|0);
   HEAP32[$vararg_ptr42>>2] = $32;
   (_printf(275,$vararg_buffer39)|0);
   $opbytes = 3;
   break;
  }
  case 18:  {
   (_printf(295,$vararg_buffer43)|0);
   break;
  }
  case 19:  {
   (_printf(304,$vararg_buffer45)|0);
   break;
  }
  case 20:  {
   (_printf(313,$vararg_buffer47)|0);
   break;
  }
  case 21:  {
   (_printf(322,$vararg_buffer49)|0);
   break;
  }
  case 22:  {
   $33 = $code;
   $34 = ((($33)) + 1|0);
   $35 = HEAP8[$34>>0]|0;
   $36 = $35&255;
   HEAP32[$vararg_buffer51>>2] = $36;
   (_printf(331,$vararg_buffer51)|0);
   $opbytes = 2;
   break;
  }
  case 23:  {
   (_printf(347,$vararg_buffer54)|0);
   break;
  }
  case 24:  {
   (_printf(130,$vararg_buffer56)|0);
   break;
  }
  case 25:  {
   (_printf(351,$vararg_buffer58)|0);
   break;
  }
  case 26:  {
   (_printf(360,$vararg_buffer60)|0);
   break;
  }
  case 27:  {
   (_printf(369,$vararg_buffer62)|0);
   break;
  }
  case 28:  {
   (_printf(378,$vararg_buffer64)|0);
   break;
  }
  case 29:  {
   (_printf(387,$vararg_buffer66)|0);
   break;
  }
  case 30:  {
   $37 = $code;
   $38 = ((($37)) + 1|0);
   $39 = HEAP8[$38>>0]|0;
   $40 = $39&255;
   HEAP32[$vararg_buffer68>>2] = $40;
   (_printf(396,$vararg_buffer68)|0);
   $opbytes = 2;
   break;
  }
  case 31:  {
   (_printf(412,$vararg_buffer71)|0);
   break;
  }
  case 32:  {
   (_printf(130,$vararg_buffer73)|0);
   break;
  }
  case 33:  {
   $41 = $code;
   $42 = ((($41)) + 2|0);
   $43 = HEAP8[$42>>0]|0;
   $44 = $43&255;
   $45 = $code;
   $46 = ((($45)) + 1|0);
   $47 = HEAP8[$46>>0]|0;
   $48 = $47&255;
   HEAP32[$vararg_buffer75>>2] = $44;
   $vararg_ptr78 = ((($vararg_buffer75)) + 4|0);
   HEAP32[$vararg_ptr78>>2] = $48;
   (_printf(416,$vararg_buffer75)|0);
   $opbytes = 3;
   break;
  }
  case 34:  {
   $49 = $code;
   $50 = ((($49)) + 2|0);
   $51 = HEAP8[$50>>0]|0;
   $52 = $51&255;
   $53 = $code;
   $54 = ((($53)) + 1|0);
   $55 = HEAP8[$54>>0]|0;
   $56 = $55&255;
   HEAP32[$vararg_buffer79>>2] = $52;
   $vararg_ptr82 = ((($vararg_buffer79)) + 4|0);
   HEAP32[$vararg_ptr82>>2] = $56;
   (_printf(436,$vararg_buffer79)|0);
   $opbytes = 3;
   break;
  }
  case 35:  {
   (_printf(453,$vararg_buffer83)|0);
   break;
  }
  case 36:  {
   (_printf(462,$vararg_buffer85)|0);
   break;
  }
  case 37:  {
   (_printf(471,$vararg_buffer87)|0);
   break;
  }
  case 38:  {
   $57 = $code;
   $58 = ((($57)) + 1|0);
   $59 = HEAP8[$58>>0]|0;
   $60 = $59&255;
   HEAP32[$vararg_buffer89>>2] = $60;
   (_printf(480,$vararg_buffer89)|0);
   $opbytes = 2;
   break;
  }
  case 39:  {
   (_printf(496,$vararg_buffer92)|0);
   break;
  }
  case 40:  {
   (_printf(130,$vararg_buffer94)|0);
   break;
  }
  case 41:  {
   (_printf(500,$vararg_buffer96)|0);
   break;
  }
  case 42:  {
   $61 = $code;
   $62 = ((($61)) + 2|0);
   $63 = HEAP8[$62>>0]|0;
   $64 = $63&255;
   $65 = $code;
   $66 = ((($65)) + 1|0);
   $67 = HEAP8[$66>>0]|0;
   $68 = $67&255;
   HEAP32[$vararg_buffer98>>2] = $64;
   $vararg_ptr101 = ((($vararg_buffer98)) + 4|0);
   HEAP32[$vararg_ptr101>>2] = $68;
   (_printf(509,$vararg_buffer98)|0);
   $opbytes = 3;
   break;
  }
  case 43:  {
   (_printf(526,$vararg_buffer102)|0);
   break;
  }
  case 44:  {
   (_printf(535,$vararg_buffer104)|0);
   break;
  }
  case 45:  {
   (_printf(544,$vararg_buffer106)|0);
   break;
  }
  case 46:  {
   $69 = $code;
   $70 = ((($69)) + 1|0);
   $71 = HEAP8[$70>>0]|0;
   $72 = $71&255;
   HEAP32[$vararg_buffer108>>2] = $72;
   (_printf(553,$vararg_buffer108)|0);
   $opbytes = 2;
   break;
  }
  case 47:  {
   (_printf(569,$vararg_buffer111)|0);
   break;
  }
  case 48:  {
   (_printf(130,$vararg_buffer113)|0);
   break;
  }
  case 49:  {
   $73 = $code;
   $74 = ((($73)) + 2|0);
   $75 = HEAP8[$74>>0]|0;
   $76 = $75&255;
   $77 = $code;
   $78 = ((($77)) + 1|0);
   $79 = HEAP8[$78>>0]|0;
   $80 = $79&255;
   HEAP32[$vararg_buffer115>>2] = $76;
   $vararg_ptr118 = ((($vararg_buffer115)) + 4|0);
   HEAP32[$vararg_ptr118>>2] = $80;
   (_printf(573,$vararg_buffer115)|0);
   $opbytes = 3;
   break;
  }
  case 50:  {
   $81 = $code;
   $82 = ((($81)) + 2|0);
   $83 = HEAP8[$82>>0]|0;
   $84 = $83&255;
   $85 = $code;
   $86 = ((($85)) + 1|0);
   $87 = HEAP8[$86>>0]|0;
   $88 = $87&255;
   HEAP32[$vararg_buffer119>>2] = $84;
   $vararg_ptr122 = ((($vararg_buffer119)) + 4|0);
   HEAP32[$vararg_ptr122>>2] = $88;
   (_printf(594,$vararg_buffer119)|0);
   $opbytes = 3;
   break;
  }
  case 51:  {
   (_printf(611,$vararg_buffer123)|0);
   break;
  }
  case 52:  {
   (_printf(621,$vararg_buffer125)|0);
   break;
  }
  case 53:  {
   (_printf(630,$vararg_buffer127)|0);
   break;
  }
  case 54:  {
   $89 = $code;
   $90 = ((($89)) + 1|0);
   $91 = HEAP8[$90>>0]|0;
   $92 = $91&255;
   HEAP32[$vararg_buffer129>>2] = $92;
   (_printf(639,$vararg_buffer129)|0);
   $opbytes = 2;
   break;
  }
  case 55:  {
   (_printf(655,$vararg_buffer132)|0);
   break;
  }
  case 56:  {
   (_printf(130,$vararg_buffer134)|0);
   break;
  }
  case 57:  {
   (_printf(659,$vararg_buffer136)|0);
   break;
  }
  case 58:  {
   $93 = $code;
   $94 = ((($93)) + 2|0);
   $95 = HEAP8[$94>>0]|0;
   $96 = $95&255;
   $97 = $code;
   $98 = ((($97)) + 1|0);
   $99 = HEAP8[$98>>0]|0;
   $100 = $99&255;
   HEAP32[$vararg_buffer138>>2] = $96;
   $vararg_ptr141 = ((($vararg_buffer138)) + 4|0);
   HEAP32[$vararg_ptr141>>2] = $100;
   (_printf(669,$vararg_buffer138)|0);
   $opbytes = 3;
   break;
  }
  case 59:  {
   (_printf(686,$vararg_buffer142)|0);
   break;
  }
  case 60:  {
   (_printf(696,$vararg_buffer144)|0);
   break;
  }
  case 61:  {
   (_printf(705,$vararg_buffer146)|0);
   break;
  }
  case 62:  {
   $101 = $code;
   $102 = ((($101)) + 1|0);
   $103 = HEAP8[$102>>0]|0;
   $104 = $103&255;
   HEAP32[$vararg_buffer148>>2] = $104;
   (_printf(714,$vararg_buffer148)|0);
   $opbytes = 2;
   break;
  }
  case 63:  {
   (_printf(730,$vararg_buffer151)|0);
   break;
  }
  case 64:  {
   (_printf(734,$vararg_buffer153)|0);
   break;
  }
  case 65:  {
   (_printf(745,$vararg_buffer155)|0);
   break;
  }
  case 66:  {
   (_printf(756,$vararg_buffer157)|0);
   break;
  }
  case 67:  {
   (_printf(767,$vararg_buffer159)|0);
   break;
  }
  case 68:  {
   (_printf(778,$vararg_buffer161)|0);
   break;
  }
  case 69:  {
   (_printf(789,$vararg_buffer163)|0);
   break;
  }
  case 70:  {
   (_printf(800,$vararg_buffer165)|0);
   break;
  }
  case 71:  {
   (_printf(811,$vararg_buffer167)|0);
   break;
  }
  case 72:  {
   (_printf(822,$vararg_buffer169)|0);
   break;
  }
  case 73:  {
   (_printf(833,$vararg_buffer171)|0);
   break;
  }
  case 74:  {
   (_printf(844,$vararg_buffer173)|0);
   break;
  }
  case 75:  {
   (_printf(855,$vararg_buffer175)|0);
   break;
  }
  case 76:  {
   (_printf(866,$vararg_buffer177)|0);
   break;
  }
  case 77:  {
   (_printf(877,$vararg_buffer179)|0);
   break;
  }
  case 78:  {
   (_printf(888,$vararg_buffer181)|0);
   break;
  }
  case 79:  {
   (_printf(899,$vararg_buffer183)|0);
   break;
  }
  case 80:  {
   (_printf(910,$vararg_buffer185)|0);
   break;
  }
  case 81:  {
   (_printf(921,$vararg_buffer187)|0);
   break;
  }
  case 82:  {
   (_printf(932,$vararg_buffer189)|0);
   break;
  }
  case 83:  {
   (_printf(943,$vararg_buffer191)|0);
   break;
  }
  case 84:  {
   (_printf(954,$vararg_buffer193)|0);
   break;
  }
  case 85:  {
   (_printf(965,$vararg_buffer195)|0);
   break;
  }
  case 86:  {
   (_printf(976,$vararg_buffer197)|0);
   break;
  }
  case 87:  {
   (_printf(987,$vararg_buffer199)|0);
   break;
  }
  case 88:  {
   (_printf(998,$vararg_buffer201)|0);
   break;
  }
  case 89:  {
   (_printf(1009,$vararg_buffer203)|0);
   break;
  }
  case 90:  {
   (_printf(1020,$vararg_buffer205)|0);
   break;
  }
  case 91:  {
   (_printf(1031,$vararg_buffer207)|0);
   break;
  }
  case 92:  {
   (_printf(1042,$vararg_buffer209)|0);
   break;
  }
  case 93:  {
   (_printf(1053,$vararg_buffer211)|0);
   break;
  }
  case 94:  {
   (_printf(1064,$vararg_buffer213)|0);
   break;
  }
  case 95:  {
   (_printf(1075,$vararg_buffer215)|0);
   break;
  }
  case 96:  {
   (_printf(1086,$vararg_buffer217)|0);
   break;
  }
  case 97:  {
   (_printf(1097,$vararg_buffer219)|0);
   break;
  }
  case 98:  {
   (_printf(1108,$vararg_buffer221)|0);
   break;
  }
  case 99:  {
   (_printf(1119,$vararg_buffer223)|0);
   break;
  }
  case 100:  {
   (_printf(1130,$vararg_buffer225)|0);
   break;
  }
  case 101:  {
   (_printf(1141,$vararg_buffer227)|0);
   break;
  }
  case 102:  {
   (_printf(1152,$vararg_buffer229)|0);
   break;
  }
  case 103:  {
   (_printf(1163,$vararg_buffer231)|0);
   break;
  }
  case 104:  {
   (_printf(1174,$vararg_buffer233)|0);
   break;
  }
  case 105:  {
   (_printf(1185,$vararg_buffer235)|0);
   break;
  }
  case 106:  {
   (_printf(1196,$vararg_buffer237)|0);
   break;
  }
  case 107:  {
   (_printf(1207,$vararg_buffer239)|0);
   break;
  }
  case 108:  {
   (_printf(1218,$vararg_buffer241)|0);
   break;
  }
  case 109:  {
   (_printf(1229,$vararg_buffer243)|0);
   break;
  }
  case 110:  {
   (_printf(1240,$vararg_buffer245)|0);
   break;
  }
  case 111:  {
   (_printf(1251,$vararg_buffer247)|0);
   break;
  }
  case 112:  {
   (_printf(1262,$vararg_buffer249)|0);
   break;
  }
  case 113:  {
   (_printf(1273,$vararg_buffer251)|0);
   break;
  }
  case 114:  {
   (_printf(1284,$vararg_buffer253)|0);
   break;
  }
  case 115:  {
   (_printf(1295,$vararg_buffer255)|0);
   break;
  }
  case 116:  {
   (_printf(1306,$vararg_buffer257)|0);
   break;
  }
  case 117:  {
   (_printf(1317,$vararg_buffer259)|0);
   break;
  }
  case 118:  {
   (_printf(1328,$vararg_buffer261)|0);
   break;
  }
  case 119:  {
   (_printf(1332,$vararg_buffer263)|0);
   break;
  }
  case 120:  {
   (_printf(1343,$vararg_buffer265)|0);
   break;
  }
  case 121:  {
   (_printf(1354,$vararg_buffer267)|0);
   break;
  }
  case 122:  {
   (_printf(1365,$vararg_buffer269)|0);
   break;
  }
  case 123:  {
   (_printf(1376,$vararg_buffer271)|0);
   break;
  }
  case 124:  {
   (_printf(1387,$vararg_buffer273)|0);
   break;
  }
  case 125:  {
   (_printf(1398,$vararg_buffer275)|0);
   break;
  }
  case 126:  {
   (_printf(1409,$vararg_buffer277)|0);
   break;
  }
  case 127:  {
   (_printf(1420,$vararg_buffer279)|0);
   break;
  }
  case 128:  {
   (_printf(1431,$vararg_buffer281)|0);
   break;
  }
  case 129:  {
   (_printf(1440,$vararg_buffer283)|0);
   break;
  }
  case 130:  {
   (_printf(1449,$vararg_buffer285)|0);
   break;
  }
  case 131:  {
   (_printf(1458,$vararg_buffer287)|0);
   break;
  }
  case 132:  {
   (_printf(1467,$vararg_buffer289)|0);
   break;
  }
  case 133:  {
   (_printf(1476,$vararg_buffer291)|0);
   break;
  }
  case 134:  {
   (_printf(1485,$vararg_buffer293)|0);
   break;
  }
  case 135:  {
   (_printf(1494,$vararg_buffer295)|0);
   break;
  }
  case 136:  {
   (_printf(1503,$vararg_buffer297)|0);
   break;
  }
  case 137:  {
   (_printf(1512,$vararg_buffer299)|0);
   break;
  }
  case 138:  {
   (_printf(1521,$vararg_buffer301)|0);
   break;
  }
  case 139:  {
   (_printf(1530,$vararg_buffer303)|0);
   break;
  }
  case 140:  {
   (_printf(1539,$vararg_buffer305)|0);
   break;
  }
  case 141:  {
   (_printf(1548,$vararg_buffer307)|0);
   break;
  }
  case 142:  {
   (_printf(1557,$vararg_buffer309)|0);
   break;
  }
  case 143:  {
   (_printf(1566,$vararg_buffer311)|0);
   break;
  }
  case 144:  {
   (_printf(1575,$vararg_buffer313)|0);
   break;
  }
  case 145:  {
   (_printf(1584,$vararg_buffer315)|0);
   break;
  }
  case 146:  {
   (_printf(1593,$vararg_buffer317)|0);
   break;
  }
  case 147:  {
   (_printf(1602,$vararg_buffer319)|0);
   break;
  }
  case 148:  {
   (_printf(1611,$vararg_buffer321)|0);
   break;
  }
  case 149:  {
   (_printf(1620,$vararg_buffer323)|0);
   break;
  }
  case 150:  {
   (_printf(1629,$vararg_buffer325)|0);
   break;
  }
  case 151:  {
   (_printf(1638,$vararg_buffer327)|0);
   break;
  }
  case 152:  {
   (_printf(1647,$vararg_buffer329)|0);
   break;
  }
  case 153:  {
   (_printf(1656,$vararg_buffer331)|0);
   break;
  }
  case 154:  {
   (_printf(1665,$vararg_buffer333)|0);
   break;
  }
  case 155:  {
   (_printf(1674,$vararg_buffer335)|0);
   break;
  }
  case 156:  {
   (_printf(1683,$vararg_buffer337)|0);
   break;
  }
  case 157:  {
   (_printf(1692,$vararg_buffer339)|0);
   break;
  }
  case 158:  {
   (_printf(1701,$vararg_buffer341)|0);
   break;
  }
  case 159:  {
   (_printf(1710,$vararg_buffer343)|0);
   break;
  }
  case 160:  {
   (_printf(1719,$vararg_buffer345)|0);
   break;
  }
  case 161:  {
   (_printf(1728,$vararg_buffer347)|0);
   break;
  }
  case 162:  {
   (_printf(1737,$vararg_buffer349)|0);
   break;
  }
  case 163:  {
   (_printf(1746,$vararg_buffer351)|0);
   break;
  }
  case 164:  {
   (_printf(1755,$vararg_buffer353)|0);
   break;
  }
  case 165:  {
   (_printf(1764,$vararg_buffer355)|0);
   break;
  }
  case 166:  {
   (_printf(1773,$vararg_buffer357)|0);
   break;
  }
  case 167:  {
   (_printf(1782,$vararg_buffer359)|0);
   break;
  }
  case 168:  {
   (_printf(1791,$vararg_buffer361)|0);
   break;
  }
  case 169:  {
   (_printf(1800,$vararg_buffer363)|0);
   break;
  }
  case 170:  {
   (_printf(1809,$vararg_buffer365)|0);
   break;
  }
  case 171:  {
   (_printf(1818,$vararg_buffer367)|0);
   break;
  }
  case 172:  {
   (_printf(1827,$vararg_buffer369)|0);
   break;
  }
  case 173:  {
   (_printf(1836,$vararg_buffer371)|0);
   break;
  }
  case 174:  {
   (_printf(1845,$vararg_buffer373)|0);
   break;
  }
  case 175:  {
   (_printf(1854,$vararg_buffer375)|0);
   break;
  }
  case 176:  {
   (_printf(1863,$vararg_buffer377)|0);
   break;
  }
  case 177:  {
   (_printf(1872,$vararg_buffer379)|0);
   break;
  }
  case 178:  {
   (_printf(1881,$vararg_buffer381)|0);
   break;
  }
  case 179:  {
   (_printf(1890,$vararg_buffer383)|0);
   break;
  }
  case 180:  {
   (_printf(1899,$vararg_buffer385)|0);
   break;
  }
  case 181:  {
   (_printf(1908,$vararg_buffer387)|0);
   break;
  }
  case 182:  {
   (_printf(1917,$vararg_buffer389)|0);
   break;
  }
  case 183:  {
   (_printf(1926,$vararg_buffer391)|0);
   break;
  }
  case 184:  {
   (_printf(1935,$vararg_buffer393)|0);
   break;
  }
  case 185:  {
   (_printf(1944,$vararg_buffer395)|0);
   break;
  }
  case 186:  {
   (_printf(1953,$vararg_buffer397)|0);
   break;
  }
  case 187:  {
   (_printf(1962,$vararg_buffer399)|0);
   break;
  }
  case 188:  {
   (_printf(1971,$vararg_buffer401)|0);
   break;
  }
  case 189:  {
   (_printf(1980,$vararg_buffer403)|0);
   break;
  }
  case 190:  {
   (_printf(1989,$vararg_buffer405)|0);
   break;
  }
  case 191:  {
   (_printf(1998,$vararg_buffer407)|0);
   break;
  }
  case 192:  {
   (_printf(2007,$vararg_buffer409)|0);
   break;
  }
  case 193:  {
   (_printf(2011,$vararg_buffer411)|0);
   break;
  }
  case 194:  {
   $105 = $code;
   $106 = ((($105)) + 2|0);
   $107 = HEAP8[$106>>0]|0;
   $108 = $107&255;
   $109 = $code;
   $110 = ((($109)) + 1|0);
   $111 = HEAP8[$110>>0]|0;
   $112 = $111&255;
   HEAP32[$vararg_buffer413>>2] = $108;
   $vararg_ptr416 = ((($vararg_buffer413)) + 4|0);
   HEAP32[$vararg_ptr416>>2] = $112;
   (_printf(2020,$vararg_buffer413)|0);
   $opbytes = 3;
   break;
  }
  case 195:  {
   $113 = $code;
   $114 = ((($113)) + 2|0);
   $115 = HEAP8[$114>>0]|0;
   $116 = $115&255;
   $117 = $code;
   $118 = ((($117)) + 1|0);
   $119 = HEAP8[$118>>0]|0;
   $120 = $119&255;
   HEAP32[$vararg_buffer417>>2] = $116;
   $vararg_ptr420 = ((($vararg_buffer417)) + 4|0);
   HEAP32[$vararg_ptr420>>2] = $120;
   (_printf(2037,$vararg_buffer417)|0);
   $opbytes = 3;
   break;
  }
  case 196:  {
   $121 = $code;
   $122 = ((($121)) + 2|0);
   $123 = HEAP8[$122>>0]|0;
   $124 = $123&255;
   $125 = $code;
   $126 = ((($125)) + 1|0);
   $127 = HEAP8[$126>>0]|0;
   $128 = $127&255;
   HEAP32[$vararg_buffer421>>2] = $124;
   $vararg_ptr424 = ((($vararg_buffer421)) + 4|0);
   HEAP32[$vararg_ptr424>>2] = $128;
   (_printf(2054,$vararg_buffer421)|0);
   $opbytes = 3;
   break;
  }
  case 197:  {
   (_printf(2071,$vararg_buffer425)|0);
   break;
  }
  case 198:  {
   $129 = $code;
   $130 = ((($129)) + 1|0);
   $131 = HEAP8[$130>>0]|0;
   $132 = $131&255;
   HEAP32[$vararg_buffer427>>2] = $132;
   (_printf(2080,$vararg_buffer427)|0);
   $opbytes = 2;
   break;
  }
  case 199:  {
   (_printf(2094,$vararg_buffer430)|0);
   break;
  }
  case 200:  {
   (_printf(2103,$vararg_buffer432)|0);
   break;
  }
  case 201:  {
   (_printf(2106,$vararg_buffer434)|0);
   break;
  }
  case 202:  {
   $133 = $code;
   $134 = ((($133)) + 2|0);
   $135 = HEAP8[$134>>0]|0;
   $136 = $135&255;
   $137 = $code;
   $138 = ((($137)) + 1|0);
   $139 = HEAP8[$138>>0]|0;
   $140 = $139&255;
   HEAP32[$vararg_buffer436>>2] = $136;
   $vararg_ptr439 = ((($vararg_buffer436)) + 4|0);
   HEAP32[$vararg_ptr439>>2] = $140;
   (_printf(2110,$vararg_buffer436)|0);
   $opbytes = 3;
   break;
  }
  case 203:  {
   $141 = $code;
   $142 = ((($141)) + 2|0);
   $143 = HEAP8[$142>>0]|0;
   $144 = $143&255;
   $145 = $code;
   $146 = ((($145)) + 1|0);
   $147 = HEAP8[$146>>0]|0;
   $148 = $147&255;
   HEAP32[$vararg_buffer440>>2] = $144;
   $vararg_ptr443 = ((($vararg_buffer440)) + 4|0);
   HEAP32[$vararg_ptr443>>2] = $148;
   (_printf(2037,$vararg_buffer440)|0);
   $opbytes = 3;
   break;
  }
  case 204:  {
   $149 = $code;
   $150 = ((($149)) + 2|0);
   $151 = HEAP8[$150>>0]|0;
   $152 = $151&255;
   $153 = $code;
   $154 = ((($153)) + 1|0);
   $155 = HEAP8[$154>>0]|0;
   $156 = $155&255;
   HEAP32[$vararg_buffer444>>2] = $152;
   $vararg_ptr447 = ((($vararg_buffer444)) + 4|0);
   HEAP32[$vararg_ptr447>>2] = $156;
   (_printf(2127,$vararg_buffer444)|0);
   $opbytes = 3;
   break;
  }
  case 205:  {
   $157 = $code;
   $158 = ((($157)) + 2|0);
   $159 = HEAP8[$158>>0]|0;
   $160 = $159&255;
   $161 = $code;
   $162 = ((($161)) + 1|0);
   $163 = HEAP8[$162>>0]|0;
   $164 = $163&255;
   HEAP32[$vararg_buffer448>>2] = $160;
   $vararg_ptr451 = ((($vararg_buffer448)) + 4|0);
   HEAP32[$vararg_ptr451>>2] = $164;
   (_printf(2144,$vararg_buffer448)|0);
   $opbytes = 3;
   break;
  }
  case 206:  {
   $165 = $code;
   $166 = ((($165)) + 1|0);
   $167 = HEAP8[$166>>0]|0;
   $168 = $167&255;
   HEAP32[$vararg_buffer452>>2] = $168;
   (_printf(2161,$vararg_buffer452)|0);
   $opbytes = 2;
   break;
  }
  case 207:  {
   (_printf(2175,$vararg_buffer455)|0);
   break;
  }
  case 208:  {
   (_printf(2184,$vararg_buffer457)|0);
   break;
  }
  case 209:  {
   (_printf(2188,$vararg_buffer459)|0);
   break;
  }
  case 210:  {
   $169 = $code;
   $170 = ((($169)) + 2|0);
   $171 = HEAP8[$170>>0]|0;
   $172 = $171&255;
   $173 = $code;
   $174 = ((($173)) + 1|0);
   $175 = HEAP8[$174>>0]|0;
   $176 = $175&255;
   HEAP32[$vararg_buffer461>>2] = $172;
   $vararg_ptr464 = ((($vararg_buffer461)) + 4|0);
   HEAP32[$vararg_ptr464>>2] = $176;
   (_printf(2197,$vararg_buffer461)|0);
   $opbytes = 3;
   break;
  }
  case 211:  {
   $177 = $code;
   $178 = ((($177)) + 1|0);
   $179 = HEAP8[$178>>0]|0;
   $180 = $179&255;
   HEAP32[$vararg_buffer465>>2] = $180;
   (_printf(2214,$vararg_buffer465)|0);
   $opbytes = 2;
   break;
  }
  case 212:  {
   $181 = $code;
   $182 = ((($181)) + 2|0);
   $183 = HEAP8[$182>>0]|0;
   $184 = $183&255;
   $185 = $code;
   $186 = ((($185)) + 1|0);
   $187 = HEAP8[$186>>0]|0;
   $188 = $187&255;
   HEAP32[$vararg_buffer468>>2] = $184;
   $vararg_ptr471 = ((($vararg_buffer468)) + 4|0);
   HEAP32[$vararg_ptr471>>2] = $188;
   (_printf(2228,$vararg_buffer468)|0);
   $opbytes = 3;
   break;
  }
  case 213:  {
   (_printf(2245,$vararg_buffer472)|0);
   break;
  }
  case 214:  {
   $189 = $code;
   $190 = ((($189)) + 1|0);
   $191 = HEAP8[$190>>0]|0;
   $192 = $191&255;
   HEAP32[$vararg_buffer474>>2] = $192;
   (_printf(2254,$vararg_buffer474)|0);
   $opbytes = 2;
   break;
  }
  case 215:  {
   (_printf(2268,$vararg_buffer477)|0);
   break;
  }
  case 216:  {
   (_printf(2277,$vararg_buffer479)|0);
   break;
  }
  case 217:  {
   (_printf(2106,$vararg_buffer481)|0);
   break;
  }
  case 218:  {
   $193 = $code;
   $194 = ((($193)) + 2|0);
   $195 = HEAP8[$194>>0]|0;
   $196 = $195&255;
   $197 = $code;
   $198 = ((($197)) + 1|0);
   $199 = HEAP8[$198>>0]|0;
   $200 = $199&255;
   HEAP32[$vararg_buffer483>>2] = $196;
   $vararg_ptr486 = ((($vararg_buffer483)) + 4|0);
   HEAP32[$vararg_ptr486>>2] = $200;
   (_printf(2280,$vararg_buffer483)|0);
   $opbytes = 3;
   break;
  }
  case 219:  {
   $201 = $code;
   $202 = ((($201)) + 1|0);
   $203 = HEAP8[$202>>0]|0;
   $204 = $203&255;
   HEAP32[$vararg_buffer487>>2] = $204;
   (_printf(2297,$vararg_buffer487)|0);
   $opbytes = 2;
   break;
  }
  case 220:  {
   $205 = $code;
   $206 = ((($205)) + 2|0);
   $207 = HEAP8[$206>>0]|0;
   $208 = $207&255;
   $209 = $code;
   $210 = ((($209)) + 1|0);
   $211 = HEAP8[$210>>0]|0;
   $212 = $211&255;
   HEAP32[$vararg_buffer490>>2] = $208;
   $vararg_ptr493 = ((($vararg_buffer490)) + 4|0);
   HEAP32[$vararg_ptr493>>2] = $212;
   (_printf(2311,$vararg_buffer490)|0);
   $opbytes = 3;
   break;
  }
  case 221:  {
   $213 = $code;
   $214 = ((($213)) + 2|0);
   $215 = HEAP8[$214>>0]|0;
   $216 = $215&255;
   $217 = $code;
   $218 = ((($217)) + 1|0);
   $219 = HEAP8[$218>>0]|0;
   $220 = $219&255;
   HEAP32[$vararg_buffer494>>2] = $216;
   $vararg_ptr497 = ((($vararg_buffer494)) + 4|0);
   HEAP32[$vararg_ptr497>>2] = $220;
   (_printf(2144,$vararg_buffer494)|0);
   $opbytes = 3;
   break;
  }
  case 222:  {
   $221 = $code;
   $222 = ((($221)) + 1|0);
   $223 = HEAP8[$222>>0]|0;
   $224 = $223&255;
   HEAP32[$vararg_buffer498>>2] = $224;
   (_printf(2328,$vararg_buffer498)|0);
   $opbytes = 2;
   break;
  }
  case 223:  {
   (_printf(2342,$vararg_buffer501)|0);
   break;
  }
  case 224:  {
   (_printf(2351,$vararg_buffer503)|0);
   break;
  }
  case 225:  {
   (_printf(2355,$vararg_buffer505)|0);
   break;
  }
  case 226:  {
   $225 = $code;
   $226 = ((($225)) + 2|0);
   $227 = HEAP8[$226>>0]|0;
   $228 = $227&255;
   $229 = $code;
   $230 = ((($229)) + 1|0);
   $231 = HEAP8[$230>>0]|0;
   $232 = $231&255;
   HEAP32[$vararg_buffer507>>2] = $228;
   $vararg_ptr510 = ((($vararg_buffer507)) + 4|0);
   HEAP32[$vararg_ptr510>>2] = $232;
   (_printf(2364,$vararg_buffer507)|0);
   $opbytes = 3;
   break;
  }
  case 227:  {
   (_printf(2381,$vararg_buffer511)|0);
   break;
  }
  case 228:  {
   $233 = $code;
   $234 = ((($233)) + 2|0);
   $235 = HEAP8[$234>>0]|0;
   $236 = $235&255;
   $237 = $code;
   $238 = ((($237)) + 1|0);
   $239 = HEAP8[$238>>0]|0;
   $240 = $239&255;
   HEAP32[$vararg_buffer513>>2] = $236;
   $vararg_ptr516 = ((($vararg_buffer513)) + 4|0);
   HEAP32[$vararg_ptr516>>2] = $240;
   (_printf(2386,$vararg_buffer513)|0);
   $opbytes = 3;
   break;
  }
  case 229:  {
   (_printf(2403,$vararg_buffer517)|0);
   break;
  }
  case 230:  {
   $241 = $code;
   $242 = ((($241)) + 1|0);
   $243 = HEAP8[$242>>0]|0;
   $244 = $243&255;
   HEAP32[$vararg_buffer519>>2] = $244;
   (_printf(2412,$vararg_buffer519)|0);
   $opbytes = 2;
   break;
  }
  case 231:  {
   (_printf(2426,$vararg_buffer522)|0);
   break;
  }
  case 232:  {
   (_printf(2435,$vararg_buffer524)|0);
   break;
  }
  case 233:  {
   (_printf(2439,$vararg_buffer526)|0);
   break;
  }
  case 234:  {
   $245 = $code;
   $246 = ((($245)) + 2|0);
   $247 = HEAP8[$246>>0]|0;
   $248 = $247&255;
   $249 = $code;
   $250 = ((($249)) + 1|0);
   $251 = HEAP8[$250>>0]|0;
   $252 = $251&255;
   HEAP32[$vararg_buffer528>>2] = $248;
   $vararg_ptr531 = ((($vararg_buffer528)) + 4|0);
   HEAP32[$vararg_ptr531>>2] = $252;
   (_printf(2444,$vararg_buffer528)|0);
   $opbytes = 3;
   break;
  }
  case 235:  {
   (_printf(2461,$vararg_buffer532)|0);
   break;
  }
  case 236:  {
   $253 = $code;
   $254 = ((($253)) + 2|0);
   $255 = HEAP8[$254>>0]|0;
   $256 = $255&255;
   $257 = $code;
   $258 = ((($257)) + 1|0);
   $259 = HEAP8[$258>>0]|0;
   $260 = $259&255;
   HEAP32[$vararg_buffer534>>2] = $256;
   $vararg_ptr537 = ((($vararg_buffer534)) + 4|0);
   HEAP32[$vararg_ptr537>>2] = $260;
   (_printf(2466,$vararg_buffer534)|0);
   $opbytes = 3;
   break;
  }
  case 237:  {
   $261 = $code;
   $262 = ((($261)) + 2|0);
   $263 = HEAP8[$262>>0]|0;
   $264 = $263&255;
   $265 = $code;
   $266 = ((($265)) + 1|0);
   $267 = HEAP8[$266>>0]|0;
   $268 = $267&255;
   HEAP32[$vararg_buffer538>>2] = $264;
   $vararg_ptr541 = ((($vararg_buffer538)) + 4|0);
   HEAP32[$vararg_ptr541>>2] = $268;
   (_printf(2144,$vararg_buffer538)|0);
   $opbytes = 3;
   break;
  }
  case 238:  {
   $269 = $code;
   $270 = ((($269)) + 1|0);
   $271 = HEAP8[$270>>0]|0;
   $272 = $271&255;
   HEAP32[$vararg_buffer542>>2] = $272;
   (_printf(2484,$vararg_buffer542)|0);
   $opbytes = 2;
   break;
  }
  case 239:  {
   (_printf(2498,$vararg_buffer545)|0);
   break;
  }
  case 240:  {
   (_printf(2507,$vararg_buffer547)|0);
   break;
  }
  case 241:  {
   (_printf(2510,$vararg_buffer549)|0);
   break;
  }
  case 242:  {
   $273 = $code;
   $274 = ((($273)) + 2|0);
   $275 = HEAP8[$274>>0]|0;
   $276 = $275&255;
   $277 = $code;
   $278 = ((($277)) + 1|0);
   $279 = HEAP8[$278>>0]|0;
   $280 = $279&255;
   HEAP32[$vararg_buffer551>>2] = $276;
   $vararg_ptr554 = ((($vararg_buffer551)) + 4|0);
   HEAP32[$vararg_ptr554>>2] = $280;
   (_printf(2521,$vararg_buffer551)|0);
   $opbytes = 3;
   break;
  }
  case 243:  {
   (_printf(2538,$vararg_buffer555)|0);
   break;
  }
  case 244:  {
   $281 = $code;
   $282 = ((($281)) + 2|0);
   $283 = HEAP8[$282>>0]|0;
   $284 = $283&255;
   $285 = $code;
   $286 = ((($285)) + 1|0);
   $287 = HEAP8[$286>>0]|0;
   $288 = $287&255;
   HEAP32[$vararg_buffer557>>2] = $284;
   $vararg_ptr560 = ((($vararg_buffer557)) + 4|0);
   HEAP32[$vararg_ptr560>>2] = $288;
   (_printf(2541,$vararg_buffer557)|0);
   $opbytes = 3;
   break;
  }
  case 245:  {
   (_printf(2558,$vararg_buffer561)|0);
   break;
  }
  case 246:  {
   $289 = $code;
   $290 = ((($289)) + 1|0);
   $291 = HEAP8[$290>>0]|0;
   $292 = $291&255;
   HEAP32[$vararg_buffer563>>2] = $292;
   (_printf(2569,$vararg_buffer563)|0);
   $opbytes = 2;
   break;
  }
  case 247:  {
   (_printf(2583,$vararg_buffer566)|0);
   break;
  }
  case 248:  {
   (_printf(2592,$vararg_buffer568)|0);
   break;
  }
  case 249:  {
   (_printf(2595,$vararg_buffer570)|0);
   break;
  }
  case 250:  {
   $293 = $code;
   $294 = ((($293)) + 2|0);
   $295 = HEAP8[$294>>0]|0;
   $296 = $295&255;
   $297 = $code;
   $298 = ((($297)) + 1|0);
   $299 = HEAP8[$298>>0]|0;
   $300 = $299&255;
   HEAP32[$vararg_buffer572>>2] = $296;
   $vararg_ptr575 = ((($vararg_buffer572)) + 4|0);
   HEAP32[$vararg_ptr575>>2] = $300;
   (_printf(2600,$vararg_buffer572)|0);
   $opbytes = 3;
   break;
  }
  case 251:  {
   (_printf(2617,$vararg_buffer576)|0);
   break;
  }
  case 252:  {
   $301 = $code;
   $302 = ((($301)) + 2|0);
   $303 = HEAP8[$302>>0]|0;
   $304 = $303&255;
   $305 = $code;
   $306 = ((($305)) + 1|0);
   $307 = HEAP8[$306>>0]|0;
   $308 = $307&255;
   HEAP32[$vararg_buffer578>>2] = $304;
   $vararg_ptr581 = ((($vararg_buffer578)) + 4|0);
   HEAP32[$vararg_ptr581>>2] = $308;
   (_printf(2620,$vararg_buffer578)|0);
   $opbytes = 3;
   break;
  }
  case 253:  {
   $309 = $code;
   $310 = ((($309)) + 2|0);
   $311 = HEAP8[$310>>0]|0;
   $312 = $311&255;
   $313 = $code;
   $314 = ((($313)) + 1|0);
   $315 = HEAP8[$314>>0]|0;
   $316 = $315&255;
   HEAP32[$vararg_buffer582>>2] = $312;
   $vararg_ptr585 = ((($vararg_buffer582)) + 4|0);
   HEAP32[$vararg_ptr585>>2] = $316;
   (_printf(2144,$vararg_buffer582)|0);
   $opbytes = 3;
   break;
  }
  case 254:  {
   $317 = $code;
   $318 = ((($317)) + 1|0);
   $319 = HEAP8[$318>>0]|0;
   $320 = $319&255;
   HEAP32[$vararg_buffer586>>2] = $320;
   (_printf(2637,$vararg_buffer586)|0);
   $opbytes = 2;
   break;
  }
  case 255:  {
   (_printf(2651,$vararg_buffer589)|0);
   break;
  }
  default: {
   // unreachable;
  }
  }
 } while(0);
 $321 = $opbytes;
 STACKTOP = sp;return ($321|0);
}
function _LogicFlagsA($state,$ac) {
 $state = $state|0;
 $ac = $ac|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $ac;
 $2 = $0;
 $3 = ((($2)) + 12|0);
 $4 = HEAP8[$3>>0]|0;
 $5 = $4 & -9;
 HEAP8[$3>>0] = $5;
 $6 = $0;
 $7 = ((($6)) + 12|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = $8 & -17;
 HEAP8[$7>>0] = $9;
 $10 = $0;
 $11 = HEAP8[$10>>0]|0;
 $12 = $11&255;
 $13 = ($12|0)==(0);
 $14 = $13&1;
 $15 = $14&255;
 $16 = $0;
 $17 = ((($16)) + 12|0);
 $18 = HEAP8[$17>>0]|0;
 $19 = $15 & 1;
 $20 = $18 & -2;
 $21 = $20 | $19;
 HEAP8[$17>>0] = $21;
 $22 = $0;
 $23 = HEAP8[$22>>0]|0;
 $24 = $23&255;
 $25 = $24 & 128;
 $26 = (128)==($25|0);
 $27 = $26&1;
 $28 = $27&255;
 $29 = $0;
 $30 = ((($29)) + 12|0);
 $31 = HEAP8[$30>>0]|0;
 $32 = $28 & 1;
 $33 = ($32 << 1)&255;
 $34 = $31 & -3;
 $35 = $34 | $33;
 HEAP8[$30>>0] = $35;
 $36 = $0;
 $37 = HEAP8[$36>>0]|0;
 $38 = $37&255;
 $39 = (_parity($38,8)|0);
 $40 = $39&255;
 $41 = $0;
 $42 = ((($41)) + 12|0);
 $43 = HEAP8[$42>>0]|0;
 $44 = $40 & 1;
 $45 = ($44 << 2)&255;
 $46 = $43 & -5;
 $47 = $46 | $45;
 HEAP8[$42>>0] = $47;
 STACKTOP = sp;return;
}
function _ArithFlagsA($state,$res) {
 $state = $state|0;
 $res = $res|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $res;
 $2 = $1;
 $3 = $2&65535;
 $4 = ($3|0)>(255);
 $5 = $4&1;
 $6 = $5&255;
 $7 = $0;
 $8 = ((($7)) + 12|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $6 & 1;
 $11 = ($10 << 3)&255;
 $12 = $9 & -9;
 $13 = $12 | $11;
 HEAP8[$8>>0] = $13;
 $14 = $1;
 $15 = $14&65535;
 $16 = $15 & 255;
 $17 = ($16|0)==(0);
 $18 = $17&1;
 $19 = $18&255;
 $20 = $0;
 $21 = ((($20)) + 12|0);
 $22 = HEAP8[$21>>0]|0;
 $23 = $19 & 1;
 $24 = $22 & -2;
 $25 = $24 | $23;
 HEAP8[$21>>0] = $25;
 $26 = $1;
 $27 = $26&65535;
 $28 = $27 & 128;
 $29 = (128)==($28|0);
 $30 = $29&1;
 $31 = $30&255;
 $32 = $0;
 $33 = ((($32)) + 12|0);
 $34 = HEAP8[$33>>0]|0;
 $35 = $31 & 1;
 $36 = ($35 << 1)&255;
 $37 = $34 & -3;
 $38 = $37 | $36;
 HEAP8[$33>>0] = $38;
 $39 = $1;
 $40 = $39&65535;
 $41 = $40 & 255;
 $42 = (_parity($41,8)|0);
 $43 = $42&255;
 $44 = $0;
 $45 = ((($44)) + 12|0);
 $46 = HEAP8[$45>>0]|0;
 $47 = $43 & 1;
 $48 = ($47 << 2)&255;
 $49 = $46 & -5;
 $50 = $49 | $48;
 HEAP8[$45>>0] = $50;
 STACKTOP = sp;return;
}
function _UnimplementedInstruction($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $0 = $state;
 (_printf(2660,$vararg_buffer)|0);
 $1 = $0;
 $2 = ((($1)) + 10|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = (($3) + -1)<<16>>16;
 HEAP16[$2>>1] = $4;
 $5 = $0;
 $6 = ((($5)) + 16|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = $0;
 $9 = ((($8)) + 10|0);
 $10 = HEAP16[$9>>1]|0;
 $11 = $10&65535;
 (_Disassemble8085Op($7,$11)|0);
 (_printf(2694,$vararg_buffer1)|0);
 _exit(1);
 // unreachable;
}
function _InvalidInstruction($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer3 = 0, $vararg_buffer6 = 0, $vararg_buffer9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer9 = sp + 32|0;
 $vararg_buffer6 = sp + 24|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $0 = $state;
 (_printf(2696,$vararg_buffer)|0);
 $1 = $0;
 $2 = ((($1)) + 10|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 HEAP32[$vararg_buffer1>>2] = $4;
 (_printf(2724,$vararg_buffer1)|0);
 $5 = $0;
 $6 = ((($5)) + 10|0);
 $7 = HEAP16[$6>>1]|0;
 $8 = $7&65535;
 $9 = $0;
 $10 = ((($9)) + 16|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = (($11) + ($8)|0);
 $13 = HEAP8[$12>>0]|0;
 $14 = $13&255;
 HEAP32[$vararg_buffer3>>2] = $14;
 (_printf(2732,$vararg_buffer3)|0);
 $15 = $0;
 $16 = ((($15)) + 10|0);
 $17 = HEAP16[$16>>1]|0;
 $18 = (($17) + -1)<<16>>16;
 HEAP16[$16>>1] = $18;
 $19 = $0;
 $20 = ((($19)) + 10|0);
 $21 = HEAP16[$20>>1]|0;
 $22 = $21&65535;
 HEAP32[$vararg_buffer6>>2] = $22;
 (_printf(2724,$vararg_buffer6)|0);
 $23 = $0;
 $24 = ((($23)) + 16|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = ((($25)) + 2048|0);
 $27 = HEAP8[$26>>0]|0;
 $28 = $27&255;
 HEAP32[$vararg_buffer9>>2] = $28;
 (_printf(2732,$vararg_buffer9)|0);
 _exit(1);
 // unreachable;
}
function _addByteWithCarry($state,$lhs,$rhs) {
 $state = $state|0;
 $lhs = $lhs|0;
 $rhs = $rhs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $res = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $lhs;
 $2 = $rhs;
 $3 = $0;
 $4 = ((($3)) + 12|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = ($5&255) >>> 3;
 $7 = $6 & 1;
 $8 = ($7<<24>>24)!=(0);
 if ($8) {
  $9 = $2;
  $10 = (($9) + 1)<<24>>24;
  $2 = $10;
 }
 $11 = $1;
 $12 = $11&255;
 $13 = $2;
 $14 = $13&255;
 $15 = (($12) + ($14))|0;
 $16 = $15&65535;
 $res = $16;
 $17 = $0;
 $18 = $res;
 _ArithFlagsA($17,$18);
 $19 = $res;
 $20 = $19&255;
 STACKTOP = sp;return ($20|0);
}
function _subtractByte($state,$lhs,$rhs) {
 $state = $state|0;
 $lhs = $lhs|0;
 $rhs = $rhs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $res = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $lhs;
 $2 = $rhs;
 $3 = $1;
 $4 = $3&255;
 $5 = $2;
 $6 = $5&255;
 $7 = (($4) - ($6))|0;
 $8 = $7&65535;
 $res = $8;
 $9 = $0;
 $10 = $res;
 _ArithFlagsA($9,$10);
 $11 = $res;
 $12 = $11&255;
 STACKTOP = sp;return ($12|0);
}
function _subtractByteWithBorrow($state,$lhs,$rhs) {
 $state = $state|0;
 $lhs = $lhs|0;
 $rhs = $rhs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $res = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $lhs;
 $2 = $rhs;
 $3 = $0;
 $4 = ((($3)) + 12|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = ($5&255) >>> 3;
 $7 = $6 & 1;
 $8 = ($7<<24>>24)!=(0);
 if ($8) {
  $9 = $2;
  $10 = (($9) + -1)<<24>>24;
  $2 = $10;
 }
 $11 = $1;
 $12 = $11&255;
 $13 = $2;
 $14 = $13&255;
 $15 = (($12) - ($14))|0;
 $16 = $15&65535;
 $res = $16;
 $17 = $0;
 $18 = $res;
 _ArithFlagsA($17,$18);
 $19 = $res;
 $20 = $19&255;
 STACKTOP = sp;return ($20|0);
}
function _call($state,$addr) {
 $state = $state|0;
 $addr = $addr|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $pc = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $addr;
 $2 = $0;
 $3 = ((($2)) + 10|0);
 $4 = HEAP16[$3>>1]|0;
 $pc = $4;
 $5 = $pc;
 $6 = $5&65535;
 $7 = $6 >> 8;
 $8 = $7 & 255;
 $9 = $8&255;
 $10 = $0;
 $11 = ((($10)) + 8|0);
 $12 = HEAP16[$11>>1]|0;
 $13 = $12&65535;
 $14 = (($13) - 1)|0;
 $15 = $0;
 $16 = ((($15)) + 16|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = (($17) + ($14)|0);
 HEAP8[$18>>0] = $9;
 $19 = $pc;
 $20 = $19&65535;
 $21 = $20 & 255;
 $22 = $21&255;
 $23 = $0;
 $24 = ((($23)) + 8|0);
 $25 = HEAP16[$24>>1]|0;
 $26 = $25&65535;
 $27 = (($26) - 2)|0;
 $28 = $0;
 $29 = ((($28)) + 16|0);
 $30 = HEAP32[$29>>2]|0;
 $31 = (($30) + ($27)|0);
 HEAP8[$31>>0] = $22;
 $32 = $0;
 $33 = ((($32)) + 8|0);
 $34 = HEAP16[$33>>1]|0;
 $35 = $34&65535;
 $36 = (($35) - 2)|0;
 $37 = $36&65535;
 $38 = $0;
 $39 = ((($38)) + 8|0);
 HEAP16[$39>>1] = $37;
 $40 = $1;
 $41 = $0;
 $42 = ((($41)) + 10|0);
 HEAP16[$42>>1] = $40;
 STACKTOP = sp;return;
}
function _returnToCaller($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $0;
 $2 = ((($1)) + 8|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 $5 = $0;
 $6 = ((($5)) + 16|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (($7) + ($4)|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $9&255;
 $11 = $0;
 $12 = ((($11)) + 8|0);
 $13 = HEAP16[$12>>1]|0;
 $14 = $13&65535;
 $15 = (($14) + 1)|0;
 $16 = $0;
 $17 = ((($16)) + 16|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = (($18) + ($15)|0);
 $20 = HEAP8[$19>>0]|0;
 $21 = $20&255;
 $22 = $21 << 8;
 $23 = $10 | $22;
 $24 = $23&65535;
 $25 = $0;
 $26 = ((($25)) + 10|0);
 HEAP16[$26>>1] = $24;
 $27 = $0;
 $28 = ((($27)) + 8|0);
 $29 = HEAP16[$28>>1]|0;
 $30 = $29&65535;
 $31 = (($30) + 2)|0;
 $32 = $31&65535;
 HEAP16[$28>>1] = $32;
 STACKTOP = sp;return;
}
function _Emulate8085Op($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0;
 var $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0;
 var $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0;
 var $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0;
 var $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0, $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0, $1087 = 0;
 var $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0, $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0, $11 = 0, $110 = 0, $1100 = 0, $1101 = 0, $1102 = 0, $1103 = 0, $1104 = 0;
 var $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $1110 = 0, $1111 = 0, $1112 = 0, $1113 = 0, $1114 = 0, $1115 = 0, $1116 = 0, $1117 = 0, $1118 = 0, $1119 = 0, $112 = 0, $1120 = 0, $1121 = 0, $1122 = 0;
 var $1123 = 0, $1124 = 0, $1125 = 0, $1126 = 0, $1127 = 0, $1128 = 0, $1129 = 0, $113 = 0, $1130 = 0, $1131 = 0, $1132 = 0, $1133 = 0, $1134 = 0, $1135 = 0, $1136 = 0, $1137 = 0, $1138 = 0, $1139 = 0, $114 = 0, $1140 = 0;
 var $1141 = 0, $1142 = 0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0, $1148 = 0, $1149 = 0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0, $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0, $1157 = 0, $1158 = 0, $1159 = 0;
 var $116 = 0, $1160 = 0, $1161 = 0, $1162 = 0, $1163 = 0, $1164 = 0, $1165 = 0, $1166 = 0, $1167 = 0, $1168 = 0, $1169 = 0, $117 = 0, $1170 = 0, $1171 = 0, $1172 = 0, $1173 = 0, $1174 = 0, $1175 = 0, $1176 = 0, $1177 = 0;
 var $1178 = 0, $1179 = 0, $118 = 0, $1180 = 0, $1181 = 0, $1182 = 0, $1183 = 0, $1184 = 0, $1185 = 0, $1186 = 0, $1187 = 0, $1188 = 0, $1189 = 0, $119 = 0, $1190 = 0, $1191 = 0, $1192 = 0, $1193 = 0, $1194 = 0, $1195 = 0;
 var $1196 = 0, $1197 = 0, $1198 = 0, $1199 = 0, $12 = 0, $120 = 0, $1200 = 0, $1201 = 0, $1202 = 0, $1203 = 0, $1204 = 0, $1205 = 0, $1206 = 0, $1207 = 0, $1208 = 0, $1209 = 0, $121 = 0, $1210 = 0, $1211 = 0, $1212 = 0;
 var $1213 = 0, $1214 = 0, $1215 = 0, $1216 = 0, $1217 = 0, $1218 = 0, $1219 = 0, $122 = 0, $1220 = 0, $1221 = 0, $1222 = 0, $1223 = 0, $1224 = 0, $1225 = 0, $1226 = 0, $1227 = 0, $1228 = 0, $1229 = 0, $123 = 0, $1230 = 0;
 var $1231 = 0, $1232 = 0, $1233 = 0, $1234 = 0, $1235 = 0, $1236 = 0, $1237 = 0, $1238 = 0, $1239 = 0, $124 = 0, $1240 = 0, $1241 = 0, $1242 = 0, $1243 = 0, $1244 = 0, $1245 = 0, $1246 = 0, $1247 = 0, $1248 = 0, $1249 = 0;
 var $125 = 0, $1250 = 0, $1251 = 0, $1252 = 0, $1253 = 0, $1254 = 0, $1255 = 0, $1256 = 0, $1257 = 0, $1258 = 0, $1259 = 0, $126 = 0, $1260 = 0, $1261 = 0, $1262 = 0, $1263 = 0, $1264 = 0, $1265 = 0, $1266 = 0, $1267 = 0;
 var $1268 = 0, $1269 = 0, $127 = 0, $1270 = 0, $1271 = 0, $1272 = 0, $1273 = 0, $1274 = 0, $1275 = 0, $1276 = 0, $1277 = 0, $1278 = 0, $1279 = 0, $128 = 0, $1280 = 0, $1281 = 0, $1282 = 0, $1283 = 0, $1284 = 0, $1285 = 0;
 var $1286 = 0, $1287 = 0, $1288 = 0, $1289 = 0, $129 = 0, $1290 = 0, $1291 = 0, $1292 = 0, $1293 = 0, $1294 = 0, $1295 = 0, $1296 = 0, $1297 = 0, $1298 = 0, $1299 = 0, $13 = 0, $130 = 0, $1300 = 0, $1301 = 0, $1302 = 0;
 var $1303 = 0, $1304 = 0, $1305 = 0, $1306 = 0, $1307 = 0, $1308 = 0, $1309 = 0, $131 = 0, $1310 = 0, $1311 = 0, $1312 = 0, $1313 = 0, $1314 = 0, $1315 = 0, $1316 = 0, $1317 = 0, $1318 = 0, $1319 = 0, $132 = 0, $1320 = 0;
 var $1321 = 0, $1322 = 0, $1323 = 0, $1324 = 0, $1325 = 0, $1326 = 0, $1327 = 0, $1328 = 0, $1329 = 0, $133 = 0, $1330 = 0, $1331 = 0, $1332 = 0, $1333 = 0, $1334 = 0, $1335 = 0, $1336 = 0, $1337 = 0, $1338 = 0, $1339 = 0;
 var $134 = 0, $1340 = 0, $1341 = 0, $1342 = 0, $1343 = 0, $1344 = 0, $1345 = 0, $1346 = 0, $1347 = 0, $1348 = 0, $1349 = 0, $135 = 0, $1350 = 0, $1351 = 0, $1352 = 0, $1353 = 0, $1354 = 0, $1355 = 0, $1356 = 0, $1357 = 0;
 var $1358 = 0, $1359 = 0, $136 = 0, $1360 = 0, $1361 = 0, $1362 = 0, $1363 = 0, $1364 = 0, $1365 = 0, $1366 = 0, $1367 = 0, $1368 = 0, $1369 = 0, $137 = 0, $1370 = 0, $1371 = 0, $1372 = 0, $1373 = 0, $1374 = 0, $1375 = 0;
 var $1376 = 0, $1377 = 0, $1378 = 0, $1379 = 0, $138 = 0, $1380 = 0, $1381 = 0, $1382 = 0, $1383 = 0, $1384 = 0, $1385 = 0, $1386 = 0, $1387 = 0, $1388 = 0, $1389 = 0, $139 = 0, $1390 = 0, $1391 = 0, $1392 = 0, $1393 = 0;
 var $1394 = 0, $1395 = 0, $1396 = 0, $1397 = 0, $1398 = 0, $1399 = 0, $14 = 0, $140 = 0, $1400 = 0, $1401 = 0, $1402 = 0, $1403 = 0, $1404 = 0, $1405 = 0, $1406 = 0, $1407 = 0, $1408 = 0, $1409 = 0, $141 = 0, $1410 = 0;
 var $1411 = 0, $1412 = 0, $1413 = 0, $1414 = 0, $1415 = 0, $1416 = 0, $1417 = 0, $1418 = 0, $1419 = 0, $142 = 0, $1420 = 0, $1421 = 0, $1422 = 0, $1423 = 0, $1424 = 0, $1425 = 0, $1426 = 0, $1427 = 0, $1428 = 0, $1429 = 0;
 var $143 = 0, $1430 = 0, $1431 = 0, $1432 = 0, $1433 = 0, $1434 = 0, $1435 = 0, $1436 = 0, $1437 = 0, $1438 = 0, $1439 = 0, $144 = 0, $1440 = 0, $1441 = 0, $1442 = 0, $1443 = 0, $1444 = 0, $1445 = 0, $1446 = 0, $1447 = 0;
 var $1448 = 0, $1449 = 0, $145 = 0, $1450 = 0, $1451 = 0, $1452 = 0, $1453 = 0, $1454 = 0, $1455 = 0, $1456 = 0, $1457 = 0, $1458 = 0, $1459 = 0, $146 = 0, $1460 = 0, $1461 = 0, $1462 = 0, $1463 = 0, $1464 = 0, $1465 = 0;
 var $1466 = 0, $1467 = 0, $1468 = 0, $1469 = 0, $147 = 0, $1470 = 0, $1471 = 0, $1472 = 0, $1473 = 0, $1474 = 0, $1475 = 0, $1476 = 0, $1477 = 0, $1478 = 0, $1479 = 0, $148 = 0, $1480 = 0, $1481 = 0, $1482 = 0, $1483 = 0;
 var $1484 = 0, $1485 = 0, $1486 = 0, $1487 = 0, $1488 = 0, $1489 = 0, $149 = 0, $1490 = 0, $1491 = 0, $1492 = 0, $1493 = 0, $1494 = 0, $1495 = 0, $1496 = 0, $1497 = 0, $1498 = 0, $1499 = 0, $15 = 0, $150 = 0, $1500 = 0;
 var $1501 = 0, $1502 = 0, $1503 = 0, $1504 = 0, $1505 = 0, $1506 = 0, $1507 = 0, $1508 = 0, $1509 = 0, $151 = 0, $1510 = 0, $1511 = 0, $1512 = 0, $1513 = 0, $1514 = 0, $1515 = 0, $1516 = 0, $1517 = 0, $1518 = 0, $1519 = 0;
 var $152 = 0, $1520 = 0, $1521 = 0, $1522 = 0, $1523 = 0, $1524 = 0, $1525 = 0, $1526 = 0, $1527 = 0, $1528 = 0, $1529 = 0, $153 = 0, $1530 = 0, $1531 = 0, $1532 = 0, $1533 = 0, $1534 = 0, $1535 = 0, $1536 = 0, $1537 = 0;
 var $1538 = 0, $1539 = 0, $154 = 0, $1540 = 0, $1541 = 0, $1542 = 0, $1543 = 0, $1544 = 0, $1545 = 0, $1546 = 0, $1547 = 0, $1548 = 0, $1549 = 0, $155 = 0, $1550 = 0, $1551 = 0, $1552 = 0, $1553 = 0, $1554 = 0, $1555 = 0;
 var $1556 = 0, $1557 = 0, $1558 = 0, $1559 = 0, $156 = 0, $1560 = 0, $1561 = 0, $1562 = 0, $1563 = 0, $1564 = 0, $1565 = 0, $1566 = 0, $1567 = 0, $1568 = 0, $1569 = 0, $157 = 0, $1570 = 0, $1571 = 0, $1572 = 0, $1573 = 0;
 var $1574 = 0, $1575 = 0, $1576 = 0, $1577 = 0, $1578 = 0, $1579 = 0, $158 = 0, $1580 = 0, $1581 = 0, $1582 = 0, $1583 = 0, $1584 = 0, $1585 = 0, $1586 = 0, $1587 = 0, $1588 = 0, $1589 = 0, $159 = 0, $1590 = 0, $1591 = 0;
 var $1592 = 0, $1593 = 0, $1594 = 0, $1595 = 0, $1596 = 0, $1597 = 0, $1598 = 0, $1599 = 0, $16 = 0, $160 = 0, $1600 = 0, $1601 = 0, $1602 = 0, $1603 = 0, $1604 = 0, $1605 = 0, $1606 = 0, $1607 = 0, $1608 = 0, $1609 = 0;
 var $161 = 0, $1610 = 0, $1611 = 0, $1612 = 0, $1613 = 0, $1614 = 0, $1615 = 0, $1616 = 0, $1617 = 0, $1618 = 0, $1619 = 0, $162 = 0, $1620 = 0, $1621 = 0, $1622 = 0, $1623 = 0, $1624 = 0, $1625 = 0, $1626 = 0, $1627 = 0;
 var $1628 = 0, $1629 = 0, $163 = 0, $1630 = 0, $1631 = 0, $1632 = 0, $1633 = 0, $1634 = 0, $1635 = 0, $1636 = 0, $1637 = 0, $1638 = 0, $1639 = 0, $164 = 0, $1640 = 0, $1641 = 0, $1642 = 0, $1643 = 0, $1644 = 0, $1645 = 0;
 var $1646 = 0, $1647 = 0, $1648 = 0, $1649 = 0, $165 = 0, $1650 = 0, $1651 = 0, $1652 = 0, $1653 = 0, $1654 = 0, $1655 = 0, $1656 = 0, $1657 = 0, $1658 = 0, $1659 = 0, $166 = 0, $1660 = 0, $1661 = 0, $1662 = 0, $1663 = 0;
 var $1664 = 0, $1665 = 0, $1666 = 0, $1667 = 0, $1668 = 0, $1669 = 0, $167 = 0, $1670 = 0, $1671 = 0, $1672 = 0, $1673 = 0, $1674 = 0, $1675 = 0, $1676 = 0, $1677 = 0, $1678 = 0, $1679 = 0, $168 = 0, $1680 = 0, $1681 = 0;
 var $1682 = 0, $1683 = 0, $1684 = 0, $1685 = 0, $1686 = 0, $1687 = 0, $1688 = 0, $1689 = 0, $169 = 0, $1690 = 0, $1691 = 0, $1692 = 0, $1693 = 0, $1694 = 0, $1695 = 0, $1696 = 0, $1697 = 0, $1698 = 0, $1699 = 0, $17 = 0;
 var $170 = 0, $1700 = 0, $1701 = 0, $1702 = 0, $1703 = 0, $1704 = 0, $1705 = 0, $1706 = 0, $1707 = 0, $1708 = 0, $1709 = 0, $171 = 0, $1710 = 0, $1711 = 0, $1712 = 0, $1713 = 0, $1714 = 0, $1715 = 0, $1716 = 0, $1717 = 0;
 var $1718 = 0, $1719 = 0, $172 = 0, $1720 = 0, $1721 = 0, $1722 = 0, $1723 = 0, $1724 = 0, $1725 = 0, $1726 = 0, $1727 = 0, $1728 = 0, $1729 = 0, $173 = 0, $1730 = 0, $1731 = 0, $1732 = 0, $1733 = 0, $1734 = 0, $1735 = 0;
 var $1736 = 0, $1737 = 0, $1738 = 0, $1739 = 0, $174 = 0, $1740 = 0, $1741 = 0, $1742 = 0, $1743 = 0, $1744 = 0, $1745 = 0, $1746 = 0, $1747 = 0, $1748 = 0, $1749 = 0, $175 = 0, $1750 = 0, $1751 = 0, $1752 = 0, $1753 = 0;
 var $1754 = 0, $1755 = 0, $1756 = 0, $1757 = 0, $1758 = 0, $1759 = 0, $176 = 0, $1760 = 0, $1761 = 0, $1762 = 0, $1763 = 0, $1764 = 0, $1765 = 0, $1766 = 0, $1767 = 0, $1768 = 0, $1769 = 0, $177 = 0, $1770 = 0, $1771 = 0;
 var $1772 = 0, $1773 = 0, $1774 = 0, $1775 = 0, $1776 = 0, $1777 = 0, $1778 = 0, $1779 = 0, $178 = 0, $1780 = 0, $1781 = 0, $1782 = 0, $1783 = 0, $1784 = 0, $1785 = 0, $1786 = 0, $1787 = 0, $1788 = 0, $1789 = 0, $179 = 0;
 var $1790 = 0, $1791 = 0, $1792 = 0, $1793 = 0, $1794 = 0, $1795 = 0, $1796 = 0, $1797 = 0, $1798 = 0, $1799 = 0, $18 = 0, $180 = 0, $1800 = 0, $1801 = 0, $1802 = 0, $1803 = 0, $1804 = 0, $1805 = 0, $1806 = 0, $1807 = 0;
 var $1808 = 0, $1809 = 0, $181 = 0, $1810 = 0, $1811 = 0, $1812 = 0, $1813 = 0, $1814 = 0, $1815 = 0, $1816 = 0, $1817 = 0, $1818 = 0, $1819 = 0, $182 = 0, $1820 = 0, $1821 = 0, $1822 = 0, $1823 = 0, $1824 = 0, $1825 = 0;
 var $1826 = 0, $1827 = 0, $1828 = 0, $1829 = 0, $183 = 0, $1830 = 0, $1831 = 0, $1832 = 0, $1833 = 0, $1834 = 0, $1835 = 0, $1836 = 0, $1837 = 0, $1838 = 0, $1839 = 0, $184 = 0, $1840 = 0, $1841 = 0, $1842 = 0, $1843 = 0;
 var $1844 = 0, $1845 = 0, $1846 = 0, $1847 = 0, $1848 = 0, $1849 = 0, $185 = 0, $1850 = 0, $1851 = 0, $1852 = 0, $1853 = 0, $1854 = 0, $1855 = 0, $1856 = 0, $1857 = 0, $1858 = 0, $1859 = 0, $186 = 0, $1860 = 0, $1861 = 0;
 var $1862 = 0, $1863 = 0, $1864 = 0, $1865 = 0, $1866 = 0, $1867 = 0, $1868 = 0, $1869 = 0, $187 = 0, $1870 = 0, $1871 = 0, $1872 = 0, $1873 = 0, $1874 = 0, $1875 = 0, $1876 = 0, $1877 = 0, $1878 = 0, $1879 = 0, $188 = 0;
 var $1880 = 0, $1881 = 0, $1882 = 0, $1883 = 0, $1884 = 0, $1885 = 0, $1886 = 0, $1887 = 0, $1888 = 0, $1889 = 0, $189 = 0, $1890 = 0, $1891 = 0, $1892 = 0, $1893 = 0, $1894 = 0, $1895 = 0, $1896 = 0, $1897 = 0, $1898 = 0;
 var $1899 = 0, $19 = 0, $190 = 0, $1900 = 0, $1901 = 0, $1902 = 0, $1903 = 0, $1904 = 0, $1905 = 0, $1906 = 0, $1907 = 0, $1908 = 0, $1909 = 0, $191 = 0, $1910 = 0, $1911 = 0, $1912 = 0, $1913 = 0, $1914 = 0, $1915 = 0;
 var $1916 = 0, $1917 = 0, $1918 = 0, $1919 = 0, $192 = 0, $1920 = 0, $1921 = 0, $1922 = 0, $1923 = 0, $1924 = 0, $1925 = 0, $1926 = 0, $1927 = 0, $1928 = 0, $1929 = 0, $193 = 0, $1930 = 0, $1931 = 0, $1932 = 0, $1933 = 0;
 var $1934 = 0, $1935 = 0, $1936 = 0, $1937 = 0, $1938 = 0, $1939 = 0, $194 = 0, $1940 = 0, $1941 = 0, $1942 = 0, $1943 = 0, $1944 = 0, $1945 = 0, $1946 = 0, $1947 = 0, $1948 = 0, $1949 = 0, $195 = 0, $1950 = 0, $1951 = 0;
 var $1952 = 0, $1953 = 0, $1954 = 0, $1955 = 0, $1956 = 0, $1957 = 0, $1958 = 0, $1959 = 0, $196 = 0, $1960 = 0, $1961 = 0, $1962 = 0, $1963 = 0, $1964 = 0, $1965 = 0, $1966 = 0, $1967 = 0, $1968 = 0, $1969 = 0, $197 = 0;
 var $1970 = 0, $1971 = 0, $1972 = 0, $1973 = 0, $1974 = 0, $1975 = 0, $1976 = 0, $1977 = 0, $1978 = 0, $1979 = 0, $198 = 0, $1980 = 0, $1981 = 0, $1982 = 0, $1983 = 0, $1984 = 0, $1985 = 0, $1986 = 0, $1987 = 0, $1988 = 0;
 var $1989 = 0, $199 = 0, $1990 = 0, $1991 = 0, $1992 = 0, $1993 = 0, $1994 = 0, $1995 = 0, $1996 = 0, $1997 = 0, $1998 = 0, $1999 = 0, $2 = 0, $20 = 0, $200 = 0, $2000 = 0, $2001 = 0, $2002 = 0, $2003 = 0, $2004 = 0;
 var $2005 = 0, $2006 = 0, $2007 = 0, $2008 = 0, $2009 = 0, $201 = 0, $2010 = 0, $2011 = 0, $2012 = 0, $2013 = 0, $2014 = 0, $2015 = 0, $2016 = 0, $2017 = 0, $2018 = 0, $2019 = 0, $202 = 0, $2020 = 0, $2021 = 0, $2022 = 0;
 var $2023 = 0, $2024 = 0, $2025 = 0, $2026 = 0, $2027 = 0, $2028 = 0, $2029 = 0, $203 = 0, $2030 = 0, $2031 = 0, $2032 = 0, $2033 = 0, $2034 = 0, $2035 = 0, $2036 = 0, $2037 = 0, $2038 = 0, $2039 = 0, $204 = 0, $2040 = 0;
 var $2041 = 0, $2042 = 0, $2043 = 0, $2044 = 0, $2045 = 0, $2046 = 0, $2047 = 0, $2048 = 0, $2049 = 0, $205 = 0, $2050 = 0, $2051 = 0, $2052 = 0, $2053 = 0, $2054 = 0, $2055 = 0, $2056 = 0, $2057 = 0, $2058 = 0, $2059 = 0;
 var $206 = 0, $2060 = 0, $2061 = 0, $2062 = 0, $2063 = 0, $2064 = 0, $2065 = 0, $2066 = 0, $2067 = 0, $2068 = 0, $2069 = 0, $207 = 0, $2070 = 0, $2071 = 0, $2072 = 0, $2073 = 0, $2074 = 0, $2075 = 0, $2076 = 0, $2077 = 0;
 var $2078 = 0, $2079 = 0, $208 = 0, $2080 = 0, $2081 = 0, $2082 = 0, $2083 = 0, $2084 = 0, $2085 = 0, $2086 = 0, $2087 = 0, $2088 = 0, $2089 = 0, $209 = 0, $2090 = 0, $2091 = 0, $2092 = 0, $2093 = 0, $2094 = 0, $2095 = 0;
 var $2096 = 0, $2097 = 0, $2098 = 0, $2099 = 0, $21 = 0, $210 = 0, $2100 = 0, $2101 = 0, $2102 = 0, $2103 = 0, $2104 = 0, $2105 = 0, $2106 = 0, $2107 = 0, $2108 = 0, $2109 = 0, $211 = 0, $2110 = 0, $2111 = 0, $2112 = 0;
 var $2113 = 0, $2114 = 0, $2115 = 0, $2116 = 0, $2117 = 0, $2118 = 0, $2119 = 0, $212 = 0, $2120 = 0, $2121 = 0, $2122 = 0, $2123 = 0, $2124 = 0, $2125 = 0, $2126 = 0, $2127 = 0, $2128 = 0, $2129 = 0, $213 = 0, $2130 = 0;
 var $2131 = 0, $2132 = 0, $2133 = 0, $2134 = 0, $2135 = 0, $2136 = 0, $2137 = 0, $2138 = 0, $2139 = 0, $214 = 0, $2140 = 0, $2141 = 0, $2142 = 0, $2143 = 0, $2144 = 0, $2145 = 0, $2146 = 0, $2147 = 0, $2148 = 0, $2149 = 0;
 var $215 = 0, $2150 = 0, $2151 = 0, $2152 = 0, $2153 = 0, $2154 = 0, $2155 = 0, $2156 = 0, $2157 = 0, $2158 = 0, $2159 = 0, $216 = 0, $2160 = 0, $2161 = 0, $2162 = 0, $2163 = 0, $2164 = 0, $2165 = 0, $2166 = 0, $2167 = 0;
 var $2168 = 0, $2169 = 0, $217 = 0, $2170 = 0, $2171 = 0, $2172 = 0, $2173 = 0, $2174 = 0, $2175 = 0, $2176 = 0, $2177 = 0, $2178 = 0, $2179 = 0, $218 = 0, $2180 = 0, $2181 = 0, $2182 = 0, $2183 = 0, $2184 = 0, $2185 = 0;
 var $2186 = 0, $2187 = 0, $2188 = 0, $2189 = 0, $219 = 0, $2190 = 0, $2191 = 0, $2192 = 0, $2193 = 0, $2194 = 0, $2195 = 0, $2196 = 0, $2197 = 0, $2198 = 0, $2199 = 0, $22 = 0, $220 = 0, $2200 = 0, $2201 = 0, $2202 = 0;
 var $2203 = 0, $2204 = 0, $2205 = 0, $2206 = 0, $2207 = 0, $2208 = 0, $2209 = 0, $221 = 0, $2210 = 0, $2211 = 0, $2212 = 0, $2213 = 0, $2214 = 0, $2215 = 0, $2216 = 0, $2217 = 0, $2218 = 0, $2219 = 0, $222 = 0, $2220 = 0;
 var $2221 = 0, $2222 = 0, $2223 = 0, $2224 = 0, $2225 = 0, $2226 = 0, $2227 = 0, $2228 = 0, $2229 = 0, $223 = 0, $2230 = 0, $2231 = 0, $2232 = 0, $2233 = 0, $2234 = 0, $2235 = 0, $2236 = 0, $2237 = 0, $2238 = 0, $2239 = 0;
 var $224 = 0, $2240 = 0, $2241 = 0, $2242 = 0, $2243 = 0, $2244 = 0, $2245 = 0, $2246 = 0, $2247 = 0, $2248 = 0, $2249 = 0, $225 = 0, $2250 = 0, $2251 = 0, $2252 = 0, $2253 = 0, $2254 = 0, $2255 = 0, $2256 = 0, $2257 = 0;
 var $2258 = 0, $2259 = 0, $226 = 0, $2260 = 0, $2261 = 0, $2262 = 0, $2263 = 0, $2264 = 0, $2265 = 0, $2266 = 0, $2267 = 0, $2268 = 0, $2269 = 0, $227 = 0, $2270 = 0, $2271 = 0, $2272 = 0, $2273 = 0, $2274 = 0, $2275 = 0;
 var $2276 = 0, $2277 = 0, $2278 = 0, $2279 = 0, $228 = 0, $2280 = 0, $2281 = 0, $2282 = 0, $2283 = 0, $2284 = 0, $2285 = 0, $2286 = 0, $2287 = 0, $2288 = 0, $2289 = 0, $229 = 0, $2290 = 0, $2291 = 0, $2292 = 0, $2293 = 0;
 var $2294 = 0, $2295 = 0, $2296 = 0, $2297 = 0, $2298 = 0, $2299 = 0, $23 = 0, $230 = 0, $2300 = 0, $2301 = 0, $2302 = 0, $2303 = 0, $2304 = 0, $2305 = 0, $2306 = 0, $2307 = 0, $2308 = 0, $2309 = 0, $231 = 0, $2310 = 0;
 var $2311 = 0, $2312 = 0, $2313 = 0, $2314 = 0, $2315 = 0, $2316 = 0, $2317 = 0, $2318 = 0, $2319 = 0, $232 = 0, $2320 = 0, $2321 = 0, $2322 = 0, $2323 = 0, $2324 = 0, $2325 = 0, $2326 = 0, $2327 = 0, $2328 = 0, $2329 = 0;
 var $233 = 0, $2330 = 0, $2331 = 0, $2332 = 0, $2333 = 0, $2334 = 0, $2335 = 0, $2336 = 0, $2337 = 0, $2338 = 0, $2339 = 0, $234 = 0, $2340 = 0, $2341 = 0, $2342 = 0, $2343 = 0, $2344 = 0, $2345 = 0, $2346 = 0, $2347 = 0;
 var $2348 = 0, $2349 = 0, $235 = 0, $2350 = 0, $2351 = 0, $2352 = 0, $2353 = 0, $2354 = 0, $2355 = 0, $2356 = 0, $2357 = 0, $2358 = 0, $2359 = 0, $236 = 0, $2360 = 0, $2361 = 0, $2362 = 0, $2363 = 0, $2364 = 0, $2365 = 0;
 var $2366 = 0, $2367 = 0, $2368 = 0, $2369 = 0, $237 = 0, $2370 = 0, $2371 = 0, $2372 = 0, $2373 = 0, $2374 = 0, $2375 = 0, $2376 = 0, $2377 = 0, $2378 = 0, $2379 = 0, $238 = 0, $2380 = 0, $2381 = 0, $2382 = 0, $2383 = 0;
 var $2384 = 0, $2385 = 0, $2386 = 0, $2387 = 0, $2388 = 0, $2389 = 0, $239 = 0, $2390 = 0, $2391 = 0, $2392 = 0, $2393 = 0, $2394 = 0, $2395 = 0, $2396 = 0, $2397 = 0, $2398 = 0, $2399 = 0, $24 = 0, $240 = 0, $2400 = 0;
 var $2401 = 0, $2402 = 0, $2403 = 0, $2404 = 0, $2405 = 0, $2406 = 0, $2407 = 0, $2408 = 0, $2409 = 0, $241 = 0, $2410 = 0, $2411 = 0, $2412 = 0, $2413 = 0, $2414 = 0, $2415 = 0, $2416 = 0, $2417 = 0, $2418 = 0, $2419 = 0;
 var $242 = 0, $2420 = 0, $2421 = 0, $2422 = 0, $2423 = 0, $2424 = 0, $2425 = 0, $2426 = 0, $2427 = 0, $2428 = 0, $2429 = 0, $243 = 0, $2430 = 0, $2431 = 0, $2432 = 0, $2433 = 0, $2434 = 0, $2435 = 0, $2436 = 0, $2437 = 0;
 var $2438 = 0, $2439 = 0, $244 = 0, $2440 = 0, $2441 = 0, $2442 = 0, $2443 = 0, $2444 = 0, $2445 = 0, $2446 = 0, $2447 = 0, $2448 = 0, $2449 = 0, $245 = 0, $2450 = 0, $2451 = 0, $2452 = 0, $2453 = 0, $2454 = 0, $2455 = 0;
 var $2456 = 0, $2457 = 0, $2458 = 0, $2459 = 0, $246 = 0, $2460 = 0, $2461 = 0, $2462 = 0, $2463 = 0, $2464 = 0, $2465 = 0, $2466 = 0, $2467 = 0, $2468 = 0, $2469 = 0, $247 = 0, $2470 = 0, $2471 = 0, $2472 = 0, $2473 = 0;
 var $2474 = 0, $2475 = 0, $2476 = 0, $2477 = 0, $2478 = 0, $2479 = 0, $248 = 0, $2480 = 0, $2481 = 0, $2482 = 0, $2483 = 0, $2484 = 0, $2485 = 0, $2486 = 0, $2487 = 0, $2488 = 0, $2489 = 0, $249 = 0, $2490 = 0, $2491 = 0;
 var $2492 = 0, $2493 = 0, $2494 = 0, $2495 = 0, $2496 = 0, $2497 = 0, $2498 = 0, $2499 = 0, $25 = 0, $250 = 0, $2500 = 0, $2501 = 0, $2502 = 0, $2503 = 0, $2504 = 0, $2505 = 0, $2506 = 0, $2507 = 0, $2508 = 0, $2509 = 0;
 var $251 = 0, $2510 = 0, $2511 = 0, $2512 = 0, $2513 = 0, $2514 = 0, $2515 = 0, $2516 = 0, $2517 = 0, $2518 = 0, $2519 = 0, $252 = 0, $2520 = 0, $2521 = 0, $2522 = 0, $2523 = 0, $2524 = 0, $2525 = 0, $2526 = 0, $2527 = 0;
 var $2528 = 0, $2529 = 0, $253 = 0, $2530 = 0, $2531 = 0, $2532 = 0, $2533 = 0, $2534 = 0, $2535 = 0, $2536 = 0, $2537 = 0, $2538 = 0, $2539 = 0, $254 = 0, $2540 = 0, $2541 = 0, $2542 = 0, $2543 = 0, $2544 = 0, $2545 = 0;
 var $2546 = 0, $2547 = 0, $2548 = 0, $2549 = 0, $255 = 0, $2550 = 0, $2551 = 0, $2552 = 0, $2553 = 0, $2554 = 0, $2555 = 0, $2556 = 0, $2557 = 0, $2558 = 0, $2559 = 0, $256 = 0, $2560 = 0, $2561 = 0, $2562 = 0, $2563 = 0;
 var $2564 = 0, $2565 = 0, $2566 = 0, $2567 = 0, $2568 = 0, $2569 = 0, $257 = 0, $2570 = 0, $2571 = 0, $2572 = 0, $2573 = 0, $2574 = 0, $2575 = 0, $2576 = 0, $2577 = 0, $2578 = 0, $2579 = 0, $258 = 0, $2580 = 0, $2581 = 0;
 var $2582 = 0, $2583 = 0, $2584 = 0, $2585 = 0, $2586 = 0, $2587 = 0, $2588 = 0, $2589 = 0, $259 = 0, $2590 = 0, $2591 = 0, $2592 = 0, $2593 = 0, $2594 = 0, $2595 = 0, $2596 = 0, $2597 = 0, $2598 = 0, $2599 = 0, $26 = 0;
 var $260 = 0, $2600 = 0, $2601 = 0, $2602 = 0, $2603 = 0, $2604 = 0, $2605 = 0, $2606 = 0, $2607 = 0, $2608 = 0, $2609 = 0, $261 = 0, $2610 = 0, $2611 = 0, $2612 = 0, $2613 = 0, $2614 = 0, $2615 = 0, $2616 = 0, $2617 = 0;
 var $2618 = 0, $2619 = 0, $262 = 0, $2620 = 0, $2621 = 0, $2622 = 0, $2623 = 0, $2624 = 0, $2625 = 0, $2626 = 0, $2627 = 0, $2628 = 0, $2629 = 0, $263 = 0, $2630 = 0, $2631 = 0, $2632 = 0, $2633 = 0, $2634 = 0, $2635 = 0;
 var $2636 = 0, $2637 = 0, $2638 = 0, $2639 = 0, $264 = 0, $2640 = 0, $2641 = 0, $2642 = 0, $2643 = 0, $2644 = 0, $2645 = 0, $2646 = 0, $2647 = 0, $2648 = 0, $2649 = 0, $265 = 0, $2650 = 0, $2651 = 0, $2652 = 0, $2653 = 0;
 var $2654 = 0, $2655 = 0, $2656 = 0, $2657 = 0, $2658 = 0, $2659 = 0, $266 = 0, $2660 = 0, $2661 = 0, $2662 = 0, $2663 = 0, $2664 = 0, $2665 = 0, $2666 = 0, $2667 = 0, $2668 = 0, $2669 = 0, $267 = 0, $2670 = 0, $2671 = 0;
 var $2672 = 0, $2673 = 0, $2674 = 0, $2675 = 0, $2676 = 0, $2677 = 0, $2678 = 0, $2679 = 0, $268 = 0, $2680 = 0, $2681 = 0, $2682 = 0, $2683 = 0, $2684 = 0, $2685 = 0, $2686 = 0, $2687 = 0, $2688 = 0, $2689 = 0, $269 = 0;
 var $2690 = 0, $2691 = 0, $2692 = 0, $2693 = 0, $2694 = 0, $2695 = 0, $2696 = 0, $2697 = 0, $2698 = 0, $2699 = 0, $27 = 0, $270 = 0, $2700 = 0, $2701 = 0, $2702 = 0, $2703 = 0, $2704 = 0, $2705 = 0, $2706 = 0, $2707 = 0;
 var $2708 = 0, $2709 = 0, $271 = 0, $2710 = 0, $2711 = 0, $2712 = 0, $2713 = 0, $2714 = 0, $2715 = 0, $2716 = 0, $2717 = 0, $2718 = 0, $2719 = 0, $272 = 0, $2720 = 0, $2721 = 0, $2722 = 0, $2723 = 0, $2724 = 0, $2725 = 0;
 var $2726 = 0, $2727 = 0, $2728 = 0, $2729 = 0, $273 = 0, $2730 = 0, $2731 = 0, $2732 = 0, $2733 = 0, $2734 = 0, $2735 = 0, $2736 = 0, $2737 = 0, $2738 = 0, $2739 = 0, $274 = 0, $2740 = 0, $2741 = 0, $2742 = 0, $2743 = 0;
 var $2744 = 0, $2745 = 0, $2746 = 0, $2747 = 0, $2748 = 0, $2749 = 0, $275 = 0, $2750 = 0, $2751 = 0, $2752 = 0, $2753 = 0, $2754 = 0, $2755 = 0, $2756 = 0, $2757 = 0, $2758 = 0, $2759 = 0, $276 = 0, $2760 = 0, $2761 = 0;
 var $2762 = 0, $2763 = 0, $2764 = 0, $2765 = 0, $2766 = 0, $2767 = 0, $2768 = 0, $2769 = 0, $277 = 0, $2770 = 0, $2771 = 0, $2772 = 0, $2773 = 0, $2774 = 0, $2775 = 0, $2776 = 0, $2777 = 0, $2778 = 0, $2779 = 0, $278 = 0;
 var $2780 = 0, $2781 = 0, $2782 = 0, $2783 = 0, $2784 = 0, $2785 = 0, $2786 = 0, $2787 = 0, $2788 = 0, $2789 = 0, $279 = 0, $2790 = 0, $2791 = 0, $2792 = 0, $2793 = 0, $2794 = 0, $2795 = 0, $2796 = 0, $2797 = 0, $2798 = 0;
 var $2799 = 0, $28 = 0, $280 = 0, $2800 = 0, $2801 = 0, $2802 = 0, $2803 = 0, $2804 = 0, $2805 = 0, $2806 = 0, $2807 = 0, $2808 = 0, $2809 = 0, $281 = 0, $2810 = 0, $2811 = 0, $2812 = 0, $2813 = 0, $2814 = 0, $2815 = 0;
 var $2816 = 0, $2817 = 0, $2818 = 0, $2819 = 0, $282 = 0, $2820 = 0, $2821 = 0, $2822 = 0, $2823 = 0, $2824 = 0, $2825 = 0, $2826 = 0, $2827 = 0, $2828 = 0, $2829 = 0, $283 = 0, $2830 = 0, $2831 = 0, $2832 = 0, $2833 = 0;
 var $2834 = 0, $2835 = 0, $2836 = 0, $2837 = 0, $2838 = 0, $2839 = 0, $284 = 0, $2840 = 0, $2841 = 0, $2842 = 0, $2843 = 0, $2844 = 0, $2845 = 0, $2846 = 0, $2847 = 0, $2848 = 0, $2849 = 0, $285 = 0, $2850 = 0, $2851 = 0;
 var $2852 = 0, $2853 = 0, $2854 = 0, $2855 = 0, $2856 = 0, $2857 = 0, $2858 = 0, $2859 = 0, $286 = 0, $2860 = 0, $2861 = 0, $2862 = 0, $2863 = 0, $2864 = 0, $2865 = 0, $2866 = 0, $2867 = 0, $2868 = 0, $2869 = 0, $287 = 0;
 var $2870 = 0, $2871 = 0, $2872 = 0, $2873 = 0, $2874 = 0, $2875 = 0, $2876 = 0, $2877 = 0, $2878 = 0, $2879 = 0, $288 = 0, $2880 = 0, $2881 = 0, $2882 = 0, $2883 = 0, $2884 = 0, $2885 = 0, $2886 = 0, $2887 = 0, $2888 = 0;
 var $2889 = 0, $289 = 0, $2890 = 0, $2891 = 0, $2892 = 0, $2893 = 0, $2894 = 0, $2895 = 0, $2896 = 0, $2897 = 0, $2898 = 0, $2899 = 0, $29 = 0, $290 = 0, $2900 = 0, $2901 = 0, $2902 = 0, $2903 = 0, $2904 = 0, $2905 = 0;
 var $2906 = 0, $2907 = 0, $2908 = 0, $2909 = 0, $291 = 0, $2910 = 0, $2911 = 0, $2912 = 0, $2913 = 0, $2914 = 0, $2915 = 0, $2916 = 0, $2917 = 0, $2918 = 0, $2919 = 0, $292 = 0, $2920 = 0, $2921 = 0, $2922 = 0, $2923 = 0;
 var $2924 = 0, $2925 = 0, $2926 = 0, $2927 = 0, $2928 = 0, $2929 = 0, $293 = 0, $2930 = 0, $2931 = 0, $2932 = 0, $2933 = 0, $2934 = 0, $2935 = 0, $2936 = 0, $2937 = 0, $2938 = 0, $2939 = 0, $294 = 0, $2940 = 0, $2941 = 0;
 var $2942 = 0, $2943 = 0, $2944 = 0, $2945 = 0, $2946 = 0, $2947 = 0, $2948 = 0, $2949 = 0, $295 = 0, $2950 = 0, $2951 = 0, $2952 = 0, $2953 = 0, $2954 = 0, $2955 = 0, $2956 = 0, $2957 = 0, $2958 = 0, $2959 = 0, $296 = 0;
 var $2960 = 0, $2961 = 0, $2962 = 0, $2963 = 0, $2964 = 0, $2965 = 0, $2966 = 0, $2967 = 0, $2968 = 0, $2969 = 0, $297 = 0, $2970 = 0, $2971 = 0, $2972 = 0, $2973 = 0, $2974 = 0, $2975 = 0, $2976 = 0, $2977 = 0, $2978 = 0;
 var $2979 = 0, $298 = 0, $2980 = 0, $2981 = 0, $2982 = 0, $2983 = 0, $2984 = 0, $2985 = 0, $2986 = 0, $2987 = 0, $2988 = 0, $2989 = 0, $299 = 0, $2990 = 0, $2991 = 0, $2992 = 0, $2993 = 0, $2994 = 0, $2995 = 0, $2996 = 0;
 var $2997 = 0, $2998 = 0, $2999 = 0, $3 = 0, $30 = 0, $300 = 0, $3000 = 0, $3001 = 0, $3002 = 0, $3003 = 0, $3004 = 0, $3005 = 0, $3006 = 0, $3007 = 0, $3008 = 0, $3009 = 0, $301 = 0, $3010 = 0, $3011 = 0, $3012 = 0;
 var $3013 = 0, $3014 = 0, $3015 = 0, $3016 = 0, $3017 = 0, $3018 = 0, $3019 = 0, $302 = 0, $3020 = 0, $3021 = 0, $3022 = 0, $3023 = 0, $3024 = 0, $3025 = 0, $3026 = 0, $3027 = 0, $3028 = 0, $3029 = 0, $303 = 0, $3030 = 0;
 var $3031 = 0, $3032 = 0, $3033 = 0, $3034 = 0, $3035 = 0, $3036 = 0, $3037 = 0, $3038 = 0, $3039 = 0, $304 = 0, $3040 = 0, $3041 = 0, $3042 = 0, $3043 = 0, $3044 = 0, $3045 = 0, $3046 = 0, $3047 = 0, $3048 = 0, $3049 = 0;
 var $305 = 0, $3050 = 0, $3051 = 0, $3052 = 0, $3053 = 0, $3054 = 0, $3055 = 0, $3056 = 0, $3057 = 0, $3058 = 0, $3059 = 0, $306 = 0, $3060 = 0, $3061 = 0, $3062 = 0, $3063 = 0, $3064 = 0, $3065 = 0, $3066 = 0, $3067 = 0;
 var $3068 = 0, $3069 = 0, $307 = 0, $3070 = 0, $3071 = 0, $3072 = 0, $3073 = 0, $3074 = 0, $3075 = 0, $3076 = 0, $3077 = 0, $3078 = 0, $3079 = 0, $308 = 0, $3080 = 0, $3081 = 0, $3082 = 0, $3083 = 0, $3084 = 0, $3085 = 0;
 var $3086 = 0, $3087 = 0, $3088 = 0, $3089 = 0, $309 = 0, $3090 = 0, $3091 = 0, $3092 = 0, $3093 = 0, $3094 = 0, $3095 = 0, $3096 = 0, $3097 = 0, $3098 = 0, $3099 = 0, $31 = 0, $310 = 0, $3100 = 0, $3101 = 0, $3102 = 0;
 var $3103 = 0, $3104 = 0, $3105 = 0, $3106 = 0, $3107 = 0, $3108 = 0, $3109 = 0, $311 = 0, $3110 = 0, $3111 = 0, $3112 = 0, $3113 = 0, $3114 = 0, $3115 = 0, $3116 = 0, $3117 = 0, $3118 = 0, $3119 = 0, $312 = 0, $3120 = 0;
 var $3121 = 0, $3122 = 0, $3123 = 0, $3124 = 0, $3125 = 0, $3126 = 0, $3127 = 0, $3128 = 0, $3129 = 0, $313 = 0, $3130 = 0, $3131 = 0, $3132 = 0, $3133 = 0, $3134 = 0, $3135 = 0, $3136 = 0, $3137 = 0, $3138 = 0, $3139 = 0;
 var $314 = 0, $3140 = 0, $3141 = 0, $3142 = 0, $3143 = 0, $3144 = 0, $3145 = 0, $3146 = 0, $3147 = 0, $3148 = 0, $3149 = 0, $315 = 0, $3150 = 0, $3151 = 0, $3152 = 0, $3153 = 0, $3154 = 0, $3155 = 0, $3156 = 0, $3157 = 0;
 var $3158 = 0, $3159 = 0, $316 = 0, $3160 = 0, $3161 = 0, $3162 = 0, $3163 = 0, $3164 = 0, $3165 = 0, $3166 = 0, $3167 = 0, $3168 = 0, $3169 = 0, $317 = 0, $3170 = 0, $3171 = 0, $3172 = 0, $3173 = 0, $3174 = 0, $3175 = 0;
 var $3176 = 0, $3177 = 0, $3178 = 0, $3179 = 0, $318 = 0, $3180 = 0, $3181 = 0, $3182 = 0, $3183 = 0, $3184 = 0, $3185 = 0, $3186 = 0, $3187 = 0, $3188 = 0, $3189 = 0, $319 = 0, $3190 = 0, $3191 = 0, $3192 = 0, $3193 = 0;
 var $3194 = 0, $3195 = 0, $3196 = 0, $3197 = 0, $3198 = 0, $3199 = 0, $32 = 0, $320 = 0, $3200 = 0, $3201 = 0, $3202 = 0, $3203 = 0, $3204 = 0, $3205 = 0, $3206 = 0, $3207 = 0, $3208 = 0, $3209 = 0, $321 = 0, $3210 = 0;
 var $3211 = 0, $3212 = 0, $3213 = 0, $3214 = 0, $3215 = 0, $3216 = 0, $3217 = 0, $3218 = 0, $3219 = 0, $322 = 0, $3220 = 0, $3221 = 0, $3222 = 0, $3223 = 0, $3224 = 0, $3225 = 0, $3226 = 0, $3227 = 0, $3228 = 0, $3229 = 0;
 var $323 = 0, $3230 = 0, $3231 = 0, $3232 = 0, $3233 = 0, $3234 = 0, $3235 = 0, $3236 = 0, $3237 = 0, $3238 = 0, $3239 = 0, $324 = 0, $3240 = 0, $3241 = 0, $3242 = 0, $3243 = 0, $3244 = 0, $3245 = 0, $3246 = 0, $3247 = 0;
 var $3248 = 0, $3249 = 0, $325 = 0, $3250 = 0, $3251 = 0, $3252 = 0, $3253 = 0, $3254 = 0, $3255 = 0, $3256 = 0, $3257 = 0, $3258 = 0, $3259 = 0, $326 = 0, $3260 = 0, $3261 = 0, $3262 = 0, $3263 = 0, $3264 = 0, $3265 = 0;
 var $3266 = 0, $3267 = 0, $3268 = 0, $3269 = 0, $327 = 0, $3270 = 0, $3271 = 0, $3272 = 0, $3273 = 0, $3274 = 0, $3275 = 0, $3276 = 0, $3277 = 0, $3278 = 0, $3279 = 0, $328 = 0, $3280 = 0, $3281 = 0, $3282 = 0, $3283 = 0;
 var $3284 = 0, $3285 = 0, $3286 = 0, $3287 = 0, $3288 = 0, $3289 = 0, $329 = 0, $3290 = 0, $3291 = 0, $3292 = 0, $3293 = 0, $3294 = 0, $3295 = 0, $3296 = 0, $3297 = 0, $3298 = 0, $3299 = 0, $33 = 0, $330 = 0, $3300 = 0;
 var $3301 = 0, $3302 = 0, $3303 = 0, $3304 = 0, $3305 = 0, $3306 = 0, $3307 = 0, $3308 = 0, $3309 = 0, $331 = 0, $3310 = 0, $3311 = 0, $3312 = 0, $3313 = 0, $3314 = 0, $3315 = 0, $3316 = 0, $3317 = 0, $3318 = 0, $3319 = 0;
 var $332 = 0, $3320 = 0, $3321 = 0, $3322 = 0, $3323 = 0, $3324 = 0, $3325 = 0, $3326 = 0, $3327 = 0, $3328 = 0, $3329 = 0, $333 = 0, $3330 = 0, $3331 = 0, $3332 = 0, $3333 = 0, $3334 = 0, $3335 = 0, $3336 = 0, $3337 = 0;
 var $3338 = 0, $3339 = 0, $334 = 0, $3340 = 0, $3341 = 0, $3342 = 0, $3343 = 0, $3344 = 0, $3345 = 0, $3346 = 0, $3347 = 0, $3348 = 0, $3349 = 0, $335 = 0, $3350 = 0, $3351 = 0, $3352 = 0, $3353 = 0, $3354 = 0, $3355 = 0;
 var $3356 = 0, $3357 = 0, $3358 = 0, $3359 = 0, $336 = 0, $3360 = 0, $3361 = 0, $3362 = 0, $3363 = 0, $3364 = 0, $3365 = 0, $3366 = 0, $3367 = 0, $3368 = 0, $3369 = 0, $337 = 0, $3370 = 0, $3371 = 0, $3372 = 0, $3373 = 0;
 var $3374 = 0, $3375 = 0, $3376 = 0, $3377 = 0, $3378 = 0, $3379 = 0, $338 = 0, $3380 = 0, $3381 = 0, $3382 = 0, $3383 = 0, $3384 = 0, $3385 = 0, $3386 = 0, $3387 = 0, $3388 = 0, $3389 = 0, $339 = 0, $3390 = 0, $3391 = 0;
 var $3392 = 0, $3393 = 0, $3394 = 0, $3395 = 0, $3396 = 0, $3397 = 0, $3398 = 0, $3399 = 0, $34 = 0, $340 = 0, $3400 = 0, $3401 = 0, $3402 = 0, $3403 = 0, $3404 = 0, $3405 = 0, $3406 = 0, $3407 = 0, $3408 = 0, $3409 = 0;
 var $341 = 0, $3410 = 0, $3411 = 0, $3412 = 0, $3413 = 0, $3414 = 0, $3415 = 0, $3416 = 0, $3417 = 0, $3418 = 0, $3419 = 0, $342 = 0, $3420 = 0, $3421 = 0, $3422 = 0, $3423 = 0, $3424 = 0, $3425 = 0, $3426 = 0, $3427 = 0;
 var $3428 = 0, $3429 = 0, $343 = 0, $3430 = 0, $3431 = 0, $3432 = 0, $3433 = 0, $3434 = 0, $3435 = 0, $3436 = 0, $3437 = 0, $3438 = 0, $3439 = 0, $344 = 0, $3440 = 0, $3441 = 0, $3442 = 0, $3443 = 0, $3444 = 0, $3445 = 0;
 var $3446 = 0, $3447 = 0, $3448 = 0, $3449 = 0, $345 = 0, $3450 = 0, $3451 = 0, $3452 = 0, $3453 = 0, $3454 = 0, $3455 = 0, $3456 = 0, $3457 = 0, $3458 = 0, $3459 = 0, $346 = 0, $3460 = 0, $3461 = 0, $3462 = 0, $3463 = 0;
 var $3464 = 0, $3465 = 0, $3466 = 0, $3467 = 0, $3468 = 0, $3469 = 0, $347 = 0, $3470 = 0, $3471 = 0, $3472 = 0, $3473 = 0, $3474 = 0, $3475 = 0, $3476 = 0, $3477 = 0, $3478 = 0, $3479 = 0, $348 = 0, $3480 = 0, $3481 = 0;
 var $3482 = 0, $3483 = 0, $3484 = 0, $3485 = 0, $3486 = 0, $3487 = 0, $3488 = 0, $3489 = 0, $349 = 0, $3490 = 0, $3491 = 0, $3492 = 0, $3493 = 0, $3494 = 0, $3495 = 0, $3496 = 0, $3497 = 0, $3498 = 0, $3499 = 0, $35 = 0;
 var $350 = 0, $3500 = 0, $3501 = 0, $3502 = 0, $3503 = 0, $3504 = 0, $3505 = 0, $3506 = 0, $3507 = 0, $3508 = 0, $3509 = 0, $351 = 0, $3510 = 0, $3511 = 0, $3512 = 0, $3513 = 0, $3514 = 0, $3515 = 0, $3516 = 0, $3517 = 0;
 var $3518 = 0, $3519 = 0, $352 = 0, $3520 = 0, $3521 = 0, $3522 = 0, $3523 = 0, $3524 = 0, $3525 = 0, $3526 = 0, $3527 = 0, $3528 = 0, $3529 = 0, $353 = 0, $3530 = 0, $3531 = 0, $3532 = 0, $3533 = 0, $3534 = 0, $3535 = 0;
 var $3536 = 0, $3537 = 0, $3538 = 0, $3539 = 0, $354 = 0, $3540 = 0, $3541 = 0, $3542 = 0, $3543 = 0, $3544 = 0, $3545 = 0, $3546 = 0, $3547 = 0, $3548 = 0, $3549 = 0, $355 = 0, $3550 = 0, $3551 = 0, $3552 = 0, $3553 = 0;
 var $3554 = 0, $3555 = 0, $3556 = 0, $3557 = 0, $3558 = 0, $3559 = 0, $356 = 0, $3560 = 0, $3561 = 0, $3562 = 0, $3563 = 0, $3564 = 0, $3565 = 0, $3566 = 0, $3567 = 0, $3568 = 0, $3569 = 0, $357 = 0, $3570 = 0, $3571 = 0;
 var $3572 = 0, $3573 = 0, $3574 = 0, $3575 = 0, $3576 = 0, $3577 = 0, $3578 = 0, $3579 = 0, $358 = 0, $3580 = 0, $3581 = 0, $3582 = 0, $3583 = 0, $3584 = 0, $3585 = 0, $3586 = 0, $3587 = 0, $3588 = 0, $3589 = 0, $359 = 0;
 var $3590 = 0, $3591 = 0, $3592 = 0, $3593 = 0, $3594 = 0, $3595 = 0, $3596 = 0, $3597 = 0, $3598 = 0, $3599 = 0, $36 = 0, $360 = 0, $3600 = 0, $3601 = 0, $3602 = 0, $3603 = 0, $3604 = 0, $3605 = 0, $3606 = 0, $3607 = 0;
 var $3608 = 0, $3609 = 0, $361 = 0, $3610 = 0, $3611 = 0, $3612 = 0, $3613 = 0, $3614 = 0, $3615 = 0, $3616 = 0, $3617 = 0, $3618 = 0, $3619 = 0, $362 = 0, $3620 = 0, $3621 = 0, $3622 = 0, $3623 = 0, $3624 = 0, $3625 = 0;
 var $3626 = 0, $3627 = 0, $3628 = 0, $3629 = 0, $363 = 0, $3630 = 0, $3631 = 0, $3632 = 0, $3633 = 0, $3634 = 0, $3635 = 0, $3636 = 0, $3637 = 0, $3638 = 0, $3639 = 0, $364 = 0, $3640 = 0, $3641 = 0, $3642 = 0, $3643 = 0;
 var $3644 = 0, $3645 = 0, $3646 = 0, $3647 = 0, $3648 = 0, $3649 = 0, $365 = 0, $3650 = 0, $3651 = 0, $3652 = 0, $3653 = 0, $3654 = 0, $3655 = 0, $3656 = 0, $3657 = 0, $3658 = 0, $3659 = 0, $366 = 0, $3660 = 0, $3661 = 0;
 var $3662 = 0, $3663 = 0, $3664 = 0, $3665 = 0, $3666 = 0, $3667 = 0, $3668 = 0, $3669 = 0, $367 = 0, $3670 = 0, $3671 = 0, $3672 = 0, $3673 = 0, $3674 = 0, $3675 = 0, $3676 = 0, $3677 = 0, $3678 = 0, $3679 = 0, $368 = 0;
 var $3680 = 0, $3681 = 0, $3682 = 0, $3683 = 0, $3684 = 0, $3685 = 0, $3686 = 0, $3687 = 0, $3688 = 0, $3689 = 0, $369 = 0, $3690 = 0, $3691 = 0, $3692 = 0, $3693 = 0, $3694 = 0, $3695 = 0, $3696 = 0, $3697 = 0, $3698 = 0;
 var $3699 = 0, $37 = 0, $370 = 0, $3700 = 0, $3701 = 0, $3702 = 0, $3703 = 0, $3704 = 0, $3705 = 0, $3706 = 0, $3707 = 0, $3708 = 0, $3709 = 0, $371 = 0, $3710 = 0, $3711 = 0, $3712 = 0, $3713 = 0, $3714 = 0, $3715 = 0;
 var $3716 = 0, $3717 = 0, $3718 = 0, $3719 = 0, $372 = 0, $3720 = 0, $3721 = 0, $3722 = 0, $3723 = 0, $3724 = 0, $3725 = 0, $3726 = 0, $3727 = 0, $3728 = 0, $3729 = 0, $373 = 0, $3730 = 0, $3731 = 0, $3732 = 0, $3733 = 0;
 var $3734 = 0, $3735 = 0, $3736 = 0, $3737 = 0, $3738 = 0, $3739 = 0, $374 = 0, $3740 = 0, $3741 = 0, $3742 = 0, $3743 = 0, $3744 = 0, $3745 = 0, $3746 = 0, $3747 = 0, $3748 = 0, $3749 = 0, $375 = 0, $3750 = 0, $3751 = 0;
 var $3752 = 0, $3753 = 0, $3754 = 0, $3755 = 0, $3756 = 0, $3757 = 0, $3758 = 0, $3759 = 0, $376 = 0, $3760 = 0, $3761 = 0, $3762 = 0, $3763 = 0, $3764 = 0, $3765 = 0, $3766 = 0, $3767 = 0, $3768 = 0, $3769 = 0, $377 = 0;
 var $3770 = 0, $3771 = 0, $3772 = 0, $3773 = 0, $3774 = 0, $3775 = 0, $3776 = 0, $3777 = 0, $3778 = 0, $3779 = 0, $378 = 0, $3780 = 0, $3781 = 0, $3782 = 0, $3783 = 0, $3784 = 0, $3785 = 0, $3786 = 0, $3787 = 0, $3788 = 0;
 var $3789 = 0, $379 = 0, $3790 = 0, $3791 = 0, $3792 = 0, $3793 = 0, $3794 = 0, $3795 = 0, $3796 = 0, $3797 = 0, $3798 = 0, $3799 = 0, $38 = 0, $380 = 0, $3800 = 0, $3801 = 0, $3802 = 0, $3803 = 0, $3804 = 0, $3805 = 0;
 var $3806 = 0, $3807 = 0, $3808 = 0, $3809 = 0, $381 = 0, $3810 = 0, $3811 = 0, $3812 = 0, $3813 = 0, $3814 = 0, $3815 = 0, $3816 = 0, $3817 = 0, $3818 = 0, $3819 = 0, $382 = 0, $3820 = 0, $3821 = 0, $3822 = 0, $3823 = 0;
 var $3824 = 0, $3825 = 0, $3826 = 0, $3827 = 0, $3828 = 0, $3829 = 0, $383 = 0, $3830 = 0, $3831 = 0, $3832 = 0, $3833 = 0, $3834 = 0, $3835 = 0, $3836 = 0, $3837 = 0, $3838 = 0, $3839 = 0, $384 = 0, $3840 = 0, $3841 = 0;
 var $3842 = 0, $3843 = 0, $3844 = 0, $3845 = 0, $3846 = 0, $3847 = 0, $3848 = 0, $3849 = 0, $385 = 0, $3850 = 0, $3851 = 0, $3852 = 0, $3853 = 0, $3854 = 0, $3855 = 0, $3856 = 0, $3857 = 0, $3858 = 0, $3859 = 0, $386 = 0;
 var $3860 = 0, $3861 = 0, $3862 = 0, $3863 = 0, $3864 = 0, $3865 = 0, $3866 = 0, $3867 = 0, $3868 = 0, $3869 = 0, $387 = 0, $3870 = 0, $3871 = 0, $3872 = 0, $3873 = 0, $3874 = 0, $3875 = 0, $3876 = 0, $3877 = 0, $3878 = 0;
 var $3879 = 0, $388 = 0, $3880 = 0, $3881 = 0, $3882 = 0, $3883 = 0, $3884 = 0, $3885 = 0, $3886 = 0, $3887 = 0, $3888 = 0, $3889 = 0, $389 = 0, $3890 = 0, $3891 = 0, $3892 = 0, $3893 = 0, $3894 = 0, $3895 = 0, $3896 = 0;
 var $3897 = 0, $3898 = 0, $3899 = 0, $39 = 0, $390 = 0, $3900 = 0, $3901 = 0, $3902 = 0, $3903 = 0, $3904 = 0, $3905 = 0, $3906 = 0, $3907 = 0, $3908 = 0, $3909 = 0, $391 = 0, $3910 = 0, $3911 = 0, $3912 = 0, $3913 = 0;
 var $3914 = 0, $3915 = 0, $3916 = 0, $3917 = 0, $3918 = 0, $3919 = 0, $392 = 0, $3920 = 0, $3921 = 0, $3922 = 0, $3923 = 0, $3924 = 0, $3925 = 0, $3926 = 0, $3927 = 0, $3928 = 0, $3929 = 0, $393 = 0, $3930 = 0, $3931 = 0;
 var $3932 = 0, $3933 = 0, $3934 = 0, $3935 = 0, $3936 = 0, $3937 = 0, $3938 = 0, $3939 = 0, $394 = 0, $3940 = 0, $3941 = 0, $3942 = 0, $3943 = 0, $3944 = 0, $3945 = 0, $3946 = 0, $3947 = 0, $3948 = 0, $3949 = 0, $395 = 0;
 var $3950 = 0, $3951 = 0, $3952 = 0, $3953 = 0, $3954 = 0, $3955 = 0, $3956 = 0, $3957 = 0, $3958 = 0, $3959 = 0, $396 = 0, $3960 = 0, $3961 = 0, $3962 = 0, $3963 = 0, $3964 = 0, $3965 = 0, $3966 = 0, $3967 = 0, $3968 = 0;
 var $3969 = 0, $397 = 0, $3970 = 0, $3971 = 0, $3972 = 0, $3973 = 0, $3974 = 0, $3975 = 0, $3976 = 0, $3977 = 0, $3978 = 0, $3979 = 0, $398 = 0, $3980 = 0, $3981 = 0, $3982 = 0, $3983 = 0, $3984 = 0, $3985 = 0, $3986 = 0;
 var $3987 = 0, $3988 = 0, $3989 = 0, $399 = 0, $3990 = 0, $3991 = 0, $3992 = 0, $3993 = 0, $3994 = 0, $3995 = 0, $3996 = 0, $3997 = 0, $3998 = 0, $3999 = 0, $4 = 0, $40 = 0, $400 = 0, $4000 = 0, $4001 = 0, $4002 = 0;
 var $4003 = 0, $4004 = 0, $4005 = 0, $4006 = 0, $4007 = 0, $4008 = 0, $4009 = 0, $401 = 0, $4010 = 0, $4011 = 0, $4012 = 0, $4013 = 0, $4014 = 0, $4015 = 0, $4016 = 0, $4017 = 0, $4018 = 0, $4019 = 0, $402 = 0, $4020 = 0;
 var $4021 = 0, $4022 = 0, $4023 = 0, $4024 = 0, $4025 = 0, $4026 = 0, $4027 = 0, $4028 = 0, $4029 = 0, $403 = 0, $4030 = 0, $4031 = 0, $4032 = 0, $4033 = 0, $4034 = 0, $4035 = 0, $4036 = 0, $4037 = 0, $4038 = 0, $4039 = 0;
 var $404 = 0, $4040 = 0, $4041 = 0, $4042 = 0, $4043 = 0, $4044 = 0, $4045 = 0, $4046 = 0, $4047 = 0, $4048 = 0, $4049 = 0, $405 = 0, $4050 = 0, $4051 = 0, $4052 = 0, $4053 = 0, $4054 = 0, $4055 = 0, $4056 = 0, $4057 = 0;
 var $4058 = 0, $4059 = 0, $406 = 0, $4060 = 0, $4061 = 0, $4062 = 0, $4063 = 0, $4064 = 0, $4065 = 0, $4066 = 0, $4067 = 0, $4068 = 0, $4069 = 0, $407 = 0, $4070 = 0, $4071 = 0, $4072 = 0, $4073 = 0, $4074 = 0, $4075 = 0;
 var $4076 = 0, $4077 = 0, $4078 = 0, $4079 = 0, $408 = 0, $4080 = 0, $4081 = 0, $4082 = 0, $4083 = 0, $4084 = 0, $4085 = 0, $4086 = 0, $4087 = 0, $4088 = 0, $4089 = 0, $409 = 0, $4090 = 0, $4091 = 0, $4092 = 0, $4093 = 0;
 var $4094 = 0, $4095 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0;
 var $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0;
 var $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0;
 var $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0;
 var $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0;
 var $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0;
 var $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0;
 var $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0;
 var $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0;
 var $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0;
 var $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0;
 var $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0;
 var $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0;
 var $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0;
 var $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0;
 var $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0;
 var $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0;
 var $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0;
 var $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0;
 var $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0;
 var $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0;
 var $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0;
 var $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0;
 var $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0;
 var $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0;
 var $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0;
 var $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0;
 var $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0;
 var $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0;
 var $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0;
 var $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0;
 var $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0;
 var $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $bc = 0, $cycles = 0, $de = 0, $h = 0;
 var $hl = 0, $hl19 = 0, $hl30 = 0, $hl9 = 0, $l = 0, $offset = 0, $offset11 = 0, $offset15 = 0, $offset21 = 0, $offset24 = 0, $offset25 = 0, $offset27 = 0, $offset29 = 0, $offset32 = 0, $offset35 = 0, $offset36 = 0, $offset37 = 0, $offset38 = 0, $offset39 = 0, $offset40 = 0;
 var $offset41 = 0, $offset42 = 0, $offset43 = 0, $offset44 = 0, $offset45 = 0, $offset46 = 0, $offset47 = 0, $offset48 = 0, $offset55 = 0, $offset64 = 0, $offset67 = 0, $offset68 = 0, $offset69 = 0, $offset70 = 0, $offset71 = 0, $offset72 = 0, $opcode = 0, $pc = 0, $psw = 0, $psw74 = 0;
 var $res = 0, $res1 = 0, $res10 = 0, $res12 = 0, $res13 = 0, $res16 = 0, $res17 = 0, $res18 = 0, $res2 = 0, $res20 = 0, $res22 = 0, $res23 = 0, $res26 = 0, $res28 = 0, $res3 = 0, $res31 = 0, $res33 = 0, $res34 = 0, $res4 = 0, $res49 = 0;
 var $res50 = 0, $res51 = 0, $res52 = 0, $res53 = 0, $res54 = 0, $res56 = 0, $res57 = 0, $res58 = 0, $res59 = 0, $res6 = 0, $res60 = 0, $res61 = 0, $res62 = 0, $res63 = 0, $res65 = 0, $res66 = 0, $res7 = 0, $save1 = 0, $save2 = 0, $sp = 0;
 var $spH = 0, $spL = 0, $v = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer4 = 0, $x = 0, $x14 = 0, $x5 = 0, $x73 = 0, $x75 = 0, $x8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer4 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $1 = $state;
 $cycles = 4;
 $2 = $1;
 $3 = ((($2)) + 10|0);
 $4 = HEAP16[$3>>1]|0;
 $5 = $4&65535;
 $6 = $1;
 $7 = ((($6)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (($8) + ($5)|0);
 $opcode = $9;
 $10 = $1;
 $11 = ((($10)) + 10|0);
 $12 = HEAP16[$11>>1]|0;
 $13 = $12&65535;
 HEAP32[$vararg_buffer>>2] = $13;
 (_printf(2750,$vararg_buffer)|0);
 $14 = $1;
 $15 = ((($14)) + 10|0);
 $16 = HEAP16[$15>>1]|0;
 $17 = $16&65535;
 $18 = $1;
 $19 = ((($18)) + 16|0);
 $20 = HEAP32[$19>>2]|0;
 $21 = (($20) + ($17)|0);
 $22 = HEAP8[$21>>0]|0;
 $23 = $22&255;
 HEAP32[$vararg_buffer1>>2] = $23;
 (_printf(2779,$vararg_buffer1)|0);
 $24 = $1;
 $25 = ((($24)) + 10|0);
 $26 = HEAP16[$25>>1]|0;
 $27 = $26&65535;
 $28 = (($27) + 1)|0;
 $29 = $28&65535;
 HEAP16[$25>>1] = $29;
 $30 = $1;
 $31 = ((($30)) + 10|0);
 $32 = HEAP16[$31>>1]|0;
 $33 = $32&65535;
 $34 = (($33) - 1)|0;
 $35 = $1;
 $36 = ((($35)) + 16|0);
 $37 = HEAP32[$36>>2]|0;
 $38 = (($37) + ($34)|0);
 $39 = HEAP8[$38>>0]|0;
 $40 = $39&255;
 L1: do {
  switch ($40|0) {
  case 48: case 0:  {
   break;
  }
  case 1:  {
   $41 = $opcode;
   $42 = ((($41)) + 1|0);
   $43 = HEAP8[$42>>0]|0;
   $44 = $1;
   $45 = ((($44)) + 2|0);
   HEAP8[$45>>0] = $43;
   $46 = $opcode;
   $47 = ((($46)) + 2|0);
   $48 = HEAP8[$47>>0]|0;
   $49 = $1;
   $50 = ((($49)) + 1|0);
   HEAP8[$50>>0] = $48;
   $51 = $1;
   $52 = ((($51)) + 10|0);
   $53 = HEAP16[$52>>1]|0;
   $54 = $53&65535;
   $55 = (($54) + 2)|0;
   $56 = $55&65535;
   HEAP16[$52>>1] = $56;
   break;
  }
  case 2:  {
   $57 = $1;
   $58 = HEAP8[$57>>0]|0;
   $59 = $1;
   $60 = ((($59)) + 1|0);
   $61 = HEAP8[$60>>0]|0;
   $62 = $61&255;
   $63 = $62 << 8;
   $64 = $1;
   $65 = ((($64)) + 2|0);
   $66 = HEAP8[$65>>0]|0;
   $67 = $66&255;
   $68 = $63 | $67;
   $69 = $1;
   $70 = ((($69)) + 16|0);
   $71 = HEAP32[$70>>2]|0;
   $72 = (($71) + ($68)|0);
   HEAP8[$72>>0] = $58;
   break;
  }
  case 3:  {
   $73 = $1;
   $74 = ((($73)) + 2|0);
   $75 = HEAP8[$74>>0]|0;
   $76 = (($75) + 1)<<24>>24;
   HEAP8[$74>>0] = $76;
   $77 = $1;
   $78 = ((($77)) + 2|0);
   $79 = HEAP8[$78>>0]|0;
   $80 = $79&255;
   $81 = ($80|0)==(0);
   if ($81) {
    $82 = $1;
    $83 = ((($82)) + 1|0);
    $84 = HEAP8[$83>>0]|0;
    $85 = (($84) + 1)<<24>>24;
    HEAP8[$83>>0] = $85;
   }
   break;
  }
  case 4:  {
   $86 = $1;
   $87 = ((($86)) + 1|0);
   $88 = HEAP8[$87>>0]|0;
   $89 = $88&255;
   $90 = (($89) + 1)|0;
   $91 = $90&255;
   $res = $91;
   $92 = $res;
   $93 = $92&255;
   $94 = ($93|0)==(0);
   $95 = $94&1;
   $96 = $95&255;
   $97 = $1;
   $98 = ((($97)) + 12|0);
   $99 = HEAP8[$98>>0]|0;
   $100 = $96 & 1;
   $101 = $99 & -2;
   $102 = $101 | $100;
   HEAP8[$98>>0] = $102;
   $103 = $res;
   $104 = $103&255;
   $105 = $104 & 128;
   $106 = (128)==($105|0);
   $107 = $106&1;
   $108 = $107&255;
   $109 = $1;
   $110 = ((($109)) + 12|0);
   $111 = HEAP8[$110>>0]|0;
   $112 = $108 & 1;
   $113 = ($112 << 1)&255;
   $114 = $111 & -3;
   $115 = $114 | $113;
   HEAP8[$110>>0] = $115;
   $116 = $res;
   $117 = $116&255;
   $118 = (_parity($117,8)|0);
   $119 = $118&255;
   $120 = $1;
   $121 = ((($120)) + 12|0);
   $122 = HEAP8[$121>>0]|0;
   $123 = $119 & 1;
   $124 = ($123 << 2)&255;
   $125 = $122 & -5;
   $126 = $125 | $124;
   HEAP8[$121>>0] = $126;
   $127 = $res;
   $128 = $1;
   $129 = ((($128)) + 1|0);
   HEAP8[$129>>0] = $127;
   break;
  }
  case 5:  {
   $130 = $1;
   $131 = ((($130)) + 1|0);
   $132 = HEAP8[$131>>0]|0;
   $133 = $132&255;
   $134 = (($133) - 1)|0;
   $135 = $134&255;
   $res1 = $135;
   $136 = $res1;
   $137 = $136&255;
   $138 = ($137|0)==(0);
   $139 = $138&1;
   $140 = $139&255;
   $141 = $1;
   $142 = ((($141)) + 12|0);
   $143 = HEAP8[$142>>0]|0;
   $144 = $140 & 1;
   $145 = $143 & -2;
   $146 = $145 | $144;
   HEAP8[$142>>0] = $146;
   $147 = $res1;
   $148 = $147&255;
   $149 = $148 & 128;
   $150 = (128)==($149|0);
   $151 = $150&1;
   $152 = $151&255;
   $153 = $1;
   $154 = ((($153)) + 12|0);
   $155 = HEAP8[$154>>0]|0;
   $156 = $152 & 1;
   $157 = ($156 << 1)&255;
   $158 = $155 & -3;
   $159 = $158 | $157;
   HEAP8[$154>>0] = $159;
   $160 = $res1;
   $161 = $160&255;
   $162 = (_parity($161,8)|0);
   $163 = $162&255;
   $164 = $1;
   $165 = ((($164)) + 12|0);
   $166 = HEAP8[$165>>0]|0;
   $167 = $163 & 1;
   $168 = ($167 << 2)&255;
   $169 = $166 & -5;
   $170 = $169 | $168;
   HEAP8[$165>>0] = $170;
   $171 = $res1;
   $172 = $1;
   $173 = ((($172)) + 1|0);
   HEAP8[$173>>0] = $171;
   break;
  }
  case 6:  {
   $174 = $opcode;
   $175 = ((($174)) + 1|0);
   $176 = HEAP8[$175>>0]|0;
   $177 = $1;
   $178 = ((($177)) + 1|0);
   HEAP8[$178>>0] = $176;
   $179 = $1;
   $180 = ((($179)) + 10|0);
   $181 = HEAP16[$180>>1]|0;
   $182 = (($181) + 1)<<16>>16;
   HEAP16[$180>>1] = $182;
   break;
  }
  case 7:  {
   $183 = $1;
   $184 = HEAP8[$183>>0]|0;
   $x = $184;
   $185 = $x;
   $186 = $185&255;
   $187 = $186 & 128;
   $188 = $187 >> 7;
   $189 = $x;
   $190 = $189&255;
   $191 = $190 << 1;
   $192 = $188 | $191;
   $193 = $192&255;
   $194 = $1;
   HEAP8[$194>>0] = $193;
   $195 = $x;
   $196 = $195&255;
   $197 = $196 & 128;
   $198 = $197 >> 7;
   $199 = (1)==($198|0);
   $200 = $199&1;
   $201 = $200&255;
   $202 = $1;
   $203 = ((($202)) + 12|0);
   $204 = HEAP8[$203>>0]|0;
   $205 = $201 & 1;
   $206 = ($205 << 3)&255;
   $207 = $204 & -9;
   $208 = $207 | $206;
   HEAP8[$203>>0] = $208;
   break;
  }
  case 8:  {
   $209 = $1;
   _InvalidInstruction($209);
   break;
  }
  case 9:  {
   $210 = $1;
   $211 = ((($210)) + 5|0);
   $212 = HEAP8[$211>>0]|0;
   $213 = $212&255;
   $214 = $213 << 8;
   $215 = $1;
   $216 = ((($215)) + 6|0);
   $217 = HEAP8[$216>>0]|0;
   $218 = $217&255;
   $219 = $214 | $218;
   $hl = $219;
   $220 = $1;
   $221 = ((($220)) + 1|0);
   $222 = HEAP8[$221>>0]|0;
   $223 = $222&255;
   $224 = $223 << 8;
   $225 = $1;
   $226 = ((($225)) + 2|0);
   $227 = HEAP8[$226>>0]|0;
   $228 = $227&255;
   $229 = $224 | $228;
   $bc = $229;
   $230 = $hl;
   $231 = $bc;
   $232 = (($230) + ($231))|0;
   $res2 = $232;
   $233 = $res2;
   $234 = $233 & 65280;
   $235 = $234 >>> 8;
   $236 = $235&255;
   $237 = $1;
   $238 = ((($237)) + 5|0);
   HEAP8[$238>>0] = $236;
   $239 = $res2;
   $240 = $239 & 255;
   $241 = $240&255;
   $242 = $1;
   $243 = ((($242)) + 6|0);
   HEAP8[$243>>0] = $241;
   $244 = $res2;
   $245 = $244 & -65536;
   $246 = ($245>>>0)>(0);
   $247 = $246&1;
   $248 = $247&255;
   $249 = $1;
   $250 = ((($249)) + 12|0);
   $251 = HEAP8[$250>>0]|0;
   $252 = $248 & 1;
   $253 = ($252 << 3)&255;
   $254 = $251 & -9;
   $255 = $254 | $253;
   HEAP8[$250>>0] = $255;
   break;
  }
  case 10:  {
   $256 = $1;
   $257 = ((($256)) + 1|0);
   $258 = HEAP8[$257>>0]|0;
   $259 = $258&255;
   $260 = $259 << 8;
   $261 = $1;
   $262 = ((($261)) + 2|0);
   $263 = HEAP8[$262>>0]|0;
   $264 = $263&255;
   $265 = $260 | $264;
   $266 = $265&65535;
   $offset = $266;
   $267 = $offset;
   $268 = $267&65535;
   $269 = $1;
   $270 = ((($269)) + 16|0);
   $271 = HEAP32[$270>>2]|0;
   $272 = (($271) + ($268)|0);
   $273 = HEAP8[$272>>0]|0;
   $274 = $1;
   HEAP8[$274>>0] = $273;
   break;
  }
  case 11:  {
   $275 = $1;
   $276 = ((($275)) + 2|0);
   $277 = HEAP8[$276>>0]|0;
   $278 = (($277) + -1)<<24>>24;
   HEAP8[$276>>0] = $278;
   $279 = $1;
   $280 = ((($279)) + 2|0);
   $281 = HEAP8[$280>>0]|0;
   $282 = $281&255;
   $283 = ($282|0)==(255);
   if ($283) {
    $284 = $1;
    $285 = ((($284)) + 1|0);
    $286 = HEAP8[$285>>0]|0;
    $287 = (($286) + -1)<<24>>24;
    HEAP8[$285>>0] = $287;
   }
   break;
  }
  case 12:  {
   $288 = $1;
   $289 = ((($288)) + 2|0);
   $290 = HEAP8[$289>>0]|0;
   $291 = $290&255;
   $292 = (($291) + 1)|0;
   $293 = $292&255;
   $res3 = $293;
   $294 = $res3;
   $295 = $294&255;
   $296 = ($295|0)==(0);
   $297 = $296&1;
   $298 = $297&255;
   $299 = $1;
   $300 = ((($299)) + 12|0);
   $301 = HEAP8[$300>>0]|0;
   $302 = $298 & 1;
   $303 = $301 & -2;
   $304 = $303 | $302;
   HEAP8[$300>>0] = $304;
   $305 = $res3;
   $306 = $305&255;
   $307 = $306 & 128;
   $308 = (128)==($307|0);
   $309 = $308&1;
   $310 = $309&255;
   $311 = $1;
   $312 = ((($311)) + 12|0);
   $313 = HEAP8[$312>>0]|0;
   $314 = $310 & 1;
   $315 = ($314 << 1)&255;
   $316 = $313 & -3;
   $317 = $316 | $315;
   HEAP8[$312>>0] = $317;
   $318 = $res3;
   $319 = $318&255;
   $320 = (_parity($319,8)|0);
   $321 = $320&255;
   $322 = $1;
   $323 = ((($322)) + 12|0);
   $324 = HEAP8[$323>>0]|0;
   $325 = $321 & 1;
   $326 = ($325 << 2)&255;
   $327 = $324 & -5;
   $328 = $327 | $326;
   HEAP8[$323>>0] = $328;
   $329 = $res3;
   $330 = $1;
   $331 = ((($330)) + 2|0);
   HEAP8[$331>>0] = $329;
   break;
  }
  case 13:  {
   $332 = $1;
   $333 = ((($332)) + 2|0);
   $334 = HEAP8[$333>>0]|0;
   $335 = $334&255;
   $336 = (($335) - 1)|0;
   $337 = $336&255;
   $res4 = $337;
   $338 = $res4;
   $339 = $338&255;
   $340 = ($339|0)==(0);
   $341 = $340&1;
   $342 = $341&255;
   $343 = $1;
   $344 = ((($343)) + 12|0);
   $345 = HEAP8[$344>>0]|0;
   $346 = $342 & 1;
   $347 = $345 & -2;
   $348 = $347 | $346;
   HEAP8[$344>>0] = $348;
   $349 = $res4;
   $350 = $349&255;
   $351 = $350 & 128;
   $352 = (128)==($351|0);
   $353 = $352&1;
   $354 = $353&255;
   $355 = $1;
   $356 = ((($355)) + 12|0);
   $357 = HEAP8[$356>>0]|0;
   $358 = $354 & 1;
   $359 = ($358 << 1)&255;
   $360 = $357 & -3;
   $361 = $360 | $359;
   HEAP8[$356>>0] = $361;
   $362 = $res4;
   $363 = $362&255;
   $364 = (_parity($363,8)|0);
   $365 = $364&255;
   $366 = $1;
   $367 = ((($366)) + 12|0);
   $368 = HEAP8[$367>>0]|0;
   $369 = $365 & 1;
   $370 = ($369 << 2)&255;
   $371 = $368 & -5;
   $372 = $371 | $370;
   HEAP8[$367>>0] = $372;
   $373 = $res4;
   $374 = $1;
   $375 = ((($374)) + 2|0);
   HEAP8[$375>>0] = $373;
   break;
  }
  case 14:  {
   $376 = $opcode;
   $377 = ((($376)) + 1|0);
   $378 = HEAP8[$377>>0]|0;
   $379 = $1;
   $380 = ((($379)) + 2|0);
   HEAP8[$380>>0] = $378;
   $381 = $1;
   $382 = ((($381)) + 10|0);
   $383 = HEAP16[$382>>1]|0;
   $384 = (($383) + 1)<<16>>16;
   HEAP16[$382>>1] = $384;
   break;
  }
  case 15:  {
   $385 = $1;
   $386 = HEAP8[$385>>0]|0;
   $x5 = $386;
   $387 = $x5;
   $388 = $387&255;
   $389 = $388 & 1;
   $390 = $389 << 7;
   $391 = $x5;
   $392 = $391&255;
   $393 = $392 >> 1;
   $394 = $390 | $393;
   $395 = $394&255;
   $396 = $1;
   HEAP8[$396>>0] = $395;
   $397 = $x5;
   $398 = $397&255;
   $399 = $398 & 1;
   $400 = (1)==($399|0);
   $401 = $400&1;
   $402 = $401&255;
   $403 = $1;
   $404 = ((($403)) + 12|0);
   $405 = HEAP8[$404>>0]|0;
   $406 = $402 & 1;
   $407 = ($406 << 3)&255;
   $408 = $405 & -9;
   $409 = $408 | $407;
   HEAP8[$404>>0] = $409;
   break;
  }
  case 16:  {
   $410 = $1;
   _InvalidInstruction($410);
   break;
  }
  case 17:  {
   $411 = $opcode;
   $412 = ((($411)) + 1|0);
   $413 = HEAP8[$412>>0]|0;
   $414 = $1;
   $415 = ((($414)) + 4|0);
   HEAP8[$415>>0] = $413;
   $416 = $opcode;
   $417 = ((($416)) + 2|0);
   $418 = HEAP8[$417>>0]|0;
   $419 = $1;
   $420 = ((($419)) + 3|0);
   HEAP8[$420>>0] = $418;
   $421 = $1;
   $422 = ((($421)) + 10|0);
   $423 = HEAP16[$422>>1]|0;
   $424 = $423&65535;
   $425 = (($424) + 2)|0;
   $426 = $425&65535;
   HEAP16[$422>>1] = $426;
   break;
  }
  case 18:  {
   $427 = $1;
   $428 = HEAP8[$427>>0]|0;
   $429 = $1;
   $430 = ((($429)) + 1|0);
   $431 = HEAP8[$430>>0]|0;
   $432 = $431&255;
   $433 = $432 << 8;
   $434 = $1;
   $435 = ((($434)) + 2|0);
   $436 = HEAP8[$435>>0]|0;
   $437 = $436&255;
   $438 = (($433) + ($437))|0;
   $439 = $1;
   $440 = ((($439)) + 16|0);
   $441 = HEAP32[$440>>2]|0;
   $442 = (($441) + ($438)|0);
   HEAP8[$442>>0] = $428;
   break;
  }
  case 19:  {
   $443 = $1;
   $444 = ((($443)) + 4|0);
   $445 = HEAP8[$444>>0]|0;
   $446 = (($445) + 1)<<24>>24;
   HEAP8[$444>>0] = $446;
   $447 = $1;
   $448 = ((($447)) + 4|0);
   $449 = HEAP8[$448>>0]|0;
   $450 = $449&255;
   $451 = ($450|0)==(0);
   if ($451) {
    $452 = $1;
    $453 = ((($452)) + 3|0);
    $454 = HEAP8[$453>>0]|0;
    $455 = (($454) + 1)<<24>>24;
    HEAP8[$453>>0] = $455;
   }
   break;
  }
  case 20:  {
   $456 = $1;
   $457 = ((($456)) + 3|0);
   $458 = HEAP8[$457>>0]|0;
   $459 = $458&255;
   $460 = (($459) + 1)|0;
   $461 = $460&255;
   $res6 = $461;
   $462 = $res6;
   $463 = $462&255;
   $464 = ($463|0)==(0);
   $465 = $464&1;
   $466 = $465&255;
   $467 = $1;
   $468 = ((($467)) + 12|0);
   $469 = HEAP8[$468>>0]|0;
   $470 = $466 & 1;
   $471 = $469 & -2;
   $472 = $471 | $470;
   HEAP8[$468>>0] = $472;
   $473 = $res6;
   $474 = $473&255;
   $475 = $474 & 128;
   $476 = (128)==($475|0);
   $477 = $476&1;
   $478 = $477&255;
   $479 = $1;
   $480 = ((($479)) + 12|0);
   $481 = HEAP8[$480>>0]|0;
   $482 = $478 & 1;
   $483 = ($482 << 1)&255;
   $484 = $481 & -3;
   $485 = $484 | $483;
   HEAP8[$480>>0] = $485;
   $486 = $res6;
   $487 = $486&255;
   $488 = (_parity($487,8)|0);
   $489 = $488&255;
   $490 = $1;
   $491 = ((($490)) + 12|0);
   $492 = HEAP8[$491>>0]|0;
   $493 = $489 & 1;
   $494 = ($493 << 2)&255;
   $495 = $492 & -5;
   $496 = $495 | $494;
   HEAP8[$491>>0] = $496;
   $497 = $res6;
   $498 = $1;
   $499 = ((($498)) + 3|0);
   HEAP8[$499>>0] = $497;
   break;
  }
  case 21:  {
   $500 = $1;
   $501 = ((($500)) + 3|0);
   $502 = HEAP8[$501>>0]|0;
   $503 = $502&255;
   $504 = (($503) - 1)|0;
   $505 = $504&255;
   $res7 = $505;
   $506 = $res7;
   $507 = $506&255;
   $508 = ($507|0)==(0);
   $509 = $508&1;
   $510 = $509&255;
   $511 = $1;
   $512 = ((($511)) + 12|0);
   $513 = HEAP8[$512>>0]|0;
   $514 = $510 & 1;
   $515 = $513 & -2;
   $516 = $515 | $514;
   HEAP8[$512>>0] = $516;
   $517 = $res7;
   $518 = $517&255;
   $519 = $518 & 128;
   $520 = (128)==($519|0);
   $521 = $520&1;
   $522 = $521&255;
   $523 = $1;
   $524 = ((($523)) + 12|0);
   $525 = HEAP8[$524>>0]|0;
   $526 = $522 & 1;
   $527 = ($526 << 1)&255;
   $528 = $525 & -3;
   $529 = $528 | $527;
   HEAP8[$524>>0] = $529;
   $530 = $res7;
   $531 = $530&255;
   $532 = (_parity($531,8)|0);
   $533 = $532&255;
   $534 = $1;
   $535 = ((($534)) + 12|0);
   $536 = HEAP8[$535>>0]|0;
   $537 = $533 & 1;
   $538 = ($537 << 2)&255;
   $539 = $536 & -5;
   $540 = $539 | $538;
   HEAP8[$535>>0] = $540;
   $541 = $res7;
   $542 = $1;
   $543 = ((($542)) + 3|0);
   HEAP8[$543>>0] = $541;
   break;
  }
  case 22:  {
   $544 = $opcode;
   $545 = ((($544)) + 1|0);
   $546 = HEAP8[$545>>0]|0;
   $547 = $1;
   $548 = ((($547)) + 3|0);
   HEAP8[$548>>0] = $546;
   $549 = $1;
   $550 = ((($549)) + 10|0);
   $551 = HEAP16[$550>>1]|0;
   $552 = (($551) + 1)<<16>>16;
   HEAP16[$550>>1] = $552;
   break;
  }
  case 23:  {
   $553 = $1;
   $554 = HEAP8[$553>>0]|0;
   $x8 = $554;
   $555 = $1;
   $556 = ((($555)) + 12|0);
   $557 = HEAP8[$556>>0]|0;
   $558 = ($557&255) >>> 3;
   $559 = $558 & 1;
   $560 = $559&255;
   $561 = $x8;
   $562 = $561&255;
   $563 = $562 << 1;
   $564 = $560 | $563;
   $565 = $564&255;
   $566 = $1;
   HEAP8[$566>>0] = $565;
   $567 = $x8;
   $568 = $567&255;
   $569 = $568 & 128;
   $570 = $569 >> 7;
   $571 = (1)==($570|0);
   $572 = $571&1;
   $573 = $572&255;
   $574 = $1;
   $575 = ((($574)) + 12|0);
   $576 = HEAP8[$575>>0]|0;
   $577 = $573 & 1;
   $578 = ($577 << 3)&255;
   $579 = $576 & -9;
   $580 = $579 | $578;
   HEAP8[$575>>0] = $580;
   break;
  }
  case 24:  {
   $581 = $1;
   _InvalidInstruction($581);
   break;
  }
  case 25:  {
   $582 = $1;
   $583 = ((($582)) + 5|0);
   $584 = HEAP8[$583>>0]|0;
   $585 = $584&255;
   $586 = $585 << 8;
   $587 = $1;
   $588 = ((($587)) + 6|0);
   $589 = HEAP8[$588>>0]|0;
   $590 = $589&255;
   $591 = $586 | $590;
   $hl9 = $591;
   $592 = $1;
   $593 = ((($592)) + 3|0);
   $594 = HEAP8[$593>>0]|0;
   $595 = $594&255;
   $596 = $595 << 8;
   $597 = $1;
   $598 = ((($597)) + 4|0);
   $599 = HEAP8[$598>>0]|0;
   $600 = $599&255;
   $601 = $596 | $600;
   $de = $601;
   $602 = $hl9;
   $603 = $de;
   $604 = (($602) + ($603))|0;
   $res10 = $604;
   $605 = $res10;
   $606 = $605 & 65280;
   $607 = $606 >>> 8;
   $608 = $607&255;
   $609 = $1;
   $610 = ((($609)) + 5|0);
   HEAP8[$610>>0] = $608;
   $611 = $res10;
   $612 = $611 & 255;
   $613 = $612&255;
   $614 = $1;
   $615 = ((($614)) + 6|0);
   HEAP8[$615>>0] = $613;
   $616 = $res10;
   $617 = $616 & -65536;
   $618 = ($617|0)!=(0);
   $619 = $618&1;
   $620 = $619&255;
   $621 = $1;
   $622 = ((($621)) + 12|0);
   $623 = HEAP8[$622>>0]|0;
   $624 = $620 & 1;
   $625 = ($624 << 3)&255;
   $626 = $623 & -9;
   $627 = $626 | $625;
   HEAP8[$622>>0] = $627;
   break;
  }
  case 26:  {
   $628 = $1;
   $629 = ((($628)) + 3|0);
   $630 = HEAP8[$629>>0]|0;
   $631 = $630&255;
   $632 = $631 << 8;
   $633 = $1;
   $634 = ((($633)) + 4|0);
   $635 = HEAP8[$634>>0]|0;
   $636 = $635&255;
   $637 = $632 | $636;
   $638 = $637&65535;
   $offset11 = $638;
   $639 = $offset11;
   $640 = $639&65535;
   $641 = $1;
   $642 = ((($641)) + 16|0);
   $643 = HEAP32[$642>>2]|0;
   $644 = (($643) + ($640)|0);
   $645 = HEAP8[$644>>0]|0;
   $646 = $1;
   HEAP8[$646>>0] = $645;
   break;
  }
  case 27:  {
   $647 = $1;
   $648 = ((($647)) + 4|0);
   $649 = HEAP8[$648>>0]|0;
   $650 = (($649) + -1)<<24>>24;
   HEAP8[$648>>0] = $650;
   $651 = $1;
   $652 = ((($651)) + 4|0);
   $653 = HEAP8[$652>>0]|0;
   $654 = $653&255;
   $655 = ($654|0)==(255);
   if ($655) {
    $656 = $1;
    $657 = ((($656)) + 3|0);
    $658 = HEAP8[$657>>0]|0;
    $659 = (($658) + -1)<<24>>24;
    HEAP8[$657>>0] = $659;
   }
   break;
  }
  case 28:  {
   $660 = $1;
   $661 = ((($660)) + 4|0);
   $662 = HEAP8[$661>>0]|0;
   $663 = $662&255;
   $664 = (($663) + 1)|0;
   $665 = $664&255;
   $res12 = $665;
   $666 = $res12;
   $667 = $666&255;
   $668 = ($667|0)==(0);
   $669 = $668&1;
   $670 = $669&255;
   $671 = $1;
   $672 = ((($671)) + 12|0);
   $673 = HEAP8[$672>>0]|0;
   $674 = $670 & 1;
   $675 = $673 & -2;
   $676 = $675 | $674;
   HEAP8[$672>>0] = $676;
   $677 = $res12;
   $678 = $677&255;
   $679 = $678 & 128;
   $680 = (128)==($679|0);
   $681 = $680&1;
   $682 = $681&255;
   $683 = $1;
   $684 = ((($683)) + 12|0);
   $685 = HEAP8[$684>>0]|0;
   $686 = $682 & 1;
   $687 = ($686 << 1)&255;
   $688 = $685 & -3;
   $689 = $688 | $687;
   HEAP8[$684>>0] = $689;
   $690 = $res12;
   $691 = $690&255;
   $692 = (_parity($691,8)|0);
   $693 = $692&255;
   $694 = $1;
   $695 = ((($694)) + 12|0);
   $696 = HEAP8[$695>>0]|0;
   $697 = $693 & 1;
   $698 = ($697 << 2)&255;
   $699 = $696 & -5;
   $700 = $699 | $698;
   HEAP8[$695>>0] = $700;
   $701 = $res12;
   $702 = $1;
   $703 = ((($702)) + 4|0);
   HEAP8[$703>>0] = $701;
   break;
  }
  case 29:  {
   $704 = $1;
   $705 = ((($704)) + 4|0);
   $706 = HEAP8[$705>>0]|0;
   $707 = $706&255;
   $708 = (($707) - 1)|0;
   $709 = $708&255;
   $res13 = $709;
   $710 = $res13;
   $711 = $710&255;
   $712 = ($711|0)==(0);
   $713 = $712&1;
   $714 = $713&255;
   $715 = $1;
   $716 = ((($715)) + 12|0);
   $717 = HEAP8[$716>>0]|0;
   $718 = $714 & 1;
   $719 = $717 & -2;
   $720 = $719 | $718;
   HEAP8[$716>>0] = $720;
   $721 = $res13;
   $722 = $721&255;
   $723 = $722 & 128;
   $724 = (128)==($723|0);
   $725 = $724&1;
   $726 = $725&255;
   $727 = $1;
   $728 = ((($727)) + 12|0);
   $729 = HEAP8[$728>>0]|0;
   $730 = $726 & 1;
   $731 = ($730 << 1)&255;
   $732 = $729 & -3;
   $733 = $732 | $731;
   HEAP8[$728>>0] = $733;
   $734 = $res13;
   $735 = $734&255;
   $736 = (_parity($735,8)|0);
   $737 = $736&255;
   $738 = $1;
   $739 = ((($738)) + 12|0);
   $740 = HEAP8[$739>>0]|0;
   $741 = $737 & 1;
   $742 = ($741 << 2)&255;
   $743 = $740 & -5;
   $744 = $743 | $742;
   HEAP8[$739>>0] = $744;
   $745 = $res13;
   $746 = $1;
   $747 = ((($746)) + 4|0);
   HEAP8[$747>>0] = $745;
   break;
  }
  case 30:  {
   $748 = $opcode;
   $749 = ((($748)) + 1|0);
   $750 = HEAP8[$749>>0]|0;
   $751 = $1;
   $752 = ((($751)) + 4|0);
   HEAP8[$752>>0] = $750;
   $753 = $1;
   $754 = ((($753)) + 10|0);
   $755 = HEAP16[$754>>1]|0;
   $756 = (($755) + 1)<<16>>16;
   HEAP16[$754>>1] = $756;
   break;
  }
  case 31:  {
   $757 = $1;
   $758 = HEAP8[$757>>0]|0;
   $x14 = $758;
   $759 = $1;
   $760 = ((($759)) + 12|0);
   $761 = HEAP8[$760>>0]|0;
   $762 = ($761&255) >>> 3;
   $763 = $762 & 1;
   $764 = $763&255;
   $765 = $x14;
   $766 = $765&255;
   $767 = $766 << 1;
   $768 = $764 | $767;
   $769 = $768&255;
   $770 = $1;
   HEAP8[$770>>0] = $769;
   $771 = $x14;
   $772 = $771&255;
   $773 = $772 & 1;
   $774 = (1)==($773|0);
   $775 = $774&1;
   $776 = $775&255;
   $777 = $1;
   $778 = ((($777)) + 12|0);
   $779 = HEAP8[$778>>0]|0;
   $780 = $776 & 1;
   $781 = ($780 << 3)&255;
   $782 = $779 & -9;
   $783 = $782 | $781;
   HEAP8[$778>>0] = $783;
   break;
  }
  case 32:  {
   $784 = $1;
   _UnimplementedInstruction($784);
   break;
  }
  case 33:  {
   $785 = $opcode;
   $786 = ((($785)) + 1|0);
   $787 = HEAP8[$786>>0]|0;
   $788 = $1;
   $789 = ((($788)) + 6|0);
   HEAP8[$789>>0] = $787;
   $790 = $opcode;
   $791 = ((($790)) + 2|0);
   $792 = HEAP8[$791>>0]|0;
   $793 = $1;
   $794 = ((($793)) + 5|0);
   HEAP8[$794>>0] = $792;
   $795 = $1;
   $796 = ((($795)) + 10|0);
   $797 = HEAP16[$796>>1]|0;
   $798 = $797&65535;
   $799 = (($798) + 2)|0;
   $800 = $799&65535;
   HEAP16[$796>>1] = $800;
   break;
  }
  case 34:  {
   $801 = $opcode;
   $802 = ((($801)) + 2|0);
   $803 = HEAP8[$802>>0]|0;
   $804 = $803&255;
   $805 = $804 << 8;
   $806 = $opcode;
   $807 = ((($806)) + 1|0);
   $808 = HEAP8[$807>>0]|0;
   $809 = $808&255;
   $810 = $805 | $809;
   $811 = $810&65535;
   $offset15 = $811;
   $812 = $1;
   $813 = ((($812)) + 6|0);
   $814 = HEAP8[$813>>0]|0;
   $815 = $offset15;
   $816 = $815&65535;
   $817 = $1;
   $818 = ((($817)) + 16|0);
   $819 = HEAP32[$818>>2]|0;
   $820 = (($819) + ($816)|0);
   HEAP8[$820>>0] = $814;
   $821 = $1;
   $822 = ((($821)) + 5|0);
   $823 = HEAP8[$822>>0]|0;
   $824 = $offset15;
   $825 = $824&65535;
   $826 = (($825) + 1)|0;
   $827 = $1;
   $828 = ((($827)) + 16|0);
   $829 = HEAP32[$828>>2]|0;
   $830 = (($829) + ($826)|0);
   HEAP8[$830>>0] = $823;
   $831 = $1;
   $832 = ((($831)) + 10|0);
   $833 = HEAP16[$832>>1]|0;
   $834 = $833&65535;
   $835 = (($834) + 2)|0;
   $836 = $835&65535;
   HEAP16[$832>>1] = $836;
   break;
  }
  case 35:  {
   $837 = $1;
   $838 = ((($837)) + 6|0);
   $839 = HEAP8[$838>>0]|0;
   $840 = (($839) + 1)<<24>>24;
   HEAP8[$838>>0] = $840;
   $841 = $1;
   $842 = ((($841)) + 6|0);
   $843 = HEAP8[$842>>0]|0;
   $844 = $843&255;
   $845 = ($844|0)==(0);
   if ($845) {
    $846 = $1;
    $847 = ((($846)) + 5|0);
    $848 = HEAP8[$847>>0]|0;
    $849 = (($848) + 1)<<24>>24;
    HEAP8[$847>>0] = $849;
   }
   break;
  }
  case 36:  {
   $850 = $1;
   $851 = ((($850)) + 5|0);
   $852 = HEAP8[$851>>0]|0;
   $853 = $852&255;
   $854 = (($853) + 1)|0;
   $855 = $854&255;
   $res16 = $855;
   $856 = $res16;
   $857 = $856&255;
   $858 = ($857|0)==(0);
   $859 = $858&1;
   $860 = $859&255;
   $861 = $1;
   $862 = ((($861)) + 12|0);
   $863 = HEAP8[$862>>0]|0;
   $864 = $860 & 1;
   $865 = $863 & -2;
   $866 = $865 | $864;
   HEAP8[$862>>0] = $866;
   $867 = $res16;
   $868 = $867&255;
   $869 = $868 & 128;
   $870 = (128)==($869|0);
   $871 = $870&1;
   $872 = $871&255;
   $873 = $1;
   $874 = ((($873)) + 12|0);
   $875 = HEAP8[$874>>0]|0;
   $876 = $872 & 1;
   $877 = ($876 << 1)&255;
   $878 = $875 & -3;
   $879 = $878 | $877;
   HEAP8[$874>>0] = $879;
   $880 = $res16;
   $881 = $880&255;
   $882 = (_parity($881,8)|0);
   $883 = $882&255;
   $884 = $1;
   $885 = ((($884)) + 12|0);
   $886 = HEAP8[$885>>0]|0;
   $887 = $883 & 1;
   $888 = ($887 << 2)&255;
   $889 = $886 & -5;
   $890 = $889 | $888;
   HEAP8[$885>>0] = $890;
   $891 = $res16;
   $892 = $1;
   $893 = ((($892)) + 5|0);
   HEAP8[$893>>0] = $891;
   break;
  }
  case 37:  {
   $894 = $1;
   $895 = ((($894)) + 5|0);
   $896 = HEAP8[$895>>0]|0;
   $897 = $896&255;
   $898 = (($897) - 1)|0;
   $899 = $898&255;
   $res17 = $899;
   $900 = $res17;
   $901 = $900&255;
   $902 = ($901|0)==(0);
   $903 = $902&1;
   $904 = $903&255;
   $905 = $1;
   $906 = ((($905)) + 12|0);
   $907 = HEAP8[$906>>0]|0;
   $908 = $904 & 1;
   $909 = $907 & -2;
   $910 = $909 | $908;
   HEAP8[$906>>0] = $910;
   $911 = $res17;
   $912 = $911&255;
   $913 = $912 & 128;
   $914 = (128)==($913|0);
   $915 = $914&1;
   $916 = $915&255;
   $917 = $1;
   $918 = ((($917)) + 12|0);
   $919 = HEAP8[$918>>0]|0;
   $920 = $916 & 1;
   $921 = ($920 << 1)&255;
   $922 = $919 & -3;
   $923 = $922 | $921;
   HEAP8[$918>>0] = $923;
   $924 = $res17;
   $925 = $924&255;
   $926 = (_parity($925,8)|0);
   $927 = $926&255;
   $928 = $1;
   $929 = ((($928)) + 12|0);
   $930 = HEAP8[$929>>0]|0;
   $931 = $927 & 1;
   $932 = ($931 << 2)&255;
   $933 = $930 & -5;
   $934 = $933 | $932;
   HEAP8[$929>>0] = $934;
   $935 = $res17;
   $936 = $1;
   $937 = ((($936)) + 5|0);
   HEAP8[$937>>0] = $935;
   break;
  }
  case 38:  {
   $938 = $opcode;
   $939 = ((($938)) + 1|0);
   $940 = HEAP8[$939>>0]|0;
   $941 = $1;
   $942 = ((($941)) + 5|0);
   HEAP8[$942>>0] = $940;
   $943 = $1;
   $944 = ((($943)) + 10|0);
   $945 = HEAP16[$944>>1]|0;
   $946 = (($945) + 1)<<16>>16;
   HEAP16[$944>>1] = $946;
   break;
  }
  case 39:  {
   $947 = $1;
   $948 = HEAP8[$947>>0]|0;
   $949 = $948&255;
   $res18 = $949;
   $950 = $1;
   $951 = ((($950)) + 12|0);
   $952 = HEAP8[$951>>0]|0;
   $953 = ($952&255) >>> 4;
   $954 = $953 & 1;
   $955 = $954&255;
   $956 = ($955|0)==(1);
   if ($956) {
    label = 47;
   } else {
    $957 = $1;
    $958 = HEAP8[$957>>0]|0;
    $959 = $958&255;
    $960 = $959 & 15;
    $961 = ($960|0)>(9);
    if ($961) {
     label = 47;
    }
   }
   if ((label|0) == 47) {
    $962 = $1;
    $963 = HEAP8[$962>>0]|0;
    $964 = $963&255;
    $965 = (($964) + 6)|0;
    $966 = $965&65535;
    $res18 = $966;
   }
   $967 = $1;
   $968 = $res18;
   _ArithFlagsA($967,$968);
   $969 = $res18;
   $970 = $969&255;
   $971 = $1;
   HEAP8[$971>>0] = $970;
   $972 = $1;
   $973 = ((($972)) + 12|0);
   $974 = HEAP8[$973>>0]|0;
   $975 = ($974&255) >>> 3;
   $976 = $975 & 1;
   $977 = $976&255;
   $978 = ($977|0)==(1);
   if ($978) {
    label = 50;
   } else {
    $979 = $1;
    $980 = HEAP8[$979>>0]|0;
    $981 = $980&255;
    $982 = $981 >> 4;
    $983 = $982 & 15;
    $984 = ($983|0)>(9);
    if ($984) {
     label = 50;
    }
   }
   if ((label|0) == 50) {
    $985 = $1;
    $986 = HEAP8[$985>>0]|0;
    $987 = $986&255;
    $988 = (($987) + 96)|0;
    $989 = $988&65535;
    $res18 = $989;
   }
   $990 = $1;
   $991 = $res18;
   _ArithFlagsA($990,$991);
   $992 = $res18;
   $993 = $992&255;
   $994 = $1;
   HEAP8[$994>>0] = $993;
   break;
  }
  case 40:  {
   $995 = $1;
   _InvalidInstruction($995);
   break;
  }
  case 41:  {
   $996 = $1;
   $997 = ((($996)) + 5|0);
   $998 = HEAP8[$997>>0]|0;
   $999 = $998&255;
   $1000 = $999 << 8;
   $1001 = $1;
   $1002 = ((($1001)) + 6|0);
   $1003 = HEAP8[$1002>>0]|0;
   $1004 = $1003&255;
   $1005 = $1000 | $1004;
   $hl19 = $1005;
   $1006 = $hl19;
   $1007 = $hl19;
   $1008 = (($1006) + ($1007))|0;
   $res20 = $1008;
   $1009 = $res20;
   $1010 = $1009 & 65280;
   $1011 = $1010 >>> 8;
   $1012 = $1011&255;
   $1013 = $1;
   $1014 = ((($1013)) + 5|0);
   HEAP8[$1014>>0] = $1012;
   $1015 = $res20;
   $1016 = $1015 & 255;
   $1017 = $1016&255;
   $1018 = $1;
   $1019 = ((($1018)) + 6|0);
   HEAP8[$1019>>0] = $1017;
   $1020 = $res20;
   $1021 = $1020 & -65536;
   $1022 = ($1021|0)!=(0);
   $1023 = $1022&1;
   $1024 = $1023&255;
   $1025 = $1;
   $1026 = ((($1025)) + 12|0);
   $1027 = HEAP8[$1026>>0]|0;
   $1028 = $1024 & 1;
   $1029 = ($1028 << 3)&255;
   $1030 = $1027 & -9;
   $1031 = $1030 | $1029;
   HEAP8[$1026>>0] = $1031;
   break;
  }
  case 42:  {
   $1032 = $opcode;
   $1033 = ((($1032)) + 2|0);
   $1034 = HEAP8[$1033>>0]|0;
   $1035 = $1034&255;
   $1036 = $1035 << 8;
   $1037 = $opcode;
   $1038 = ((($1037)) + 1|0);
   $1039 = HEAP8[$1038>>0]|0;
   $1040 = $1039&255;
   $1041 = $1036 | $1040;
   $1042 = $1041&65535;
   $offset21 = $1042;
   $1043 = $offset21;
   $1044 = $1043&65535;
   $1045 = $1;
   $1046 = ((($1045)) + 16|0);
   $1047 = HEAP32[$1046>>2]|0;
   $1048 = (($1047) + ($1044)|0);
   $1049 = HEAP8[$1048>>0]|0;
   $l = $1049;
   $1050 = $offset21;
   $1051 = $1050&65535;
   $1052 = (($1051) + 1)|0;
   $1053 = $1;
   $1054 = ((($1053)) + 16|0);
   $1055 = HEAP32[$1054>>2]|0;
   $1056 = (($1055) + ($1052)|0);
   $1057 = HEAP8[$1056>>0]|0;
   $h = $1057;
   $1058 = $h;
   $1059 = $1058&255;
   $1060 = $1059 << 8;
   $1061 = $l;
   $1062 = $1061&255;
   $1063 = $1060 | $1062;
   $1064 = $1063&65535;
   $v = $1064;
   $1065 = $v;
   $1066 = $1065&65535;
   $1067 = $1066 >> 8;
   $1068 = $1067 & 255;
   $1069 = $1068&255;
   $1070 = $1;
   $1071 = ((($1070)) + 5|0);
   HEAP8[$1071>>0] = $1069;
   $1072 = $v;
   $1073 = $1072&65535;
   $1074 = $1073 & 255;
   $1075 = $1074&255;
   $1076 = $1;
   $1077 = ((($1076)) + 6|0);
   HEAP8[$1077>>0] = $1075;
   $1078 = $1;
   $1079 = ((($1078)) + 10|0);
   $1080 = HEAP16[$1079>>1]|0;
   $1081 = $1080&65535;
   $1082 = (($1081) + 2)|0;
   $1083 = $1082&65535;
   HEAP16[$1079>>1] = $1083;
   break;
  }
  case 43:  {
   $1084 = $1;
   $1085 = ((($1084)) + 6|0);
   $1086 = HEAP8[$1085>>0]|0;
   $1087 = (($1086) + -1)<<24>>24;
   HEAP8[$1085>>0] = $1087;
   $1088 = $1;
   $1089 = ((($1088)) + 6|0);
   $1090 = HEAP8[$1089>>0]|0;
   $1091 = $1090&255;
   $1092 = ($1091|0)==(255);
   if ($1092) {
    $1093 = $1;
    $1094 = ((($1093)) + 5|0);
    $1095 = HEAP8[$1094>>0]|0;
    $1096 = (($1095) + -1)<<24>>24;
    HEAP8[$1094>>0] = $1096;
   }
   break;
  }
  case 44:  {
   $1097 = $1;
   $1098 = ((($1097)) + 6|0);
   $1099 = HEAP8[$1098>>0]|0;
   $1100 = $1099&255;
   $1101 = (($1100) + 1)|0;
   $1102 = $1101&255;
   $res22 = $1102;
   $1103 = $res22;
   $1104 = $1103&255;
   $1105 = ($1104|0)==(0);
   $1106 = $1105&1;
   $1107 = $1106&255;
   $1108 = $1;
   $1109 = ((($1108)) + 12|0);
   $1110 = HEAP8[$1109>>0]|0;
   $1111 = $1107 & 1;
   $1112 = $1110 & -2;
   $1113 = $1112 | $1111;
   HEAP8[$1109>>0] = $1113;
   $1114 = $res22;
   $1115 = $1114&255;
   $1116 = $1115 & 128;
   $1117 = (128)==($1116|0);
   $1118 = $1117&1;
   $1119 = $1118&255;
   $1120 = $1;
   $1121 = ((($1120)) + 12|0);
   $1122 = HEAP8[$1121>>0]|0;
   $1123 = $1119 & 1;
   $1124 = ($1123 << 1)&255;
   $1125 = $1122 & -3;
   $1126 = $1125 | $1124;
   HEAP8[$1121>>0] = $1126;
   $1127 = $res22;
   $1128 = $1127&255;
   $1129 = (_parity($1128,8)|0);
   $1130 = $1129&255;
   $1131 = $1;
   $1132 = ((($1131)) + 12|0);
   $1133 = HEAP8[$1132>>0]|0;
   $1134 = $1130 & 1;
   $1135 = ($1134 << 2)&255;
   $1136 = $1133 & -5;
   $1137 = $1136 | $1135;
   HEAP8[$1132>>0] = $1137;
   $1138 = $res22;
   $1139 = $1;
   $1140 = ((($1139)) + 6|0);
   HEAP8[$1140>>0] = $1138;
   break;
  }
  case 45:  {
   $1141 = $1;
   $1142 = ((($1141)) + 6|0);
   $1143 = HEAP8[$1142>>0]|0;
   $1144 = $1143&255;
   $1145 = (($1144) - 1)|0;
   $1146 = $1145&255;
   $res23 = $1146;
   $1147 = $res23;
   $1148 = $1147&255;
   $1149 = ($1148|0)==(0);
   $1150 = $1149&1;
   $1151 = $1150&255;
   $1152 = $1;
   $1153 = ((($1152)) + 12|0);
   $1154 = HEAP8[$1153>>0]|0;
   $1155 = $1151 & 1;
   $1156 = $1154 & -2;
   $1157 = $1156 | $1155;
   HEAP8[$1153>>0] = $1157;
   $1158 = $res23;
   $1159 = $1158&255;
   $1160 = $1159 & 128;
   $1161 = (128)==($1160|0);
   $1162 = $1161&1;
   $1163 = $1162&255;
   $1164 = $1;
   $1165 = ((($1164)) + 12|0);
   $1166 = HEAP8[$1165>>0]|0;
   $1167 = $1163 & 1;
   $1168 = ($1167 << 1)&255;
   $1169 = $1166 & -3;
   $1170 = $1169 | $1168;
   HEAP8[$1165>>0] = $1170;
   $1171 = $res23;
   $1172 = $1171&255;
   $1173 = (_parity($1172,8)|0);
   $1174 = $1173&255;
   $1175 = $1;
   $1176 = ((($1175)) + 12|0);
   $1177 = HEAP8[$1176>>0]|0;
   $1178 = $1174 & 1;
   $1179 = ($1178 << 2)&255;
   $1180 = $1177 & -5;
   $1181 = $1180 | $1179;
   HEAP8[$1176>>0] = $1181;
   $1182 = $res23;
   $1183 = $1;
   $1184 = ((($1183)) + 6|0);
   HEAP8[$1184>>0] = $1182;
   break;
  }
  case 46:  {
   $1185 = $opcode;
   $1186 = ((($1185)) + 1|0);
   $1187 = HEAP8[$1186>>0]|0;
   $1188 = $1;
   $1189 = ((($1188)) + 6|0);
   HEAP8[$1189>>0] = $1187;
   $1190 = $1;
   $1191 = ((($1190)) + 10|0);
   $1192 = HEAP16[$1191>>1]|0;
   $1193 = (($1192) + 1)<<16>>16;
   HEAP16[$1191>>1] = $1193;
   break;
  }
  case 47:  {
   $1194 = $1;
   $1195 = HEAP8[$1194>>0]|0;
   $1196 = $1195&255;
   $1197 = $1196 ^ 255;
   $1198 = $1197&255;
   HEAP8[$1194>>0] = $1198;
   break;
  }
  case 49:  {
   $1199 = $opcode;
   $1200 = ((($1199)) + 2|0);
   $1201 = HEAP8[$1200>>0]|0;
   $1202 = $1201&255;
   $1203 = $1202 << 8;
   $1204 = $opcode;
   $1205 = ((($1204)) + 1|0);
   $1206 = HEAP8[$1205>>0]|0;
   $1207 = $1206&255;
   $1208 = $1203 | $1207;
   $1209 = $1208&65535;
   $1210 = $1;
   $1211 = ((($1210)) + 8|0);
   HEAP16[$1211>>1] = $1209;
   $1212 = $1;
   $1213 = ((($1212)) + 10|0);
   $1214 = HEAP16[$1213>>1]|0;
   $1215 = $1214&65535;
   $1216 = (($1215) + 2)|0;
   $1217 = $1216&65535;
   HEAP16[$1213>>1] = $1217;
   break;
  }
  case 50:  {
   $1218 = $opcode;
   $1219 = ((($1218)) + 2|0);
   $1220 = HEAP8[$1219>>0]|0;
   $1221 = $1220&255;
   $1222 = $1221 << 8;
   $1223 = $opcode;
   $1224 = ((($1223)) + 1|0);
   $1225 = HEAP8[$1224>>0]|0;
   $1226 = $1225&255;
   $1227 = $1222 | $1226;
   $1228 = $1227&65535;
   $offset24 = $1228;
   $1229 = $1;
   $1230 = HEAP8[$1229>>0]|0;
   $1231 = $offset24;
   $1232 = $1231&65535;
   $1233 = $1;
   $1234 = ((($1233)) + 16|0);
   $1235 = HEAP32[$1234>>2]|0;
   $1236 = (($1235) + ($1232)|0);
   HEAP8[$1236>>0] = $1230;
   $1237 = $1;
   $1238 = ((($1237)) + 10|0);
   $1239 = HEAP16[$1238>>1]|0;
   $1240 = $1239&65535;
   $1241 = (($1240) + 2)|0;
   $1242 = $1241&65535;
   HEAP16[$1238>>1] = $1242;
   break;
  }
  case 51:  {
   $1243 = $1;
   $1244 = ((($1243)) + 8|0);
   $1245 = HEAP16[$1244>>1]|0;
   $1246 = (($1245) + 1)<<16>>16;
   HEAP16[$1244>>1] = $1246;
   break;
  }
  case 52:  {
   $1247 = $1;
   $1248 = ((($1247)) + 5|0);
   $1249 = HEAP8[$1248>>0]|0;
   $1250 = $1249&255;
   $1251 = $1250 << 8;
   $1252 = $1;
   $1253 = ((($1252)) + 6|0);
   $1254 = HEAP8[$1253>>0]|0;
   $1255 = $1254&255;
   $1256 = $1251 | $1255;
   $1257 = $1256&65535;
   $offset25 = $1257;
   $1258 = $offset25;
   $1259 = $1258&65535;
   $1260 = $1;
   $1261 = ((($1260)) + 16|0);
   $1262 = HEAP32[$1261>>2]|0;
   $1263 = (($1262) + ($1259)|0);
   $1264 = HEAP8[$1263>>0]|0;
   $1265 = $1264&255;
   $1266 = (($1265) + 1)|0;
   $1267 = $1266&255;
   $res26 = $1267;
   $1268 = $res26;
   $1269 = $1268&255;
   $1270 = ($1269|0)==(0);
   $1271 = $1270&1;
   $1272 = $1271&255;
   $1273 = $1;
   $1274 = ((($1273)) + 12|0);
   $1275 = HEAP8[$1274>>0]|0;
   $1276 = $1272 & 1;
   $1277 = $1275 & -2;
   $1278 = $1277 | $1276;
   HEAP8[$1274>>0] = $1278;
   $1279 = $res26;
   $1280 = $1279&255;
   $1281 = $1280 & 128;
   $1282 = (128)==($1281|0);
   $1283 = $1282&1;
   $1284 = $1283&255;
   $1285 = $1;
   $1286 = ((($1285)) + 12|0);
   $1287 = HEAP8[$1286>>0]|0;
   $1288 = $1284 & 1;
   $1289 = ($1288 << 1)&255;
   $1290 = $1287 & -3;
   $1291 = $1290 | $1289;
   HEAP8[$1286>>0] = $1291;
   $1292 = $res26;
   $1293 = $1292&255;
   $1294 = (_parity($1293,8)|0);
   $1295 = $1294&255;
   $1296 = $1;
   $1297 = ((($1296)) + 12|0);
   $1298 = HEAP8[$1297>>0]|0;
   $1299 = $1295 & 1;
   $1300 = ($1299 << 2)&255;
   $1301 = $1298 & -5;
   $1302 = $1301 | $1300;
   HEAP8[$1297>>0] = $1302;
   $1303 = $res26;
   $1304 = $offset25;
   $1305 = $1304&65535;
   $1306 = $1;
   $1307 = ((($1306)) + 16|0);
   $1308 = HEAP32[$1307>>2]|0;
   $1309 = (($1308) + ($1305)|0);
   HEAP8[$1309>>0] = $1303;
   break;
  }
  case 53:  {
   $1310 = $1;
   $1311 = ((($1310)) + 5|0);
   $1312 = HEAP8[$1311>>0]|0;
   $1313 = $1312&255;
   $1314 = $1313 << 8;
   $1315 = $1;
   $1316 = ((($1315)) + 6|0);
   $1317 = HEAP8[$1316>>0]|0;
   $1318 = $1317&255;
   $1319 = $1314 | $1318;
   $1320 = $1319&65535;
   $offset27 = $1320;
   $1321 = $offset27;
   $1322 = $1321&65535;
   $1323 = $1;
   $1324 = ((($1323)) + 16|0);
   $1325 = HEAP32[$1324>>2]|0;
   $1326 = (($1325) + ($1322)|0);
   $1327 = HEAP8[$1326>>0]|0;
   $1328 = $1327&255;
   $1329 = (($1328) - 1)|0;
   $1330 = $1329&255;
   $res28 = $1330;
   $1331 = $res28;
   $1332 = $1331&255;
   $1333 = ($1332|0)==(0);
   $1334 = $1333&1;
   $1335 = $1334&255;
   $1336 = $1;
   $1337 = ((($1336)) + 12|0);
   $1338 = HEAP8[$1337>>0]|0;
   $1339 = $1335 & 1;
   $1340 = $1338 & -2;
   $1341 = $1340 | $1339;
   HEAP8[$1337>>0] = $1341;
   $1342 = $res28;
   $1343 = $1342&255;
   $1344 = $1343 & 128;
   $1345 = (128)==($1344|0);
   $1346 = $1345&1;
   $1347 = $1346&255;
   $1348 = $1;
   $1349 = ((($1348)) + 12|0);
   $1350 = HEAP8[$1349>>0]|0;
   $1351 = $1347 & 1;
   $1352 = ($1351 << 1)&255;
   $1353 = $1350 & -3;
   $1354 = $1353 | $1352;
   HEAP8[$1349>>0] = $1354;
   $1355 = $res28;
   $1356 = $1355&255;
   $1357 = (_parity($1356,8)|0);
   $1358 = $1357&255;
   $1359 = $1;
   $1360 = ((($1359)) + 12|0);
   $1361 = HEAP8[$1360>>0]|0;
   $1362 = $1358 & 1;
   $1363 = ($1362 << 2)&255;
   $1364 = $1361 & -5;
   $1365 = $1364 | $1363;
   HEAP8[$1360>>0] = $1365;
   $1366 = $res28;
   $1367 = $offset27;
   $1368 = $1367&65535;
   $1369 = $1;
   $1370 = ((($1369)) + 16|0);
   $1371 = HEAP32[$1370>>2]|0;
   $1372 = (($1371) + ($1368)|0);
   HEAP8[$1372>>0] = $1366;
   break;
  }
  case 54:  {
   $1373 = $1;
   $1374 = ((($1373)) + 5|0);
   $1375 = HEAP8[$1374>>0]|0;
   $1376 = $1375&255;
   $1377 = $1376 << 8;
   $1378 = $1;
   $1379 = ((($1378)) + 6|0);
   $1380 = HEAP8[$1379>>0]|0;
   $1381 = $1380&255;
   $1382 = $1377 | $1381;
   $1383 = $1382&65535;
   $offset29 = $1383;
   $1384 = $opcode;
   $1385 = ((($1384)) + 1|0);
   $1386 = HEAP8[$1385>>0]|0;
   $1387 = $offset29;
   $1388 = $1387&65535;
   $1389 = $1;
   $1390 = ((($1389)) + 16|0);
   $1391 = HEAP32[$1390>>2]|0;
   $1392 = (($1391) + ($1388)|0);
   HEAP8[$1392>>0] = $1386;
   $1393 = $1;
   $1394 = ((($1393)) + 10|0);
   $1395 = HEAP16[$1394>>1]|0;
   $1396 = (($1395) + 1)<<16>>16;
   HEAP16[$1394>>1] = $1396;
   break;
  }
  case 55:  {
   $1397 = $1;
   $1398 = ((($1397)) + 12|0);
   $1399 = HEAP8[$1398>>0]|0;
   $1400 = $1399 & -9;
   $1401 = $1400 | 8;
   HEAP8[$1398>>0] = $1401;
   break;
  }
  case 56:  {
   $1402 = $1;
   _InvalidInstruction($1402);
   break;
  }
  case 57:  {
   $1403 = $1;
   $1404 = ((($1403)) + 5|0);
   $1405 = HEAP8[$1404>>0]|0;
   $1406 = $1405&255;
   $1407 = $1406 << 8;
   $1408 = $1;
   $1409 = ((($1408)) + 6|0);
   $1410 = HEAP8[$1409>>0]|0;
   $1411 = $1410&255;
   $1412 = $1407 | $1411;
   $1413 = $1412&65535;
   $hl30 = $1413;
   $1414 = $1;
   $1415 = ((($1414)) + 8|0);
   $1416 = HEAP16[$1415>>1]|0;
   $sp = $1416;
   $1417 = $hl30;
   $1418 = $1417&65535;
   $1419 = $sp;
   $1420 = $1419&65535;
   $1421 = (($1418) + ($1420))|0;
   $res31 = $1421;
   $1422 = $res31;
   $1423 = $1422 & 65280;
   $1424 = $1423 >>> 8;
   $1425 = $1424&255;
   $1426 = $1;
   $1427 = ((($1426)) + 5|0);
   HEAP8[$1427>>0] = $1425;
   $1428 = $res31;
   $1429 = $1428 & 255;
   $1430 = $1429&255;
   $1431 = $1;
   $1432 = ((($1431)) + 6|0);
   HEAP8[$1432>>0] = $1430;
   $1433 = $res31;
   $1434 = $1433 & -65536;
   $1435 = ($1434>>>0)>(0);
   $1436 = $1435&1;
   $1437 = $1436&255;
   $1438 = $1;
   $1439 = ((($1438)) + 12|0);
   $1440 = HEAP8[$1439>>0]|0;
   $1441 = $1437 & 1;
   $1442 = ($1441 << 3)&255;
   $1443 = $1440 & -9;
   $1444 = $1443 | $1442;
   HEAP8[$1439>>0] = $1444;
   break;
  }
  case 58:  {
   $1445 = $opcode;
   $1446 = ((($1445)) + 2|0);
   $1447 = HEAP8[$1446>>0]|0;
   $1448 = $1447&255;
   $1449 = $1448 << 8;
   $1450 = $opcode;
   $1451 = ((($1450)) + 1|0);
   $1452 = HEAP8[$1451>>0]|0;
   $1453 = $1452&255;
   $1454 = $1449 | $1453;
   $1455 = $1454&65535;
   $offset32 = $1455;
   $1456 = $offset32;
   $1457 = $1456&65535;
   $1458 = $1;
   $1459 = ((($1458)) + 16|0);
   $1460 = HEAP32[$1459>>2]|0;
   $1461 = (($1460) + ($1457)|0);
   $1462 = HEAP8[$1461>>0]|0;
   $1463 = $1;
   HEAP8[$1463>>0] = $1462;
   $1464 = $1;
   $1465 = ((($1464)) + 10|0);
   $1466 = HEAP16[$1465>>1]|0;
   $1467 = $1466&65535;
   $1468 = (($1467) + 2)|0;
   $1469 = $1468&65535;
   HEAP16[$1465>>1] = $1469;
   break;
  }
  case 59:  {
   $1470 = $1;
   $1471 = ((($1470)) + 8|0);
   $1472 = HEAP16[$1471>>1]|0;
   $1473 = (($1472) + -1)<<16>>16;
   HEAP16[$1471>>1] = $1473;
   break;
  }
  case 60:  {
   (_printf(2805,$vararg_buffer4)|0);
   $1474 = $1;
   $1475 = HEAP8[$1474>>0]|0;
   $1476 = $1475&255;
   $1477 = (($1476) + 1)|0;
   $1478 = $1477&255;
   $res33 = $1478;
   $1479 = $res33;
   $1480 = $1479&255;
   $1481 = ($1480|0)==(0);
   $1482 = $1481&1;
   $1483 = $1482&255;
   $1484 = $1;
   $1485 = ((($1484)) + 12|0);
   $1486 = HEAP8[$1485>>0]|0;
   $1487 = $1483 & 1;
   $1488 = $1486 & -2;
   $1489 = $1488 | $1487;
   HEAP8[$1485>>0] = $1489;
   $1490 = $res33;
   $1491 = $1490&255;
   $1492 = $1491 & 128;
   $1493 = (128)==($1492|0);
   $1494 = $1493&1;
   $1495 = $1494&255;
   $1496 = $1;
   $1497 = ((($1496)) + 12|0);
   $1498 = HEAP8[$1497>>0]|0;
   $1499 = $1495 & 1;
   $1500 = ($1499 << 1)&255;
   $1501 = $1498 & -3;
   $1502 = $1501 | $1500;
   HEAP8[$1497>>0] = $1502;
   $1503 = $res33;
   $1504 = $1503&255;
   $1505 = (_parity($1504,8)|0);
   $1506 = $1505&255;
   $1507 = $1;
   $1508 = ((($1507)) + 12|0);
   $1509 = HEAP8[$1508>>0]|0;
   $1510 = $1506 & 1;
   $1511 = ($1510 << 2)&255;
   $1512 = $1509 & -5;
   $1513 = $1512 | $1511;
   HEAP8[$1508>>0] = $1513;
   $1514 = $res33;
   $1515 = $1;
   HEAP8[$1515>>0] = $1514;
   break;
  }
  case 61:  {
   $1516 = $1;
   $1517 = HEAP8[$1516>>0]|0;
   $1518 = $1517&255;
   $1519 = (($1518) - 1)|0;
   $1520 = $1519&255;
   $res34 = $1520;
   $1521 = $res34;
   $1522 = $1521&255;
   $1523 = ($1522|0)==(0);
   $1524 = $1523&1;
   $1525 = $1524&255;
   $1526 = $1;
   $1527 = ((($1526)) + 12|0);
   $1528 = HEAP8[$1527>>0]|0;
   $1529 = $1525 & 1;
   $1530 = $1528 & -2;
   $1531 = $1530 | $1529;
   HEAP8[$1527>>0] = $1531;
   $1532 = $res34;
   $1533 = $1532&255;
   $1534 = $1533 & 128;
   $1535 = (128)==($1534|0);
   $1536 = $1535&1;
   $1537 = $1536&255;
   $1538 = $1;
   $1539 = ((($1538)) + 12|0);
   $1540 = HEAP8[$1539>>0]|0;
   $1541 = $1537 & 1;
   $1542 = ($1541 << 1)&255;
   $1543 = $1540 & -3;
   $1544 = $1543 | $1542;
   HEAP8[$1539>>0] = $1544;
   $1545 = $res34;
   $1546 = $1545&255;
   $1547 = (_parity($1546,8)|0);
   $1548 = $1547&255;
   $1549 = $1;
   $1550 = ((($1549)) + 12|0);
   $1551 = HEAP8[$1550>>0]|0;
   $1552 = $1548 & 1;
   $1553 = ($1552 << 2)&255;
   $1554 = $1551 & -5;
   $1555 = $1554 | $1553;
   HEAP8[$1550>>0] = $1555;
   $1556 = $res34;
   $1557 = $1;
   HEAP8[$1557>>0] = $1556;
   break;
  }
  case 62:  {
   $1558 = $opcode;
   $1559 = ((($1558)) + 1|0);
   $1560 = HEAP8[$1559>>0]|0;
   $1561 = $1;
   HEAP8[$1561>>0] = $1560;
   $1562 = $1;
   $1563 = ((($1562)) + 10|0);
   $1564 = HEAP16[$1563>>1]|0;
   $1565 = (($1564) + 1)<<16>>16;
   HEAP16[$1563>>1] = $1565;
   break;
  }
  case 63:  {
   $1566 = $1;
   $1567 = ((($1566)) + 12|0);
   $1568 = HEAP8[$1567>>0]|0;
   $1569 = ($1568&255) >>> 3;
   $1570 = $1569 & 1;
   $1571 = $1570&255;
   $1572 = (0)==($1571|0);
   $1573 = $1;
   $1574 = ((($1573)) + 12|0);
   $1575 = HEAP8[$1574>>0]|0;
   $1576 = $1575 & -9;
   if ($1572) {
    $1577 = $1576 | 8;
    HEAP8[$1574>>0] = $1577;
    break L1;
   } else {
    HEAP8[$1574>>0] = $1576;
    break L1;
   }
   break;
  }
  case 64:  {
   $1578 = $1;
   $1579 = ((($1578)) + 1|0);
   $1580 = HEAP8[$1579>>0]|0;
   $1581 = $1;
   $1582 = ((($1581)) + 1|0);
   HEAP8[$1582>>0] = $1580;
   break;
  }
  case 65:  {
   $1583 = $1;
   $1584 = ((($1583)) + 2|0);
   $1585 = HEAP8[$1584>>0]|0;
   $1586 = $1;
   $1587 = ((($1586)) + 1|0);
   HEAP8[$1587>>0] = $1585;
   break;
  }
  case 66:  {
   $1588 = $1;
   $1589 = ((($1588)) + 3|0);
   $1590 = HEAP8[$1589>>0]|0;
   $1591 = $1;
   $1592 = ((($1591)) + 1|0);
   HEAP8[$1592>>0] = $1590;
   break;
  }
  case 67:  {
   $1593 = $1;
   $1594 = ((($1593)) + 4|0);
   $1595 = HEAP8[$1594>>0]|0;
   $1596 = $1;
   $1597 = ((($1596)) + 1|0);
   HEAP8[$1597>>0] = $1595;
   break;
  }
  case 68:  {
   $1598 = $1;
   $1599 = ((($1598)) + 5|0);
   $1600 = HEAP8[$1599>>0]|0;
   $1601 = $1;
   $1602 = ((($1601)) + 1|0);
   HEAP8[$1602>>0] = $1600;
   break;
  }
  case 69:  {
   $1603 = $1;
   $1604 = ((($1603)) + 6|0);
   $1605 = HEAP8[$1604>>0]|0;
   $1606 = $1;
   $1607 = ((($1606)) + 1|0);
   HEAP8[$1607>>0] = $1605;
   break;
  }
  case 70:  {
   $1608 = $1;
   $1609 = ((($1608)) + 5|0);
   $1610 = HEAP8[$1609>>0]|0;
   $1611 = $1610&255;
   $1612 = $1611 << 8;
   $1613 = $1;
   $1614 = ((($1613)) + 6|0);
   $1615 = HEAP8[$1614>>0]|0;
   $1616 = $1615&255;
   $1617 = $1612 | $1616;
   $1618 = $1617&65535;
   $offset35 = $1618;
   $1619 = $offset35;
   $1620 = $1619&65535;
   $1621 = $1;
   $1622 = ((($1621)) + 16|0);
   $1623 = HEAP32[$1622>>2]|0;
   $1624 = (($1623) + ($1620)|0);
   $1625 = HEAP8[$1624>>0]|0;
   $1626 = $1;
   $1627 = ((($1626)) + 1|0);
   HEAP8[$1627>>0] = $1625;
   break;
  }
  case 71:  {
   $1628 = $1;
   $1629 = HEAP8[$1628>>0]|0;
   $1630 = $1;
   $1631 = ((($1630)) + 1|0);
   HEAP8[$1631>>0] = $1629;
   break;
  }
  case 72:  {
   $1632 = $1;
   $1633 = ((($1632)) + 1|0);
   $1634 = HEAP8[$1633>>0]|0;
   $1635 = $1;
   $1636 = ((($1635)) + 2|0);
   HEAP8[$1636>>0] = $1634;
   break;
  }
  case 73:  {
   $1637 = $1;
   $1638 = ((($1637)) + 2|0);
   $1639 = HEAP8[$1638>>0]|0;
   $1640 = $1;
   $1641 = ((($1640)) + 2|0);
   HEAP8[$1641>>0] = $1639;
   break;
  }
  case 74:  {
   $1642 = $1;
   $1643 = ((($1642)) + 3|0);
   $1644 = HEAP8[$1643>>0]|0;
   $1645 = $1;
   $1646 = ((($1645)) + 2|0);
   HEAP8[$1646>>0] = $1644;
   break;
  }
  case 75:  {
   $1647 = $1;
   $1648 = ((($1647)) + 4|0);
   $1649 = HEAP8[$1648>>0]|0;
   $1650 = $1;
   $1651 = ((($1650)) + 2|0);
   HEAP8[$1651>>0] = $1649;
   break;
  }
  case 76:  {
   $1652 = $1;
   $1653 = ((($1652)) + 5|0);
   $1654 = HEAP8[$1653>>0]|0;
   $1655 = $1;
   $1656 = ((($1655)) + 2|0);
   HEAP8[$1656>>0] = $1654;
   break;
  }
  case 77:  {
   $1657 = $1;
   $1658 = ((($1657)) + 6|0);
   $1659 = HEAP8[$1658>>0]|0;
   $1660 = $1;
   $1661 = ((($1660)) + 2|0);
   HEAP8[$1661>>0] = $1659;
   break;
  }
  case 78:  {
   $1662 = $1;
   $1663 = ((($1662)) + 5|0);
   $1664 = HEAP8[$1663>>0]|0;
   $1665 = $1664&255;
   $1666 = $1665 << 8;
   $1667 = $1;
   $1668 = ((($1667)) + 6|0);
   $1669 = HEAP8[$1668>>0]|0;
   $1670 = $1669&255;
   $1671 = $1666 | $1670;
   $1672 = $1671&65535;
   $offset36 = $1672;
   $1673 = $offset36;
   $1674 = $1673&65535;
   $1675 = $1;
   $1676 = ((($1675)) + 16|0);
   $1677 = HEAP32[$1676>>2]|0;
   $1678 = (($1677) + ($1674)|0);
   $1679 = HEAP8[$1678>>0]|0;
   $1680 = $1;
   $1681 = ((($1680)) + 2|0);
   HEAP8[$1681>>0] = $1679;
   break;
  }
  case 79:  {
   $1682 = $1;
   $1683 = HEAP8[$1682>>0]|0;
   $1684 = $1;
   $1685 = ((($1684)) + 2|0);
   HEAP8[$1685>>0] = $1683;
   break;
  }
  case 80:  {
   $1686 = $1;
   $1687 = ((($1686)) + 1|0);
   $1688 = HEAP8[$1687>>0]|0;
   $1689 = $1;
   $1690 = ((($1689)) + 3|0);
   HEAP8[$1690>>0] = $1688;
   break;
  }
  case 81:  {
   $1691 = $1;
   $1692 = ((($1691)) + 2|0);
   $1693 = HEAP8[$1692>>0]|0;
   $1694 = $1;
   $1695 = ((($1694)) + 3|0);
   HEAP8[$1695>>0] = $1693;
   break;
  }
  case 82:  {
   $1696 = $1;
   $1697 = ((($1696)) + 3|0);
   $1698 = HEAP8[$1697>>0]|0;
   $1699 = $1;
   $1700 = ((($1699)) + 3|0);
   HEAP8[$1700>>0] = $1698;
   break;
  }
  case 83:  {
   $1701 = $1;
   $1702 = ((($1701)) + 4|0);
   $1703 = HEAP8[$1702>>0]|0;
   $1704 = $1;
   $1705 = ((($1704)) + 3|0);
   HEAP8[$1705>>0] = $1703;
   break;
  }
  case 84:  {
   $1706 = $1;
   $1707 = ((($1706)) + 5|0);
   $1708 = HEAP8[$1707>>0]|0;
   $1709 = $1;
   $1710 = ((($1709)) + 3|0);
   HEAP8[$1710>>0] = $1708;
   break;
  }
  case 85:  {
   $1711 = $1;
   $1712 = ((($1711)) + 6|0);
   $1713 = HEAP8[$1712>>0]|0;
   $1714 = $1;
   $1715 = ((($1714)) + 3|0);
   HEAP8[$1715>>0] = $1713;
   break;
  }
  case 86:  {
   $1716 = $1;
   $1717 = ((($1716)) + 5|0);
   $1718 = HEAP8[$1717>>0]|0;
   $1719 = $1718&255;
   $1720 = $1719 << 8;
   $1721 = $1;
   $1722 = ((($1721)) + 6|0);
   $1723 = HEAP8[$1722>>0]|0;
   $1724 = $1723&255;
   $1725 = $1720 | $1724;
   $1726 = $1725&65535;
   $offset37 = $1726;
   $1727 = $offset37;
   $1728 = $1727&65535;
   $1729 = $1;
   $1730 = ((($1729)) + 16|0);
   $1731 = HEAP32[$1730>>2]|0;
   $1732 = (($1731) + ($1728)|0);
   $1733 = HEAP8[$1732>>0]|0;
   $1734 = $1;
   $1735 = ((($1734)) + 3|0);
   HEAP8[$1735>>0] = $1733;
   break;
  }
  case 87:  {
   $1736 = $1;
   $1737 = HEAP8[$1736>>0]|0;
   $1738 = $1;
   $1739 = ((($1738)) + 3|0);
   HEAP8[$1739>>0] = $1737;
   break;
  }
  case 88:  {
   $1740 = $1;
   $1741 = ((($1740)) + 1|0);
   $1742 = HEAP8[$1741>>0]|0;
   $1743 = $1;
   $1744 = ((($1743)) + 4|0);
   HEAP8[$1744>>0] = $1742;
   break;
  }
  case 89:  {
   $1745 = $1;
   $1746 = ((($1745)) + 2|0);
   $1747 = HEAP8[$1746>>0]|0;
   $1748 = $1;
   $1749 = ((($1748)) + 4|0);
   HEAP8[$1749>>0] = $1747;
   break;
  }
  case 90:  {
   $1750 = $1;
   $1751 = ((($1750)) + 3|0);
   $1752 = HEAP8[$1751>>0]|0;
   $1753 = $1;
   $1754 = ((($1753)) + 4|0);
   HEAP8[$1754>>0] = $1752;
   break;
  }
  case 91:  {
   $1755 = $1;
   $1756 = ((($1755)) + 4|0);
   $1757 = HEAP8[$1756>>0]|0;
   $1758 = $1;
   $1759 = ((($1758)) + 4|0);
   HEAP8[$1759>>0] = $1757;
   break;
  }
  case 92:  {
   $1760 = $1;
   $1761 = ((($1760)) + 5|0);
   $1762 = HEAP8[$1761>>0]|0;
   $1763 = $1;
   $1764 = ((($1763)) + 4|0);
   HEAP8[$1764>>0] = $1762;
   break;
  }
  case 93:  {
   $1765 = $1;
   $1766 = ((($1765)) + 6|0);
   $1767 = HEAP8[$1766>>0]|0;
   $1768 = $1;
   $1769 = ((($1768)) + 4|0);
   HEAP8[$1769>>0] = $1767;
   break;
  }
  case 94:  {
   $1770 = $1;
   $1771 = ((($1770)) + 5|0);
   $1772 = HEAP8[$1771>>0]|0;
   $1773 = $1772&255;
   $1774 = $1773 << 8;
   $1775 = $1;
   $1776 = ((($1775)) + 6|0);
   $1777 = HEAP8[$1776>>0]|0;
   $1778 = $1777&255;
   $1779 = $1774 | $1778;
   $1780 = $1779&65535;
   $offset38 = $1780;
   $1781 = $offset38;
   $1782 = $1781&65535;
   $1783 = $1;
   $1784 = ((($1783)) + 16|0);
   $1785 = HEAP32[$1784>>2]|0;
   $1786 = (($1785) + ($1782)|0);
   $1787 = HEAP8[$1786>>0]|0;
   $1788 = $1;
   $1789 = ((($1788)) + 4|0);
   HEAP8[$1789>>0] = $1787;
   break;
  }
  case 95:  {
   $1790 = $1;
   $1791 = HEAP8[$1790>>0]|0;
   $1792 = $1;
   $1793 = ((($1792)) + 4|0);
   HEAP8[$1793>>0] = $1791;
   break;
  }
  case 96:  {
   $1794 = $1;
   $1795 = ((($1794)) + 1|0);
   $1796 = HEAP8[$1795>>0]|0;
   $1797 = $1;
   $1798 = ((($1797)) + 5|0);
   HEAP8[$1798>>0] = $1796;
   break;
  }
  case 97:  {
   $1799 = $1;
   $1800 = ((($1799)) + 2|0);
   $1801 = HEAP8[$1800>>0]|0;
   $1802 = $1;
   $1803 = ((($1802)) + 5|0);
   HEAP8[$1803>>0] = $1801;
   break;
  }
  case 98:  {
   $1804 = $1;
   $1805 = ((($1804)) + 3|0);
   $1806 = HEAP8[$1805>>0]|0;
   $1807 = $1;
   $1808 = ((($1807)) + 5|0);
   HEAP8[$1808>>0] = $1806;
   break;
  }
  case 99:  {
   $1809 = $1;
   $1810 = ((($1809)) + 4|0);
   $1811 = HEAP8[$1810>>0]|0;
   $1812 = $1;
   $1813 = ((($1812)) + 5|0);
   HEAP8[$1813>>0] = $1811;
   break;
  }
  case 100:  {
   $1814 = $1;
   $1815 = ((($1814)) + 5|0);
   $1816 = HEAP8[$1815>>0]|0;
   $1817 = $1;
   $1818 = ((($1817)) + 5|0);
   HEAP8[$1818>>0] = $1816;
   break;
  }
  case 101:  {
   $1819 = $1;
   $1820 = ((($1819)) + 6|0);
   $1821 = HEAP8[$1820>>0]|0;
   $1822 = $1;
   $1823 = ((($1822)) + 5|0);
   HEAP8[$1823>>0] = $1821;
   break;
  }
  case 102:  {
   $1824 = $1;
   $1825 = ((($1824)) + 5|0);
   $1826 = HEAP8[$1825>>0]|0;
   $1827 = $1826&255;
   $1828 = $1827 << 8;
   $1829 = $1;
   $1830 = ((($1829)) + 6|0);
   $1831 = HEAP8[$1830>>0]|0;
   $1832 = $1831&255;
   $1833 = $1828 | $1832;
   $1834 = $1833&65535;
   $offset39 = $1834;
   $1835 = $offset39;
   $1836 = $1835&65535;
   $1837 = $1;
   $1838 = ((($1837)) + 16|0);
   $1839 = HEAP32[$1838>>2]|0;
   $1840 = (($1839) + ($1836)|0);
   $1841 = HEAP8[$1840>>0]|0;
   $1842 = $1;
   $1843 = ((($1842)) + 5|0);
   HEAP8[$1843>>0] = $1841;
   break;
  }
  case 103:  {
   $1844 = $1;
   $1845 = HEAP8[$1844>>0]|0;
   $1846 = $1;
   $1847 = ((($1846)) + 5|0);
   HEAP8[$1847>>0] = $1845;
   break;
  }
  case 104:  {
   $1848 = $1;
   $1849 = ((($1848)) + 1|0);
   $1850 = HEAP8[$1849>>0]|0;
   $1851 = $1;
   $1852 = ((($1851)) + 6|0);
   HEAP8[$1852>>0] = $1850;
   break;
  }
  case 105:  {
   $1853 = $1;
   $1854 = ((($1853)) + 2|0);
   $1855 = HEAP8[$1854>>0]|0;
   $1856 = $1;
   $1857 = ((($1856)) + 6|0);
   HEAP8[$1857>>0] = $1855;
   break;
  }
  case 106:  {
   $1858 = $1;
   $1859 = ((($1858)) + 3|0);
   $1860 = HEAP8[$1859>>0]|0;
   $1861 = $1;
   $1862 = ((($1861)) + 6|0);
   HEAP8[$1862>>0] = $1860;
   break;
  }
  case 107:  {
   $1863 = $1;
   $1864 = ((($1863)) + 4|0);
   $1865 = HEAP8[$1864>>0]|0;
   $1866 = $1;
   $1867 = ((($1866)) + 6|0);
   HEAP8[$1867>>0] = $1865;
   break;
  }
  case 108:  {
   $1868 = $1;
   $1869 = ((($1868)) + 5|0);
   $1870 = HEAP8[$1869>>0]|0;
   $1871 = $1;
   $1872 = ((($1871)) + 6|0);
   HEAP8[$1872>>0] = $1870;
   break;
  }
  case 109:  {
   $1873 = $1;
   $1874 = ((($1873)) + 6|0);
   $1875 = HEAP8[$1874>>0]|0;
   $1876 = $1;
   $1877 = ((($1876)) + 6|0);
   HEAP8[$1877>>0] = $1875;
   break;
  }
  case 110:  {
   $1878 = $1;
   $1879 = ((($1878)) + 5|0);
   $1880 = HEAP8[$1879>>0]|0;
   $1881 = $1880&255;
   $1882 = $1881 << 8;
   $1883 = $1;
   $1884 = ((($1883)) + 6|0);
   $1885 = HEAP8[$1884>>0]|0;
   $1886 = $1885&255;
   $1887 = $1882 | $1886;
   $1888 = $1887&65535;
   $offset40 = $1888;
   $1889 = $offset40;
   $1890 = $1889&65535;
   $1891 = $1;
   $1892 = ((($1891)) + 16|0);
   $1893 = HEAP32[$1892>>2]|0;
   $1894 = (($1893) + ($1890)|0);
   $1895 = HEAP8[$1894>>0]|0;
   $1896 = $1;
   $1897 = ((($1896)) + 6|0);
   HEAP8[$1897>>0] = $1895;
   break;
  }
  case 111:  {
   $1898 = $1;
   $1899 = HEAP8[$1898>>0]|0;
   $1900 = $1;
   $1901 = ((($1900)) + 6|0);
   HEAP8[$1901>>0] = $1899;
   break;
  }
  case 112:  {
   $1902 = $1;
   $1903 = ((($1902)) + 5|0);
   $1904 = HEAP8[$1903>>0]|0;
   $1905 = $1904&255;
   $1906 = $1905 << 8;
   $1907 = $1;
   $1908 = ((($1907)) + 6|0);
   $1909 = HEAP8[$1908>>0]|0;
   $1910 = $1909&255;
   $1911 = $1906 | $1910;
   $1912 = $1911&65535;
   $offset41 = $1912;
   $1913 = $1;
   $1914 = ((($1913)) + 1|0);
   $1915 = HEAP8[$1914>>0]|0;
   $1916 = $offset41;
   $1917 = $1916&65535;
   $1918 = $1;
   $1919 = ((($1918)) + 16|0);
   $1920 = HEAP32[$1919>>2]|0;
   $1921 = (($1920) + ($1917)|0);
   HEAP8[$1921>>0] = $1915;
   break;
  }
  case 113:  {
   $1922 = $1;
   $1923 = ((($1922)) + 5|0);
   $1924 = HEAP8[$1923>>0]|0;
   $1925 = $1924&255;
   $1926 = $1925 << 8;
   $1927 = $1;
   $1928 = ((($1927)) + 6|0);
   $1929 = HEAP8[$1928>>0]|0;
   $1930 = $1929&255;
   $1931 = $1926 | $1930;
   $1932 = $1931&65535;
   $offset42 = $1932;
   $1933 = $1;
   $1934 = ((($1933)) + 2|0);
   $1935 = HEAP8[$1934>>0]|0;
   $1936 = $offset42;
   $1937 = $1936&65535;
   $1938 = $1;
   $1939 = ((($1938)) + 16|0);
   $1940 = HEAP32[$1939>>2]|0;
   $1941 = (($1940) + ($1937)|0);
   HEAP8[$1941>>0] = $1935;
   break;
  }
  case 114:  {
   $1942 = $1;
   $1943 = ((($1942)) + 5|0);
   $1944 = HEAP8[$1943>>0]|0;
   $1945 = $1944&255;
   $1946 = $1945 << 8;
   $1947 = $1;
   $1948 = ((($1947)) + 6|0);
   $1949 = HEAP8[$1948>>0]|0;
   $1950 = $1949&255;
   $1951 = $1946 | $1950;
   $1952 = $1951&65535;
   $offset43 = $1952;
   $1953 = $1;
   $1954 = ((($1953)) + 3|0);
   $1955 = HEAP8[$1954>>0]|0;
   $1956 = $offset43;
   $1957 = $1956&65535;
   $1958 = $1;
   $1959 = ((($1958)) + 16|0);
   $1960 = HEAP32[$1959>>2]|0;
   $1961 = (($1960) + ($1957)|0);
   HEAP8[$1961>>0] = $1955;
   break;
  }
  case 115:  {
   $1962 = $1;
   $1963 = ((($1962)) + 5|0);
   $1964 = HEAP8[$1963>>0]|0;
   $1965 = $1964&255;
   $1966 = $1965 << 8;
   $1967 = $1;
   $1968 = ((($1967)) + 6|0);
   $1969 = HEAP8[$1968>>0]|0;
   $1970 = $1969&255;
   $1971 = $1966 | $1970;
   $1972 = $1971&65535;
   $offset44 = $1972;
   $1973 = $1;
   $1974 = ((($1973)) + 4|0);
   $1975 = HEAP8[$1974>>0]|0;
   $1976 = $offset44;
   $1977 = $1976&65535;
   $1978 = $1;
   $1979 = ((($1978)) + 16|0);
   $1980 = HEAP32[$1979>>2]|0;
   $1981 = (($1980) + ($1977)|0);
   HEAP8[$1981>>0] = $1975;
   break;
  }
  case 116:  {
   $1982 = $1;
   $1983 = ((($1982)) + 5|0);
   $1984 = HEAP8[$1983>>0]|0;
   $1985 = $1984&255;
   $1986 = $1985 << 8;
   $1987 = $1;
   $1988 = ((($1987)) + 6|0);
   $1989 = HEAP8[$1988>>0]|0;
   $1990 = $1989&255;
   $1991 = $1986 | $1990;
   $1992 = $1991&65535;
   $offset45 = $1992;
   $1993 = $1;
   $1994 = ((($1993)) + 5|0);
   $1995 = HEAP8[$1994>>0]|0;
   $1996 = $offset45;
   $1997 = $1996&65535;
   $1998 = $1;
   $1999 = ((($1998)) + 16|0);
   $2000 = HEAP32[$1999>>2]|0;
   $2001 = (($2000) + ($1997)|0);
   HEAP8[$2001>>0] = $1995;
   break;
  }
  case 117:  {
   $2002 = $1;
   $2003 = ((($2002)) + 5|0);
   $2004 = HEAP8[$2003>>0]|0;
   $2005 = $2004&255;
   $2006 = $2005 << 8;
   $2007 = $1;
   $2008 = ((($2007)) + 6|0);
   $2009 = HEAP8[$2008>>0]|0;
   $2010 = $2009&255;
   $2011 = $2006 | $2010;
   $2012 = $2011&65535;
   $offset46 = $2012;
   $2013 = $1;
   $2014 = ((($2013)) + 6|0);
   $2015 = HEAP8[$2014>>0]|0;
   $2016 = $offset46;
   $2017 = $2016&65535;
   $2018 = $1;
   $2019 = ((($2018)) + 16|0);
   $2020 = HEAP32[$2019>>2]|0;
   $2021 = (($2020) + ($2017)|0);
   HEAP8[$2021>>0] = $2015;
   break;
  }
  case 118:  {
   $0 = 1;
   $4095 = $0;
   STACKTOP = sp;return ($4095|0);
   break;
  }
  case 119:  {
   $2022 = $1;
   $2023 = ((($2022)) + 5|0);
   $2024 = HEAP8[$2023>>0]|0;
   $2025 = $2024&255;
   $2026 = $2025 << 8;
   $2027 = $1;
   $2028 = ((($2027)) + 6|0);
   $2029 = HEAP8[$2028>>0]|0;
   $2030 = $2029&255;
   $2031 = $2026 | $2030;
   $2032 = $2031&65535;
   $offset47 = $2032;
   $2033 = $1;
   $2034 = HEAP8[$2033>>0]|0;
   $2035 = $offset47;
   $2036 = $2035&65535;
   $2037 = $1;
   $2038 = ((($2037)) + 16|0);
   $2039 = HEAP32[$2038>>2]|0;
   $2040 = (($2039) + ($2036)|0);
   HEAP8[$2040>>0] = $2034;
   break;
  }
  case 120:  {
   $2041 = $1;
   $2042 = ((($2041)) + 1|0);
   $2043 = HEAP8[$2042>>0]|0;
   $2044 = $1;
   HEAP8[$2044>>0] = $2043;
   break;
  }
  case 121:  {
   $2045 = $1;
   $2046 = ((($2045)) + 2|0);
   $2047 = HEAP8[$2046>>0]|0;
   $2048 = $1;
   HEAP8[$2048>>0] = $2047;
   break;
  }
  case 122:  {
   $2049 = $1;
   $2050 = ((($2049)) + 3|0);
   $2051 = HEAP8[$2050>>0]|0;
   $2052 = $1;
   HEAP8[$2052>>0] = $2051;
   break;
  }
  case 123:  {
   $2053 = $1;
   $2054 = ((($2053)) + 4|0);
   $2055 = HEAP8[$2054>>0]|0;
   $2056 = $1;
   HEAP8[$2056>>0] = $2055;
   break;
  }
  case 124:  {
   $2057 = $1;
   $2058 = ((($2057)) + 5|0);
   $2059 = HEAP8[$2058>>0]|0;
   $2060 = $1;
   HEAP8[$2060>>0] = $2059;
   break;
  }
  case 125:  {
   $2061 = $1;
   $2062 = ((($2061)) + 6|0);
   $2063 = HEAP8[$2062>>0]|0;
   $2064 = $1;
   HEAP8[$2064>>0] = $2063;
   break;
  }
  case 126:  {
   $2065 = $1;
   $2066 = ((($2065)) + 5|0);
   $2067 = HEAP8[$2066>>0]|0;
   $2068 = $2067&255;
   $2069 = $2068 << 8;
   $2070 = $1;
   $2071 = ((($2070)) + 6|0);
   $2072 = HEAP8[$2071>>0]|0;
   $2073 = $2072&255;
   $2074 = $2069 | $2073;
   $2075 = $2074&65535;
   $offset48 = $2075;
   $2076 = $offset48;
   $2077 = $2076&65535;
   $2078 = $1;
   $2079 = ((($2078)) + 16|0);
   $2080 = HEAP32[$2079>>2]|0;
   $2081 = (($2080) + ($2077)|0);
   $2082 = HEAP8[$2081>>0]|0;
   $2083 = $1;
   HEAP8[$2083>>0] = $2082;
   break;
  }
  case 127:  {
   $2084 = $1;
   $2085 = HEAP8[$2084>>0]|0;
   $2086 = $1;
   HEAP8[$2086>>0] = $2085;
   break;
  }
  case 128:  {
   $2087 = $1;
   $2088 = HEAP8[$2087>>0]|0;
   $2089 = $2088&255;
   $2090 = $1;
   $2091 = ((($2090)) + 1|0);
   $2092 = HEAP8[$2091>>0]|0;
   $2093 = $2092&255;
   $2094 = (($2089) + ($2093))|0;
   $2095 = $2094&65535;
   $res49 = $2095;
   $2096 = $1;
   $2097 = $res49;
   _ArithFlagsA($2096,$2097);
   $2098 = $res49;
   $2099 = $2098&255;
   $2100 = $1;
   HEAP8[$2100>>0] = $2099;
   break;
  }
  case 129:  {
   $2101 = $1;
   $2102 = HEAP8[$2101>>0]|0;
   $2103 = $2102&255;
   $2104 = $1;
   $2105 = ((($2104)) + 2|0);
   $2106 = HEAP8[$2105>>0]|0;
   $2107 = $2106&255;
   $2108 = (($2103) + ($2107))|0;
   $2109 = $2108&65535;
   $res50 = $2109;
   $2110 = $1;
   $2111 = $res50;
   _ArithFlagsA($2110,$2111);
   $2112 = $res50;
   $2113 = $2112&255;
   $2114 = $1;
   HEAP8[$2114>>0] = $2113;
   break;
  }
  case 130:  {
   $2115 = $1;
   $2116 = HEAP8[$2115>>0]|0;
   $2117 = $2116&255;
   $2118 = $1;
   $2119 = ((($2118)) + 3|0);
   $2120 = HEAP8[$2119>>0]|0;
   $2121 = $2120&255;
   $2122 = (($2117) + ($2121))|0;
   $2123 = $2122&65535;
   $res51 = $2123;
   $2124 = $1;
   $2125 = $res51;
   _ArithFlagsA($2124,$2125);
   $2126 = $res51;
   $2127 = $2126&255;
   $2128 = $1;
   HEAP8[$2128>>0] = $2127;
   break;
  }
  case 131:  {
   $2129 = $1;
   $2130 = HEAP8[$2129>>0]|0;
   $2131 = $2130&255;
   $2132 = $1;
   $2133 = ((($2132)) + 4|0);
   $2134 = HEAP8[$2133>>0]|0;
   $2135 = $2134&255;
   $2136 = (($2131) + ($2135))|0;
   $2137 = $2136&65535;
   $res52 = $2137;
   $2138 = $1;
   $2139 = $res52;
   _ArithFlagsA($2138,$2139);
   $2140 = $res52;
   $2141 = $2140&255;
   $2142 = $1;
   HEAP8[$2142>>0] = $2141;
   break;
  }
  case 132:  {
   $2143 = $1;
   $2144 = HEAP8[$2143>>0]|0;
   $2145 = $2144&255;
   $2146 = $1;
   $2147 = ((($2146)) + 5|0);
   $2148 = HEAP8[$2147>>0]|0;
   $2149 = $2148&255;
   $2150 = (($2145) + ($2149))|0;
   $2151 = $2150&65535;
   $res53 = $2151;
   $2152 = $1;
   $2153 = $res53;
   _ArithFlagsA($2152,$2153);
   $2154 = $res53;
   $2155 = $2154&255;
   $2156 = $1;
   HEAP8[$2156>>0] = $2155;
   break;
  }
  case 133:  {
   $2157 = $1;
   $2158 = HEAP8[$2157>>0]|0;
   $2159 = $2158&255;
   $2160 = $1;
   $2161 = ((($2160)) + 6|0);
   $2162 = HEAP8[$2161>>0]|0;
   $2163 = $2162&255;
   $2164 = (($2159) + ($2163))|0;
   $2165 = $2164&65535;
   $res54 = $2165;
   $2166 = $1;
   $2167 = $res54;
   _ArithFlagsA($2166,$2167);
   $2168 = $res54;
   $2169 = $2168&255;
   $2170 = $1;
   HEAP8[$2170>>0] = $2169;
   break;
  }
  case 134:  {
   $2171 = $1;
   $2172 = ((($2171)) + 5|0);
   $2173 = HEAP8[$2172>>0]|0;
   $2174 = $2173&255;
   $2175 = $2174 << 8;
   $2176 = $1;
   $2177 = ((($2176)) + 6|0);
   $2178 = HEAP8[$2177>>0]|0;
   $2179 = $2178&255;
   $2180 = $2175 | $2179;
   $2181 = $2180&65535;
   $offset55 = $2181;
   $2182 = $1;
   $2183 = HEAP8[$2182>>0]|0;
   $2184 = $2183&255;
   $2185 = $offset55;
   $2186 = $2185&65535;
   $2187 = $1;
   $2188 = ((($2187)) + 16|0);
   $2189 = HEAP32[$2188>>2]|0;
   $2190 = (($2189) + ($2186)|0);
   $2191 = HEAP8[$2190>>0]|0;
   $2192 = $2191&255;
   $2193 = (($2184) + ($2192))|0;
   $2194 = $2193&65535;
   $res56 = $2194;
   $2195 = $1;
   $2196 = $res56;
   _ArithFlagsA($2195,$2196);
   $2197 = $res56;
   $2198 = $2197&255;
   $2199 = $1;
   HEAP8[$2199>>0] = $2198;
   break;
  }
  case 135:  {
   $2200 = $1;
   $2201 = HEAP8[$2200>>0]|0;
   $2202 = $2201&255;
   $2203 = $1;
   $2204 = HEAP8[$2203>>0]|0;
   $2205 = $2204&255;
   $2206 = (($2202) + ($2205))|0;
   $2207 = $2206&65535;
   $res57 = $2207;
   $2208 = $1;
   $2209 = $res57;
   _ArithFlagsA($2208,$2209);
   $2210 = $res57;
   $2211 = $2210&255;
   $2212 = $1;
   HEAP8[$2212>>0] = $2211;
   break;
  }
  case 136:  {
   $2213 = $1;
   $2214 = HEAP8[$2213>>0]|0;
   $2215 = $2214&255;
   $2216 = $1;
   $2217 = ((($2216)) + 1|0);
   $2218 = HEAP8[$2217>>0]|0;
   $2219 = $2218&255;
   $2220 = (($2215) + ($2219))|0;
   $2221 = $1;
   $2222 = ((($2221)) + 12|0);
   $2223 = HEAP8[$2222>>0]|0;
   $2224 = ($2223&255) >>> 3;
   $2225 = $2224 & 1;
   $2226 = $2225&255;
   $2227 = (($2220) + ($2226))|0;
   $2228 = $2227&65535;
   $res58 = $2228;
   $2229 = $1;
   $2230 = $res58;
   _ArithFlagsA($2229,$2230);
   $2231 = $res58;
   $2232 = $2231&255;
   $2233 = $1;
   HEAP8[$2233>>0] = $2232;
   break;
  }
  case 137:  {
   $2234 = $1;
   $2235 = HEAP8[$2234>>0]|0;
   $2236 = $2235&255;
   $2237 = $1;
   $2238 = ((($2237)) + 2|0);
   $2239 = HEAP8[$2238>>0]|0;
   $2240 = $2239&255;
   $2241 = (($2236) + ($2240))|0;
   $2242 = $1;
   $2243 = ((($2242)) + 12|0);
   $2244 = HEAP8[$2243>>0]|0;
   $2245 = ($2244&255) >>> 3;
   $2246 = $2245 & 1;
   $2247 = $2246&255;
   $2248 = (($2241) + ($2247))|0;
   $2249 = $2248&65535;
   $res59 = $2249;
   $2250 = $1;
   $2251 = $res59;
   _ArithFlagsA($2250,$2251);
   $2252 = $res59;
   $2253 = $2252&255;
   $2254 = $1;
   HEAP8[$2254>>0] = $2253;
   break;
  }
  case 138:  {
   $2255 = $1;
   $2256 = HEAP8[$2255>>0]|0;
   $2257 = $2256&255;
   $2258 = $1;
   $2259 = ((($2258)) + 3|0);
   $2260 = HEAP8[$2259>>0]|0;
   $2261 = $2260&255;
   $2262 = (($2257) + ($2261))|0;
   $2263 = $1;
   $2264 = ((($2263)) + 12|0);
   $2265 = HEAP8[$2264>>0]|0;
   $2266 = ($2265&255) >>> 3;
   $2267 = $2266 & 1;
   $2268 = $2267&255;
   $2269 = (($2262) + ($2268))|0;
   $2270 = $2269&65535;
   $res60 = $2270;
   $2271 = $1;
   $2272 = $res60;
   _ArithFlagsA($2271,$2272);
   $2273 = $res60;
   $2274 = $2273&255;
   $2275 = $1;
   HEAP8[$2275>>0] = $2274;
   break;
  }
  case 139:  {
   $2276 = $1;
   $2277 = HEAP8[$2276>>0]|0;
   $2278 = $2277&255;
   $2279 = $1;
   $2280 = ((($2279)) + 4|0);
   $2281 = HEAP8[$2280>>0]|0;
   $2282 = $2281&255;
   $2283 = (($2278) + ($2282))|0;
   $2284 = $1;
   $2285 = ((($2284)) + 12|0);
   $2286 = HEAP8[$2285>>0]|0;
   $2287 = ($2286&255) >>> 3;
   $2288 = $2287 & 1;
   $2289 = $2288&255;
   $2290 = (($2283) + ($2289))|0;
   $2291 = $2290&65535;
   $res61 = $2291;
   $2292 = $1;
   $2293 = $res61;
   _ArithFlagsA($2292,$2293);
   $2294 = $res61;
   $2295 = $2294&255;
   $2296 = $1;
   HEAP8[$2296>>0] = $2295;
   break;
  }
  case 140:  {
   $2297 = $1;
   $2298 = HEAP8[$2297>>0]|0;
   $2299 = $2298&255;
   $2300 = $1;
   $2301 = ((($2300)) + 5|0);
   $2302 = HEAP8[$2301>>0]|0;
   $2303 = $2302&255;
   $2304 = (($2299) + ($2303))|0;
   $2305 = $1;
   $2306 = ((($2305)) + 12|0);
   $2307 = HEAP8[$2306>>0]|0;
   $2308 = ($2307&255) >>> 3;
   $2309 = $2308 & 1;
   $2310 = $2309&255;
   $2311 = (($2304) + ($2310))|0;
   $2312 = $2311&65535;
   $res62 = $2312;
   $2313 = $1;
   $2314 = $res62;
   _ArithFlagsA($2313,$2314);
   $2315 = $res62;
   $2316 = $2315&255;
   $2317 = $1;
   HEAP8[$2317>>0] = $2316;
   break;
  }
  case 141:  {
   $2318 = $1;
   $2319 = HEAP8[$2318>>0]|0;
   $2320 = $2319&255;
   $2321 = $1;
   $2322 = ((($2321)) + 6|0);
   $2323 = HEAP8[$2322>>0]|0;
   $2324 = $2323&255;
   $2325 = (($2320) + ($2324))|0;
   $2326 = $1;
   $2327 = ((($2326)) + 12|0);
   $2328 = HEAP8[$2327>>0]|0;
   $2329 = ($2328&255) >>> 3;
   $2330 = $2329 & 1;
   $2331 = $2330&255;
   $2332 = (($2325) + ($2331))|0;
   $2333 = $2332&65535;
   $res63 = $2333;
   $2334 = $1;
   $2335 = $res63;
   _ArithFlagsA($2334,$2335);
   $2336 = $res63;
   $2337 = $2336&255;
   $2338 = $1;
   HEAP8[$2338>>0] = $2337;
   break;
  }
  case 142:  {
   $2339 = $1;
   $2340 = ((($2339)) + 5|0);
   $2341 = HEAP8[$2340>>0]|0;
   $2342 = $2341&255;
   $2343 = $2342 << 8;
   $2344 = $1;
   $2345 = ((($2344)) + 6|0);
   $2346 = HEAP8[$2345>>0]|0;
   $2347 = $2346&255;
   $2348 = $2343 | $2347;
   $2349 = $2348&65535;
   $offset64 = $2349;
   $2350 = $1;
   $2351 = HEAP8[$2350>>0]|0;
   $2352 = $2351&255;
   $2353 = $offset64;
   $2354 = $2353&65535;
   $2355 = $1;
   $2356 = ((($2355)) + 16|0);
   $2357 = HEAP32[$2356>>2]|0;
   $2358 = (($2357) + ($2354)|0);
   $2359 = HEAP8[$2358>>0]|0;
   $2360 = $2359&255;
   $2361 = (($2352) + ($2360))|0;
   $2362 = $1;
   $2363 = ((($2362)) + 12|0);
   $2364 = HEAP8[$2363>>0]|0;
   $2365 = ($2364&255) >>> 3;
   $2366 = $2365 & 1;
   $2367 = $2366&255;
   $2368 = (($2361) + ($2367))|0;
   $2369 = $2368&65535;
   $res65 = $2369;
   $2370 = $1;
   $2371 = $res65;
   _ArithFlagsA($2370,$2371);
   $2372 = $res65;
   $2373 = $2372&255;
   $2374 = $1;
   HEAP8[$2374>>0] = $2373;
   break;
  }
  case 143:  {
   $2375 = $1;
   $2376 = HEAP8[$2375>>0]|0;
   $2377 = $2376&255;
   $2378 = $1;
   $2379 = HEAP8[$2378>>0]|0;
   $2380 = $2379&255;
   $2381 = (($2377) + ($2380))|0;
   $2382 = $1;
   $2383 = ((($2382)) + 12|0);
   $2384 = HEAP8[$2383>>0]|0;
   $2385 = ($2384&255) >>> 3;
   $2386 = $2385 & 1;
   $2387 = $2386&255;
   $2388 = (($2381) + ($2387))|0;
   $2389 = $2388&65535;
   $res66 = $2389;
   $2390 = $1;
   $2391 = $res66;
   _ArithFlagsA($2390,$2391);
   $2392 = $res66;
   $2393 = $2392&255;
   $2394 = $1;
   HEAP8[$2394>>0] = $2393;
   break;
  }
  case 144:  {
   $2395 = $1;
   $2396 = $1;
   $2397 = HEAP8[$2396>>0]|0;
   $2398 = $1;
   $2399 = ((($2398)) + 1|0);
   $2400 = HEAP8[$2399>>0]|0;
   $2401 = (_subtractByte($2395,$2397,$2400)|0);
   $2402 = $1;
   HEAP8[$2402>>0] = $2401;
   break;
  }
  case 145:  {
   $2403 = $1;
   $2404 = $1;
   $2405 = HEAP8[$2404>>0]|0;
   $2406 = $1;
   $2407 = ((($2406)) + 2|0);
   $2408 = HEAP8[$2407>>0]|0;
   $2409 = (_subtractByte($2403,$2405,$2408)|0);
   $2410 = $1;
   HEAP8[$2410>>0] = $2409;
   break;
  }
  case 146:  {
   $2411 = $1;
   $2412 = $1;
   $2413 = HEAP8[$2412>>0]|0;
   $2414 = $1;
   $2415 = ((($2414)) + 3|0);
   $2416 = HEAP8[$2415>>0]|0;
   $2417 = (_subtractByte($2411,$2413,$2416)|0);
   $2418 = $1;
   HEAP8[$2418>>0] = $2417;
   break;
  }
  case 147:  {
   $2419 = $1;
   $2420 = $1;
   $2421 = HEAP8[$2420>>0]|0;
   $2422 = $1;
   $2423 = ((($2422)) + 4|0);
   $2424 = HEAP8[$2423>>0]|0;
   $2425 = (_subtractByte($2419,$2421,$2424)|0);
   $2426 = $1;
   HEAP8[$2426>>0] = $2425;
   break;
  }
  case 148:  {
   $2427 = $1;
   $2428 = $1;
   $2429 = HEAP8[$2428>>0]|0;
   $2430 = $1;
   $2431 = ((($2430)) + 5|0);
   $2432 = HEAP8[$2431>>0]|0;
   $2433 = (_subtractByte($2427,$2429,$2432)|0);
   $2434 = $1;
   HEAP8[$2434>>0] = $2433;
   break;
  }
  case 149:  {
   $2435 = $1;
   $2436 = $1;
   $2437 = HEAP8[$2436>>0]|0;
   $2438 = $1;
   $2439 = ((($2438)) + 6|0);
   $2440 = HEAP8[$2439>>0]|0;
   $2441 = (_subtractByte($2435,$2437,$2440)|0);
   $2442 = $1;
   HEAP8[$2442>>0] = $2441;
   break;
  }
  case 150:  {
   $2443 = $1;
   $2444 = ((($2443)) + 5|0);
   $2445 = HEAP8[$2444>>0]|0;
   $2446 = $2445&255;
   $2447 = $2446 << 8;
   $2448 = $1;
   $2449 = ((($2448)) + 6|0);
   $2450 = HEAP8[$2449>>0]|0;
   $2451 = $2450&255;
   $2452 = $2447 | $2451;
   $2453 = $2452&65535;
   $offset67 = $2453;
   $2454 = $1;
   $2455 = $1;
   $2456 = HEAP8[$2455>>0]|0;
   $2457 = $offset67;
   $2458 = $2457&65535;
   $2459 = $1;
   $2460 = ((($2459)) + 16|0);
   $2461 = HEAP32[$2460>>2]|0;
   $2462 = (($2461) + ($2458)|0);
   $2463 = HEAP8[$2462>>0]|0;
   $2464 = (_subtractByte($2454,$2456,$2463)|0);
   $2465 = $1;
   HEAP8[$2465>>0] = $2464;
   break;
  }
  case 151:  {
   $2466 = $1;
   $2467 = $1;
   $2468 = HEAP8[$2467>>0]|0;
   $2469 = $1;
   $2470 = HEAP8[$2469>>0]|0;
   $2471 = (_subtractByte($2466,$2468,$2470)|0);
   $2472 = $1;
   HEAP8[$2472>>0] = $2471;
   break;
  }
  case 152:  {
   $2473 = $1;
   $2474 = $1;
   $2475 = HEAP8[$2474>>0]|0;
   $2476 = $1;
   $2477 = ((($2476)) + 1|0);
   $2478 = HEAP8[$2477>>0]|0;
   $2479 = (_subtractByteWithBorrow($2473,$2475,$2478)|0);
   $2480 = $1;
   HEAP8[$2480>>0] = $2479;
   break;
  }
  case 153:  {
   $2481 = $1;
   $2482 = $1;
   $2483 = HEAP8[$2482>>0]|0;
   $2484 = $1;
   $2485 = ((($2484)) + 2|0);
   $2486 = HEAP8[$2485>>0]|0;
   $2487 = (_subtractByteWithBorrow($2481,$2483,$2486)|0);
   $2488 = $1;
   HEAP8[$2488>>0] = $2487;
   break;
  }
  case 154:  {
   $2489 = $1;
   $2490 = $1;
   $2491 = HEAP8[$2490>>0]|0;
   $2492 = $1;
   $2493 = ((($2492)) + 3|0);
   $2494 = HEAP8[$2493>>0]|0;
   $2495 = (_subtractByteWithBorrow($2489,$2491,$2494)|0);
   $2496 = $1;
   HEAP8[$2496>>0] = $2495;
   break;
  }
  case 155:  {
   $2497 = $1;
   $2498 = $1;
   $2499 = HEAP8[$2498>>0]|0;
   $2500 = $1;
   $2501 = ((($2500)) + 4|0);
   $2502 = HEAP8[$2501>>0]|0;
   $2503 = (_subtractByteWithBorrow($2497,$2499,$2502)|0);
   $2504 = $1;
   HEAP8[$2504>>0] = $2503;
   break;
  }
  case 156:  {
   $2505 = $1;
   $2506 = $1;
   $2507 = HEAP8[$2506>>0]|0;
   $2508 = $1;
   $2509 = ((($2508)) + 5|0);
   $2510 = HEAP8[$2509>>0]|0;
   $2511 = (_subtractByteWithBorrow($2505,$2507,$2510)|0);
   $2512 = $1;
   HEAP8[$2512>>0] = $2511;
   break;
  }
  case 157:  {
   $2513 = $1;
   $2514 = $1;
   $2515 = HEAP8[$2514>>0]|0;
   $2516 = $1;
   $2517 = ((($2516)) + 6|0);
   $2518 = HEAP8[$2517>>0]|0;
   $2519 = (_subtractByteWithBorrow($2513,$2515,$2518)|0);
   $2520 = $1;
   HEAP8[$2520>>0] = $2519;
   break;
  }
  case 158:  {
   $2521 = $1;
   $2522 = ((($2521)) + 5|0);
   $2523 = HEAP8[$2522>>0]|0;
   $2524 = $2523&255;
   $2525 = $2524 << 8;
   $2526 = $1;
   $2527 = ((($2526)) + 6|0);
   $2528 = HEAP8[$2527>>0]|0;
   $2529 = $2528&255;
   $2530 = $2525 | $2529;
   $2531 = $2530&65535;
   $offset68 = $2531;
   $2532 = $1;
   $2533 = $1;
   $2534 = HEAP8[$2533>>0]|0;
   $2535 = $offset68;
   $2536 = $2535&65535;
   $2537 = $1;
   $2538 = ((($2537)) + 16|0);
   $2539 = HEAP32[$2538>>2]|0;
   $2540 = (($2539) + ($2536)|0);
   $2541 = HEAP8[$2540>>0]|0;
   $2542 = (_subtractByteWithBorrow($2532,$2534,$2541)|0);
   $2543 = $1;
   HEAP8[$2543>>0] = $2542;
   break;
  }
  case 159:  {
   $2544 = $1;
   $2545 = $1;
   $2546 = HEAP8[$2545>>0]|0;
   $2547 = $1;
   $2548 = HEAP8[$2547>>0]|0;
   $2549 = (_subtractByteWithBorrow($2544,$2546,$2548)|0);
   $2550 = $1;
   HEAP8[$2550>>0] = $2549;
   break;
  }
  case 160:  {
   $2551 = $1;
   $2552 = HEAP8[$2551>>0]|0;
   $2553 = $2552&255;
   $2554 = $1;
   $2555 = ((($2554)) + 1|0);
   $2556 = HEAP8[$2555>>0]|0;
   $2557 = $2556&255;
   $2558 = $2553 & $2557;
   $2559 = $2558&255;
   $2560 = $1;
   HEAP8[$2560>>0] = $2559;
   $2561 = $1;
   _LogicFlagsA($2561,1);
   break;
  }
  case 161:  {
   $2562 = $1;
   $2563 = HEAP8[$2562>>0]|0;
   $2564 = $2563&255;
   $2565 = $1;
   $2566 = ((($2565)) + 2|0);
   $2567 = HEAP8[$2566>>0]|0;
   $2568 = $2567&255;
   $2569 = $2564 & $2568;
   $2570 = $2569&255;
   $2571 = $1;
   HEAP8[$2571>>0] = $2570;
   $2572 = $1;
   _LogicFlagsA($2572,1);
   break;
  }
  case 162:  {
   $2573 = $1;
   $2574 = HEAP8[$2573>>0]|0;
   $2575 = $2574&255;
   $2576 = $1;
   $2577 = ((($2576)) + 3|0);
   $2578 = HEAP8[$2577>>0]|0;
   $2579 = $2578&255;
   $2580 = $2575 & $2579;
   $2581 = $2580&255;
   $2582 = $1;
   HEAP8[$2582>>0] = $2581;
   $2583 = $1;
   _LogicFlagsA($2583,1);
   break;
  }
  case 163:  {
   $2584 = $1;
   $2585 = HEAP8[$2584>>0]|0;
   $2586 = $2585&255;
   $2587 = $1;
   $2588 = ((($2587)) + 4|0);
   $2589 = HEAP8[$2588>>0]|0;
   $2590 = $2589&255;
   $2591 = $2586 & $2590;
   $2592 = $2591&255;
   $2593 = $1;
   HEAP8[$2593>>0] = $2592;
   $2594 = $1;
   _LogicFlagsA($2594,1);
   break;
  }
  case 164:  {
   $2595 = $1;
   $2596 = HEAP8[$2595>>0]|0;
   $2597 = $2596&255;
   $2598 = $1;
   $2599 = ((($2598)) + 5|0);
   $2600 = HEAP8[$2599>>0]|0;
   $2601 = $2600&255;
   $2602 = $2597 & $2601;
   $2603 = $2602&255;
   $2604 = $1;
   HEAP8[$2604>>0] = $2603;
   $2605 = $1;
   _LogicFlagsA($2605,1);
   break;
  }
  case 165:  {
   $2606 = $1;
   $2607 = HEAP8[$2606>>0]|0;
   $2608 = $2607&255;
   $2609 = $1;
   $2610 = ((($2609)) + 6|0);
   $2611 = HEAP8[$2610>>0]|0;
   $2612 = $2611&255;
   $2613 = $2608 & $2612;
   $2614 = $2613&255;
   $2615 = $1;
   HEAP8[$2615>>0] = $2614;
   $2616 = $1;
   _LogicFlagsA($2616,1);
   break;
  }
  case 166:  {
   $2617 = $1;
   $2618 = ((($2617)) + 5|0);
   $2619 = HEAP8[$2618>>0]|0;
   $2620 = $2619&255;
   $2621 = $2620 << 8;
   $2622 = $1;
   $2623 = ((($2622)) + 6|0);
   $2624 = HEAP8[$2623>>0]|0;
   $2625 = $2624&255;
   $2626 = $2621 | $2625;
   $2627 = $2626&65535;
   $offset69 = $2627;
   $2628 = $1;
   $2629 = HEAP8[$2628>>0]|0;
   $2630 = $2629&255;
   $2631 = $offset69;
   $2632 = $2631&65535;
   $2633 = $1;
   $2634 = ((($2633)) + 16|0);
   $2635 = HEAP32[$2634>>2]|0;
   $2636 = (($2635) + ($2632)|0);
   $2637 = HEAP8[$2636>>0]|0;
   $2638 = $2637&255;
   $2639 = $2630 & $2638;
   $2640 = $2639&255;
   $2641 = $1;
   HEAP8[$2641>>0] = $2640;
   $2642 = $1;
   _LogicFlagsA($2642,1);
   break;
  }
  case 167:  {
   $2643 = $1;
   $2644 = HEAP8[$2643>>0]|0;
   $2645 = $2644&255;
   $2646 = $1;
   $2647 = HEAP8[$2646>>0]|0;
   $2648 = $2647&255;
   $2649 = $2645 & $2648;
   $2650 = $2649&255;
   $2651 = $1;
   HEAP8[$2651>>0] = $2650;
   $2652 = $1;
   _LogicFlagsA($2652,1);
   break;
  }
  case 168:  {
   $2653 = $1;
   $2654 = HEAP8[$2653>>0]|0;
   $2655 = $2654&255;
   $2656 = $1;
   $2657 = ((($2656)) + 1|0);
   $2658 = HEAP8[$2657>>0]|0;
   $2659 = $2658&255;
   $2660 = $2655 ^ $2659;
   $2661 = $2660&255;
   $2662 = $1;
   HEAP8[$2662>>0] = $2661;
   $2663 = $1;
   _LogicFlagsA($2663,0);
   break;
  }
  case 169:  {
   $2664 = $1;
   $2665 = HEAP8[$2664>>0]|0;
   $2666 = $2665&255;
   $2667 = $1;
   $2668 = ((($2667)) + 2|0);
   $2669 = HEAP8[$2668>>0]|0;
   $2670 = $2669&255;
   $2671 = $2666 ^ $2670;
   $2672 = $2671&255;
   $2673 = $1;
   HEAP8[$2673>>0] = $2672;
   $2674 = $1;
   _LogicFlagsA($2674,0);
   break;
  }
  case 170:  {
   $2675 = $1;
   $2676 = HEAP8[$2675>>0]|0;
   $2677 = $2676&255;
   $2678 = $1;
   $2679 = ((($2678)) + 3|0);
   $2680 = HEAP8[$2679>>0]|0;
   $2681 = $2680&255;
   $2682 = $2677 ^ $2681;
   $2683 = $2682&255;
   $2684 = $1;
   HEAP8[$2684>>0] = $2683;
   $2685 = $1;
   _LogicFlagsA($2685,0);
   break;
  }
  case 171:  {
   $2686 = $1;
   $2687 = HEAP8[$2686>>0]|0;
   $2688 = $2687&255;
   $2689 = $1;
   $2690 = ((($2689)) + 4|0);
   $2691 = HEAP8[$2690>>0]|0;
   $2692 = $2691&255;
   $2693 = $2688 ^ $2692;
   $2694 = $2693&255;
   $2695 = $1;
   HEAP8[$2695>>0] = $2694;
   $2696 = $1;
   _LogicFlagsA($2696,0);
   break;
  }
  case 172:  {
   $2697 = $1;
   $2698 = HEAP8[$2697>>0]|0;
   $2699 = $2698&255;
   $2700 = $1;
   $2701 = ((($2700)) + 5|0);
   $2702 = HEAP8[$2701>>0]|0;
   $2703 = $2702&255;
   $2704 = $2699 ^ $2703;
   $2705 = $2704&255;
   $2706 = $1;
   HEAP8[$2706>>0] = $2705;
   $2707 = $1;
   _LogicFlagsA($2707,0);
   break;
  }
  case 173:  {
   $2708 = $1;
   $2709 = HEAP8[$2708>>0]|0;
   $2710 = $2709&255;
   $2711 = $1;
   $2712 = ((($2711)) + 6|0);
   $2713 = HEAP8[$2712>>0]|0;
   $2714 = $2713&255;
   $2715 = $2710 ^ $2714;
   $2716 = $2715&255;
   $2717 = $1;
   HEAP8[$2717>>0] = $2716;
   $2718 = $1;
   _LogicFlagsA($2718,0);
   break;
  }
  case 174:  {
   $2719 = $1;
   $2720 = ((($2719)) + 5|0);
   $2721 = HEAP8[$2720>>0]|0;
   $2722 = $2721&255;
   $2723 = $2722 << 8;
   $2724 = $1;
   $2725 = ((($2724)) + 6|0);
   $2726 = HEAP8[$2725>>0]|0;
   $2727 = $2726&255;
   $2728 = $2723 | $2727;
   $2729 = $2728&65535;
   $offset70 = $2729;
   $2730 = $1;
   $2731 = HEAP8[$2730>>0]|0;
   $2732 = $2731&255;
   $2733 = $offset70;
   $2734 = $2733&65535;
   $2735 = $1;
   $2736 = ((($2735)) + 16|0);
   $2737 = HEAP32[$2736>>2]|0;
   $2738 = (($2737) + ($2734)|0);
   $2739 = HEAP8[$2738>>0]|0;
   $2740 = $2739&255;
   $2741 = $2732 ^ $2740;
   $2742 = $2741&255;
   $2743 = $1;
   HEAP8[$2743>>0] = $2742;
   $2744 = $1;
   _LogicFlagsA($2744,0);
   break;
  }
  case 175:  {
   $2745 = $1;
   $2746 = HEAP8[$2745>>0]|0;
   $2747 = $2746&255;
   $2748 = $1;
   $2749 = HEAP8[$2748>>0]|0;
   $2750 = $2749&255;
   $2751 = $2747 ^ $2750;
   $2752 = $2751&255;
   $2753 = $1;
   HEAP8[$2753>>0] = $2752;
   $2754 = $1;
   _LogicFlagsA($2754,0);
   break;
  }
  case 176:  {
   $2755 = $1;
   $2756 = HEAP8[$2755>>0]|0;
   $2757 = $2756&255;
   $2758 = $1;
   $2759 = ((($2758)) + 1|0);
   $2760 = HEAP8[$2759>>0]|0;
   $2761 = $2760&255;
   $2762 = $2757 | $2761;
   $2763 = $2762&255;
   $2764 = $1;
   HEAP8[$2764>>0] = $2763;
   $2765 = $1;
   _LogicFlagsA($2765,0);
   break;
  }
  case 177:  {
   $2766 = $1;
   $2767 = HEAP8[$2766>>0]|0;
   $2768 = $2767&255;
   $2769 = $1;
   $2770 = ((($2769)) + 2|0);
   $2771 = HEAP8[$2770>>0]|0;
   $2772 = $2771&255;
   $2773 = $2768 | $2772;
   $2774 = $2773&255;
   $2775 = $1;
   HEAP8[$2775>>0] = $2774;
   $2776 = $1;
   _LogicFlagsA($2776,0);
   break;
  }
  case 178:  {
   $2777 = $1;
   $2778 = HEAP8[$2777>>0]|0;
   $2779 = $2778&255;
   $2780 = $1;
   $2781 = ((($2780)) + 3|0);
   $2782 = HEAP8[$2781>>0]|0;
   $2783 = $2782&255;
   $2784 = $2779 | $2783;
   $2785 = $2784&255;
   $2786 = $1;
   HEAP8[$2786>>0] = $2785;
   $2787 = $1;
   _LogicFlagsA($2787,0);
   break;
  }
  case 179:  {
   $2788 = $1;
   $2789 = HEAP8[$2788>>0]|0;
   $2790 = $2789&255;
   $2791 = $1;
   $2792 = ((($2791)) + 4|0);
   $2793 = HEAP8[$2792>>0]|0;
   $2794 = $2793&255;
   $2795 = $2790 | $2794;
   $2796 = $2795&255;
   $2797 = $1;
   HEAP8[$2797>>0] = $2796;
   $2798 = $1;
   _LogicFlagsA($2798,0);
   break;
  }
  case 180:  {
   $2799 = $1;
   $2800 = HEAP8[$2799>>0]|0;
   $2801 = $2800&255;
   $2802 = $1;
   $2803 = ((($2802)) + 5|0);
   $2804 = HEAP8[$2803>>0]|0;
   $2805 = $2804&255;
   $2806 = $2801 | $2805;
   $2807 = $2806&255;
   $2808 = $1;
   HEAP8[$2808>>0] = $2807;
   $2809 = $1;
   _LogicFlagsA($2809,0);
   break;
  }
  case 181:  {
   $2810 = $1;
   $2811 = HEAP8[$2810>>0]|0;
   $2812 = $2811&255;
   $2813 = $1;
   $2814 = ((($2813)) + 6|0);
   $2815 = HEAP8[$2814>>0]|0;
   $2816 = $2815&255;
   $2817 = $2812 | $2816;
   $2818 = $2817&255;
   $2819 = $1;
   HEAP8[$2819>>0] = $2818;
   $2820 = $1;
   _LogicFlagsA($2820,0);
   break;
  }
  case 182:  {
   $2821 = $1;
   $2822 = ((($2821)) + 5|0);
   $2823 = HEAP8[$2822>>0]|0;
   $2824 = $2823&255;
   $2825 = $2824 << 8;
   $2826 = $1;
   $2827 = ((($2826)) + 6|0);
   $2828 = HEAP8[$2827>>0]|0;
   $2829 = $2828&255;
   $2830 = $2825 | $2829;
   $2831 = $2830&65535;
   $offset71 = $2831;
   $2832 = $1;
   $2833 = HEAP8[$2832>>0]|0;
   $2834 = $2833&255;
   $2835 = $offset71;
   $2836 = $2835&65535;
   $2837 = $1;
   $2838 = ((($2837)) + 16|0);
   $2839 = HEAP32[$2838>>2]|0;
   $2840 = (($2839) + ($2836)|0);
   $2841 = HEAP8[$2840>>0]|0;
   $2842 = $2841&255;
   $2843 = $2834 | $2842;
   $2844 = $2843&255;
   $2845 = $1;
   HEAP8[$2845>>0] = $2844;
   $2846 = $1;
   _LogicFlagsA($2846,0);
   break;
  }
  case 183:  {
   $2847 = $1;
   $2848 = HEAP8[$2847>>0]|0;
   $2849 = $2848&255;
   $2850 = $1;
   $2851 = HEAP8[$2850>>0]|0;
   $2852 = $2851&255;
   $2853 = $2849 | $2852;
   $2854 = $2853&255;
   $2855 = $1;
   HEAP8[$2855>>0] = $2854;
   $2856 = $1;
   _LogicFlagsA($2856,0);
   break;
  }
  case 184:  {
   $2857 = $1;
   $2858 = $1;
   $2859 = HEAP8[$2858>>0]|0;
   $2860 = $1;
   $2861 = ((($2860)) + 1|0);
   $2862 = HEAP8[$2861>>0]|0;
   (_subtractByte($2857,$2859,$2862)|0);
   break;
  }
  case 185:  {
   $2863 = $1;
   $2864 = $1;
   $2865 = HEAP8[$2864>>0]|0;
   $2866 = $1;
   $2867 = ((($2866)) + 2|0);
   $2868 = HEAP8[$2867>>0]|0;
   (_subtractByte($2863,$2865,$2868)|0);
   break;
  }
  case 186:  {
   $2869 = $1;
   $2870 = $1;
   $2871 = HEAP8[$2870>>0]|0;
   $2872 = $1;
   $2873 = ((($2872)) + 3|0);
   $2874 = HEAP8[$2873>>0]|0;
   (_subtractByte($2869,$2871,$2874)|0);
   break;
  }
  case 187:  {
   $2875 = $1;
   $2876 = $1;
   $2877 = HEAP8[$2876>>0]|0;
   $2878 = $1;
   $2879 = ((($2878)) + 4|0);
   $2880 = HEAP8[$2879>>0]|0;
   (_subtractByte($2875,$2877,$2880)|0);
   break;
  }
  case 188:  {
   $2881 = $1;
   $2882 = $1;
   $2883 = HEAP8[$2882>>0]|0;
   $2884 = $1;
   $2885 = ((($2884)) + 5|0);
   $2886 = HEAP8[$2885>>0]|0;
   (_subtractByte($2881,$2883,$2886)|0);
   break;
  }
  case 189:  {
   $2887 = $1;
   $2888 = $1;
   $2889 = HEAP8[$2888>>0]|0;
   $2890 = $1;
   $2891 = ((($2890)) + 6|0);
   $2892 = HEAP8[$2891>>0]|0;
   (_subtractByte($2887,$2889,$2892)|0);
   break;
  }
  case 190:  {
   $2893 = $1;
   $2894 = ((($2893)) + 5|0);
   $2895 = HEAP8[$2894>>0]|0;
   $2896 = $2895&255;
   $2897 = $2896 << 8;
   $2898 = $1;
   $2899 = ((($2898)) + 6|0);
   $2900 = HEAP8[$2899>>0]|0;
   $2901 = $2900&255;
   $2902 = $2897 | $2901;
   $2903 = $2902&65535;
   $offset72 = $2903;
   $2904 = $1;
   $2905 = $1;
   $2906 = HEAP8[$2905>>0]|0;
   $2907 = $offset72;
   $2908 = $2907&65535;
   $2909 = $1;
   $2910 = ((($2909)) + 16|0);
   $2911 = HEAP32[$2910>>2]|0;
   $2912 = (($2911) + ($2908)|0);
   $2913 = HEAP8[$2912>>0]|0;
   (_subtractByte($2904,$2906,$2913)|0);
   break;
  }
  case 191:  {
   $2914 = $1;
   $2915 = $1;
   $2916 = HEAP8[$2915>>0]|0;
   $2917 = $1;
   $2918 = HEAP8[$2917>>0]|0;
   (_subtractByte($2914,$2916,$2918)|0);
   break;
  }
  case 192:  {
   $2919 = $1;
   $2920 = ((($2919)) + 12|0);
   $2921 = HEAP8[$2920>>0]|0;
   $2922 = $2921 & 1;
   $2923 = $2922&255;
   $2924 = (0)==($2923|0);
   if ($2924) {
    $2925 = $1;
    _returnToCaller($2925);
   }
   break;
  }
  case 193:  {
   $2926 = $1;
   $2927 = ((($2926)) + 8|0);
   $2928 = HEAP16[$2927>>1]|0;
   $2929 = $2928&65535;
   $2930 = $1;
   $2931 = ((($2930)) + 16|0);
   $2932 = HEAP32[$2931>>2]|0;
   $2933 = (($2932) + ($2929)|0);
   $2934 = HEAP8[$2933>>0]|0;
   $2935 = $1;
   $2936 = ((($2935)) + 2|0);
   HEAP8[$2936>>0] = $2934;
   $2937 = $1;
   $2938 = ((($2937)) + 8|0);
   $2939 = HEAP16[$2938>>1]|0;
   $2940 = $2939&65535;
   $2941 = (($2940) + 1)|0;
   $2942 = $1;
   $2943 = ((($2942)) + 16|0);
   $2944 = HEAP32[$2943>>2]|0;
   $2945 = (($2944) + ($2941)|0);
   $2946 = HEAP8[$2945>>0]|0;
   $2947 = $1;
   $2948 = ((($2947)) + 1|0);
   HEAP8[$2948>>0] = $2946;
   $2949 = $1;
   $2950 = ((($2949)) + 8|0);
   $2951 = HEAP16[$2950>>1]|0;
   $2952 = $2951&65535;
   $2953 = (($2952) + 2)|0;
   $2954 = $2953&65535;
   HEAP16[$2950>>1] = $2954;
   break;
  }
  case 194:  {
   $2955 = $1;
   $2956 = ((($2955)) + 12|0);
   $2957 = HEAP8[$2956>>0]|0;
   $2958 = $2957 & 1;
   $2959 = $2958&255;
   $2960 = (0)==($2959|0);
   if ($2960) {
    $2961 = $opcode;
    $2962 = ((($2961)) + 2|0);
    $2963 = HEAP8[$2962>>0]|0;
    $2964 = $2963&255;
    $2965 = $2964 << 8;
    $2966 = $opcode;
    $2967 = ((($2966)) + 1|0);
    $2968 = HEAP8[$2967>>0]|0;
    $2969 = $2968&255;
    $2970 = $2965 | $2969;
    $2971 = $2970&65535;
    $2972 = $1;
    $2973 = ((($2972)) + 10|0);
    HEAP16[$2973>>1] = $2971;
    break L1;
   } else {
    $2974 = $1;
    $2975 = ((($2974)) + 10|0);
    $2976 = HEAP16[$2975>>1]|0;
    $2977 = $2976&65535;
    $2978 = (($2977) + 2)|0;
    $2979 = $2978&65535;
    HEAP16[$2975>>1] = $2979;
    break L1;
   }
   break;
  }
  case 195:  {
   $2980 = $1;
   $2981 = ((($2980)) + 10|0);
   $2982 = HEAP16[$2981>>1]|0;
   $2983 = $2982&65535;
   $2984 = (($2983) - 1)|0;
   $2985 = $opcode;
   $2986 = ((($2985)) + 2|0);
   $2987 = HEAP8[$2986>>0]|0;
   $2988 = $2987&255;
   $2989 = $2988 << 8;
   $2990 = $opcode;
   $2991 = ((($2990)) + 1|0);
   $2992 = HEAP8[$2991>>0]|0;
   $2993 = $2992&255;
   $2994 = $2989 | $2993;
   $2995 = (($2984) + ($2994))|0;
   $2996 = $2995&65535;
   $2997 = $1;
   $2998 = ((($2997)) + 10|0);
   HEAP16[$2998>>1] = $2996;
   break;
  }
  case 196:  {
   $2999 = $1;
   $3000 = ((($2999)) + 12|0);
   $3001 = HEAP8[$3000>>0]|0;
   $3002 = $3001 & 1;
   $3003 = $3002&255;
   $3004 = (0)==($3003|0);
   $3005 = $1;
   $3006 = ((($3005)) + 10|0);
   $3007 = HEAP16[$3006>>1]|0;
   if ($3004) {
    $pc = $3007;
    $3008 = $pc;
    $3009 = $3008&65535;
    $3010 = $3009 >> 8;
    $3011 = $3010 & 255;
    $3012 = $3011&255;
    $3013 = $1;
    $3014 = ((($3013)) + 8|0);
    $3015 = HEAP16[$3014>>1]|0;
    $3016 = $3015&65535;
    $3017 = (($3016) - 1)|0;
    $3018 = $1;
    $3019 = ((($3018)) + 16|0);
    $3020 = HEAP32[$3019>>2]|0;
    $3021 = (($3020) + ($3017)|0);
    HEAP8[$3021>>0] = $3012;
    $3022 = $pc;
    $3023 = $3022&65535;
    $3024 = $3023 & 255;
    $3025 = $3024&255;
    $3026 = $1;
    $3027 = ((($3026)) + 8|0);
    $3028 = HEAP16[$3027>>1]|0;
    $3029 = $3028&65535;
    $3030 = (($3029) - 2)|0;
    $3031 = $1;
    $3032 = ((($3031)) + 16|0);
    $3033 = HEAP32[$3032>>2]|0;
    $3034 = (($3033) + ($3030)|0);
    HEAP8[$3034>>0] = $3025;
    $3035 = $1;
    $3036 = ((($3035)) + 8|0);
    $3037 = HEAP16[$3036>>1]|0;
    $3038 = $3037&65535;
    $3039 = (($3038) - 2)|0;
    $3040 = $3039&65535;
    $3041 = $1;
    $3042 = ((($3041)) + 8|0);
    HEAP16[$3042>>1] = $3040;
    $3043 = $opcode;
    $3044 = ((($3043)) + 2|0);
    $3045 = HEAP8[$3044>>0]|0;
    $3046 = $3045&255;
    $3047 = $3046 << 8;
    $3048 = $opcode;
    $3049 = ((($3048)) + 1|0);
    $3050 = HEAP8[$3049>>0]|0;
    $3051 = $3050&255;
    $3052 = $3047 | $3051;
    $3053 = $3052&65535;
    $3054 = $1;
    $3055 = ((($3054)) + 10|0);
    HEAP16[$3055>>1] = $3053;
    break L1;
   } else {
    $3056 = $3007&65535;
    $3057 = (($3056) + 2)|0;
    $3058 = $3057&65535;
    HEAP16[$3006>>1] = $3058;
    break L1;
   }
   break;
  }
  case 197:  {
   $3059 = $1;
   $3060 = ((($3059)) + 1|0);
   $3061 = HEAP8[$3060>>0]|0;
   $3062 = $1;
   $3063 = ((($3062)) + 8|0);
   $3064 = HEAP16[$3063>>1]|0;
   $3065 = $3064&65535;
   $3066 = (($3065) - 1)|0;
   $3067 = $1;
   $3068 = ((($3067)) + 16|0);
   $3069 = HEAP32[$3068>>2]|0;
   $3070 = (($3069) + ($3066)|0);
   HEAP8[$3070>>0] = $3061;
   $3071 = $1;
   $3072 = ((($3071)) + 2|0);
   $3073 = HEAP8[$3072>>0]|0;
   $3074 = $1;
   $3075 = ((($3074)) + 8|0);
   $3076 = HEAP16[$3075>>1]|0;
   $3077 = $3076&65535;
   $3078 = (($3077) - 2)|0;
   $3079 = $1;
   $3080 = ((($3079)) + 16|0);
   $3081 = HEAP32[$3080>>2]|0;
   $3082 = (($3081) + ($3078)|0);
   HEAP8[$3082>>0] = $3073;
   $3083 = $1;
   $3084 = ((($3083)) + 8|0);
   $3085 = HEAP16[$3084>>1]|0;
   $3086 = $3085&65535;
   $3087 = (($3086) - 2)|0;
   $3088 = $3087&65535;
   $3089 = $1;
   $3090 = ((($3089)) + 8|0);
   HEAP16[$3090>>1] = $3088;
   break;
  }
  case 198:  {
   $3091 = $1;
   $3092 = HEAP8[$3091>>0]|0;
   $3093 = $3092&255;
   $3094 = $3093&65535;
   $3095 = $opcode;
   $3096 = ((($3095)) + 1|0);
   $3097 = HEAP8[$3096>>0]|0;
   $3098 = $3097&255;
   $3099 = $3098&65535;
   $3100 = (($3094) + ($3099))|0;
   $3101 = $3100&65535;
   $x73 = $3101;
   $3102 = $x73;
   $3103 = $3102&65535;
   $3104 = $3103 & 255;
   $3105 = ($3104|0)==(0);
   $3106 = $3105&1;
   $3107 = $3106&255;
   $3108 = $1;
   $3109 = ((($3108)) + 12|0);
   $3110 = HEAP8[$3109>>0]|0;
   $3111 = $3107 & 1;
   $3112 = $3110 & -2;
   $3113 = $3112 | $3111;
   HEAP8[$3109>>0] = $3113;
   $3114 = $x73;
   $3115 = $3114&65535;
   $3116 = $3115 & 128;
   $3117 = (128)==($3116|0);
   $3118 = $3117&1;
   $3119 = $3118&255;
   $3120 = $1;
   $3121 = ((($3120)) + 12|0);
   $3122 = HEAP8[$3121>>0]|0;
   $3123 = $3119 & 1;
   $3124 = ($3123 << 1)&255;
   $3125 = $3122 & -3;
   $3126 = $3125 | $3124;
   HEAP8[$3121>>0] = $3126;
   $3127 = $x73;
   $3128 = $3127&65535;
   $3129 = $3128 & 255;
   $3130 = (_parity($3129,8)|0);
   $3131 = $3130&255;
   $3132 = $1;
   $3133 = ((($3132)) + 12|0);
   $3134 = HEAP8[$3133>>0]|0;
   $3135 = $3131 & 1;
   $3136 = ($3135 << 2)&255;
   $3137 = $3134 & -5;
   $3138 = $3137 | $3136;
   HEAP8[$3133>>0] = $3138;
   $3139 = $x73;
   $3140 = $3139&65535;
   $3141 = ($3140|0)>(255);
   $3142 = $3141&1;
   $3143 = $3142&255;
   $3144 = $1;
   $3145 = ((($3144)) + 12|0);
   $3146 = HEAP8[$3145>>0]|0;
   $3147 = $3143 & 1;
   $3148 = ($3147 << 3)&255;
   $3149 = $3146 & -9;
   $3150 = $3149 | $3148;
   HEAP8[$3145>>0] = $3150;
   $3151 = $x73;
   $3152 = $3151&255;
   $3153 = $1;
   HEAP8[$3153>>0] = $3152;
   $3154 = $1;
   $3155 = ((($3154)) + 10|0);
   $3156 = HEAP16[$3155>>1]|0;
   $3157 = (($3156) + 1)<<16>>16;
   HEAP16[$3155>>1] = $3157;
   break;
  }
  case 199:  {
   $3158 = $1;
   _UnimplementedInstruction($3158);
   break;
  }
  case 200:  {
   $3159 = $1;
   $3160 = ((($3159)) + 12|0);
   $3161 = HEAP8[$3160>>0]|0;
   $3162 = $3161 & 1;
   $3163 = $3162&255;
   $3164 = (1)==($3163|0);
   if ($3164) {
    $3165 = $1;
    _returnToCaller($3165);
   }
   break;
  }
  case 201:  {
   $3166 = $1;
   _returnToCaller($3166);
   break;
  }
  case 202:  {
   $3167 = $1;
   $3168 = ((($3167)) + 12|0);
   $3169 = HEAP8[$3168>>0]|0;
   $3170 = $3169 & 1;
   $3171 = $3170&255;
   $3172 = (1)==($3171|0);
   if ($3172) {
    $3173 = $opcode;
    $3174 = ((($3173)) + 2|0);
    $3175 = HEAP8[$3174>>0]|0;
    $3176 = $3175&255;
    $3177 = $3176 << 8;
    $3178 = $opcode;
    $3179 = ((($3178)) + 1|0);
    $3180 = HEAP8[$3179>>0]|0;
    $3181 = $3180&255;
    $3182 = $3177 | $3181;
    $3183 = $3182&65535;
    $3184 = $1;
    $3185 = ((($3184)) + 10|0);
    HEAP16[$3185>>1] = $3183;
    break L1;
   } else {
    $3186 = $1;
    $3187 = ((($3186)) + 10|0);
    $3188 = HEAP16[$3187>>1]|0;
    $3189 = $3188&65535;
    $3190 = (($3189) + 2)|0;
    $3191 = $3190&65535;
    HEAP16[$3187>>1] = $3191;
    break L1;
   }
   break;
  }
  case 203:  {
   $3192 = $1;
   _InvalidInstruction($3192);
   break;
  }
  case 204:  {
   $3193 = $1;
   $3194 = ((($3193)) + 12|0);
   $3195 = HEAP8[$3194>>0]|0;
   $3196 = $3195 & 1;
   $3197 = $3196&255;
   $3198 = (1)==($3197|0);
   $3199 = $1;
   if ($3198) {
    $3200 = $opcode;
    $3201 = ((($3200)) + 2|0);
    $3202 = HEAP8[$3201>>0]|0;
    $3203 = $3202&255;
    $3204 = $3203 << 8;
    $3205 = $opcode;
    $3206 = ((($3205)) + 1|0);
    $3207 = HEAP8[$3206>>0]|0;
    $3208 = $3207&255;
    $3209 = $3204 | $3208;
    $3210 = $3209&65535;
    _call($3199,$3210);
    break L1;
   } else {
    $3211 = ((($3199)) + 10|0);
    $3212 = HEAP16[$3211>>1]|0;
    $3213 = $3212&65535;
    $3214 = (($3213) + 2)|0;
    $3215 = $3214&65535;
    HEAP16[$3211>>1] = $3215;
    break L1;
   }
   break;
  }
  case 205:  {
   $3216 = $1;
   $3217 = $opcode;
   $3218 = ((($3217)) + 2|0);
   $3219 = HEAP8[$3218>>0]|0;
   $3220 = $3219&255;
   $3221 = $3220 << 8;
   $3222 = $opcode;
   $3223 = ((($3222)) + 1|0);
   $3224 = HEAP8[$3223>>0]|0;
   $3225 = $3224&255;
   $3226 = $3221 | $3225;
   $3227 = $3226&65535;
   _call($3216,$3227);
   break;
  }
  case 206:  {
   $3228 = $1;
   $3229 = $1;
   $3230 = HEAP8[$3229>>0]|0;
   $3231 = $opcode;
   $3232 = ((($3231)) + 1|0);
   $3233 = HEAP8[$3232>>0]|0;
   $3234 = (_addByteWithCarry($3228,$3230,$3233)|0);
   $3235 = $1;
   HEAP8[$3235>>0] = $3234;
   $3236 = $1;
   $3237 = ((($3236)) + 10|0);
   $3238 = HEAP16[$3237>>1]|0;
   $3239 = (($3238) + 1)<<16>>16;
   HEAP16[$3237>>1] = $3239;
   break;
  }
  case 207:  {
   $3240 = $1;
   _UnimplementedInstruction($3240);
   break;
  }
  case 208:  {
   $3241 = $1;
   $3242 = ((($3241)) + 12|0);
   $3243 = HEAP8[$3242>>0]|0;
   $3244 = ($3243&255) >>> 3;
   $3245 = $3244 & 1;
   $3246 = $3245&255;
   $3247 = (0)==($3246|0);
   if ($3247) {
    $3248 = $1;
    _returnToCaller($3248);
   }
   break;
  }
  case 209:  {
   $3249 = $1;
   $3250 = ((($3249)) + 8|0);
   $3251 = HEAP16[$3250>>1]|0;
   $3252 = $3251&65535;
   $3253 = $1;
   $3254 = ((($3253)) + 16|0);
   $3255 = HEAP32[$3254>>2]|0;
   $3256 = (($3255) + ($3252)|0);
   $3257 = HEAP8[$3256>>0]|0;
   $3258 = $1;
   $3259 = ((($3258)) + 4|0);
   HEAP8[$3259>>0] = $3257;
   $3260 = $1;
   $3261 = ((($3260)) + 8|0);
   $3262 = HEAP16[$3261>>1]|0;
   $3263 = $3262&65535;
   $3264 = (($3263) + 1)|0;
   $3265 = $1;
   $3266 = ((($3265)) + 16|0);
   $3267 = HEAP32[$3266>>2]|0;
   $3268 = (($3267) + ($3264)|0);
   $3269 = HEAP8[$3268>>0]|0;
   $3270 = $1;
   $3271 = ((($3270)) + 3|0);
   HEAP8[$3271>>0] = $3269;
   $3272 = $1;
   $3273 = ((($3272)) + 8|0);
   $3274 = HEAP16[$3273>>1]|0;
   $3275 = $3274&65535;
   $3276 = (($3275) + 2)|0;
   $3277 = $3276&65535;
   HEAP16[$3273>>1] = $3277;
   break;
  }
  case 210:  {
   $3278 = $1;
   _UnimplementedInstruction($3278);
   break;
  }
  case 211:  {
   $3279 = $1;
   $3280 = ((($3279)) + 10|0);
   $3281 = HEAP16[$3280>>1]|0;
   $3282 = (($3281) + 1)<<16>>16;
   HEAP16[$3280>>1] = $3282;
   break;
  }
  case 212:  {
   $3283 = $1;
   $3284 = ((($3283)) + 12|0);
   $3285 = HEAP8[$3284>>0]|0;
   $3286 = ($3285&255) >>> 3;
   $3287 = $3286 & 1;
   $3288 = $3287&255;
   $3289 = (0)==($3288|0);
   $3290 = $1;
   if ($3289) {
    $3291 = $opcode;
    $3292 = ((($3291)) + 2|0);
    $3293 = HEAP8[$3292>>0]|0;
    $3294 = $3293&255;
    $3295 = $3294 << 8;
    $3296 = $opcode;
    $3297 = ((($3296)) + 1|0);
    $3298 = HEAP8[$3297>>0]|0;
    $3299 = $3298&255;
    $3300 = $3295 | $3299;
    $3301 = $3300&65535;
    _call($3290,$3301);
    break L1;
   } else {
    $3302 = ((($3290)) + 10|0);
    $3303 = HEAP16[$3302>>1]|0;
    $3304 = $3303&65535;
    $3305 = (($3304) + 2)|0;
    $3306 = $3305&65535;
    HEAP16[$3302>>1] = $3306;
    break L1;
   }
   break;
  }
  case 213:  {
   $3307 = $1;
   $3308 = ((($3307)) + 3|0);
   $3309 = HEAP8[$3308>>0]|0;
   $3310 = $1;
   $3311 = ((($3310)) + 8|0);
   $3312 = HEAP16[$3311>>1]|0;
   $3313 = $3312&65535;
   $3314 = (($3313) - 1)|0;
   $3315 = $1;
   $3316 = ((($3315)) + 16|0);
   $3317 = HEAP32[$3316>>2]|0;
   $3318 = (($3317) + ($3314)|0);
   HEAP8[$3318>>0] = $3309;
   $3319 = $1;
   $3320 = ((($3319)) + 4|0);
   $3321 = HEAP8[$3320>>0]|0;
   $3322 = $1;
   $3323 = ((($3322)) + 8|0);
   $3324 = HEAP16[$3323>>1]|0;
   $3325 = $3324&65535;
   $3326 = (($3325) - 2)|0;
   $3327 = $1;
   $3328 = ((($3327)) + 16|0);
   $3329 = HEAP32[$3328>>2]|0;
   $3330 = (($3329) + ($3326)|0);
   HEAP8[$3330>>0] = $3321;
   $3331 = $1;
   $3332 = ((($3331)) + 8|0);
   $3333 = HEAP16[$3332>>1]|0;
   $3334 = $3333&65535;
   $3335 = (($3334) - 2)|0;
   $3336 = $3335&65535;
   $3337 = $1;
   $3338 = ((($3337)) + 8|0);
   HEAP16[$3338>>1] = $3336;
   break;
  }
  case 214:  {
   $3339 = $1;
   $3340 = $1;
   $3341 = HEAP8[$3340>>0]|0;
   $3342 = $opcode;
   $3343 = ((($3342)) + 1|0);
   $3344 = HEAP8[$3343>>0]|0;
   $3345 = (_subtractByte($3339,$3341,$3344)|0);
   $3346 = $1;
   HEAP8[$3346>>0] = $3345;
   $3347 = $1;
   $3348 = ((($3347)) + 10|0);
   $3349 = HEAP16[$3348>>1]|0;
   $3350 = (($3349) + 1)<<16>>16;
   HEAP16[$3348>>1] = $3350;
   break;
  }
  case 215:  {
   $3351 = $1;
   _UnimplementedInstruction($3351);
   break;
  }
  case 216:  {
   $3352 = $1;
   $3353 = ((($3352)) + 12|0);
   $3354 = HEAP8[$3353>>0]|0;
   $3355 = ($3354&255) >>> 3;
   $3356 = $3355 & 1;
   $3357 = $3356&255;
   $3358 = (1)==($3357|0);
   if ($3358) {
    $3359 = $1;
    _returnToCaller($3359);
   }
   break;
  }
  case 217:  {
   $3360 = $1;
   _InvalidInstruction($3360);
   break;
  }
  case 218:  {
   $3361 = $1;
   $3362 = ((($3361)) + 12|0);
   $3363 = HEAP8[$3362>>0]|0;
   $3364 = ($3363&255) >>> 3;
   $3365 = $3364 & 1;
   $3366 = $3365&255;
   $3367 = (1)==($3366|0);
   if ($3367) {
    $3368 = $opcode;
    $3369 = ((($3368)) + 2|0);
    $3370 = HEAP8[$3369>>0]|0;
    $3371 = $3370&255;
    $3372 = $3371 << 8;
    $3373 = $opcode;
    $3374 = ((($3373)) + 1|0);
    $3375 = HEAP8[$3374>>0]|0;
    $3376 = $3375&255;
    $3377 = $3372 | $3376;
    $3378 = $3377&65535;
    $3379 = $1;
    $3380 = ((($3379)) + 10|0);
    HEAP16[$3380>>1] = $3378;
    break L1;
   } else {
    $3381 = $1;
    $3382 = ((($3381)) + 10|0);
    $3383 = HEAP16[$3382>>1]|0;
    $3384 = $3383&65535;
    $3385 = (($3384) + 2)|0;
    $3386 = $3385&65535;
    HEAP16[$3382>>1] = $3386;
    break L1;
   }
   break;
  }
  case 219:  {
   $3387 = $1;
   _UnimplementedInstruction($3387);
   break;
  }
  case 220:  {
   $3388 = $1;
   $3389 = ((($3388)) + 12|0);
   $3390 = HEAP8[$3389>>0]|0;
   $3391 = ($3390&255) >>> 3;
   $3392 = $3391 & 1;
   $3393 = $3392&255;
   $3394 = (1)==($3393|0);
   $3395 = $1;
   if ($3394) {
    $3396 = $opcode;
    $3397 = ((($3396)) + 2|0);
    $3398 = HEAP8[$3397>>0]|0;
    $3399 = $3398&255;
    $3400 = $3399 << 8;
    $3401 = $opcode;
    $3402 = ((($3401)) + 1|0);
    $3403 = HEAP8[$3402>>0]|0;
    $3404 = $3403&255;
    $3405 = $3400 | $3404;
    $3406 = $3405&65535;
    _call($3395,$3406);
    break L1;
   } else {
    $3407 = ((($3395)) + 10|0);
    $3408 = HEAP16[$3407>>1]|0;
    $3409 = $3408&65535;
    $3410 = (($3409) + 2)|0;
    $3411 = $3410&65535;
    HEAP16[$3407>>1] = $3411;
    break L1;
   }
   break;
  }
  case 221:  {
   $3412 = $1;
   _InvalidInstruction($3412);
   break;
  }
  case 222:  {
   $3413 = $1;
   $3414 = $1;
   $3415 = HEAP8[$3414>>0]|0;
   $3416 = $opcode;
   $3417 = ((($3416)) + 1|0);
   $3418 = HEAP8[$3417>>0]|0;
   $3419 = (_subtractByteWithBorrow($3413,$3415,$3418)|0);
   $3420 = $1;
   HEAP8[$3420>>0] = $3419;
   $3421 = $1;
   $3422 = ((($3421)) + 10|0);
   $3423 = HEAP16[$3422>>1]|0;
   $3424 = (($3423) + 1)<<16>>16;
   HEAP16[$3422>>1] = $3424;
   break;
  }
  case 223:  {
   $3425 = $1;
   _UnimplementedInstruction($3425);
   break;
  }
  case 224:  {
   $3426 = $1;
   $3427 = ((($3426)) + 12|0);
   $3428 = HEAP8[$3427>>0]|0;
   $3429 = ($3428&255) >>> 3;
   $3430 = $3429 & 1;
   $3431 = $3430&255;
   $3432 = (0)==($3431|0);
   if ($3432) {
    $3433 = $1;
    _returnToCaller($3433);
   }
   break;
  }
  case 225:  {
   $3434 = $1;
   $3435 = ((($3434)) + 8|0);
   $3436 = HEAP16[$3435>>1]|0;
   $3437 = $3436&65535;
   $3438 = $1;
   $3439 = ((($3438)) + 16|0);
   $3440 = HEAP32[$3439>>2]|0;
   $3441 = (($3440) + ($3437)|0);
   $3442 = HEAP8[$3441>>0]|0;
   $3443 = $1;
   $3444 = ((($3443)) + 6|0);
   HEAP8[$3444>>0] = $3442;
   $3445 = $1;
   $3446 = ((($3445)) + 8|0);
   $3447 = HEAP16[$3446>>1]|0;
   $3448 = $3447&65535;
   $3449 = (($3448) + 1)|0;
   $3450 = $1;
   $3451 = ((($3450)) + 16|0);
   $3452 = HEAP32[$3451>>2]|0;
   $3453 = (($3452) + ($3449)|0);
   $3454 = HEAP8[$3453>>0]|0;
   $3455 = $1;
   $3456 = ((($3455)) + 5|0);
   HEAP8[$3456>>0] = $3454;
   $3457 = $1;
   $3458 = ((($3457)) + 8|0);
   $3459 = HEAP16[$3458>>1]|0;
   $3460 = $3459&65535;
   $3461 = (($3460) + 2)|0;
   $3462 = $3461&65535;
   HEAP16[$3458>>1] = $3462;
   break;
  }
  case 226:  {
   $3463 = $1;
   $3464 = ((($3463)) + 12|0);
   $3465 = HEAP8[$3464>>0]|0;
   $3466 = ($3465&255) >>> 2;
   $3467 = $3466 & 1;
   $3468 = $3467&255;
   $3469 = (0)==($3468|0);
   if ($3469) {
    $3470 = $opcode;
    $3471 = ((($3470)) + 2|0);
    $3472 = HEAP8[$3471>>0]|0;
    $3473 = $3472&255;
    $3474 = $3473 << 8;
    $3475 = $opcode;
    $3476 = ((($3475)) + 1|0);
    $3477 = HEAP8[$3476>>0]|0;
    $3478 = $3477&255;
    $3479 = $3474 | $3478;
    $3480 = $3479&65535;
    $3481 = $1;
    $3482 = ((($3481)) + 10|0);
    HEAP16[$3482>>1] = $3480;
    break L1;
   } else {
    $3483 = $1;
    $3484 = ((($3483)) + 10|0);
    $3485 = HEAP16[$3484>>1]|0;
    $3486 = $3485&65535;
    $3487 = (($3486) + 2)|0;
    $3488 = $3487&65535;
    HEAP16[$3484>>1] = $3488;
    break L1;
   }
   break;
  }
  case 227:  {
   $3489 = $1;
   $3490 = ((($3489)) + 8|0);
   $3491 = HEAP16[$3490>>1]|0;
   $3492 = $3491&65535;
   $3493 = $1;
   $3494 = ((($3493)) + 16|0);
   $3495 = HEAP32[$3494>>2]|0;
   $3496 = (($3495) + ($3492)|0);
   $3497 = HEAP8[$3496>>0]|0;
   $3498 = $3497&255;
   $spL = $3498;
   $3499 = $1;
   $3500 = ((($3499)) + 8|0);
   $3501 = HEAP16[$3500>>1]|0;
   $3502 = $3501&65535;
   $3503 = (($3502) + 1)|0;
   $3504 = $1;
   $3505 = ((($3504)) + 16|0);
   $3506 = HEAP32[$3505>>2]|0;
   $3507 = (($3506) + ($3503)|0);
   $3508 = HEAP8[$3507>>0]|0;
   $3509 = $3508&255;
   $spH = $3509;
   $3510 = $1;
   $3511 = ((($3510)) + 6|0);
   $3512 = HEAP8[$3511>>0]|0;
   $3513 = $1;
   $3514 = ((($3513)) + 8|0);
   $3515 = HEAP16[$3514>>1]|0;
   $3516 = $3515&65535;
   $3517 = $1;
   $3518 = ((($3517)) + 16|0);
   $3519 = HEAP32[$3518>>2]|0;
   $3520 = (($3519) + ($3516)|0);
   HEAP8[$3520>>0] = $3512;
   $3521 = $1;
   $3522 = ((($3521)) + 5|0);
   $3523 = HEAP8[$3522>>0]|0;
   $3524 = $1;
   $3525 = ((($3524)) + 8|0);
   $3526 = HEAP16[$3525>>1]|0;
   $3527 = $3526&65535;
   $3528 = (($3527) + 1)|0;
   $3529 = $1;
   $3530 = ((($3529)) + 16|0);
   $3531 = HEAP32[$3530>>2]|0;
   $3532 = (($3531) + ($3528)|0);
   HEAP8[$3532>>0] = $3523;
   $3533 = $spH;
   $3534 = $3533&255;
   $3535 = $1;
   $3536 = ((($3535)) + 5|0);
   HEAP8[$3536>>0] = $3534;
   $3537 = $spL;
   $3538 = $3537&255;
   $3539 = $1;
   $3540 = ((($3539)) + 6|0);
   HEAP8[$3540>>0] = $3538;
   break;
  }
  case 228:  {
   $3541 = $1;
   $3542 = ((($3541)) + 12|0);
   $3543 = HEAP8[$3542>>0]|0;
   $3544 = ($3543&255) >>> 2;
   $3545 = $3544 & 1;
   $3546 = $3545&255;
   $3547 = (0)==($3546|0);
   $3548 = $1;
   if ($3547) {
    $3549 = $opcode;
    $3550 = ((($3549)) + 2|0);
    $3551 = HEAP8[$3550>>0]|0;
    $3552 = $3551&255;
    $3553 = $3552 << 8;
    $3554 = $opcode;
    $3555 = ((($3554)) + 1|0);
    $3556 = HEAP8[$3555>>0]|0;
    $3557 = $3556&255;
    $3558 = $3553 | $3557;
    $3559 = $3558&65535;
    _call($3548,$3559);
    break L1;
   } else {
    $3560 = ((($3548)) + 10|0);
    $3561 = HEAP16[$3560>>1]|0;
    $3562 = $3561&65535;
    $3563 = (($3562) + 2)|0;
    $3564 = $3563&65535;
    HEAP16[$3560>>1] = $3564;
    break L1;
   }
   break;
  }
  case 229:  {
   $3565 = $1;
   $3566 = ((($3565)) + 5|0);
   $3567 = HEAP8[$3566>>0]|0;
   $3568 = $1;
   $3569 = ((($3568)) + 8|0);
   $3570 = HEAP16[$3569>>1]|0;
   $3571 = $3570&65535;
   $3572 = (($3571) - 1)|0;
   $3573 = $1;
   $3574 = ((($3573)) + 16|0);
   $3575 = HEAP32[$3574>>2]|0;
   $3576 = (($3575) + ($3572)|0);
   HEAP8[$3576>>0] = $3567;
   $3577 = $1;
   $3578 = ((($3577)) + 6|0);
   $3579 = HEAP8[$3578>>0]|0;
   $3580 = $1;
   $3581 = ((($3580)) + 8|0);
   $3582 = HEAP16[$3581>>1]|0;
   $3583 = $3582&65535;
   $3584 = (($3583) - 2)|0;
   $3585 = $1;
   $3586 = ((($3585)) + 16|0);
   $3587 = HEAP32[$3586>>2]|0;
   $3588 = (($3587) + ($3584)|0);
   HEAP8[$3588>>0] = $3579;
   $3589 = $1;
   $3590 = ((($3589)) + 8|0);
   $3591 = HEAP16[$3590>>1]|0;
   $3592 = $3591&65535;
   $3593 = (($3592) - 2)|0;
   $3594 = $3593&65535;
   $3595 = $1;
   $3596 = ((($3595)) + 8|0);
   HEAP16[$3596>>1] = $3594;
   break;
  }
  case 230:  {
   $3597 = $1;
   $3598 = HEAP8[$3597>>0]|0;
   $3599 = $3598&255;
   $3600 = $opcode;
   $3601 = ((($3600)) + 1|0);
   $3602 = HEAP8[$3601>>0]|0;
   $3603 = $3602&255;
   $3604 = $3599 & $3603;
   $3605 = $3604&255;
   $3606 = $1;
   HEAP8[$3606>>0] = $3605;
   $3607 = $1;
   _LogicFlagsA($3607,1);
   $3608 = $1;
   $3609 = ((($3608)) + 10|0);
   $3610 = HEAP16[$3609>>1]|0;
   $3611 = (($3610) + 1)<<16>>16;
   HEAP16[$3609>>1] = $3611;
   break;
  }
  case 231:  {
   $3612 = $1;
   _UnimplementedInstruction($3612);
   break;
  }
  case 232:  {
   $3613 = $1;
   $3614 = ((($3613)) + 12|0);
   $3615 = HEAP8[$3614>>0]|0;
   $3616 = ($3615&255) >>> 3;
   $3617 = $3616 & 1;
   $3618 = $3617&255;
   $3619 = (0)==($3618|0);
   if ($3619) {
    $3620 = $1;
    _returnToCaller($3620);
   }
   break;
  }
  case 233:  {
   $3621 = $1;
   $3622 = ((($3621)) + 5|0);
   $3623 = HEAP8[$3622>>0]|0;
   $3624 = $3623&255;
   $3625 = $3624 << 8;
   $3626 = $1;
   $3627 = ((($3626)) + 6|0);
   $3628 = HEAP8[$3627>>0]|0;
   $3629 = $3628&255;
   $3630 = $3625 | $3629;
   $3631 = $3630&65535;
   $3632 = $1;
   $3633 = ((($3632)) + 10|0);
   HEAP16[$3633>>1] = $3631;
   break;
  }
  case 234:  {
   $3634 = $1;
   $3635 = ((($3634)) + 12|0);
   $3636 = HEAP8[$3635>>0]|0;
   $3637 = ($3636&255) >>> 2;
   $3638 = $3637 & 1;
   $3639 = $3638&255;
   $3640 = (1)==($3639|0);
   if ($3640) {
    $3641 = $opcode;
    $3642 = ((($3641)) + 2|0);
    $3643 = HEAP8[$3642>>0]|0;
    $3644 = $3643&255;
    $3645 = $3644 << 8;
    $3646 = $opcode;
    $3647 = ((($3646)) + 1|0);
    $3648 = HEAP8[$3647>>0]|0;
    $3649 = $3648&255;
    $3650 = $3645 | $3649;
    $3651 = $3650&65535;
    $3652 = $1;
    $3653 = ((($3652)) + 10|0);
    HEAP16[$3653>>1] = $3651;
    break L1;
   } else {
    $3654 = $1;
    $3655 = ((($3654)) + 10|0);
    $3656 = HEAP16[$3655>>1]|0;
    $3657 = $3656&65535;
    $3658 = (($3657) + 2)|0;
    $3659 = $3658&65535;
    HEAP16[$3655>>1] = $3659;
    break L1;
   }
   break;
  }
  case 235:  {
   $3660 = $1;
   $3661 = ((($3660)) + 3|0);
   $3662 = HEAP8[$3661>>0]|0;
   $save1 = $3662;
   $3663 = $1;
   $3664 = ((($3663)) + 4|0);
   $3665 = HEAP8[$3664>>0]|0;
   $save2 = $3665;
   $3666 = $1;
   $3667 = ((($3666)) + 5|0);
   $3668 = HEAP8[$3667>>0]|0;
   $3669 = $1;
   $3670 = ((($3669)) + 3|0);
   HEAP8[$3670>>0] = $3668;
   $3671 = $1;
   $3672 = ((($3671)) + 6|0);
   $3673 = HEAP8[$3672>>0]|0;
   $3674 = $1;
   $3675 = ((($3674)) + 4|0);
   HEAP8[$3675>>0] = $3673;
   $3676 = $save1;
   $3677 = $1;
   $3678 = ((($3677)) + 5|0);
   HEAP8[$3678>>0] = $3676;
   $3679 = $save2;
   $3680 = $1;
   $3681 = ((($3680)) + 6|0);
   HEAP8[$3681>>0] = $3679;
   break;
  }
  case 236:  {
   $3682 = $1;
   $3683 = ((($3682)) + 12|0);
   $3684 = HEAP8[$3683>>0]|0;
   $3685 = ($3684&255) >>> 2;
   $3686 = $3685 & 1;
   $3687 = $3686&255;
   $3688 = (1)==($3687|0);
   $3689 = $1;
   if ($3688) {
    $3690 = $opcode;
    $3691 = ((($3690)) + 2|0);
    $3692 = HEAP8[$3691>>0]|0;
    $3693 = $3692&255;
    $3694 = $3693 << 8;
    $3695 = $opcode;
    $3696 = ((($3695)) + 1|0);
    $3697 = HEAP8[$3696>>0]|0;
    $3698 = $3697&255;
    $3699 = $3694 | $3698;
    $3700 = $3699&65535;
    _call($3689,$3700);
    break L1;
   } else {
    $3701 = ((($3689)) + 10|0);
    $3702 = HEAP16[$3701>>1]|0;
    $3703 = $3702&65535;
    $3704 = (($3703) + 2)|0;
    $3705 = $3704&65535;
    HEAP16[$3701>>1] = $3705;
    break L1;
   }
   break;
  }
  case 237:  {
   $3706 = $1;
   _InvalidInstruction($3706);
   break;
  }
  case 238:  {
   $3707 = $1;
   $3708 = HEAP8[$3707>>0]|0;
   $3709 = $3708&255;
   $3710 = $opcode;
   $3711 = ((($3710)) + 1|0);
   $3712 = HEAP8[$3711>>0]|0;
   $3713 = $3712&255;
   $3714 = $3709 ^ $3713;
   $3715 = $3714&255;
   $3716 = $1;
   HEAP8[$3716>>0] = $3715;
   $3717 = $1;
   _LogicFlagsA($3717,0);
   $3718 = $1;
   $3719 = ((($3718)) + 10|0);
   $3720 = HEAP16[$3719>>1]|0;
   $3721 = (($3720) + 1)<<16>>16;
   HEAP16[$3719>>1] = $3721;
   break;
  }
  case 239:  {
   $3722 = $1;
   _UnimplementedInstruction($3722);
   break;
  }
  case 240:  {
   $3723 = $1;
   $3724 = ((($3723)) + 12|0);
   $3725 = HEAP8[$3724>>0]|0;
   $3726 = ($3725&255) >>> 1;
   $3727 = $3726 & 1;
   $3728 = $3727&255;
   $3729 = (0)==($3728|0);
   if ($3729) {
    $3730 = $1;
    _returnToCaller($3730);
   }
   break;
  }
  case 241:  {
   $3731 = $1;
   $3732 = ((($3731)) + 8|0);
   $3733 = HEAP16[$3732>>1]|0;
   $3734 = $3733&65535;
   $3735 = (($3734) + 1)|0;
   $3736 = $1;
   $3737 = ((($3736)) + 16|0);
   $3738 = HEAP32[$3737>>2]|0;
   $3739 = (($3738) + ($3735)|0);
   $3740 = HEAP8[$3739>>0]|0;
   $3741 = $1;
   HEAP8[$3741>>0] = $3740;
   $3742 = $1;
   $3743 = ((($3742)) + 8|0);
   $3744 = HEAP16[$3743>>1]|0;
   $3745 = $3744&65535;
   $3746 = $1;
   $3747 = ((($3746)) + 16|0);
   $3748 = HEAP32[$3747>>2]|0;
   $3749 = (($3748) + ($3745)|0);
   $3750 = HEAP8[$3749>>0]|0;
   $psw = $3750;
   $3751 = $psw;
   $3752 = $3751&255;
   $3753 = $3752 & 1;
   $3754 = (1)==($3753|0);
   $3755 = $3754&1;
   $3756 = $3755&255;
   $3757 = $1;
   $3758 = ((($3757)) + 12|0);
   $3759 = HEAP8[$3758>>0]|0;
   $3760 = $3756 & 1;
   $3761 = $3759 & -2;
   $3762 = $3761 | $3760;
   HEAP8[$3758>>0] = $3762;
   $3763 = $psw;
   $3764 = $3763&255;
   $3765 = $3764 & 2;
   $3766 = (2)==($3765|0);
   $3767 = $3766&1;
   $3768 = $3767&255;
   $3769 = $1;
   $3770 = ((($3769)) + 12|0);
   $3771 = HEAP8[$3770>>0]|0;
   $3772 = $3768 & 1;
   $3773 = ($3772 << 1)&255;
   $3774 = $3771 & -3;
   $3775 = $3774 | $3773;
   HEAP8[$3770>>0] = $3775;
   $3776 = $psw;
   $3777 = $3776&255;
   $3778 = $3777 & 4;
   $3779 = (4)==($3778|0);
   $3780 = $3779&1;
   $3781 = $3780&255;
   $3782 = $1;
   $3783 = ((($3782)) + 12|0);
   $3784 = HEAP8[$3783>>0]|0;
   $3785 = $3781 & 1;
   $3786 = ($3785 << 2)&255;
   $3787 = $3784 & -5;
   $3788 = $3787 | $3786;
   HEAP8[$3783>>0] = $3788;
   $3789 = $psw;
   $3790 = $3789&255;
   $3791 = $3790 & 8;
   $3792 = (5)==($3791|0);
   $3793 = $3792&1;
   $3794 = $3793&255;
   $3795 = $1;
   $3796 = ((($3795)) + 12|0);
   $3797 = HEAP8[$3796>>0]|0;
   $3798 = $3794 & 1;
   $3799 = ($3798 << 3)&255;
   $3800 = $3797 & -9;
   $3801 = $3800 | $3799;
   HEAP8[$3796>>0] = $3801;
   $3802 = $psw;
   $3803 = $3802&255;
   $3804 = $3803 & 16;
   $3805 = (16)==($3804|0);
   $3806 = $3805&1;
   $3807 = $3806&255;
   $3808 = $1;
   $3809 = ((($3808)) + 12|0);
   $3810 = HEAP8[$3809>>0]|0;
   $3811 = $3807 & 1;
   $3812 = ($3811 << 4)&255;
   $3813 = $3810 & -17;
   $3814 = $3813 | $3812;
   HEAP8[$3809>>0] = $3814;
   $3815 = $1;
   $3816 = ((($3815)) + 8|0);
   $3817 = HEAP16[$3816>>1]|0;
   $3818 = $3817&65535;
   $3819 = (($3818) + 2)|0;
   $3820 = $3819&65535;
   HEAP16[$3816>>1] = $3820;
   break;
  }
  case 242:  {
   $3821 = $1;
   $3822 = ((($3821)) + 12|0);
   $3823 = HEAP8[$3822>>0]|0;
   $3824 = ($3823&255) >>> 1;
   $3825 = $3824 & 1;
   $3826 = $3825&255;
   $3827 = (0)==($3826|0);
   if ($3827) {
    $3828 = $opcode;
    $3829 = ((($3828)) + 2|0);
    $3830 = HEAP8[$3829>>0]|0;
    $3831 = $3830&255;
    $3832 = $3831 << 8;
    $3833 = $opcode;
    $3834 = ((($3833)) + 1|0);
    $3835 = HEAP8[$3834>>0]|0;
    $3836 = $3835&255;
    $3837 = $3832 | $3836;
    $3838 = $3837&65535;
    $3839 = $1;
    $3840 = ((($3839)) + 10|0);
    HEAP16[$3840>>1] = $3838;
    break L1;
   } else {
    $3841 = $1;
    $3842 = ((($3841)) + 10|0);
    $3843 = HEAP16[$3842>>1]|0;
    $3844 = $3843&65535;
    $3845 = (($3844) + 2)|0;
    $3846 = $3845&65535;
    HEAP16[$3842>>1] = $3846;
    break L1;
   }
   break;
  }
  case 243:  {
   $3847 = $1;
   _UnimplementedInstruction($3847);
   break;
  }
  case 244:  {
   $3848 = $1;
   $3849 = ((($3848)) + 12|0);
   $3850 = HEAP8[$3849>>0]|0;
   $3851 = ($3850&255) >>> 1;
   $3852 = $3851 & 1;
   $3853 = $3852&255;
   $3854 = (0)==($3853|0);
   $3855 = $1;
   if ($3854) {
    $3856 = $opcode;
    $3857 = ((($3856)) + 2|0);
    $3858 = HEAP8[$3857>>0]|0;
    $3859 = $3858&255;
    $3860 = $3859 << 8;
    $3861 = $opcode;
    $3862 = ((($3861)) + 1|0);
    $3863 = HEAP8[$3862>>0]|0;
    $3864 = $3863&255;
    $3865 = $3860 | $3864;
    $3866 = $3865&65535;
    _call($3855,$3866);
    break L1;
   } else {
    $3867 = ((($3855)) + 10|0);
    $3868 = HEAP16[$3867>>1]|0;
    $3869 = $3868&65535;
    $3870 = (($3869) + 2)|0;
    $3871 = $3870&65535;
    HEAP16[$3867>>1] = $3871;
    break L1;
   }
   break;
  }
  case 245:  {
   $3872 = $1;
   $3873 = HEAP8[$3872>>0]|0;
   $3874 = $1;
   $3875 = ((($3874)) + 8|0);
   $3876 = HEAP16[$3875>>1]|0;
   $3877 = $3876&65535;
   $3878 = (($3877) - 1)|0;
   $3879 = $1;
   $3880 = ((($3879)) + 16|0);
   $3881 = HEAP32[$3880>>2]|0;
   $3882 = (($3881) + ($3878)|0);
   HEAP8[$3882>>0] = $3873;
   $3883 = $1;
   $3884 = ((($3883)) + 12|0);
   $3885 = HEAP8[$3884>>0]|0;
   $3886 = $3885 & 1;
   $3887 = $3886&255;
   $3888 = $1;
   $3889 = ((($3888)) + 12|0);
   $3890 = HEAP8[$3889>>0]|0;
   $3891 = ($3890&255) >>> 1;
   $3892 = $3891 & 1;
   $3893 = $3892&255;
   $3894 = $3893 << 1;
   $3895 = $3887 | $3894;
   $3896 = $1;
   $3897 = ((($3896)) + 12|0);
   $3898 = HEAP8[$3897>>0]|0;
   $3899 = ($3898&255) >>> 2;
   $3900 = $3899 & 1;
   $3901 = $3900&255;
   $3902 = $3901 << 2;
   $3903 = $3895 | $3902;
   $3904 = $1;
   $3905 = ((($3904)) + 12|0);
   $3906 = HEAP8[$3905>>0]|0;
   $3907 = ($3906&255) >>> 3;
   $3908 = $3907 & 1;
   $3909 = $3908&255;
   $3910 = $3909 << 3;
   $3911 = $3903 | $3910;
   $3912 = $1;
   $3913 = ((($3912)) + 12|0);
   $3914 = HEAP8[$3913>>0]|0;
   $3915 = ($3914&255) >>> 4;
   $3916 = $3915 & 1;
   $3917 = $3916&255;
   $3918 = $3917 << 4;
   $3919 = $3911 | $3918;
   $3920 = $3919&255;
   $psw74 = $3920;
   $3921 = $psw74;
   $3922 = $1;
   $3923 = ((($3922)) + 8|0);
   $3924 = HEAP16[$3923>>1]|0;
   $3925 = $3924&65535;
   $3926 = (($3925) - 2)|0;
   $3927 = $1;
   $3928 = ((($3927)) + 16|0);
   $3929 = HEAP32[$3928>>2]|0;
   $3930 = (($3929) + ($3926)|0);
   HEAP8[$3930>>0] = $3921;
   $3931 = $1;
   $3932 = ((($3931)) + 8|0);
   $3933 = HEAP16[$3932>>1]|0;
   $3934 = $3933&65535;
   $3935 = (($3934) - 2)|0;
   $3936 = $3935&65535;
   $3937 = $1;
   $3938 = ((($3937)) + 8|0);
   HEAP16[$3938>>1] = $3936;
   break;
  }
  case 246:  {
   $3939 = $1;
   $3940 = HEAP8[$3939>>0]|0;
   $3941 = $3940&255;
   $3942 = $opcode;
   $3943 = ((($3942)) + 1|0);
   $3944 = HEAP8[$3943>>0]|0;
   $3945 = $3944&255;
   $3946 = $3941 | $3945;
   $3947 = $3946&255;
   $3948 = $1;
   HEAP8[$3948>>0] = $3947;
   $3949 = $1;
   _LogicFlagsA($3949,0);
   $3950 = $1;
   $3951 = ((($3950)) + 10|0);
   $3952 = HEAP16[$3951>>1]|0;
   $3953 = (($3952) + 1)<<16>>16;
   HEAP16[$3951>>1] = $3953;
   break;
  }
  case 247:  {
   $3954 = $1;
   _UnimplementedInstruction($3954);
   break;
  }
  case 248:  {
   $3955 = $1;
   $3956 = ((($3955)) + 12|0);
   $3957 = HEAP8[$3956>>0]|0;
   $3958 = ($3957&255) >>> 1;
   $3959 = $3958 & 1;
   $3960 = $3959&255;
   $3961 = (1)==($3960|0);
   if ($3961) {
    $3962 = $1;
    _returnToCaller($3962);
   }
   break;
  }
  case 249:  {
   $3963 = $1;
   $3964 = ((($3963)) + 5|0);
   $3965 = HEAP8[$3964>>0]|0;
   $3966 = $3965&255;
   $3967 = $3966 << 8;
   $3968 = $1;
   $3969 = ((($3968)) + 6|0);
   $3970 = HEAP8[$3969>>0]|0;
   $3971 = $3970&255;
   $3972 = $3967 | $3971;
   $3973 = $3972&65535;
   $3974 = $1;
   $3975 = ((($3974)) + 8|0);
   HEAP16[$3975>>1] = $3973;
   break;
  }
  case 250:  {
   $3976 = $1;
   $3977 = ((($3976)) + 12|0);
   $3978 = HEAP8[$3977>>0]|0;
   $3979 = ($3978&255) >>> 1;
   $3980 = $3979 & 1;
   $3981 = $3980&255;
   $3982 = (1)==($3981|0);
   if ($3982) {
    $3983 = $opcode;
    $3984 = ((($3983)) + 2|0);
    $3985 = HEAP8[$3984>>0]|0;
    $3986 = $3985&255;
    $3987 = $3986 << 8;
    $3988 = $opcode;
    $3989 = ((($3988)) + 1|0);
    $3990 = HEAP8[$3989>>0]|0;
    $3991 = $3990&255;
    $3992 = $3987 | $3991;
    $3993 = $3992&65535;
    $3994 = $1;
    $3995 = ((($3994)) + 10|0);
    HEAP16[$3995>>1] = $3993;
    break L1;
   } else {
    $3996 = $1;
    $3997 = ((($3996)) + 10|0);
    $3998 = HEAP16[$3997>>1]|0;
    $3999 = $3998&65535;
    $4000 = (($3999) + 2)|0;
    $4001 = $4000&65535;
    HEAP16[$3997>>1] = $4001;
    break L1;
   }
   break;
  }
  case 251:  {
   $4002 = $1;
   $4003 = ((($4002)) + 13|0);
   HEAP8[$4003>>0] = 1;
   break;
  }
  case 252:  {
   $4004 = $1;
   $4005 = ((($4004)) + 12|0);
   $4006 = HEAP8[$4005>>0]|0;
   $4007 = ($4006&255) >>> 1;
   $4008 = $4007 & 1;
   $4009 = $4008&255;
   $4010 = (1)==($4009|0);
   $4011 = $1;
   if ($4010) {
    $4012 = $opcode;
    $4013 = ((($4012)) + 2|0);
    $4014 = HEAP8[$4013>>0]|0;
    $4015 = $4014&255;
    $4016 = $4015 << 8;
    $4017 = $opcode;
    $4018 = ((($4017)) + 1|0);
    $4019 = HEAP8[$4018>>0]|0;
    $4020 = $4019&255;
    $4021 = $4016 | $4020;
    $4022 = $4021&65535;
    _call($4011,$4022);
    break L1;
   } else {
    $4023 = ((($4011)) + 10|0);
    $4024 = HEAP16[$4023>>1]|0;
    $4025 = $4024&65535;
    $4026 = (($4025) + 2)|0;
    $4027 = $4026&65535;
    HEAP16[$4023>>1] = $4027;
    break L1;
   }
   break;
  }
  case 253:  {
   $4028 = $1;
   _InvalidInstruction($4028);
   break;
  }
  case 254:  {
   $4029 = $1;
   $4030 = HEAP8[$4029>>0]|0;
   $4031 = $4030&255;
   $4032 = $opcode;
   $4033 = ((($4032)) + 1|0);
   $4034 = HEAP8[$4033>>0]|0;
   $4035 = $4034&255;
   $4036 = (($4031) - ($4035))|0;
   $4037 = $4036&255;
   $x75 = $4037;
   $4038 = $x75;
   $4039 = $4038&255;
   $4040 = ($4039|0)==(0);
   $4041 = $4040&1;
   $4042 = $4041&255;
   $4043 = $1;
   $4044 = ((($4043)) + 12|0);
   $4045 = HEAP8[$4044>>0]|0;
   $4046 = $4042 & 1;
   $4047 = $4045 & -2;
   $4048 = $4047 | $4046;
   HEAP8[$4044>>0] = $4048;
   $4049 = $x75;
   $4050 = $4049&255;
   $4051 = $4050 & 128;
   $4052 = (128)==($4051|0);
   $4053 = $4052&1;
   $4054 = $4053&255;
   $4055 = $1;
   $4056 = ((($4055)) + 12|0);
   $4057 = HEAP8[$4056>>0]|0;
   $4058 = $4054 & 1;
   $4059 = ($4058 << 1)&255;
   $4060 = $4057 & -3;
   $4061 = $4060 | $4059;
   HEAP8[$4056>>0] = $4061;
   $4062 = $x75;
   $4063 = $4062&255;
   $4064 = (_parity($4063,8)|0);
   $4065 = $4064&255;
   $4066 = $1;
   $4067 = ((($4066)) + 12|0);
   $4068 = HEAP8[$4067>>0]|0;
   $4069 = $4065 & 1;
   $4070 = ($4069 << 2)&255;
   $4071 = $4068 & -5;
   $4072 = $4071 | $4070;
   HEAP8[$4067>>0] = $4072;
   $4073 = $1;
   $4074 = HEAP8[$4073>>0]|0;
   $4075 = $4074&255;
   $4076 = $opcode;
   $4077 = ((($4076)) + 1|0);
   $4078 = HEAP8[$4077>>0]|0;
   $4079 = $4078&255;
   $4080 = ($4075|0)<($4079|0);
   $4081 = $4080&1;
   $4082 = $4081&255;
   $4083 = $1;
   $4084 = ((($4083)) + 12|0);
   $4085 = HEAP8[$4084>>0]|0;
   $4086 = $4082 & 1;
   $4087 = ($4086 << 3)&255;
   $4088 = $4085 & -9;
   $4089 = $4088 | $4087;
   HEAP8[$4084>>0] = $4089;
   $4090 = $1;
   $4091 = ((($4090)) + 10|0);
   $4092 = HEAP16[$4091>>1]|0;
   $4093 = (($4092) + 1)<<16>>16;
   HEAP16[$4091>>1] = $4093;
   break;
  }
  case 255:  {
   $4094 = $1;
   _UnimplementedInstruction($4094);
   break;
  }
  default: {
   // unreachable;
  }
  }
 } while(0);
 $0 = 0;
 $4095 = $0;
 STACKTOP = sp;return ($4095|0);
}
function _Init8085() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $state = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (_calloc(1,20)|0);
 $state = $0;
 $1 = (_malloc(65536)|0);
 $2 = $state;
 $3 = ((($2)) + 16|0);
 HEAP32[$3>>2] = $1;
 $4 = $state;
 STACKTOP = sp;return ($4|0);
}
function _ExecuteProgram($lines,$len,$offset) {
 $lines = $lines|0;
 $len = $len|0;
 $offset = $offset|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0;
 var $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $buffer = 0, $cycles = 0, $done = 0, $i = 0, $state = 0;
 var $vararg_buffer = 0, $vararg_buffer11 = 0, $vararg_buffer14 = 0, $vararg_buffer17 = 0, $vararg_buffer2 = 0, $vararg_buffer20 = 0, $vararg_buffer23 = 0, $vararg_buffer26 = 0, $vararg_buffer5 = 0, $vararg_buffer8 = 0, $vararg_ptr1 = 0, $vararg_ptr29 = 0, $vararg_ptr30 = 0, $vararg_ptr31 = 0, $vararg_ptr32 = 0, $vararg_ptr33 = 0, $vararg_ptr34 = 0, $vararg_ptr35 = 0, $vararg_ptr36 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 144|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer26 = sp + 72|0;
 $vararg_buffer23 = sp + 64|0;
 $vararg_buffer20 = sp + 56|0;
 $vararg_buffer17 = sp + 48|0;
 $vararg_buffer14 = sp + 40|0;
 $vararg_buffer11 = sp + 32|0;
 $vararg_buffer8 = sp + 24|0;
 $vararg_buffer5 = sp + 16|0;
 $vararg_buffer2 = sp + 8|0;
 $vararg_buffer = sp;
 $0 = $lines;
 $1 = $len;
 $2 = $offset;
 $done = 0;
 $3 = (_Init8085()|0);
 $state = $3;
 $4 = $2;
 $5 = $4&65535;
 $6 = $state;
 $7 = ((($6)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (($8) + ($5)|0);
 $buffer = $9;
 $i = 0;
 $cycles = 0;
 $10 = $state;
 $11 = $state;
 $12 = ((($11)) + 8|0);
 HEAP32[$vararg_buffer>>2] = $10;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $12;
 (_printf(2821,$vararg_buffer)|0);
 $13 = $2;
 $14 = $13&65535;
 HEAP32[$vararg_buffer2>>2] = $14;
 (_printf(2848,$vararg_buffer2)|0);
 while(1) {
  $15 = $i;
  $16 = $1;
  $17 = ($15|0)<($16|0);
  if (!($17)) {
   break;
  }
  $18 = $i;
  $19 = $0;
  $20 = (($19) + ($18)|0);
  $21 = HEAP8[$20>>0]|0;
  $22 = $2;
  $23 = $22&65535;
  $24 = $i;
  $25 = (($23) + ($24))|0;
  $26 = $state;
  $27 = ((($26)) + 16|0);
  $28 = HEAP32[$27>>2]|0;
  $29 = (($28) + ($25)|0);
  HEAP8[$29>>0] = $21;
  $30 = $i;
  $31 = (($30) + 1)|0;
  $i = $31;
 }
 $32 = $2;
 $33 = $state;
 $34 = ((($33)) + 10|0);
 HEAP16[$34>>1] = $32;
 $35 = $2;
 $36 = $35&65535;
 $37 = $state;
 $38 = ((($37)) + 16|0);
 $39 = HEAP32[$38>>2]|0;
 $40 = (($39) + ($36)|0);
 $41 = HEAP8[$40>>0]|0;
 $42 = $41&255;
 HEAP32[$vararg_buffer5>>2] = $42;
 (_printf(2859,$vararg_buffer5)|0);
 $43 = $2;
 $44 = $43&65535;
 $45 = (($44) + 1)|0;
 $46 = $state;
 $47 = ((($46)) + 16|0);
 $48 = HEAP32[$47>>2]|0;
 $49 = (($48) + ($45)|0);
 $50 = HEAP8[$49>>0]|0;
 $51 = $50&255;
 HEAP32[$vararg_buffer8>>2] = $51;
 (_printf(2880,$vararg_buffer8)|0);
 while(1) {
  $52 = $done;
  $53 = ($52|0)==(0);
  if (!($53)) {
   label = 9;
   break;
  }
  $54 = $cycles;
  $55 = ($54|0)>(100);
  if ($55) {
   label = 7;
   break;
  }
  $56 = $state;
  $57 = (_Emulate8085Op($56)|0);
  $done = $57;
  $58 = $cycles;
  $59 = (($58) + 1)|0;
  $cycles = $59;
 }
 if ((label|0) == 7) {
  _exit(2);
  // unreachable;
 }
 else if ((label|0) == 9) {
  $60 = $state;
  $61 = ((($60)) + 12|0);
  $62 = HEAP8[$61>>0]|0;
  $63 = $62 & 1;
  $64 = $63&255;
  $65 = ($64|0)!=(0);
  $66 = $65 ? 122 : 46;
  HEAP32[$vararg_buffer11>>2] = $66;
  (_printf(2905,$vararg_buffer11)|0);
  $67 = $state;
  $68 = ((($67)) + 12|0);
  $69 = HEAP8[$68>>0]|0;
  $70 = ($69&255) >>> 1;
  $71 = $70 & 1;
  $72 = $71&255;
  $73 = ($72|0)!=(0);
  $74 = $73 ? 115 : 46;
  HEAP32[$vararg_buffer14>>2] = $74;
  (_printf(2905,$vararg_buffer14)|0);
  $75 = $state;
  $76 = ((($75)) + 12|0);
  $77 = HEAP8[$76>>0]|0;
  $78 = ($77&255) >>> 2;
  $79 = $78 & 1;
  $80 = $79&255;
  $81 = ($80|0)!=(0);
  $82 = $81 ? 112 : 46;
  HEAP32[$vararg_buffer17>>2] = $82;
  (_printf(2905,$vararg_buffer17)|0);
  $83 = $state;
  $84 = ((($83)) + 12|0);
  $85 = HEAP8[$84>>0]|0;
  $86 = ($85&255) >>> 3;
  $87 = $86 & 1;
  $88 = $87&255;
  $89 = ($88|0)!=(0);
  $90 = $89 ? 99 : 46;
  HEAP32[$vararg_buffer20>>2] = $90;
  (_printf(2905,$vararg_buffer20)|0);
  $91 = $state;
  $92 = ((($91)) + 12|0);
  $93 = HEAP8[$92>>0]|0;
  $94 = ($93&255) >>> 4;
  $95 = $94 & 1;
  $96 = $95&255;
  $97 = ($96|0)!=(0);
  $98 = $97 ? 97 : 46;
  HEAP32[$vararg_buffer23>>2] = $98;
  (_printf(2908,$vararg_buffer23)|0);
  $99 = $state;
  $100 = HEAP8[$99>>0]|0;
  $101 = $100&255;
  $102 = $state;
  $103 = ((($102)) + 1|0);
  $104 = HEAP8[$103>>0]|0;
  $105 = $104&255;
  $106 = $state;
  $107 = ((($106)) + 2|0);
  $108 = HEAP8[$107>>0]|0;
  $109 = $108&255;
  $110 = $state;
  $111 = ((($110)) + 3|0);
  $112 = HEAP8[$111>>0]|0;
  $113 = $112&255;
  $114 = $state;
  $115 = ((($114)) + 4|0);
  $116 = HEAP8[$115>>0]|0;
  $117 = $116&255;
  $118 = $state;
  $119 = ((($118)) + 5|0);
  $120 = HEAP8[$119>>0]|0;
  $121 = $120&255;
  $122 = $state;
  $123 = ((($122)) + 6|0);
  $124 = HEAP8[$123>>0]|0;
  $125 = $124&255;
  $126 = $state;
  $127 = ((($126)) + 8|0);
  $128 = HEAP16[$127>>1]|0;
  $129 = $128&65535;
  $130 = $state;
  $131 = ((($130)) + 10|0);
  $132 = HEAP16[$131>>1]|0;
  $133 = $132&65535;
  HEAP32[$vararg_buffer26>>2] = $101;
  $vararg_ptr29 = ((($vararg_buffer26)) + 4|0);
  HEAP32[$vararg_ptr29>>2] = $105;
  $vararg_ptr30 = ((($vararg_buffer26)) + 8|0);
  HEAP32[$vararg_ptr30>>2] = $109;
  $vararg_ptr31 = ((($vararg_buffer26)) + 12|0);
  HEAP32[$vararg_ptr31>>2] = $113;
  $vararg_ptr32 = ((($vararg_buffer26)) + 16|0);
  HEAP32[$vararg_ptr32>>2] = $117;
  $vararg_ptr33 = ((($vararg_buffer26)) + 20|0);
  HEAP32[$vararg_ptr33>>2] = $121;
  $vararg_ptr34 = ((($vararg_buffer26)) + 24|0);
  HEAP32[$vararg_ptr34>>2] = $125;
  $vararg_ptr35 = ((($vararg_buffer26)) + 28|0);
  HEAP32[$vararg_ptr35>>2] = $129;
  $vararg_ptr36 = ((($vararg_buffer26)) + 32|0);
  HEAP32[$vararg_ptr36>>2] = $133;
  (_printf(2913,$vararg_buffer26)|0);
  $134 = $state;
  STACKTOP = sp;return ($134|0);
 }
 return (0)|0;
}
function ___stdio_close($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $2 = (___syscall6(6,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 STACKTOP = sp;return ($3|0);
}
function ___syscall_ret($r) {
 $r = $r|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($r>>>0)>(4294963200);
 if ($0) {
  $1 = (0 - ($r))|0;
  $2 = (___errno_location()|0);
  HEAP32[$2>>2] = $1;
  $$0 = -1;
 } else {
  $$0 = $r;
 }
 return ($$0|0);
}
function ___errno_location() {
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (0|0)==(0|0);
 if ($0) {
  $$0 = 5456;
 } else {
  $1 = (_pthread_self()|0);
  $2 = ((($1)) + 64|0);
  $3 = HEAP32[$2>>2]|0;
  $$0 = $3;
 }
 return ($$0|0);
}
function ___stdio_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $cnt$0 = 0, $cnt$1 = 0, $iov$0 = 0, $iov$0$lcssa11 = 0, $iov$1 = 0, $iovcnt$0 = 0, $iovcnt$0$lcssa12 = 0;
 var $iovcnt$1 = 0, $iovs = 0, $rem$0 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, $vararg_ptr7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $iovs = sp + 32|0;
 $0 = ((($f)) + 28|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$iovs>>2] = $1;
 $2 = ((($iovs)) + 4|0);
 $3 = ((($f)) + 20|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = (($4) - ($1))|0;
 HEAP32[$2>>2] = $5;
 $6 = ((($iovs)) + 8|0);
 HEAP32[$6>>2] = $buf;
 $7 = ((($iovs)) + 12|0);
 HEAP32[$7>>2] = $len;
 $8 = (($5) + ($len))|0;
 $9 = ((($f)) + 60|0);
 $10 = ((($f)) + 44|0);
 $iov$0 = $iovs;$iovcnt$0 = 2;$rem$0 = $8;
 while(1) {
  $11 = HEAP32[1353]|0;
  $12 = ($11|0)==(0|0);
  if ($12) {
   $16 = HEAP32[$9>>2]|0;
   HEAP32[$vararg_buffer3>>2] = $16;
   $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
   HEAP32[$vararg_ptr6>>2] = $iov$0;
   $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
   HEAP32[$vararg_ptr7>>2] = $iovcnt$0;
   $17 = (___syscall146(146,($vararg_buffer3|0))|0);
   $18 = (___syscall_ret($17)|0);
   $cnt$0 = $18;
  } else {
   _pthread_cleanup_push((4|0),($f|0));
   $13 = HEAP32[$9>>2]|0;
   HEAP32[$vararg_buffer>>2] = $13;
   $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
   HEAP32[$vararg_ptr1>>2] = $iov$0;
   $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
   HEAP32[$vararg_ptr2>>2] = $iovcnt$0;
   $14 = (___syscall146(146,($vararg_buffer|0))|0);
   $15 = (___syscall_ret($14)|0);
   _pthread_cleanup_pop(0);
   $cnt$0 = $15;
  }
  $19 = ($rem$0|0)==($cnt$0|0);
  if ($19) {
   label = 6;
   break;
  }
  $26 = ($cnt$0|0)<(0);
  if ($26) {
   $iov$0$lcssa11 = $iov$0;$iovcnt$0$lcssa12 = $iovcnt$0;
   label = 8;
   break;
  }
  $34 = (($rem$0) - ($cnt$0))|0;
  $35 = ((($iov$0)) + 4|0);
  $36 = HEAP32[$35>>2]|0;
  $37 = ($cnt$0>>>0)>($36>>>0);
  if ($37) {
   $38 = HEAP32[$10>>2]|0;
   HEAP32[$0>>2] = $38;
   HEAP32[$3>>2] = $38;
   $39 = (($cnt$0) - ($36))|0;
   $40 = ((($iov$0)) + 8|0);
   $41 = (($iovcnt$0) + -1)|0;
   $$phi$trans$insert = ((($iov$0)) + 12|0);
   $$pre = HEAP32[$$phi$trans$insert>>2]|0;
   $49 = $$pre;$cnt$1 = $39;$iov$1 = $40;$iovcnt$1 = $41;
  } else {
   $42 = ($iovcnt$0|0)==(2);
   if ($42) {
    $43 = HEAP32[$0>>2]|0;
    $44 = (($43) + ($cnt$0)|0);
    HEAP32[$0>>2] = $44;
    $49 = $36;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = 2;
   } else {
    $49 = $36;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = $iovcnt$0;
   }
  }
  $45 = HEAP32[$iov$1>>2]|0;
  $46 = (($45) + ($cnt$1)|0);
  HEAP32[$iov$1>>2] = $46;
  $47 = ((($iov$1)) + 4|0);
  $48 = (($49) - ($cnt$1))|0;
  HEAP32[$47>>2] = $48;
  $iov$0 = $iov$1;$iovcnt$0 = $iovcnt$1;$rem$0 = $34;
 }
 if ((label|0) == 6) {
  $20 = HEAP32[$10>>2]|0;
  $21 = ((($f)) + 48|0);
  $22 = HEAP32[$21>>2]|0;
  $23 = (($20) + ($22)|0);
  $24 = ((($f)) + 16|0);
  HEAP32[$24>>2] = $23;
  $25 = $20;
  HEAP32[$0>>2] = $25;
  HEAP32[$3>>2] = $25;
  $$0 = $len;
 }
 else if ((label|0) == 8) {
  $27 = ((($f)) + 16|0);
  HEAP32[$27>>2] = 0;
  HEAP32[$0>>2] = 0;
  HEAP32[$3>>2] = 0;
  $28 = HEAP32[$f>>2]|0;
  $29 = $28 | 32;
  HEAP32[$f>>2] = $29;
  $30 = ($iovcnt$0$lcssa12|0)==(2);
  if ($30) {
   $$0 = 0;
  } else {
   $31 = ((($iov$0$lcssa11)) + 4|0);
   $32 = HEAP32[$31>>2]|0;
   $33 = (($len) - ($32))|0;
   $$0 = $33;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function _cleanup_429($p) {
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  ___unlockfile($p);
 }
 return;
}
function ___unlockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function ___stdio_seek($f,$off,$whence) {
 $f = $f|0;
 $off = $off|0;
 $whence = $whence|0;
 var $$pre = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $ret = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr3 = 0, $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $ret = sp + 20|0;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = 0;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $off;
 $vararg_ptr3 = ((($vararg_buffer)) + 12|0);
 HEAP32[$vararg_ptr3>>2] = $ret;
 $vararg_ptr4 = ((($vararg_buffer)) + 16|0);
 HEAP32[$vararg_ptr4>>2] = $whence;
 $2 = (___syscall140(140,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 $4 = ($3|0)<(0);
 if ($4) {
  HEAP32[$ret>>2] = -1;
  $5 = -1;
 } else {
  $$pre = HEAP32[$ret>>2]|0;
  $5 = $$pre;
 }
 STACKTOP = sp;return ($5|0);
}
function ___stdout_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $tio = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $tio = sp + 12|0;
 $0 = ((($f)) + 36|0);
 HEAP32[$0>>2] = 5;
 $1 = HEAP32[$f>>2]|0;
 $2 = $1 & 64;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = ((($f)) + 60|0);
  $5 = HEAP32[$4>>2]|0;
  HEAP32[$vararg_buffer>>2] = $5;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = 21505;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $tio;
  $6 = (___syscall54(54,($vararg_buffer|0))|0);
  $7 = ($6|0)==(0);
  if (!($7)) {
   $8 = ((($f)) + 75|0);
   HEAP8[$8>>0] = -1;
  }
 }
 $9 = (___stdio_write($f,$buf,$len)|0);
 STACKTOP = sp;return ($9|0);
}
function _vfprintf($f,$fmt,$ap) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0;
 var $ret$1 = 0, $ret$1$ = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap2 = sp + 120|0;
 $nl_type = sp + 80|0;
 $nl_arg = sp;
 $internal_buf = sp + 136|0;
 dest=$nl_type; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$ap>>2]|0;
 HEAP32[$ap2>>2] = $vacopy_currentptr;
 $0 = (_printf_core(0,$fmt,$ap2,$nl_arg,$nl_type)|0);
 $1 = ($0|0)<(0);
 if ($1) {
  $$0 = -1;
 } else {
  $2 = ((($f)) + 76|0);
  $3 = HEAP32[$2>>2]|0;
  $4 = ($3|0)>(-1);
  if ($4) {
   $5 = (___lockfile($f)|0);
   $32 = $5;
  } else {
   $32 = 0;
  }
  $6 = HEAP32[$f>>2]|0;
  $7 = $6 & 32;
  $8 = ((($f)) + 74|0);
  $9 = HEAP8[$8>>0]|0;
  $10 = ($9<<24>>24)<(1);
  if ($10) {
   $11 = $6 & -33;
   HEAP32[$f>>2] = $11;
  }
  $12 = ((($f)) + 48|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($13|0)==(0);
  if ($14) {
   $16 = ((($f)) + 44|0);
   $17 = HEAP32[$16>>2]|0;
   HEAP32[$16>>2] = $internal_buf;
   $18 = ((($f)) + 28|0);
   HEAP32[$18>>2] = $internal_buf;
   $19 = ((($f)) + 20|0);
   HEAP32[$19>>2] = $internal_buf;
   HEAP32[$12>>2] = 80;
   $20 = ((($internal_buf)) + 80|0);
   $21 = ((($f)) + 16|0);
   HEAP32[$21>>2] = $20;
   $22 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
   $23 = ($17|0)==(0|0);
   if ($23) {
    $ret$1 = $22;
   } else {
    $24 = ((($f)) + 36|0);
    $25 = HEAP32[$24>>2]|0;
    (FUNCTION_TABLE_iiii[$25 & 7]($f,0,0)|0);
    $26 = HEAP32[$19>>2]|0;
    $27 = ($26|0)==(0|0);
    $$ = $27 ? -1 : $22;
    HEAP32[$16>>2] = $17;
    HEAP32[$12>>2] = 0;
    HEAP32[$21>>2] = 0;
    HEAP32[$18>>2] = 0;
    HEAP32[$19>>2] = 0;
    $ret$1 = $$;
   }
  } else {
   $15 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
   $ret$1 = $15;
  }
  $28 = HEAP32[$f>>2]|0;
  $29 = $28 & 32;
  $30 = ($29|0)==(0);
  $ret$1$ = $30 ? $ret$1 : -1;
  $31 = $28 | $7;
  HEAP32[$f>>2] = $31;
  $33 = ($32|0)==(0);
  if (!($33)) {
   ___unlockfile($f);
  }
  $$0 = $ret$1$;
 }
 STACKTOP = sp;return ($$0|0);
}
function _printf_core($f,$fmt,$ap,$nl_arg,$nl_type) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 $nl_arg = $nl_arg|0;
 $nl_type = $nl_type|0;
 var $$ = 0, $$$i = 0, $$0 = 0, $$0$i = 0, $$0$lcssa$i = 0, $$012$i = 0, $$013$i = 0, $$03$i33 = 0, $$07$i = 0.0, $$1$i = 0.0, $$114$i = 0, $$2$i = 0.0, $$20$i = 0.0, $$210$$24$i = 0, $$210$$26$i = 0, $$210$i = 0, $$23$i = 0, $$25$i = 0, $$3$i = 0.0, $$311$i = 0;
 var $$33$i = 0, $$36$i = 0.0, $$4$i = 0.0, $$412$lcssa$i = 0, $$41278$i = 0, $$43 = 0, $$5$lcssa$i = 0, $$589$i = 0, $$a$3$i = 0, $$a$3191$i = 0, $$a$3192$i = 0, $$fl$4 = 0, $$l10n$0 = 0, $$lcssa = 0, $$lcssa162$i = 0, $$lcssa295 = 0, $$lcssa300 = 0, $$lcssa301 = 0, $$lcssa302 = 0, $$lcssa303 = 0;
 var $$lcssa304 = 0, $$lcssa306 = 0, $$lcssa316 = 0, $$lcssa319 = 0.0, $$lcssa321 = 0, $$neg55$i = 0, $$neg56$i = 0, $$p$$i = 0, $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr$i = 0, $$pr50$i = 0, $$pre = 0, $$pre$i = 0, $$pre$phi190$iZ2D = 0, $$pre170 = 0, $$pre171 = 0, $$pre185$i = 0, $$pre188$i = 0;
 var $$pre189$i = 0, $$z$3$i = 0, $$z$4$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0;
 var $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0;
 var $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0;
 var $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0;
 var $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0;
 var $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0;
 var $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0;
 var $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0;
 var $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0;
 var $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0;
 var $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0.0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0.0, $363 = 0, $364 = 0, $365 = 0;
 var $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0;
 var $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0.0, $391 = 0.0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0;
 var $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0.0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0.0, $411 = 0.0, $412 = 0.0, $413 = 0.0, $414 = 0.0, $415 = 0.0, $416 = 0, $417 = 0, $418 = 0, $419 = 0;
 var $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0;
 var $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0.0, $442 = 0.0, $443 = 0.0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0;
 var $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0;
 var $474 = 0.0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0.0, $483 = 0.0, $484 = 0.0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0;
 var $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0;
 var $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0;
 var $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0;
 var $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0;
 var $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0;
 var $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0.0, $594 = 0.0, $595 = 0, $596 = 0.0, $597 = 0, $598 = 0, $599 = 0, $6 = 0;
 var $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0;
 var $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0;
 var $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0;
 var $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0;
 var $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0;
 var $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0;
 var $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0;
 var $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0;
 var $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0;
 var $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0;
 var $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1149$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3136$i = 0, $a$5$lcssa$i = 0, $a$5111$i = 0, $a$6$i = 0, $a$8$i = 0, $a$9$ph$i = 0, $arg = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0, $arglist_next3 = 0;
 var $argpos$0 = 0, $big$i = 0, $buf = 0, $buf$i = 0, $carry$0142$i = 0, $carry3$0130$i = 0, $cnt$0 = 0, $cnt$1 = 0, $cnt$1$lcssa = 0, $d$0$i = 0, $d$0141$i = 0, $d$0143$i = 0, $d$1129$i = 0, $d$2$lcssa$i = 0, $d$2110$i = 0, $d$4$i = 0, $d$584$i = 0, $d$677$i = 0, $d$788$i = 0, $e$0125$i = 0;
 var $e$1$i = 0, $e$2106$i = 0, $e$4$i = 0, $e$5$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$195$i = 0, $estr$2$i = 0, $exitcond$i = 0, $expanded = 0, $expanded10 = 0, $expanded11 = 0, $expanded13 = 0, $expanded14 = 0, $expanded15 = 0, $expanded4 = 0, $expanded6 = 0, $expanded7 = 0;
 var $expanded8 = 0, $fl$0100 = 0, $fl$053 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $i$0$lcssa = 0, $i$0$lcssa178 = 0, $i$0105 = 0, $i$0124$i = 0, $i$03$i = 0, $i$03$i25 = 0, $i$1$lcssa$i = 0, $i$1116 = 0, $i$1118$i = 0, $i$2105$i = 0, $i$291 = 0, $i$291$lcssa = 0;
 var $i$3101$i = 0, $i$389 = 0, $isdigit = 0, $isdigit$i = 0, $isdigit$i27 = 0, $isdigit10 = 0, $isdigit12 = 0, $isdigit2$i = 0, $isdigit2$i23 = 0, $isdigittmp = 0, $isdigittmp$ = 0, $isdigittmp$i = 0, $isdigittmp$i26 = 0, $isdigittmp1$i = 0, $isdigittmp1$i22 = 0, $isdigittmp11 = 0, $isdigittmp4$i = 0, $isdigittmp4$i24 = 0, $isdigittmp9 = 0, $j$0$i = 0;
 var $j$0117$i = 0, $j$0119$i = 0, $j$1102$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1$i = 0, $l$1104 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$lcssa = 0, $l10n$0$phi = 0, $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notlhs$i = 0, $notrhs$i = 0, $or$cond = 0, $or$cond$i = 0;
 var $or$cond122 = 0, $or$cond15 = 0, $or$cond17 = 0, $or$cond18$i = 0, $or$cond20 = 0, $or$cond22$i = 0, $or$cond3$not$i = 0, $or$cond31$i = 0, $or$cond6$i = 0, $p$0 = 0, $p$0$ = 0, $p$1 = 0, $p$2 = 0, $p$2$ = 0, $p$3 = 0, $p$4176 = 0, $p$5 = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0;
 var $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$9$i = 0, $re$171$i = 0, $round$070$i = 0.0, $round6$1$i = 0.0, $s$0 = 0, $s$0$i = 0, $s$1 = 0, $s$1$i = 0, $s$1$i$lcssa = 0, $s$2$lcssa = 0, $s$292 = 0, $s$4 = 0, $s$6 = 0;
 var $s$7 = 0, $s$7$lcssa298 = 0, $s1$0$i = 0, $s7$081$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$072$i = 0, $s9$0$i = 0, $s9$185$i = 0, $s9$2$i = 0, $scevgep182$i = 0, $scevgep182183$i = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $st$0$lcssa299 = 0, $storemerge = 0, $storemerge13 = 0, $storemerge851 = 0, $storemerge899 = 0;
 var $sum = 0, $t$0 = 0, $t$1 = 0, $w$$i = 0, $w$0 = 0, $w$1 = 0, $w$2 = 0, $w$32$i = 0, $wc = 0, $ws$0106 = 0, $ws$1117 = 0, $z$0$i = 0, $z$0$lcssa = 0, $z$093 = 0, $z$1 = 0, $z$1$lcssa$i = 0, $z$1148$i = 0, $z$2 = 0, $z$2$i = 0, $z$2$i$lcssa = 0;
 var $z$3$lcssa$i = 0, $z$3135$i = 0, $z$4$i = 0, $z$7$$i = 0, $z$7$i = 0, $z$7$i$lcssa = 0, $z$7$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 624|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $big$i = sp + 24|0;
 $e2$i = sp + 16|0;
 $buf$i = sp + 588|0;
 $ebuf0$i = sp + 576|0;
 $arg = sp;
 $buf = sp + 536|0;
 $wc = sp + 8|0;
 $mb = sp + 528|0;
 $0 = ($f|0)!=(0|0);
 $1 = ((($buf)) + 40|0);
 $2 = $1;
 $3 = ((($buf)) + 39|0);
 $4 = ((($wc)) + 4|0);
 $5 = $buf$i;
 $6 = (0 - ($5))|0;
 $7 = ((($ebuf0$i)) + 12|0);
 $8 = ((($ebuf0$i)) + 11|0);
 $9 = $7;
 $10 = (($9) - ($5))|0;
 $11 = (-2 - ($5))|0;
 $12 = (($9) + 2)|0;
 $13 = ((($big$i)) + 288|0);
 $14 = ((($buf$i)) + 9|0);
 $15 = $14;
 $16 = ((($buf$i)) + 8|0);
 $cnt$0 = 0;$l$0 = 0;$l10n$0 = 0;$s$0 = $fmt;
 L1: while(1) {
  $17 = ($cnt$0|0)>(-1);
  do {
   if ($17) {
    $18 = (2147483647 - ($cnt$0))|0;
    $19 = ($l$0|0)>($18|0);
    if ($19) {
     $20 = (___errno_location()|0);
     HEAP32[$20>>2] = 75;
     $cnt$1 = -1;
     break;
    } else {
     $21 = (($l$0) + ($cnt$0))|0;
     $cnt$1 = $21;
     break;
    }
   } else {
    $cnt$1 = $cnt$0;
   }
  } while(0);
  $22 = HEAP8[$s$0>>0]|0;
  $23 = ($22<<24>>24)==(0);
  if ($23) {
   $cnt$1$lcssa = $cnt$1;$l10n$0$lcssa = $l10n$0;
   label = 244;
   break;
  } else {
   $24 = $22;$s$1 = $s$0;
  }
  L9: while(1) {
   switch ($24<<24>>24) {
   case 37:  {
    $s$292 = $s$1;$z$093 = $s$1;
    label = 9;
    break L9;
    break;
   }
   case 0:  {
    $s$2$lcssa = $s$1;$z$0$lcssa = $s$1;
    break L9;
    break;
   }
   default: {
   }
   }
   $25 = ((($s$1)) + 1|0);
   $$pre = HEAP8[$25>>0]|0;
   $24 = $$pre;$s$1 = $25;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $26 = ((($s$292)) + 1|0);
     $27 = HEAP8[$26>>0]|0;
     $28 = ($27<<24>>24)==(37);
     if (!($28)) {
      $s$2$lcssa = $s$292;$z$0$lcssa = $z$093;
      break L12;
     }
     $29 = ((($z$093)) + 1|0);
     $30 = ((($s$292)) + 2|0);
     $31 = HEAP8[$30>>0]|0;
     $32 = ($31<<24>>24)==(37);
     if ($32) {
      $s$292 = $30;$z$093 = $29;
      label = 9;
     } else {
      $s$2$lcssa = $30;$z$0$lcssa = $29;
      break;
     }
    }
   }
  } while(0);
  $33 = $z$0$lcssa;
  $34 = $s$0;
  $35 = (($33) - ($34))|0;
  if ($0) {
   $36 = HEAP32[$f>>2]|0;
   $37 = $36 & 32;
   $38 = ($37|0)==(0);
   if ($38) {
    (___fwritex($s$0,$35,$f)|0);
   }
  }
  $39 = ($z$0$lcssa|0)==($s$0|0);
  if (!($39)) {
   $l10n$0$phi = $l10n$0;$cnt$0 = $cnt$1;$l$0 = $35;$s$0 = $s$2$lcssa;$l10n$0 = $l10n$0$phi;
   continue;
  }
  $40 = ((($s$2$lcssa)) + 1|0);
  $41 = HEAP8[$40>>0]|0;
  $42 = $41 << 24 >> 24;
  $isdigittmp = (($42) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $43 = ((($s$2$lcssa)) + 2|0);
   $44 = HEAP8[$43>>0]|0;
   $45 = ($44<<24>>24)==(36);
   $46 = ((($s$2$lcssa)) + 3|0);
   $$43 = $45 ? $46 : $40;
   $$l10n$0 = $45 ? 1 : $l10n$0;
   $isdigittmp$ = $45 ? $isdigittmp : -1;
   $$pre170 = HEAP8[$$43>>0]|0;
   $48 = $$pre170;$argpos$0 = $isdigittmp$;$l10n$1 = $$l10n$0;$storemerge = $$43;
  } else {
   $48 = $41;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $40;
  }
  $47 = $48 << 24 >> 24;
  $49 = $47 & -32;
  $50 = ($49|0)==(32);
  L25: do {
   if ($50) {
    $52 = $47;$57 = $48;$fl$0100 = 0;$storemerge899 = $storemerge;
    while(1) {
     $51 = (($52) + -32)|0;
     $53 = 1 << $51;
     $54 = $53 & 75913;
     $55 = ($54|0)==(0);
     if ($55) {
      $66 = $57;$fl$053 = $fl$0100;$storemerge851 = $storemerge899;
      break L25;
     }
     $56 = $57 << 24 >> 24;
     $58 = (($56) + -32)|0;
     $59 = 1 << $58;
     $60 = $59 | $fl$0100;
     $61 = ((($storemerge899)) + 1|0);
     $62 = HEAP8[$61>>0]|0;
     $63 = $62 << 24 >> 24;
     $64 = $63 & -32;
     $65 = ($64|0)==(32);
     if ($65) {
      $52 = $63;$57 = $62;$fl$0100 = $60;$storemerge899 = $61;
     } else {
      $66 = $62;$fl$053 = $60;$storemerge851 = $61;
      break;
     }
    }
   } else {
    $66 = $48;$fl$053 = 0;$storemerge851 = $storemerge;
   }
  } while(0);
  $67 = ($66<<24>>24)==(42);
  do {
   if ($67) {
    $68 = ((($storemerge851)) + 1|0);
    $69 = HEAP8[$68>>0]|0;
    $70 = $69 << 24 >> 24;
    $isdigittmp11 = (($70) + -48)|0;
    $isdigit12 = ($isdigittmp11>>>0)<(10);
    if ($isdigit12) {
     $71 = ((($storemerge851)) + 2|0);
     $72 = HEAP8[$71>>0]|0;
     $73 = ($72<<24>>24)==(36);
     if ($73) {
      $74 = (($nl_type) + ($isdigittmp11<<2)|0);
      HEAP32[$74>>2] = 10;
      $75 = HEAP8[$68>>0]|0;
      $76 = $75 << 24 >> 24;
      $77 = (($76) + -48)|0;
      $78 = (($nl_arg) + ($77<<3)|0);
      $79 = $78;
      $80 = $79;
      $81 = HEAP32[$80>>2]|0;
      $82 = (($79) + 4)|0;
      $83 = $82;
      $84 = HEAP32[$83>>2]|0;
      $85 = ((($storemerge851)) + 3|0);
      $l10n$2 = 1;$storemerge13 = $85;$w$0 = $81;
     } else {
      label = 24;
     }
    } else {
     label = 24;
    }
    if ((label|0) == 24) {
     label = 0;
     $86 = ($l10n$1|0)==(0);
     if (!($86)) {
      $$0 = -1;
      break L1;
     }
     if (!($0)) {
      $fl$1 = $fl$053;$l10n$3 = 0;$s$4 = $68;$w$1 = 0;
      break;
     }
     $arglist_current = HEAP32[$ap>>2]|0;
     $87 = $arglist_current;
     $88 = ((0) + 4|0);
     $expanded4 = $88;
     $expanded = (($expanded4) - 1)|0;
     $89 = (($87) + ($expanded))|0;
     $90 = ((0) + 4|0);
     $expanded8 = $90;
     $expanded7 = (($expanded8) - 1)|0;
     $expanded6 = $expanded7 ^ -1;
     $91 = $89 & $expanded6;
     $92 = $91;
     $93 = HEAP32[$92>>2]|0;
     $arglist_next = ((($92)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     $l10n$2 = 0;$storemerge13 = $68;$w$0 = $93;
    }
    $94 = ($w$0|0)<(0);
    if ($94) {
     $95 = $fl$053 | 8192;
     $96 = (0 - ($w$0))|0;
     $fl$1 = $95;$l10n$3 = $l10n$2;$s$4 = $storemerge13;$w$1 = $96;
    } else {
     $fl$1 = $fl$053;$l10n$3 = $l10n$2;$s$4 = $storemerge13;$w$1 = $w$0;
    }
   } else {
    $97 = $66 << 24 >> 24;
    $isdigittmp1$i = (($97) + -48)|0;
    $isdigit2$i = ($isdigittmp1$i>>>0)<(10);
    if ($isdigit2$i) {
     $101 = $storemerge851;$i$03$i = 0;$isdigittmp4$i = $isdigittmp1$i;
     while(1) {
      $98 = ($i$03$i*10)|0;
      $99 = (($98) + ($isdigittmp4$i))|0;
      $100 = ((($101)) + 1|0);
      $102 = HEAP8[$100>>0]|0;
      $103 = $102 << 24 >> 24;
      $isdigittmp$i = (($103) + -48)|0;
      $isdigit$i = ($isdigittmp$i>>>0)<(10);
      if ($isdigit$i) {
       $101 = $100;$i$03$i = $99;$isdigittmp4$i = $isdigittmp$i;
      } else {
       $$lcssa = $99;$$lcssa295 = $100;
       break;
      }
     }
     $104 = ($$lcssa|0)<(0);
     if ($104) {
      $$0 = -1;
      break L1;
     } else {
      $fl$1 = $fl$053;$l10n$3 = $l10n$1;$s$4 = $$lcssa295;$w$1 = $$lcssa;
     }
    } else {
     $fl$1 = $fl$053;$l10n$3 = $l10n$1;$s$4 = $storemerge851;$w$1 = 0;
    }
   }
  } while(0);
  $105 = HEAP8[$s$4>>0]|0;
  $106 = ($105<<24>>24)==(46);
  L46: do {
   if ($106) {
    $107 = ((($s$4)) + 1|0);
    $108 = HEAP8[$107>>0]|0;
    $109 = ($108<<24>>24)==(42);
    if (!($109)) {
     $136 = $108 << 24 >> 24;
     $isdigittmp1$i22 = (($136) + -48)|0;
     $isdigit2$i23 = ($isdigittmp1$i22>>>0)<(10);
     if ($isdigit2$i23) {
      $140 = $107;$i$03$i25 = 0;$isdigittmp4$i24 = $isdigittmp1$i22;
     } else {
      $p$0 = 0;$s$6 = $107;
      break;
     }
     while(1) {
      $137 = ($i$03$i25*10)|0;
      $138 = (($137) + ($isdigittmp4$i24))|0;
      $139 = ((($140)) + 1|0);
      $141 = HEAP8[$139>>0]|0;
      $142 = $141 << 24 >> 24;
      $isdigittmp$i26 = (($142) + -48)|0;
      $isdigit$i27 = ($isdigittmp$i26>>>0)<(10);
      if ($isdigit$i27) {
       $140 = $139;$i$03$i25 = $138;$isdigittmp4$i24 = $isdigittmp$i26;
      } else {
       $p$0 = $138;$s$6 = $139;
       break L46;
      }
     }
    }
    $110 = ((($s$4)) + 2|0);
    $111 = HEAP8[$110>>0]|0;
    $112 = $111 << 24 >> 24;
    $isdigittmp9 = (($112) + -48)|0;
    $isdigit10 = ($isdigittmp9>>>0)<(10);
    if ($isdigit10) {
     $113 = ((($s$4)) + 3|0);
     $114 = HEAP8[$113>>0]|0;
     $115 = ($114<<24>>24)==(36);
     if ($115) {
      $116 = (($nl_type) + ($isdigittmp9<<2)|0);
      HEAP32[$116>>2] = 10;
      $117 = HEAP8[$110>>0]|0;
      $118 = $117 << 24 >> 24;
      $119 = (($118) + -48)|0;
      $120 = (($nl_arg) + ($119<<3)|0);
      $121 = $120;
      $122 = $121;
      $123 = HEAP32[$122>>2]|0;
      $124 = (($121) + 4)|0;
      $125 = $124;
      $126 = HEAP32[$125>>2]|0;
      $127 = ((($s$4)) + 4|0);
      $p$0 = $123;$s$6 = $127;
      break;
     }
    }
    $128 = ($l10n$3|0)==(0);
    if (!($128)) {
     $$0 = -1;
     break L1;
    }
    if ($0) {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $129 = $arglist_current2;
     $130 = ((0) + 4|0);
     $expanded11 = $130;
     $expanded10 = (($expanded11) - 1)|0;
     $131 = (($129) + ($expanded10))|0;
     $132 = ((0) + 4|0);
     $expanded15 = $132;
     $expanded14 = (($expanded15) - 1)|0;
     $expanded13 = $expanded14 ^ -1;
     $133 = $131 & $expanded13;
     $134 = $133;
     $135 = HEAP32[$134>>2]|0;
     $arglist_next3 = ((($134)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $p$0 = $135;$s$6 = $110;
    } else {
     $p$0 = 0;$s$6 = $110;
    }
   } else {
    $p$0 = -1;$s$6 = $s$4;
   }
  } while(0);
  $s$7 = $s$6;$st$0 = 0;
  while(1) {
   $143 = HEAP8[$s$7>>0]|0;
   $144 = $143 << 24 >> 24;
   $145 = (($144) + -65)|0;
   $146 = ($145>>>0)>(57);
   if ($146) {
    $$0 = -1;
    break L1;
   }
   $147 = ((($s$7)) + 1|0);
   $148 = ((2986 + (($st$0*58)|0)|0) + ($145)|0);
   $149 = HEAP8[$148>>0]|0;
   $150 = $149&255;
   $151 = (($150) + -1)|0;
   $152 = ($151>>>0)<(8);
   if ($152) {
    $s$7 = $147;$st$0 = $150;
   } else {
    $$lcssa300 = $147;$$lcssa301 = $149;$$lcssa302 = $150;$s$7$lcssa298 = $s$7;$st$0$lcssa299 = $st$0;
    break;
   }
  }
  $153 = ($$lcssa301<<24>>24)==(0);
  if ($153) {
   $$0 = -1;
   break;
  }
  $154 = ($$lcssa301<<24>>24)==(19);
  $155 = ($argpos$0|0)>(-1);
  do {
   if ($154) {
    if ($155) {
     $$0 = -1;
     break L1;
    } else {
     label = 52;
    }
   } else {
    if ($155) {
     $156 = (($nl_type) + ($argpos$0<<2)|0);
     HEAP32[$156>>2] = $$lcssa302;
     $157 = (($nl_arg) + ($argpos$0<<3)|0);
     $158 = $157;
     $159 = $158;
     $160 = HEAP32[$159>>2]|0;
     $161 = (($158) + 4)|0;
     $162 = $161;
     $163 = HEAP32[$162>>2]|0;
     $164 = $arg;
     $165 = $164;
     HEAP32[$165>>2] = $160;
     $166 = (($164) + 4)|0;
     $167 = $166;
     HEAP32[$167>>2] = $163;
     label = 52;
     break;
    }
    if (!($0)) {
     $$0 = 0;
     break L1;
    }
    _pop_arg_389($arg,$$lcssa302,$ap);
   }
  } while(0);
  if ((label|0) == 52) {
   label = 0;
   if (!($0)) {
    $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
    continue;
   }
  }
  $168 = HEAP8[$s$7$lcssa298>>0]|0;
  $169 = $168 << 24 >> 24;
  $170 = ($st$0$lcssa299|0)!=(0);
  $171 = $169 & 15;
  $172 = ($171|0)==(3);
  $or$cond15 = $170 & $172;
  $173 = $169 & -33;
  $t$0 = $or$cond15 ? $173 : $169;
  $174 = $fl$1 & 8192;
  $175 = ($174|0)==(0);
  $176 = $fl$1 & -65537;
  $fl$1$ = $175 ? $fl$1 : $176;
  L75: do {
   switch ($t$0|0) {
   case 110:  {
    switch ($st$0$lcssa299|0) {
    case 0:  {
     $183 = HEAP32[$arg>>2]|0;
     HEAP32[$183>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
     continue L1;
     break;
    }
    case 1:  {
     $184 = HEAP32[$arg>>2]|0;
     HEAP32[$184>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
     continue L1;
     break;
    }
    case 2:  {
     $185 = ($cnt$1|0)<(0);
     $186 = $185 << 31 >> 31;
     $187 = HEAP32[$arg>>2]|0;
     $188 = $187;
     $189 = $188;
     HEAP32[$189>>2] = $cnt$1;
     $190 = (($188) + 4)|0;
     $191 = $190;
     HEAP32[$191>>2] = $186;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
     continue L1;
     break;
    }
    case 3:  {
     $192 = $cnt$1&65535;
     $193 = HEAP32[$arg>>2]|0;
     HEAP16[$193>>1] = $192;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
     continue L1;
     break;
    }
    case 4:  {
     $194 = $cnt$1&255;
     $195 = HEAP32[$arg>>2]|0;
     HEAP8[$195>>0] = $194;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
     continue L1;
     break;
    }
    case 6:  {
     $196 = HEAP32[$arg>>2]|0;
     HEAP32[$196>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
     continue L1;
     break;
    }
    case 7:  {
     $197 = ($cnt$1|0)<(0);
     $198 = $197 << 31 >> 31;
     $199 = HEAP32[$arg>>2]|0;
     $200 = $199;
     $201 = $200;
     HEAP32[$201>>2] = $cnt$1;
     $202 = (($200) + 4)|0;
     $203 = $202;
     HEAP32[$203>>2] = $198;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
     continue L1;
     break;
    }
    default: {
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $204 = ($p$0>>>0)>(8);
    $205 = $204 ? $p$0 : 8;
    $206 = $fl$1$ | 8;
    $fl$3 = $206;$p$1 = $205;$t$1 = 120;
    label = 64;
    break;
   }
   case 88: case 120:  {
    $fl$3 = $fl$1$;$p$1 = $p$0;$t$1 = $t$0;
    label = 64;
    break;
   }
   case 111:  {
    $244 = $arg;
    $245 = $244;
    $246 = HEAP32[$245>>2]|0;
    $247 = (($244) + 4)|0;
    $248 = $247;
    $249 = HEAP32[$248>>2]|0;
    $250 = ($246|0)==(0);
    $251 = ($249|0)==(0);
    $252 = $250 & $251;
    if ($252) {
     $$0$lcssa$i = $1;
    } else {
     $$03$i33 = $1;$254 = $246;$258 = $249;
     while(1) {
      $253 = $254 & 7;
      $255 = $253 | 48;
      $256 = $255&255;
      $257 = ((($$03$i33)) + -1|0);
      HEAP8[$257>>0] = $256;
      $259 = (_bitshift64Lshr(($254|0),($258|0),3)|0);
      $260 = tempRet0;
      $261 = ($259|0)==(0);
      $262 = ($260|0)==(0);
      $263 = $261 & $262;
      if ($263) {
       $$0$lcssa$i = $257;
       break;
      } else {
       $$03$i33 = $257;$254 = $259;$258 = $260;
      }
     }
    }
    $264 = $fl$1$ & 8;
    $265 = ($264|0)==(0);
    if ($265) {
     $a$0 = $$0$lcssa$i;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = 0;$prefix$1 = 3466;
     label = 77;
    } else {
     $266 = $$0$lcssa$i;
     $267 = (($2) - ($266))|0;
     $268 = ($p$0|0)>($267|0);
     $269 = (($267) + 1)|0;
     $p$0$ = $268 ? $p$0 : $269;
     $a$0 = $$0$lcssa$i;$fl$4 = $fl$1$;$p$2 = $p$0$;$pl$1 = 0;$prefix$1 = 3466;
     label = 77;
    }
    break;
   }
   case 105: case 100:  {
    $270 = $arg;
    $271 = $270;
    $272 = HEAP32[$271>>2]|0;
    $273 = (($270) + 4)|0;
    $274 = $273;
    $275 = HEAP32[$274>>2]|0;
    $276 = ($275|0)<(0);
    if ($276) {
     $277 = (_i64Subtract(0,0,($272|0),($275|0))|0);
     $278 = tempRet0;
     $279 = $arg;
     $280 = $279;
     HEAP32[$280>>2] = $277;
     $281 = (($279) + 4)|0;
     $282 = $281;
     HEAP32[$282>>2] = $278;
     $287 = $277;$288 = $278;$pl$0 = 1;$prefix$0 = 3466;
     label = 76;
     break L75;
    }
    $283 = $fl$1$ & 2048;
    $284 = ($283|0)==(0);
    if ($284) {
     $285 = $fl$1$ & 1;
     $286 = ($285|0)==(0);
     $$ = $286 ? 3466 : (3468);
     $287 = $272;$288 = $275;$pl$0 = $285;$prefix$0 = $$;
     label = 76;
    } else {
     $287 = $272;$288 = $275;$pl$0 = 1;$prefix$0 = (3467);
     label = 76;
    }
    break;
   }
   case 117:  {
    $177 = $arg;
    $178 = $177;
    $179 = HEAP32[$178>>2]|0;
    $180 = (($177) + 4)|0;
    $181 = $180;
    $182 = HEAP32[$181>>2]|0;
    $287 = $179;$288 = $182;$pl$0 = 0;$prefix$0 = 3466;
    label = 76;
    break;
   }
   case 99:  {
    $308 = $arg;
    $309 = $308;
    $310 = HEAP32[$309>>2]|0;
    $311 = (($308) + 4)|0;
    $312 = $311;
    $313 = HEAP32[$312>>2]|0;
    $314 = $310&255;
    HEAP8[$3>>0] = $314;
    $a$2 = $3;$fl$6 = $176;$p$5 = 1;$pl$2 = 0;$prefix$2 = 3466;$z$2 = $1;
    break;
   }
   case 109:  {
    $315 = (___errno_location()|0);
    $316 = HEAP32[$315>>2]|0;
    $317 = (_strerror($316)|0);
    $a$1 = $317;
    label = 82;
    break;
   }
   case 115:  {
    $318 = HEAP32[$arg>>2]|0;
    $319 = ($318|0)!=(0|0);
    $320 = $319 ? $318 : 5368;
    $a$1 = $320;
    label = 82;
    break;
   }
   case 67:  {
    $327 = $arg;
    $328 = $327;
    $329 = HEAP32[$328>>2]|0;
    $330 = (($327) + 4)|0;
    $331 = $330;
    $332 = HEAP32[$331>>2]|0;
    HEAP32[$wc>>2] = $329;
    HEAP32[$4>>2] = 0;
    HEAP32[$arg>>2] = $wc;
    $798 = $wc;$p$4176 = -1;
    label = 86;
    break;
   }
   case 83:  {
    $$pre171 = HEAP32[$arg>>2]|0;
    $333 = ($p$0|0)==(0);
    if ($333) {
     _pad($f,32,$w$1,0,$fl$1$);
     $i$0$lcssa178 = 0;
     label = 97;
    } else {
     $798 = $$pre171;$p$4176 = $p$0;
     label = 86;
    }
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    $358 = +HEAPF64[$arg>>3];
    HEAP32[$e2$i>>2] = 0;
    HEAPF64[tempDoublePtr>>3] = $358;$359 = HEAP32[tempDoublePtr>>2]|0;
    $360 = HEAP32[tempDoublePtr+4>>2]|0;
    $361 = ($360|0)<(0);
    if ($361) {
     $362 = -$358;
     $$07$i = $362;$pl$0$i = 1;$prefix$0$i = 5375;
    } else {
     $363 = $fl$1$ & 2048;
     $364 = ($363|0)==(0);
     if ($364) {
      $365 = $fl$1$ & 1;
      $366 = ($365|0)==(0);
      $$$i = $366 ? (5376) : (5381);
      $$07$i = $358;$pl$0$i = $365;$prefix$0$i = $$$i;
     } else {
      $$07$i = $358;$pl$0$i = 1;$prefix$0$i = (5378);
     }
    }
    HEAPF64[tempDoublePtr>>3] = $$07$i;$367 = HEAP32[tempDoublePtr>>2]|0;
    $368 = HEAP32[tempDoublePtr+4>>2]|0;
    $369 = $368 & 2146435072;
    $370 = ($369>>>0)<(2146435072);
    $371 = (0)<(0);
    $372 = ($369|0)==(2146435072);
    $373 = $372 & $371;
    $374 = $370 | $373;
    do {
     if ($374) {
      $390 = (+_frexpl($$07$i,$e2$i));
      $391 = $390 * 2.0;
      $392 = $391 != 0.0;
      if ($392) {
       $393 = HEAP32[$e2$i>>2]|0;
       $394 = (($393) + -1)|0;
       HEAP32[$e2$i>>2] = $394;
      }
      $395 = $t$0 | 32;
      $396 = ($395|0)==(97);
      if ($396) {
       $397 = $t$0 & 32;
       $398 = ($397|0)==(0);
       $399 = ((($prefix$0$i)) + 9|0);
       $prefix$0$$i = $398 ? $prefix$0$i : $399;
       $400 = $pl$0$i | 2;
       $401 = ($p$0>>>0)>(11);
       $402 = (12 - ($p$0))|0;
       $403 = ($402|0)==(0);
       $404 = $401 | $403;
       do {
        if ($404) {
         $$1$i = $391;
        } else {
         $re$171$i = $402;$round$070$i = 8.0;
         while(1) {
          $405 = (($re$171$i) + -1)|0;
          $406 = $round$070$i * 16.0;
          $407 = ($405|0)==(0);
          if ($407) {
           $$lcssa319 = $406;
           break;
          } else {
           $re$171$i = $405;$round$070$i = $406;
          }
         }
         $408 = HEAP8[$prefix$0$$i>>0]|0;
         $409 = ($408<<24>>24)==(45);
         if ($409) {
          $410 = -$391;
          $411 = $410 - $$lcssa319;
          $412 = $$lcssa319 + $411;
          $413 = -$412;
          $$1$i = $413;
          break;
         } else {
          $414 = $391 + $$lcssa319;
          $415 = $414 - $$lcssa319;
          $$1$i = $415;
          break;
         }
        }
       } while(0);
       $416 = HEAP32[$e2$i>>2]|0;
       $417 = ($416|0)<(0);
       $418 = (0 - ($416))|0;
       $419 = $417 ? $418 : $416;
       $420 = ($419|0)<(0);
       $421 = $420 << 31 >> 31;
       $422 = (_fmt_u($419,$421,$7)|0);
       $423 = ($422|0)==($7|0);
       if ($423) {
        HEAP8[$8>>0] = 48;
        $estr$0$i = $8;
       } else {
        $estr$0$i = $422;
       }
       $424 = $416 >> 31;
       $425 = $424 & 2;
       $426 = (($425) + 43)|0;
       $427 = $426&255;
       $428 = ((($estr$0$i)) + -1|0);
       HEAP8[$428>>0] = $427;
       $429 = (($t$0) + 15)|0;
       $430 = $429&255;
       $431 = ((($estr$0$i)) + -2|0);
       HEAP8[$431>>0] = $430;
       $notrhs$i = ($p$0|0)<(1);
       $432 = $fl$1$ & 8;
       $433 = ($432|0)==(0);
       $$2$i = $$1$i;$s$0$i = $buf$i;
       while(1) {
        $434 = (~~(($$2$i)));
        $435 = (3450 + ($434)|0);
        $436 = HEAP8[$435>>0]|0;
        $437 = $436&255;
        $438 = $437 | $397;
        $439 = $438&255;
        $440 = ((($s$0$i)) + 1|0);
        HEAP8[$s$0$i>>0] = $439;
        $441 = (+($434|0));
        $442 = $$2$i - $441;
        $443 = $442 * 16.0;
        $444 = $440;
        $445 = (($444) - ($5))|0;
        $446 = ($445|0)==(1);
        do {
         if ($446) {
          $notlhs$i = $443 == 0.0;
          $or$cond3$not$i = $notrhs$i & $notlhs$i;
          $or$cond$i = $433 & $or$cond3$not$i;
          if ($or$cond$i) {
           $s$1$i = $440;
           break;
          }
          $447 = ((($s$0$i)) + 2|0);
          HEAP8[$440>>0] = 46;
          $s$1$i = $447;
         } else {
          $s$1$i = $440;
         }
        } while(0);
        $448 = $443 != 0.0;
        if ($448) {
         $$2$i = $443;$s$0$i = $s$1$i;
        } else {
         $s$1$i$lcssa = $s$1$i;
         break;
        }
       }
       $449 = ($p$0|0)!=(0);
       $$pre188$i = $s$1$i$lcssa;
       $450 = (($11) + ($$pre188$i))|0;
       $451 = ($450|0)<($p$0|0);
       $or$cond122 = $449 & $451;
       $452 = $431;
       $453 = (($12) + ($p$0))|0;
       $454 = (($453) - ($452))|0;
       $455 = (($10) - ($452))|0;
       $456 = (($455) + ($$pre188$i))|0;
       $l$0$i = $or$cond122 ? $454 : $456;
       $457 = (($l$0$i) + ($400))|0;
       _pad($f,32,$w$1,$457,$fl$1$);
       $458 = HEAP32[$f>>2]|0;
       $459 = $458 & 32;
       $460 = ($459|0)==(0);
       if ($460) {
        (___fwritex($prefix$0$$i,$400,$f)|0);
       }
       $461 = $fl$1$ ^ 65536;
       _pad($f,48,$w$1,$457,$461);
       $462 = (($$pre188$i) - ($5))|0;
       $463 = HEAP32[$f>>2]|0;
       $464 = $463 & 32;
       $465 = ($464|0)==(0);
       if ($465) {
        (___fwritex($buf$i,$462,$f)|0);
       }
       $466 = (($9) - ($452))|0;
       $sum = (($462) + ($466))|0;
       $467 = (($l$0$i) - ($sum))|0;
       _pad($f,48,$467,0,0);
       $468 = HEAP32[$f>>2]|0;
       $469 = $468 & 32;
       $470 = ($469|0)==(0);
       if ($470) {
        (___fwritex($431,$466,$f)|0);
       }
       $471 = $fl$1$ ^ 8192;
       _pad($f,32,$w$1,$457,$471);
       $472 = ($457|0)<($w$1|0);
       $w$$i = $472 ? $w$1 : $457;
       $$0$i = $w$$i;
       break;
      }
      $473 = ($p$0|0)<(0);
      $$p$i = $473 ? 6 : $p$0;
      if ($392) {
       $474 = $391 * 268435456.0;
       $475 = HEAP32[$e2$i>>2]|0;
       $476 = (($475) + -28)|0;
       HEAP32[$e2$i>>2] = $476;
       $$3$i = $474;$477 = $476;
      } else {
       $$pre185$i = HEAP32[$e2$i>>2]|0;
       $$3$i = $391;$477 = $$pre185$i;
      }
      $478 = ($477|0)<(0);
      $$33$i = $478 ? $big$i : $13;
      $479 = $$33$i;
      $$4$i = $$3$i;$z$0$i = $$33$i;
      while(1) {
       $480 = (~~(($$4$i))>>>0);
       HEAP32[$z$0$i>>2] = $480;
       $481 = ((($z$0$i)) + 4|0);
       $482 = (+($480>>>0));
       $483 = $$4$i - $482;
       $484 = $483 * 1.0E+9;
       $485 = $484 != 0.0;
       if ($485) {
        $$4$i = $484;$z$0$i = $481;
       } else {
        $$lcssa303 = $481;
        break;
       }
      }
      $$pr$i = HEAP32[$e2$i>>2]|0;
      $486 = ($$pr$i|0)>(0);
      if ($486) {
       $487 = $$pr$i;$a$1149$i = $$33$i;$z$1148$i = $$lcssa303;
       while(1) {
        $488 = ($487|0)>(29);
        $489 = $488 ? 29 : $487;
        $d$0141$i = ((($z$1148$i)) + -4|0);
        $490 = ($d$0141$i>>>0)<($a$1149$i>>>0);
        do {
         if ($490) {
          $a$2$ph$i = $a$1149$i;
         } else {
          $carry$0142$i = 0;$d$0143$i = $d$0141$i;
          while(1) {
           $491 = HEAP32[$d$0143$i>>2]|0;
           $492 = (_bitshift64Shl(($491|0),0,($489|0))|0);
           $493 = tempRet0;
           $494 = (_i64Add(($492|0),($493|0),($carry$0142$i|0),0)|0);
           $495 = tempRet0;
           $496 = (___uremdi3(($494|0),($495|0),1000000000,0)|0);
           $497 = tempRet0;
           HEAP32[$d$0143$i>>2] = $496;
           $498 = (___udivdi3(($494|0),($495|0),1000000000,0)|0);
           $499 = tempRet0;
           $d$0$i = ((($d$0143$i)) + -4|0);
           $500 = ($d$0$i>>>0)<($a$1149$i>>>0);
           if ($500) {
            $$lcssa304 = $498;
            break;
           } else {
            $carry$0142$i = $498;$d$0143$i = $d$0$i;
           }
          }
          $501 = ($$lcssa304|0)==(0);
          if ($501) {
           $a$2$ph$i = $a$1149$i;
           break;
          }
          $502 = ((($a$1149$i)) + -4|0);
          HEAP32[$502>>2] = $$lcssa304;
          $a$2$ph$i = $502;
         }
        } while(0);
        $z$2$i = $z$1148$i;
        while(1) {
         $503 = ($z$2$i>>>0)>($a$2$ph$i>>>0);
         if (!($503)) {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
         $504 = ((($z$2$i)) + -4|0);
         $505 = HEAP32[$504>>2]|0;
         $506 = ($505|0)==(0);
         if ($506) {
          $z$2$i = $504;
         } else {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
        }
        $507 = HEAP32[$e2$i>>2]|0;
        $508 = (($507) - ($489))|0;
        HEAP32[$e2$i>>2] = $508;
        $509 = ($508|0)>(0);
        if ($509) {
         $487 = $508;$a$1149$i = $a$2$ph$i;$z$1148$i = $z$2$i$lcssa;
        } else {
         $$pr50$i = $508;$a$1$lcssa$i = $a$2$ph$i;$z$1$lcssa$i = $z$2$i$lcssa;
         break;
        }
       }
      } else {
       $$pr50$i = $$pr$i;$a$1$lcssa$i = $$33$i;$z$1$lcssa$i = $$lcssa303;
      }
      $510 = ($$pr50$i|0)<(0);
      if ($510) {
       $511 = (($$p$i) + 25)|0;
       $512 = (($511|0) / 9)&-1;
       $513 = (($512) + 1)|0;
       $514 = ($395|0)==(102);
       $516 = $$pr50$i;$a$3136$i = $a$1$lcssa$i;$z$3135$i = $z$1$lcssa$i;
       while(1) {
        $515 = (0 - ($516))|0;
        $517 = ($515|0)>(9);
        $518 = $517 ? 9 : $515;
        $519 = ($a$3136$i>>>0)<($z$3135$i>>>0);
        do {
         if ($519) {
          $523 = 1 << $518;
          $524 = (($523) + -1)|0;
          $525 = 1000000000 >>> $518;
          $carry3$0130$i = 0;$d$1129$i = $a$3136$i;
          while(1) {
           $526 = HEAP32[$d$1129$i>>2]|0;
           $527 = $526 & $524;
           $528 = $526 >>> $518;
           $529 = (($528) + ($carry3$0130$i))|0;
           HEAP32[$d$1129$i>>2] = $529;
           $530 = Math_imul($527, $525)|0;
           $531 = ((($d$1129$i)) + 4|0);
           $532 = ($531>>>0)<($z$3135$i>>>0);
           if ($532) {
            $carry3$0130$i = $530;$d$1129$i = $531;
           } else {
            $$lcssa306 = $530;
            break;
           }
          }
          $533 = HEAP32[$a$3136$i>>2]|0;
          $534 = ($533|0)==(0);
          $535 = ((($a$3136$i)) + 4|0);
          $$a$3$i = $534 ? $535 : $a$3136$i;
          $536 = ($$lcssa306|0)==(0);
          if ($536) {
           $$a$3192$i = $$a$3$i;$z$4$i = $z$3135$i;
           break;
          }
          $537 = ((($z$3135$i)) + 4|0);
          HEAP32[$z$3135$i>>2] = $$lcssa306;
          $$a$3192$i = $$a$3$i;$z$4$i = $537;
         } else {
          $520 = HEAP32[$a$3136$i>>2]|0;
          $521 = ($520|0)==(0);
          $522 = ((($a$3136$i)) + 4|0);
          $$a$3191$i = $521 ? $522 : $a$3136$i;
          $$a$3192$i = $$a$3191$i;$z$4$i = $z$3135$i;
         }
        } while(0);
        $538 = $514 ? $$33$i : $$a$3192$i;
        $539 = $z$4$i;
        $540 = $538;
        $541 = (($539) - ($540))|0;
        $542 = $541 >> 2;
        $543 = ($542|0)>($513|0);
        $544 = (($538) + ($513<<2)|0);
        $$z$4$i = $543 ? $544 : $z$4$i;
        $545 = HEAP32[$e2$i>>2]|0;
        $546 = (($545) + ($518))|0;
        HEAP32[$e2$i>>2] = $546;
        $547 = ($546|0)<(0);
        if ($547) {
         $516 = $546;$a$3136$i = $$a$3192$i;$z$3135$i = $$z$4$i;
        } else {
         $a$3$lcssa$i = $$a$3192$i;$z$3$lcssa$i = $$z$4$i;
         break;
        }
       }
      } else {
       $a$3$lcssa$i = $a$1$lcssa$i;$z$3$lcssa$i = $z$1$lcssa$i;
      }
      $548 = ($a$3$lcssa$i>>>0)<($z$3$lcssa$i>>>0);
      do {
       if ($548) {
        $549 = $a$3$lcssa$i;
        $550 = (($479) - ($549))|0;
        $551 = $550 >> 2;
        $552 = ($551*9)|0;
        $553 = HEAP32[$a$3$lcssa$i>>2]|0;
        $554 = ($553>>>0)<(10);
        if ($554) {
         $e$1$i = $552;
         break;
        } else {
         $e$0125$i = $552;$i$0124$i = 10;
        }
        while(1) {
         $555 = ($i$0124$i*10)|0;
         $556 = (($e$0125$i) + 1)|0;
         $557 = ($553>>>0)<($555>>>0);
         if ($557) {
          $e$1$i = $556;
          break;
         } else {
          $e$0125$i = $556;$i$0124$i = $555;
         }
        }
       } else {
        $e$1$i = 0;
       }
      } while(0);
      $558 = ($395|0)!=(102);
      $559 = $558 ? $e$1$i : 0;
      $560 = (($$p$i) - ($559))|0;
      $561 = ($395|0)==(103);
      $562 = ($$p$i|0)!=(0);
      $563 = $562 & $561;
      $$neg55$i = $563 << 31 >> 31;
      $564 = (($560) + ($$neg55$i))|0;
      $565 = $z$3$lcssa$i;
      $566 = (($565) - ($479))|0;
      $567 = $566 >> 2;
      $568 = ($567*9)|0;
      $569 = (($568) + -9)|0;
      $570 = ($564|0)<($569|0);
      if ($570) {
       $571 = ((($$33$i)) + 4|0);
       $572 = (($564) + 9216)|0;
       $573 = (($572|0) / 9)&-1;
       $574 = (($573) + -1024)|0;
       $575 = (($571) + ($574<<2)|0);
       $576 = (($572|0) % 9)&-1;
       $j$0117$i = (($576) + 1)|0;
       $577 = ($j$0117$i|0)<(9);
       if ($577) {
        $i$1118$i = 10;$j$0119$i = $j$0117$i;
        while(1) {
         $578 = ($i$1118$i*10)|0;
         $j$0$i = (($j$0119$i) + 1)|0;
         $exitcond$i = ($j$0$i|0)==(9);
         if ($exitcond$i) {
          $i$1$lcssa$i = $578;
          break;
         } else {
          $i$1118$i = $578;$j$0119$i = $j$0$i;
         }
        }
       } else {
        $i$1$lcssa$i = 10;
       }
       $579 = HEAP32[$575>>2]|0;
       $580 = (($579>>>0) % ($i$1$lcssa$i>>>0))&-1;
       $581 = ($580|0)==(0);
       $582 = ((($575)) + 4|0);
       $583 = ($582|0)==($z$3$lcssa$i|0);
       $or$cond18$i = $583 & $581;
       do {
        if ($or$cond18$i) {
         $a$8$i = $a$3$lcssa$i;$d$4$i = $575;$e$4$i = $e$1$i;
        } else {
         $584 = (($579>>>0) / ($i$1$lcssa$i>>>0))&-1;
         $585 = $584 & 1;
         $586 = ($585|0)==(0);
         $$20$i = $586 ? 9007199254740992.0 : 9007199254740994.0;
         $587 = (($i$1$lcssa$i|0) / 2)&-1;
         $588 = ($580>>>0)<($587>>>0);
         if ($588) {
          $small$0$i = 0.5;
         } else {
          $589 = ($580|0)==($587|0);
          $or$cond22$i = $583 & $589;
          $$36$i = $or$cond22$i ? 1.0 : 1.5;
          $small$0$i = $$36$i;
         }
         $590 = ($pl$0$i|0)==(0);
         do {
          if ($590) {
           $round6$1$i = $$20$i;$small$1$i = $small$0$i;
          } else {
           $591 = HEAP8[$prefix$0$i>>0]|0;
           $592 = ($591<<24>>24)==(45);
           if (!($592)) {
            $round6$1$i = $$20$i;$small$1$i = $small$0$i;
            break;
           }
           $593 = -$$20$i;
           $594 = -$small$0$i;
           $round6$1$i = $593;$small$1$i = $594;
          }
         } while(0);
         $595 = (($579) - ($580))|0;
         HEAP32[$575>>2] = $595;
         $596 = $round6$1$i + $small$1$i;
         $597 = $596 != $round6$1$i;
         if (!($597)) {
          $a$8$i = $a$3$lcssa$i;$d$4$i = $575;$e$4$i = $e$1$i;
          break;
         }
         $598 = (($595) + ($i$1$lcssa$i))|0;
         HEAP32[$575>>2] = $598;
         $599 = ($598>>>0)>(999999999);
         if ($599) {
          $a$5111$i = $a$3$lcssa$i;$d$2110$i = $575;
          while(1) {
           $600 = ((($d$2110$i)) + -4|0);
           HEAP32[$d$2110$i>>2] = 0;
           $601 = ($600>>>0)<($a$5111$i>>>0);
           if ($601) {
            $602 = ((($a$5111$i)) + -4|0);
            HEAP32[$602>>2] = 0;
            $a$6$i = $602;
           } else {
            $a$6$i = $a$5111$i;
           }
           $603 = HEAP32[$600>>2]|0;
           $604 = (($603) + 1)|0;
           HEAP32[$600>>2] = $604;
           $605 = ($604>>>0)>(999999999);
           if ($605) {
            $a$5111$i = $a$6$i;$d$2110$i = $600;
           } else {
            $a$5$lcssa$i = $a$6$i;$d$2$lcssa$i = $600;
            break;
           }
          }
         } else {
          $a$5$lcssa$i = $a$3$lcssa$i;$d$2$lcssa$i = $575;
         }
         $606 = $a$5$lcssa$i;
         $607 = (($479) - ($606))|0;
         $608 = $607 >> 2;
         $609 = ($608*9)|0;
         $610 = HEAP32[$a$5$lcssa$i>>2]|0;
         $611 = ($610>>>0)<(10);
         if ($611) {
          $a$8$i = $a$5$lcssa$i;$d$4$i = $d$2$lcssa$i;$e$4$i = $609;
          break;
         } else {
          $e$2106$i = $609;$i$2105$i = 10;
         }
         while(1) {
          $612 = ($i$2105$i*10)|0;
          $613 = (($e$2106$i) + 1)|0;
          $614 = ($610>>>0)<($612>>>0);
          if ($614) {
           $a$8$i = $a$5$lcssa$i;$d$4$i = $d$2$lcssa$i;$e$4$i = $613;
           break;
          } else {
           $e$2106$i = $613;$i$2105$i = $612;
          }
         }
        }
       } while(0);
       $615 = ((($d$4$i)) + 4|0);
       $616 = ($z$3$lcssa$i>>>0)>($615>>>0);
       $$z$3$i = $616 ? $615 : $z$3$lcssa$i;
       $a$9$ph$i = $a$8$i;$e$5$ph$i = $e$4$i;$z$7$ph$i = $$z$3$i;
      } else {
       $a$9$ph$i = $a$3$lcssa$i;$e$5$ph$i = $e$1$i;$z$7$ph$i = $z$3$lcssa$i;
      }
      $617 = (0 - ($e$5$ph$i))|0;
      $z$7$i = $z$7$ph$i;
      while(1) {
       $618 = ($z$7$i>>>0)>($a$9$ph$i>>>0);
       if (!($618)) {
        $$lcssa162$i = 0;$z$7$i$lcssa = $z$7$i;
        break;
       }
       $619 = ((($z$7$i)) + -4|0);
       $620 = HEAP32[$619>>2]|0;
       $621 = ($620|0)==(0);
       if ($621) {
        $z$7$i = $619;
       } else {
        $$lcssa162$i = 1;$z$7$i$lcssa = $z$7$i;
        break;
       }
      }
      do {
       if ($561) {
        $622 = $562&1;
        $623 = $622 ^ 1;
        $$p$$i = (($623) + ($$p$i))|0;
        $624 = ($$p$$i|0)>($e$5$ph$i|0);
        $625 = ($e$5$ph$i|0)>(-5);
        $or$cond6$i = $624 & $625;
        if ($or$cond6$i) {
         $626 = (($t$0) + -1)|0;
         $$neg56$i = (($$p$$i) + -1)|0;
         $627 = (($$neg56$i) - ($e$5$ph$i))|0;
         $$013$i = $626;$$210$i = $627;
        } else {
         $628 = (($t$0) + -2)|0;
         $629 = (($$p$$i) + -1)|0;
         $$013$i = $628;$$210$i = $629;
        }
        $630 = $fl$1$ & 8;
        $631 = ($630|0)==(0);
        if (!($631)) {
         $$114$i = $$013$i;$$311$i = $$210$i;$$pre$phi190$iZ2D = $630;
         break;
        }
        do {
         if ($$lcssa162$i) {
          $632 = ((($z$7$i$lcssa)) + -4|0);
          $633 = HEAP32[$632>>2]|0;
          $634 = ($633|0)==(0);
          if ($634) {
           $j$2$i = 9;
           break;
          }
          $635 = (($633>>>0) % 10)&-1;
          $636 = ($635|0)==(0);
          if ($636) {
           $i$3101$i = 10;$j$1102$i = 0;
          } else {
           $j$2$i = 0;
           break;
          }
          while(1) {
           $637 = ($i$3101$i*10)|0;
           $638 = (($j$1102$i) + 1)|0;
           $639 = (($633>>>0) % ($637>>>0))&-1;
           $640 = ($639|0)==(0);
           if ($640) {
            $i$3101$i = $637;$j$1102$i = $638;
           } else {
            $j$2$i = $638;
            break;
           }
          }
         } else {
          $j$2$i = 9;
         }
        } while(0);
        $641 = $$013$i | 32;
        $642 = ($641|0)==(102);
        $643 = $z$7$i$lcssa;
        $644 = (($643) - ($479))|0;
        $645 = $644 >> 2;
        $646 = ($645*9)|0;
        $647 = (($646) + -9)|0;
        if ($642) {
         $648 = (($647) - ($j$2$i))|0;
         $649 = ($648|0)<(0);
         $$23$i = $649 ? 0 : $648;
         $650 = ($$210$i|0)<($$23$i|0);
         $$210$$24$i = $650 ? $$210$i : $$23$i;
         $$114$i = $$013$i;$$311$i = $$210$$24$i;$$pre$phi190$iZ2D = 0;
         break;
        } else {
         $651 = (($647) + ($e$5$ph$i))|0;
         $652 = (($651) - ($j$2$i))|0;
         $653 = ($652|0)<(0);
         $$25$i = $653 ? 0 : $652;
         $654 = ($$210$i|0)<($$25$i|0);
         $$210$$26$i = $654 ? $$210$i : $$25$i;
         $$114$i = $$013$i;$$311$i = $$210$$26$i;$$pre$phi190$iZ2D = 0;
         break;
        }
       } else {
        $$pre189$i = $fl$1$ & 8;
        $$114$i = $t$0;$$311$i = $$p$i;$$pre$phi190$iZ2D = $$pre189$i;
       }
      } while(0);
      $655 = $$311$i | $$pre$phi190$iZ2D;
      $656 = ($655|0)!=(0);
      $657 = $656&1;
      $658 = $$114$i | 32;
      $659 = ($658|0)==(102);
      if ($659) {
       $660 = ($e$5$ph$i|0)>(0);
       $661 = $660 ? $e$5$ph$i : 0;
       $$pn$i = $661;$estr$2$i = 0;
      } else {
       $662 = ($e$5$ph$i|0)<(0);
       $663 = $662 ? $617 : $e$5$ph$i;
       $664 = ($663|0)<(0);
       $665 = $664 << 31 >> 31;
       $666 = (_fmt_u($663,$665,$7)|0);
       $667 = $666;
       $668 = (($9) - ($667))|0;
       $669 = ($668|0)<(2);
       if ($669) {
        $estr$195$i = $666;
        while(1) {
         $670 = ((($estr$195$i)) + -1|0);
         HEAP8[$670>>0] = 48;
         $671 = $670;
         $672 = (($9) - ($671))|0;
         $673 = ($672|0)<(2);
         if ($673) {
          $estr$195$i = $670;
         } else {
          $estr$1$lcssa$i = $670;
          break;
         }
        }
       } else {
        $estr$1$lcssa$i = $666;
       }
       $674 = $e$5$ph$i >> 31;
       $675 = $674 & 2;
       $676 = (($675) + 43)|0;
       $677 = $676&255;
       $678 = ((($estr$1$lcssa$i)) + -1|0);
       HEAP8[$678>>0] = $677;
       $679 = $$114$i&255;
       $680 = ((($estr$1$lcssa$i)) + -2|0);
       HEAP8[$680>>0] = $679;
       $681 = $680;
       $682 = (($9) - ($681))|0;
       $$pn$i = $682;$estr$2$i = $680;
      }
      $683 = (($pl$0$i) + 1)|0;
      $684 = (($683) + ($$311$i))|0;
      $l$1$i = (($684) + ($657))|0;
      $685 = (($l$1$i) + ($$pn$i))|0;
      _pad($f,32,$w$1,$685,$fl$1$);
      $686 = HEAP32[$f>>2]|0;
      $687 = $686 & 32;
      $688 = ($687|0)==(0);
      if ($688) {
       (___fwritex($prefix$0$i,$pl$0$i,$f)|0);
      }
      $689 = $fl$1$ ^ 65536;
      _pad($f,48,$w$1,$685,$689);
      do {
       if ($659) {
        $690 = ($a$9$ph$i>>>0)>($$33$i>>>0);
        $r$0$a$9$i = $690 ? $$33$i : $a$9$ph$i;
        $d$584$i = $r$0$a$9$i;
        while(1) {
         $691 = HEAP32[$d$584$i>>2]|0;
         $692 = (_fmt_u($691,0,$14)|0);
         $693 = ($d$584$i|0)==($r$0$a$9$i|0);
         do {
          if ($693) {
           $699 = ($692|0)==($14|0);
           if (!($699)) {
            $s7$1$i = $692;
            break;
           }
           HEAP8[$16>>0] = 48;
           $s7$1$i = $16;
          } else {
           $694 = ($692>>>0)>($buf$i>>>0);
           if (!($694)) {
            $s7$1$i = $692;
            break;
           }
           $695 = $692;
           $696 = (($695) - ($5))|0;
           _memset(($buf$i|0),48,($696|0))|0;
           $s7$081$i = $692;
           while(1) {
            $697 = ((($s7$081$i)) + -1|0);
            $698 = ($697>>>0)>($buf$i>>>0);
            if ($698) {
             $s7$081$i = $697;
            } else {
             $s7$1$i = $697;
             break;
            }
           }
          }
         } while(0);
         $700 = HEAP32[$f>>2]|0;
         $701 = $700 & 32;
         $702 = ($701|0)==(0);
         if ($702) {
          $703 = $s7$1$i;
          $704 = (($15) - ($703))|0;
          (___fwritex($s7$1$i,$704,$f)|0);
         }
         $705 = ((($d$584$i)) + 4|0);
         $706 = ($705>>>0)>($$33$i>>>0);
         if ($706) {
          $$lcssa316 = $705;
          break;
         } else {
          $d$584$i = $705;
         }
        }
        $707 = ($655|0)==(0);
        do {
         if (!($707)) {
          $708 = HEAP32[$f>>2]|0;
          $709 = $708 & 32;
          $710 = ($709|0)==(0);
          if (!($710)) {
           break;
          }
          (___fwritex(5410,1,$f)|0);
         }
        } while(0);
        $711 = ($$lcssa316>>>0)<($z$7$i$lcssa>>>0);
        $712 = ($$311$i|0)>(0);
        $713 = $712 & $711;
        if ($713) {
         $$41278$i = $$311$i;$d$677$i = $$lcssa316;
         while(1) {
          $714 = HEAP32[$d$677$i>>2]|0;
          $715 = (_fmt_u($714,0,$14)|0);
          $716 = ($715>>>0)>($buf$i>>>0);
          if ($716) {
           $717 = $715;
           $718 = (($717) - ($5))|0;
           _memset(($buf$i|0),48,($718|0))|0;
           $s8$072$i = $715;
           while(1) {
            $719 = ((($s8$072$i)) + -1|0);
            $720 = ($719>>>0)>($buf$i>>>0);
            if ($720) {
             $s8$072$i = $719;
            } else {
             $s8$0$lcssa$i = $719;
             break;
            }
           }
          } else {
           $s8$0$lcssa$i = $715;
          }
          $721 = HEAP32[$f>>2]|0;
          $722 = $721 & 32;
          $723 = ($722|0)==(0);
          if ($723) {
           $724 = ($$41278$i|0)>(9);
           $725 = $724 ? 9 : $$41278$i;
           (___fwritex($s8$0$lcssa$i,$725,$f)|0);
          }
          $726 = ((($d$677$i)) + 4|0);
          $727 = (($$41278$i) + -9)|0;
          $728 = ($726>>>0)<($z$7$i$lcssa>>>0);
          $729 = ($$41278$i|0)>(9);
          $730 = $729 & $728;
          if ($730) {
           $$41278$i = $727;$d$677$i = $726;
          } else {
           $$412$lcssa$i = $727;
           break;
          }
         }
        } else {
         $$412$lcssa$i = $$311$i;
        }
        $731 = (($$412$lcssa$i) + 9)|0;
        _pad($f,48,$731,9,0);
       } else {
        $732 = ((($a$9$ph$i)) + 4|0);
        $z$7$$i = $$lcssa162$i ? $z$7$i$lcssa : $732;
        $733 = ($$311$i|0)>(-1);
        if ($733) {
         $734 = ($$pre$phi190$iZ2D|0)==(0);
         $$589$i = $$311$i;$d$788$i = $a$9$ph$i;
         while(1) {
          $735 = HEAP32[$d$788$i>>2]|0;
          $736 = (_fmt_u($735,0,$14)|0);
          $737 = ($736|0)==($14|0);
          if ($737) {
           HEAP8[$16>>0] = 48;
           $s9$0$i = $16;
          } else {
           $s9$0$i = $736;
          }
          $738 = ($d$788$i|0)==($a$9$ph$i|0);
          do {
           if ($738) {
            $742 = ((($s9$0$i)) + 1|0);
            $743 = HEAP32[$f>>2]|0;
            $744 = $743 & 32;
            $745 = ($744|0)==(0);
            if ($745) {
             (___fwritex($s9$0$i,1,$f)|0);
            }
            $746 = ($$589$i|0)<(1);
            $or$cond31$i = $734 & $746;
            if ($or$cond31$i) {
             $s9$2$i = $742;
             break;
            }
            $747 = HEAP32[$f>>2]|0;
            $748 = $747 & 32;
            $749 = ($748|0)==(0);
            if (!($749)) {
             $s9$2$i = $742;
             break;
            }
            (___fwritex(5410,1,$f)|0);
            $s9$2$i = $742;
           } else {
            $739 = ($s9$0$i>>>0)>($buf$i>>>0);
            if (!($739)) {
             $s9$2$i = $s9$0$i;
             break;
            }
            $scevgep182$i = (($s9$0$i) + ($6)|0);
            $scevgep182183$i = $scevgep182$i;
            _memset(($buf$i|0),48,($scevgep182183$i|0))|0;
            $s9$185$i = $s9$0$i;
            while(1) {
             $740 = ((($s9$185$i)) + -1|0);
             $741 = ($740>>>0)>($buf$i>>>0);
             if ($741) {
              $s9$185$i = $740;
             } else {
              $s9$2$i = $740;
              break;
             }
            }
           }
          } while(0);
          $750 = $s9$2$i;
          $751 = (($15) - ($750))|0;
          $752 = HEAP32[$f>>2]|0;
          $753 = $752 & 32;
          $754 = ($753|0)==(0);
          if ($754) {
           $755 = ($$589$i|0)>($751|0);
           $756 = $755 ? $751 : $$589$i;
           (___fwritex($s9$2$i,$756,$f)|0);
          }
          $757 = (($$589$i) - ($751))|0;
          $758 = ((($d$788$i)) + 4|0);
          $759 = ($758>>>0)<($z$7$$i>>>0);
          $760 = ($757|0)>(-1);
          $761 = $759 & $760;
          if ($761) {
           $$589$i = $757;$d$788$i = $758;
          } else {
           $$5$lcssa$i = $757;
           break;
          }
         }
        } else {
         $$5$lcssa$i = $$311$i;
        }
        $762 = (($$5$lcssa$i) + 18)|0;
        _pad($f,48,$762,18,0);
        $763 = HEAP32[$f>>2]|0;
        $764 = $763 & 32;
        $765 = ($764|0)==(0);
        if (!($765)) {
         break;
        }
        $766 = $estr$2$i;
        $767 = (($9) - ($766))|0;
        (___fwritex($estr$2$i,$767,$f)|0);
       }
      } while(0);
      $768 = $fl$1$ ^ 8192;
      _pad($f,32,$w$1,$685,$768);
      $769 = ($685|0)<($w$1|0);
      $w$32$i = $769 ? $w$1 : $685;
      $$0$i = $w$32$i;
     } else {
      $375 = $t$0 & 32;
      $376 = ($375|0)!=(0);
      $377 = $376 ? 5394 : 5398;
      $378 = ($$07$i != $$07$i) | (0.0 != 0.0);
      $379 = $376 ? 5402 : 5406;
      $pl$1$i = $378 ? 0 : $pl$0$i;
      $s1$0$i = $378 ? $379 : $377;
      $380 = (($pl$1$i) + 3)|0;
      _pad($f,32,$w$1,$380,$176);
      $381 = HEAP32[$f>>2]|0;
      $382 = $381 & 32;
      $383 = ($382|0)==(0);
      if ($383) {
       (___fwritex($prefix$0$i,$pl$1$i,$f)|0);
       $$pre$i = HEAP32[$f>>2]|0;
       $385 = $$pre$i;
      } else {
       $385 = $381;
      }
      $384 = $385 & 32;
      $386 = ($384|0)==(0);
      if ($386) {
       (___fwritex($s1$0$i,3,$f)|0);
      }
      $387 = $fl$1$ ^ 8192;
      _pad($f,32,$w$1,$380,$387);
      $388 = ($380|0)<($w$1|0);
      $389 = $388 ? $w$1 : $380;
      $$0$i = $389;
     }
    } while(0);
    $cnt$0 = $cnt$1;$l$0 = $$0$i;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
    continue L1;
    break;
   }
   default: {
    $a$2 = $s$0;$fl$6 = $fl$1$;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 3466;$z$2 = $1;
   }
   }
  } while(0);
  L311: do {
   if ((label|0) == 64) {
    label = 0;
    $207 = $arg;
    $208 = $207;
    $209 = HEAP32[$208>>2]|0;
    $210 = (($207) + 4)|0;
    $211 = $210;
    $212 = HEAP32[$211>>2]|0;
    $213 = $t$1 & 32;
    $214 = ($209|0)==(0);
    $215 = ($212|0)==(0);
    $216 = $214 & $215;
    if ($216) {
     $a$0 = $1;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 3466;
     label = 77;
    } else {
     $$012$i = $1;$218 = $209;$225 = $212;
     while(1) {
      $217 = $218 & 15;
      $219 = (3450 + ($217)|0);
      $220 = HEAP8[$219>>0]|0;
      $221 = $220&255;
      $222 = $221 | $213;
      $223 = $222&255;
      $224 = ((($$012$i)) + -1|0);
      HEAP8[$224>>0] = $223;
      $226 = (_bitshift64Lshr(($218|0),($225|0),4)|0);
      $227 = tempRet0;
      $228 = ($226|0)==(0);
      $229 = ($227|0)==(0);
      $230 = $228 & $229;
      if ($230) {
       $$lcssa321 = $224;
       break;
      } else {
       $$012$i = $224;$218 = $226;$225 = $227;
      }
     }
     $231 = $arg;
     $232 = $231;
     $233 = HEAP32[$232>>2]|0;
     $234 = (($231) + 4)|0;
     $235 = $234;
     $236 = HEAP32[$235>>2]|0;
     $237 = ($233|0)==(0);
     $238 = ($236|0)==(0);
     $239 = $237 & $238;
     $240 = $fl$3 & 8;
     $241 = ($240|0)==(0);
     $or$cond17 = $241 | $239;
     if ($or$cond17) {
      $a$0 = $$lcssa321;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 3466;
      label = 77;
     } else {
      $242 = $t$1 >> 4;
      $243 = (3466 + ($242)|0);
      $a$0 = $$lcssa321;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 2;$prefix$1 = $243;
      label = 77;
     }
    }
   }
   else if ((label|0) == 76) {
    label = 0;
    $289 = (_fmt_u($287,$288,$1)|0);
    $a$0 = $289;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
    label = 77;
   }
   else if ((label|0) == 82) {
    label = 0;
    $321 = (_memchr($a$1,0,$p$0)|0);
    $322 = ($321|0)==(0|0);
    $323 = $321;
    $324 = $a$1;
    $325 = (($323) - ($324))|0;
    $326 = (($a$1) + ($p$0)|0);
    $z$1 = $322 ? $326 : $321;
    $p$3 = $322 ? $p$0 : $325;
    $a$2 = $a$1;$fl$6 = $176;$p$5 = $p$3;$pl$2 = 0;$prefix$2 = 3466;$z$2 = $z$1;
   }
   else if ((label|0) == 86) {
    label = 0;
    $i$0105 = 0;$l$1104 = 0;$ws$0106 = $798;
    while(1) {
     $334 = HEAP32[$ws$0106>>2]|0;
     $335 = ($334|0)==(0);
     if ($335) {
      $i$0$lcssa = $i$0105;$l$2 = $l$1104;
      break;
     }
     $336 = (_wctomb($mb,$334)|0);
     $337 = ($336|0)<(0);
     $338 = (($p$4176) - ($i$0105))|0;
     $339 = ($336>>>0)>($338>>>0);
     $or$cond20 = $337 | $339;
     if ($or$cond20) {
      $i$0$lcssa = $i$0105;$l$2 = $336;
      break;
     }
     $340 = ((($ws$0106)) + 4|0);
     $341 = (($336) + ($i$0105))|0;
     $342 = ($p$4176>>>0)>($341>>>0);
     if ($342) {
      $i$0105 = $341;$l$1104 = $336;$ws$0106 = $340;
     } else {
      $i$0$lcssa = $341;$l$2 = $336;
      break;
     }
    }
    $343 = ($l$2|0)<(0);
    if ($343) {
     $$0 = -1;
     break L1;
    }
    _pad($f,32,$w$1,$i$0$lcssa,$fl$1$);
    $344 = ($i$0$lcssa|0)==(0);
    if ($344) {
     $i$0$lcssa178 = 0;
     label = 97;
    } else {
     $i$1116 = 0;$ws$1117 = $798;
     while(1) {
      $345 = HEAP32[$ws$1117>>2]|0;
      $346 = ($345|0)==(0);
      if ($346) {
       $i$0$lcssa178 = $i$0$lcssa;
       label = 97;
       break L311;
      }
      $347 = ((($ws$1117)) + 4|0);
      $348 = (_wctomb($mb,$345)|0);
      $349 = (($348) + ($i$1116))|0;
      $350 = ($349|0)>($i$0$lcssa|0);
      if ($350) {
       $i$0$lcssa178 = $i$0$lcssa;
       label = 97;
       break L311;
      }
      $351 = HEAP32[$f>>2]|0;
      $352 = $351 & 32;
      $353 = ($352|0)==(0);
      if ($353) {
       (___fwritex($mb,$348,$f)|0);
      }
      $354 = ($349>>>0)<($i$0$lcssa>>>0);
      if ($354) {
       $i$1116 = $349;$ws$1117 = $347;
      } else {
       $i$0$lcssa178 = $i$0$lcssa;
       label = 97;
       break;
      }
     }
    }
   }
  } while(0);
  if ((label|0) == 97) {
   label = 0;
   $355 = $fl$1$ ^ 8192;
   _pad($f,32,$w$1,$i$0$lcssa178,$355);
   $356 = ($w$1|0)>($i$0$lcssa178|0);
   $357 = $356 ? $w$1 : $i$0$lcssa178;
   $cnt$0 = $cnt$1;$l$0 = $357;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
   continue;
  }
  if ((label|0) == 77) {
   label = 0;
   $290 = ($p$2|0)>(-1);
   $291 = $fl$4 & -65537;
   $$fl$4 = $290 ? $291 : $fl$4;
   $292 = $arg;
   $293 = $292;
   $294 = HEAP32[$293>>2]|0;
   $295 = (($292) + 4)|0;
   $296 = $295;
   $297 = HEAP32[$296>>2]|0;
   $298 = ($294|0)!=(0);
   $299 = ($297|0)!=(0);
   $300 = $298 | $299;
   $301 = ($p$2|0)!=(0);
   $or$cond = $301 | $300;
   if ($or$cond) {
    $302 = $a$0;
    $303 = (($2) - ($302))|0;
    $304 = $300&1;
    $305 = $304 ^ 1;
    $306 = (($305) + ($303))|0;
    $307 = ($p$2|0)>($306|0);
    $p$2$ = $307 ? $p$2 : $306;
    $a$2 = $a$0;$fl$6 = $$fl$4;$p$5 = $p$2$;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $1;
   } else {
    $a$2 = $1;$fl$6 = $$fl$4;$p$5 = 0;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $1;
   }
  }
  $770 = $z$2;
  $771 = $a$2;
  $772 = (($770) - ($771))|0;
  $773 = ($p$5|0)<($772|0);
  $$p$5 = $773 ? $772 : $p$5;
  $774 = (($pl$2) + ($$p$5))|0;
  $775 = ($w$1|0)<($774|0);
  $w$2 = $775 ? $774 : $w$1;
  _pad($f,32,$w$2,$774,$fl$6);
  $776 = HEAP32[$f>>2]|0;
  $777 = $776 & 32;
  $778 = ($777|0)==(0);
  if ($778) {
   (___fwritex($prefix$2,$pl$2,$f)|0);
  }
  $779 = $fl$6 ^ 65536;
  _pad($f,48,$w$2,$774,$779);
  _pad($f,48,$$p$5,$772,0);
  $780 = HEAP32[$f>>2]|0;
  $781 = $780 & 32;
  $782 = ($781|0)==(0);
  if ($782) {
   (___fwritex($a$2,$772,$f)|0);
  }
  $783 = $fl$6 ^ 8192;
  _pad($f,32,$w$2,$774,$783);
  $cnt$0 = $cnt$1;$l$0 = $w$2;$l10n$0 = $l10n$3;$s$0 = $$lcssa300;
 }
 L345: do {
  if ((label|0) == 244) {
   $784 = ($f|0)==(0|0);
   if ($784) {
    $785 = ($l10n$0$lcssa|0)==(0);
    if ($785) {
     $$0 = 0;
    } else {
     $i$291 = 1;
     while(1) {
      $786 = (($nl_type) + ($i$291<<2)|0);
      $787 = HEAP32[$786>>2]|0;
      $788 = ($787|0)==(0);
      if ($788) {
       $i$291$lcssa = $i$291;
       break;
      }
      $790 = (($nl_arg) + ($i$291<<3)|0);
      _pop_arg_389($790,$787,$ap);
      $791 = (($i$291) + 1)|0;
      $792 = ($791|0)<(10);
      if ($792) {
       $i$291 = $791;
      } else {
       $$0 = 1;
       break L345;
      }
     }
     $789 = ($i$291$lcssa|0)<(10);
     if ($789) {
      $i$389 = $i$291$lcssa;
      while(1) {
       $795 = (($nl_type) + ($i$389<<2)|0);
       $796 = HEAP32[$795>>2]|0;
       $797 = ($796|0)==(0);
       $793 = (($i$389) + 1)|0;
       if (!($797)) {
        $$0 = -1;
        break L345;
       }
       $794 = ($793|0)<(10);
       if ($794) {
        $i$389 = $793;
       } else {
        $$0 = 1;
        break;
       }
      }
     } else {
      $$0 = 1;
     }
    }
   } else {
    $$0 = $cnt$1$lcssa;
   }
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function ___fwritex($s,$l,$f) {
 $s = $s|0;
 $l = $l|0;
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $$pre = 0, $$pre6 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$0 = 0, $i$0$lcssa12 = 0;
 var $i$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $4 = (___towrite($f)|0);
  $5 = ($4|0)==(0);
  if ($5) {
   $$pre = HEAP32[$0>>2]|0;
   $9 = $$pre;
   label = 5;
  } else {
   $$0 = 0;
  }
 } else {
  $3 = $1;
  $9 = $3;
  label = 5;
 }
 L5: do {
  if ((label|0) == 5) {
   $6 = ((($f)) + 20|0);
   $7 = HEAP32[$6>>2]|0;
   $8 = (($9) - ($7))|0;
   $10 = ($8>>>0)<($l>>>0);
   $11 = $7;
   if ($10) {
    $12 = ((($f)) + 36|0);
    $13 = HEAP32[$12>>2]|0;
    $14 = (FUNCTION_TABLE_iiii[$13 & 7]($f,$s,$l)|0);
    $$0 = $14;
    break;
   }
   $15 = ((($f)) + 75|0);
   $16 = HEAP8[$15>>0]|0;
   $17 = ($16<<24>>24)>(-1);
   L10: do {
    if ($17) {
     $i$0 = $l;
     while(1) {
      $18 = ($i$0|0)==(0);
      if ($18) {
       $$01 = $l;$$02 = $s;$29 = $11;$i$1 = 0;
       break L10;
      }
      $19 = (($i$0) + -1)|0;
      $20 = (($s) + ($19)|0);
      $21 = HEAP8[$20>>0]|0;
      $22 = ($21<<24>>24)==(10);
      if ($22) {
       $i$0$lcssa12 = $i$0;
       break;
      } else {
       $i$0 = $19;
      }
     }
     $23 = ((($f)) + 36|0);
     $24 = HEAP32[$23>>2]|0;
     $25 = (FUNCTION_TABLE_iiii[$24 & 7]($f,$s,$i$0$lcssa12)|0);
     $26 = ($25>>>0)<($i$0$lcssa12>>>0);
     if ($26) {
      $$0 = $i$0$lcssa12;
      break L5;
     }
     $27 = (($s) + ($i$0$lcssa12)|0);
     $28 = (($l) - ($i$0$lcssa12))|0;
     $$pre6 = HEAP32[$6>>2]|0;
     $$01 = $28;$$02 = $27;$29 = $$pre6;$i$1 = $i$0$lcssa12;
    } else {
     $$01 = $l;$$02 = $s;$29 = $11;$i$1 = 0;
    }
   } while(0);
   _memcpy(($29|0),($$02|0),($$01|0))|0;
   $30 = HEAP32[$6>>2]|0;
   $31 = (($30) + ($$01)|0);
   HEAP32[$6>>2] = $31;
   $32 = (($i$1) + ($$01))|0;
   $$0 = $32;
  }
 } while(0);
 return ($$0|0);
}
function ___towrite($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = HEAP32[$f>>2]|0;
 $7 = $6 & 8;
 $8 = ($7|0)==(0);
 if ($8) {
  $10 = ((($f)) + 8|0);
  HEAP32[$10>>2] = 0;
  $11 = ((($f)) + 4|0);
  HEAP32[$11>>2] = 0;
  $12 = ((($f)) + 44|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ((($f)) + 28|0);
  HEAP32[$14>>2] = $13;
  $15 = ((($f)) + 20|0);
  HEAP32[$15>>2] = $13;
  $16 = $13;
  $17 = ((($f)) + 48|0);
  $18 = HEAP32[$17>>2]|0;
  $19 = (($16) + ($18)|0);
  $20 = ((($f)) + 16|0);
  HEAP32[$20>>2] = $19;
  $$0 = 0;
 } else {
  $9 = $6 | 32;
  HEAP32[$f>>2] = $9;
  $$0 = -1;
 }
 return ($$0|0);
}
function _pop_arg_389($arg,$type,$ap) {
 $arg = $arg|0;
 $type = $type|0;
 $ap = $ap|0;
 var $$mask = 0, $$mask1 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0.0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0.0;
 var $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0;
 var $arglist_current2 = 0, $arglist_current20 = 0, $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current5 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0, $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next6 = 0, $arglist_next9 = 0, $expanded = 0, $expanded28 = 0, $expanded30 = 0, $expanded31 = 0;
 var $expanded32 = 0, $expanded34 = 0, $expanded35 = 0, $expanded37 = 0, $expanded38 = 0, $expanded39 = 0, $expanded41 = 0, $expanded42 = 0, $expanded44 = 0, $expanded45 = 0, $expanded46 = 0, $expanded48 = 0, $expanded49 = 0, $expanded51 = 0, $expanded52 = 0, $expanded53 = 0, $expanded55 = 0, $expanded56 = 0, $expanded58 = 0, $expanded59 = 0;
 var $expanded60 = 0, $expanded62 = 0, $expanded63 = 0, $expanded65 = 0, $expanded66 = 0, $expanded67 = 0, $expanded69 = 0, $expanded70 = 0, $expanded72 = 0, $expanded73 = 0, $expanded74 = 0, $expanded76 = 0, $expanded77 = 0, $expanded79 = 0, $expanded80 = 0, $expanded81 = 0, $expanded83 = 0, $expanded84 = 0, $expanded86 = 0, $expanded87 = 0;
 var $expanded88 = 0, $expanded90 = 0, $expanded91 = 0, $expanded93 = 0, $expanded94 = 0, $expanded95 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($type>>>0)>(20);
 L1: do {
  if (!($0)) {
   do {
    switch ($type|0) {
    case 9:  {
     $arglist_current = HEAP32[$ap>>2]|0;
     $1 = $arglist_current;
     $2 = ((0) + 4|0);
     $expanded28 = $2;
     $expanded = (($expanded28) - 1)|0;
     $3 = (($1) + ($expanded))|0;
     $4 = ((0) + 4|0);
     $expanded32 = $4;
     $expanded31 = (($expanded32) - 1)|0;
     $expanded30 = $expanded31 ^ -1;
     $5 = $3 & $expanded30;
     $6 = $5;
     $7 = HEAP32[$6>>2]|0;
     $arglist_next = ((($6)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     HEAP32[$arg>>2] = $7;
     break L1;
     break;
    }
    case 10:  {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $8 = $arglist_current2;
     $9 = ((0) + 4|0);
     $expanded35 = $9;
     $expanded34 = (($expanded35) - 1)|0;
     $10 = (($8) + ($expanded34))|0;
     $11 = ((0) + 4|0);
     $expanded39 = $11;
     $expanded38 = (($expanded39) - 1)|0;
     $expanded37 = $expanded38 ^ -1;
     $12 = $10 & $expanded37;
     $13 = $12;
     $14 = HEAP32[$13>>2]|0;
     $arglist_next3 = ((($13)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $15 = ($14|0)<(0);
     $16 = $15 << 31 >> 31;
     $17 = $arg;
     $18 = $17;
     HEAP32[$18>>2] = $14;
     $19 = (($17) + 4)|0;
     $20 = $19;
     HEAP32[$20>>2] = $16;
     break L1;
     break;
    }
    case 11:  {
     $arglist_current5 = HEAP32[$ap>>2]|0;
     $21 = $arglist_current5;
     $22 = ((0) + 4|0);
     $expanded42 = $22;
     $expanded41 = (($expanded42) - 1)|0;
     $23 = (($21) + ($expanded41))|0;
     $24 = ((0) + 4|0);
     $expanded46 = $24;
     $expanded45 = (($expanded46) - 1)|0;
     $expanded44 = $expanded45 ^ -1;
     $25 = $23 & $expanded44;
     $26 = $25;
     $27 = HEAP32[$26>>2]|0;
     $arglist_next6 = ((($26)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next6;
     $28 = $arg;
     $29 = $28;
     HEAP32[$29>>2] = $27;
     $30 = (($28) + 4)|0;
     $31 = $30;
     HEAP32[$31>>2] = 0;
     break L1;
     break;
    }
    case 12:  {
     $arglist_current8 = HEAP32[$ap>>2]|0;
     $32 = $arglist_current8;
     $33 = ((0) + 8|0);
     $expanded49 = $33;
     $expanded48 = (($expanded49) - 1)|0;
     $34 = (($32) + ($expanded48))|0;
     $35 = ((0) + 8|0);
     $expanded53 = $35;
     $expanded52 = (($expanded53) - 1)|0;
     $expanded51 = $expanded52 ^ -1;
     $36 = $34 & $expanded51;
     $37 = $36;
     $38 = $37;
     $39 = $38;
     $40 = HEAP32[$39>>2]|0;
     $41 = (($38) + 4)|0;
     $42 = $41;
     $43 = HEAP32[$42>>2]|0;
     $arglist_next9 = ((($37)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next9;
     $44 = $arg;
     $45 = $44;
     HEAP32[$45>>2] = $40;
     $46 = (($44) + 4)|0;
     $47 = $46;
     HEAP32[$47>>2] = $43;
     break L1;
     break;
    }
    case 13:  {
     $arglist_current11 = HEAP32[$ap>>2]|0;
     $48 = $arglist_current11;
     $49 = ((0) + 4|0);
     $expanded56 = $49;
     $expanded55 = (($expanded56) - 1)|0;
     $50 = (($48) + ($expanded55))|0;
     $51 = ((0) + 4|0);
     $expanded60 = $51;
     $expanded59 = (($expanded60) - 1)|0;
     $expanded58 = $expanded59 ^ -1;
     $52 = $50 & $expanded58;
     $53 = $52;
     $54 = HEAP32[$53>>2]|0;
     $arglist_next12 = ((($53)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next12;
     $55 = $54&65535;
     $56 = $55 << 16 >> 16;
     $57 = ($56|0)<(0);
     $58 = $57 << 31 >> 31;
     $59 = $arg;
     $60 = $59;
     HEAP32[$60>>2] = $56;
     $61 = (($59) + 4)|0;
     $62 = $61;
     HEAP32[$62>>2] = $58;
     break L1;
     break;
    }
    case 14:  {
     $arglist_current14 = HEAP32[$ap>>2]|0;
     $63 = $arglist_current14;
     $64 = ((0) + 4|0);
     $expanded63 = $64;
     $expanded62 = (($expanded63) - 1)|0;
     $65 = (($63) + ($expanded62))|0;
     $66 = ((0) + 4|0);
     $expanded67 = $66;
     $expanded66 = (($expanded67) - 1)|0;
     $expanded65 = $expanded66 ^ -1;
     $67 = $65 & $expanded65;
     $68 = $67;
     $69 = HEAP32[$68>>2]|0;
     $arglist_next15 = ((($68)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next15;
     $$mask1 = $69 & 65535;
     $70 = $arg;
     $71 = $70;
     HEAP32[$71>>2] = $$mask1;
     $72 = (($70) + 4)|0;
     $73 = $72;
     HEAP32[$73>>2] = 0;
     break L1;
     break;
    }
    case 15:  {
     $arglist_current17 = HEAP32[$ap>>2]|0;
     $74 = $arglist_current17;
     $75 = ((0) + 4|0);
     $expanded70 = $75;
     $expanded69 = (($expanded70) - 1)|0;
     $76 = (($74) + ($expanded69))|0;
     $77 = ((0) + 4|0);
     $expanded74 = $77;
     $expanded73 = (($expanded74) - 1)|0;
     $expanded72 = $expanded73 ^ -1;
     $78 = $76 & $expanded72;
     $79 = $78;
     $80 = HEAP32[$79>>2]|0;
     $arglist_next18 = ((($79)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next18;
     $81 = $80&255;
     $82 = $81 << 24 >> 24;
     $83 = ($82|0)<(0);
     $84 = $83 << 31 >> 31;
     $85 = $arg;
     $86 = $85;
     HEAP32[$86>>2] = $82;
     $87 = (($85) + 4)|0;
     $88 = $87;
     HEAP32[$88>>2] = $84;
     break L1;
     break;
    }
    case 16:  {
     $arglist_current20 = HEAP32[$ap>>2]|0;
     $89 = $arglist_current20;
     $90 = ((0) + 4|0);
     $expanded77 = $90;
     $expanded76 = (($expanded77) - 1)|0;
     $91 = (($89) + ($expanded76))|0;
     $92 = ((0) + 4|0);
     $expanded81 = $92;
     $expanded80 = (($expanded81) - 1)|0;
     $expanded79 = $expanded80 ^ -1;
     $93 = $91 & $expanded79;
     $94 = $93;
     $95 = HEAP32[$94>>2]|0;
     $arglist_next21 = ((($94)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next21;
     $$mask = $95 & 255;
     $96 = $arg;
     $97 = $96;
     HEAP32[$97>>2] = $$mask;
     $98 = (($96) + 4)|0;
     $99 = $98;
     HEAP32[$99>>2] = 0;
     break L1;
     break;
    }
    case 17:  {
     $arglist_current23 = HEAP32[$ap>>2]|0;
     $100 = $arglist_current23;
     $101 = ((0) + 8|0);
     $expanded84 = $101;
     $expanded83 = (($expanded84) - 1)|0;
     $102 = (($100) + ($expanded83))|0;
     $103 = ((0) + 8|0);
     $expanded88 = $103;
     $expanded87 = (($expanded88) - 1)|0;
     $expanded86 = $expanded87 ^ -1;
     $104 = $102 & $expanded86;
     $105 = $104;
     $106 = +HEAPF64[$105>>3];
     $arglist_next24 = ((($105)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next24;
     HEAPF64[$arg>>3] = $106;
     break L1;
     break;
    }
    case 18:  {
     $arglist_current26 = HEAP32[$ap>>2]|0;
     $107 = $arglist_current26;
     $108 = ((0) + 8|0);
     $expanded91 = $108;
     $expanded90 = (($expanded91) - 1)|0;
     $109 = (($107) + ($expanded90))|0;
     $110 = ((0) + 8|0);
     $expanded95 = $110;
     $expanded94 = (($expanded95) - 1)|0;
     $expanded93 = $expanded94 ^ -1;
     $111 = $109 & $expanded93;
     $112 = $111;
     $113 = +HEAPF64[$112>>3];
     $arglist_next27 = ((($112)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next27;
     HEAPF64[$arg>>3] = $113;
     break L1;
     break;
    }
    default: {
     break L1;
    }
    }
   } while(0);
  }
 } while(0);
 return;
}
function _fmt_u($0,$1,$s) {
 $0 = $0|0;
 $1 = $1|0;
 $s = $s|0;
 var $$0$lcssa = 0, $$01$lcssa$off0 = 0, $$05 = 0, $$1$lcssa = 0, $$12 = 0, $$lcssa19 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $y$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($1>>>0)>(0);
 $3 = ($0>>>0)>(4294967295);
 $4 = ($1|0)==(0);
 $5 = $4 & $3;
 $6 = $2 | $5;
 if ($6) {
  $$05 = $s;$7 = $0;$8 = $1;
  while(1) {
   $9 = (___uremdi3(($7|0),($8|0),10,0)|0);
   $10 = tempRet0;
   $11 = $9 | 48;
   $12 = $11&255;
   $13 = ((($$05)) + -1|0);
   HEAP8[$13>>0] = $12;
   $14 = (___udivdi3(($7|0),($8|0),10,0)|0);
   $15 = tempRet0;
   $16 = ($8>>>0)>(9);
   $17 = ($7>>>0)>(4294967295);
   $18 = ($8|0)==(9);
   $19 = $18 & $17;
   $20 = $16 | $19;
   if ($20) {
    $$05 = $13;$7 = $14;$8 = $15;
   } else {
    $$lcssa19 = $13;$28 = $14;$29 = $15;
    break;
   }
  }
  $$0$lcssa = $$lcssa19;$$01$lcssa$off0 = $28;
 } else {
  $$0$lcssa = $s;$$01$lcssa$off0 = $0;
 }
 $21 = ($$01$lcssa$off0|0)==(0);
 if ($21) {
  $$1$lcssa = $$0$lcssa;
 } else {
  $$12 = $$0$lcssa;$y$03 = $$01$lcssa$off0;
  while(1) {
   $22 = (($y$03>>>0) % 10)&-1;
   $23 = $22 | 48;
   $24 = $23&255;
   $25 = ((($$12)) + -1|0);
   HEAP8[$25>>0] = $24;
   $26 = (($y$03>>>0) / 10)&-1;
   $27 = ($y$03>>>0)<(10);
   if ($27) {
    $$1$lcssa = $25;
    break;
   } else {
    $$12 = $25;$y$03 = $26;
   }
  }
 }
 return ($$1$lcssa|0);
}
function _strerror($e) {
 $e = $e|0;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$03 = 0, $i$03$lcssa = 0, $i$12 = 0, $s$0$lcssa = 0, $s$01 = 0, $s$1 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $i$03 = 0;
 while(1) {
  $1 = (3476 + ($i$03)|0);
  $2 = HEAP8[$1>>0]|0;
  $3 = $2&255;
  $4 = ($3|0)==($e|0);
  if ($4) {
   $i$03$lcssa = $i$03;
   label = 2;
   break;
  }
  $5 = (($i$03) + 1)|0;
  $6 = ($5|0)==(87);
  if ($6) {
   $i$12 = 87;$s$01 = 3564;
   label = 5;
   break;
  } else {
   $i$03 = $5;
  }
 }
 if ((label|0) == 2) {
  $0 = ($i$03$lcssa|0)==(0);
  if ($0) {
   $s$0$lcssa = 3564;
  } else {
   $i$12 = $i$03$lcssa;$s$01 = 3564;
   label = 5;
  }
 }
 if ((label|0) == 5) {
  while(1) {
   label = 0;
   $s$1 = $s$01;
   while(1) {
    $7 = HEAP8[$s$1>>0]|0;
    $8 = ($7<<24>>24)==(0);
    $9 = ((($s$1)) + 1|0);
    if ($8) {
     $$lcssa = $9;
     break;
    } else {
     $s$1 = $9;
    }
   }
   $10 = (($i$12) + -1)|0;
   $11 = ($10|0)==(0);
   if ($11) {
    $s$0$lcssa = $$lcssa;
    break;
   } else {
    $i$12 = $10;$s$01 = $$lcssa;
    label = 5;
   }
  }
 }
 return ($s$0$lcssa|0);
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa30 = 0, $$019 = 0, $$1$lcssa = 0, $$110 = 0, $$110$lcssa = 0, $$24 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond18 = 0, $s$0$lcssa = 0, $s$0$lcssa29 = 0, $s$020 = 0, $s$15 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$011 = 0, $w$011$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond18 = $4 & $3;
 L1: do {
  if ($or$cond18) {
   $5 = $c&255;
   $$019 = $n;$s$020 = $src;
   while(1) {
    $6 = HEAP8[$s$020>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$0$lcssa30 = $$019;$s$0$lcssa29 = $s$020;
     label = 6;
     break L1;
    }
    $8 = ((($s$020)) + 1|0);
    $9 = (($$019) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $13 & $12;
    if ($or$cond) {
     $$019 = $9;$s$020 = $8;
    } else {
     $$0$lcssa = $9;$$lcssa = $13;$s$0$lcssa = $8;
     label = 5;
     break;
    }
   }
  } else {
   $$0$lcssa = $n;$$lcssa = $4;$s$0$lcssa = $src;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$0$lcssa30 = $$0$lcssa;$s$0$lcssa29 = $s$0$lcssa;
   label = 6;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $14 = HEAP8[$s$0$lcssa29>>0]|0;
   $15 = $c&255;
   $16 = ($14<<24>>24)==($15<<24>>24);
   if ($16) {
    $$3 = $$0$lcssa30;$s$2 = $s$0$lcssa29;
   } else {
    $17 = Math_imul($0, 16843009)|0;
    $18 = ($$0$lcssa30>>>0)>(3);
    L11: do {
     if ($18) {
      $$110 = $$0$lcssa30;$w$011 = $s$0$lcssa29;
      while(1) {
       $19 = HEAP32[$w$011>>2]|0;
       $20 = $19 ^ $17;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$110$lcssa = $$110;$w$011$lcssa = $w$011;
        break;
       }
       $26 = ((($w$011)) + 4|0);
       $27 = (($$110) + -4)|0;
       $28 = ($27>>>0)>(3);
       if ($28) {
        $$110 = $27;$w$011 = $26;
       } else {
        $$1$lcssa = $27;$w$0$lcssa = $26;
        label = 11;
        break L11;
       }
      }
      $$24 = $$110$lcssa;$s$15 = $w$011$lcssa;
     } else {
      $$1$lcssa = $$0$lcssa30;$w$0$lcssa = $s$0$lcssa29;
      label = 11;
     }
    } while(0);
    if ((label|0) == 11) {
     $29 = ($$1$lcssa|0)==(0);
     if ($29) {
      $$3 = 0;$s$2 = $w$0$lcssa;
      break;
     } else {
      $$24 = $$1$lcssa;$s$15 = $w$0$lcssa;
     }
    }
    while(1) {
     $30 = HEAP8[$s$15>>0]|0;
     $31 = ($30<<24>>24)==($15<<24>>24);
     if ($31) {
      $$3 = $$24;$s$2 = $s$15;
      break L8;
     }
     $32 = ((($s$15)) + 1|0);
     $33 = (($$24) + -1)|0;
     $34 = ($33|0)==(0);
     if ($34) {
      $$3 = 0;$s$2 = $32;
      break;
     } else {
      $$24 = $33;$s$15 = $32;
     }
    }
   }
  }
 } while(0);
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 return ($36|0);
}
function _pad($f,$c,$w,$l,$fl) {
 $f = $f|0;
 $c = $c|0;
 $w = $w|0;
 $l = $l|0;
 $fl = $fl|0;
 var $$0$lcssa6 = 0, $$02 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $or$cond = 0, $pad = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $pad = sp;
 $0 = $fl & 73728;
 $1 = ($0|0)==(0);
 $2 = ($w|0)>($l|0);
 $or$cond = $2 & $1;
 do {
  if ($or$cond) {
   $3 = (($w) - ($l))|0;
   $4 = ($3>>>0)>(256);
   $5 = $4 ? 256 : $3;
   _memset(($pad|0),($c|0),($5|0))|0;
   $6 = ($3>>>0)>(255);
   $7 = HEAP32[$f>>2]|0;
   $8 = $7 & 32;
   $9 = ($8|0)==(0);
   if ($6) {
    $10 = (($w) - ($l))|0;
    $$02 = $3;$17 = $7;$18 = $9;
    while(1) {
     if ($18) {
      (___fwritex($pad,256,$f)|0);
      $$pre = HEAP32[$f>>2]|0;
      $14 = $$pre;
     } else {
      $14 = $17;
     }
     $11 = (($$02) + -256)|0;
     $12 = ($11>>>0)>(255);
     $13 = $14 & 32;
     $15 = ($13|0)==(0);
     if ($12) {
      $$02 = $11;$17 = $14;$18 = $15;
     } else {
      break;
     }
    }
    $16 = $10 & 255;
    if ($15) {
     $$0$lcssa6 = $16;
    } else {
     break;
    }
   } else {
    if ($9) {
     $$0$lcssa6 = $3;
    } else {
     break;
    }
   }
   (___fwritex($pad,$$0$lcssa6,$f)|0);
  }
 } while(0);
 STACKTOP = sp;return;
}
function _wctomb($s,$wc) {
 $s = $s|0;
 $wc = $wc|0;
 var $$0 = 0, $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 0;
 } else {
  $1 = (_wcrtomb($s,$wc,0)|0);
  $$0 = $1;
 }
 return ($$0|0);
}
function _wcrtomb($s,$wc,$st) {
 $s = $s|0;
 $wc = $wc|0;
 $st = $st|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 do {
  if ($0) {
   $$0 = 1;
  } else {
   $1 = ($wc>>>0)<(128);
   if ($1) {
    $2 = $wc&255;
    HEAP8[$s>>0] = $2;
    $$0 = 1;
    break;
   }
   $3 = ($wc>>>0)<(2048);
   if ($3) {
    $4 = $wc >>> 6;
    $5 = $4 | 192;
    $6 = $5&255;
    $7 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $6;
    $8 = $wc & 63;
    $9 = $8 | 128;
    $10 = $9&255;
    HEAP8[$7>>0] = $10;
    $$0 = 2;
    break;
   }
   $11 = ($wc>>>0)<(55296);
   $12 = $wc & -8192;
   $13 = ($12|0)==(57344);
   $or$cond = $11 | $13;
   if ($or$cond) {
    $14 = $wc >>> 12;
    $15 = $14 | 224;
    $16 = $15&255;
    $17 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $16;
    $18 = $wc >>> 6;
    $19 = $18 & 63;
    $20 = $19 | 128;
    $21 = $20&255;
    $22 = ((($s)) + 2|0);
    HEAP8[$17>>0] = $21;
    $23 = $wc & 63;
    $24 = $23 | 128;
    $25 = $24&255;
    HEAP8[$22>>0] = $25;
    $$0 = 3;
    break;
   }
   $26 = (($wc) + -65536)|0;
   $27 = ($26>>>0)<(1048576);
   if ($27) {
    $28 = $wc >>> 18;
    $29 = $28 | 240;
    $30 = $29&255;
    $31 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $30;
    $32 = $wc >>> 12;
    $33 = $32 & 63;
    $34 = $33 | 128;
    $35 = $34&255;
    $36 = ((($s)) + 2|0);
    HEAP8[$31>>0] = $35;
    $37 = $wc >>> 6;
    $38 = $37 & 63;
    $39 = $38 | 128;
    $40 = $39&255;
    $41 = ((($s)) + 3|0);
    HEAP8[$36>>0] = $40;
    $42 = $wc & 63;
    $43 = $42 | 128;
    $44 = $43&255;
    HEAP8[$41>>0] = $44;
    $$0 = 4;
    break;
   } else {
    $45 = (___errno_location()|0);
    HEAP32[$45>>2] = 84;
    $$0 = -1;
    break;
   }
  }
 } while(0);
 return ($$0|0);
}
function _frexpl($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_frexp($x,$e));
 return (+$0);
}
function _frexp($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 switch ($4|0) {
 case 0:  {
  $5 = $x != 0.0;
  if ($5) {
   $6 = $x * 1.8446744073709552E+19;
   $7 = (+_frexp($6,$e));
   $8 = HEAP32[$e>>2]|0;
   $9 = (($8) + -64)|0;
   $$01 = $7;$storemerge = $9;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  break;
 }
 case 2047:  {
  $$0 = $x;
  break;
 }
 default: {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
 }
 }
 return (+$$0);
}
function ___lockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function _printf($fmt,$varargs) {
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $1 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = HEAP32[2]|0;
 $1 = (_vfprintf($0,$fmt,$ap)|0);
 STACKTOP = sp;return ($1|0);
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$0 = 0, $$lcssa = 0, $$lcssa141 = 0, $$lcssa142 = 0, $$lcssa144 = 0, $$lcssa147 = 0, $$lcssa149 = 0, $$lcssa151 = 0, $$lcssa153 = 0, $$lcssa155 = 0, $$lcssa157 = 0, $$not$i = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i13 = 0, $$pre$i16$i = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i14Z2D = 0, $$pre$phi$i17$iZ2D = 0;
 var $$pre$phi$iZ2D = 0, $$pre$phi10$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre71 = 0, $$pre9$i$i = 0, $$rsize$0$i = 0, $$rsize$4$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0;
 var $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0;
 var $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0;
 var $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0;
 var $1062 = 0, $1063 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0;
 var $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0;
 var $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0;
 var $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0;
 var $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0;
 var $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0;
 var $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0;
 var $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0;
 var $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0;
 var $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0;
 var $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0;
 var $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0;
 var $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0;
 var $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0;
 var $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0;
 var $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0;
 var $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0;
 var $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0;
 var $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0;
 var $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0;
 var $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0;
 var $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0;
 var $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0;
 var $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0;
 var $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0;
 var $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0;
 var $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0;
 var $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0;
 var $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0;
 var $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0;
 var $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0;
 var $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0;
 var $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0;
 var $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0;
 var $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0;
 var $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0;
 var $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0;
 var $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0;
 var $K12$0$i = 0, $K2$0$i$i = 0, $K8$0$i$i = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i$i$lcssa = 0, $R$1$i$lcssa = 0, $R$1$i9 = 0, $R$1$i9$lcssa = 0, $R$3$i = 0, $R$3$i$i = 0, $R$3$i11 = 0, $RP$1$i = 0, $RP$1$i$i = 0, $RP$1$i$i$lcssa = 0, $RP$1$i$lcssa = 0, $RP$1$i8 = 0, $RP$1$i8$lcssa = 0, $T$0$i = 0, $T$0$i$i = 0;
 var $T$0$i$i$lcssa = 0, $T$0$i$i$lcssa140 = 0, $T$0$i$lcssa = 0, $T$0$i$lcssa156 = 0, $T$0$i18$i = 0, $T$0$i18$i$lcssa = 0, $T$0$i18$i$lcssa139 = 0, $br$2$ph$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i12 = 0, $exitcond$i$i = 0, $i$01$i$i = 0, $idx$0$i = 0, $nb$0 = 0, $not$$i$i = 0, $not$$i20$i = 0, $not$7$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0;
 var $or$cond$i17 = 0, $or$cond1$i = 0, $or$cond1$i16 = 0, $or$cond10$i = 0, $or$cond11$i = 0, $or$cond2$i = 0, $or$cond48$i = 0, $or$cond5$i = 0, $or$cond7$i = 0, $or$cond8$i = 0, $p$0$i$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i5 = 0, $rsize$1$i = 0, $rsize$3$i = 0, $rsize$4$lcssa$i = 0, $rsize$412$i = 0, $rst$0$i = 0;
 var $rst$1$i = 0, $sizebits$0$$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$068$i = 0, $sp$068$i$lcssa = 0, $sp$167$i = 0, $sp$167$i$lcssa = 0, $ssize$0$i = 0, $ssize$2$ph$i = 0, $ssize$5$i = 0, $t$0$i = 0, $t$0$i4 = 0, $t$2$i = 0, $t$4$ph$i = 0, $t$4$v$4$i = 0, $t$411$i = 0, $tbase$746$i = 0, $tsize$745$i = 0;
 var $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i6 = 0, $v$1$i = 0, $v$3$i = 0, $v$4$lcssa$i = 0, $v$413$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[1365]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (5500 + ($13<<2)|0);
    $15 = ((($14)) + 8|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[1365] = $22;
     } else {
      $23 = HEAP32[(5476)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $31 = (($16) + ($28)|0);
    $32 = ((($31)) + 4|0);
    $33 = HEAP32[$32>>2]|0;
    $34 = $33 | 1;
    HEAP32[$32>>2] = $34;
    $$0 = $17;
    return ($$0|0);
   }
   $35 = HEAP32[(5468)>>2]|0;
   $36 = ($4>>>0)>($35>>>0);
   if ($36) {
    $37 = ($7|0)==(0);
    if (!($37)) {
     $38 = $7 << $5;
     $39 = 2 << $5;
     $40 = (0 - ($39))|0;
     $41 = $39 | $40;
     $42 = $38 & $41;
     $43 = (0 - ($42))|0;
     $44 = $42 & $43;
     $45 = (($44) + -1)|0;
     $46 = $45 >>> 12;
     $47 = $46 & 16;
     $48 = $45 >>> $47;
     $49 = $48 >>> 5;
     $50 = $49 & 8;
     $51 = $50 | $47;
     $52 = $48 >>> $50;
     $53 = $52 >>> 2;
     $54 = $53 & 4;
     $55 = $51 | $54;
     $56 = $52 >>> $54;
     $57 = $56 >>> 1;
     $58 = $57 & 2;
     $59 = $55 | $58;
     $60 = $56 >>> $58;
     $61 = $60 >>> 1;
     $62 = $61 & 1;
     $63 = $59 | $62;
     $64 = $60 >>> $62;
     $65 = (($63) + ($64))|0;
     $66 = $65 << 1;
     $67 = (5500 + ($66<<2)|0);
     $68 = ((($67)) + 8|0);
     $69 = HEAP32[$68>>2]|0;
     $70 = ((($69)) + 8|0);
     $71 = HEAP32[$70>>2]|0;
     $72 = ($67|0)==($71|0);
     do {
      if ($72) {
       $73 = 1 << $65;
       $74 = $73 ^ -1;
       $75 = $6 & $74;
       HEAP32[1365] = $75;
       $89 = $35;
      } else {
       $76 = HEAP32[(5476)>>2]|0;
       $77 = ($71>>>0)<($76>>>0);
       if ($77) {
        _abort();
        // unreachable;
       }
       $78 = ((($71)) + 12|0);
       $79 = HEAP32[$78>>2]|0;
       $80 = ($79|0)==($69|0);
       if ($80) {
        HEAP32[$78>>2] = $67;
        HEAP32[$68>>2] = $71;
        $$pre = HEAP32[(5468)>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $81 = $65 << 3;
     $82 = (($81) - ($4))|0;
     $83 = $4 | 3;
     $84 = ((($69)) + 4|0);
     HEAP32[$84>>2] = $83;
     $85 = (($69) + ($4)|0);
     $86 = $82 | 1;
     $87 = ((($85)) + 4|0);
     HEAP32[$87>>2] = $86;
     $88 = (($85) + ($82)|0);
     HEAP32[$88>>2] = $82;
     $90 = ($89|0)==(0);
     if (!($90)) {
      $91 = HEAP32[(5480)>>2]|0;
      $92 = $89 >>> 3;
      $93 = $92 << 1;
      $94 = (5500 + ($93<<2)|0);
      $95 = HEAP32[1365]|0;
      $96 = 1 << $92;
      $97 = $95 & $96;
      $98 = ($97|0)==(0);
      if ($98) {
       $99 = $95 | $96;
       HEAP32[1365] = $99;
       $$pre71 = ((($94)) + 8|0);
       $$pre$phiZ2D = $$pre71;$F4$0 = $94;
      } else {
       $100 = ((($94)) + 8|0);
       $101 = HEAP32[$100>>2]|0;
       $102 = HEAP32[(5476)>>2]|0;
       $103 = ($101>>>0)<($102>>>0);
       if ($103) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $100;$F4$0 = $101;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $91;
      $104 = ((($F4$0)) + 12|0);
      HEAP32[$104>>2] = $91;
      $105 = ((($91)) + 8|0);
      HEAP32[$105>>2] = $F4$0;
      $106 = ((($91)) + 12|0);
      HEAP32[$106>>2] = $94;
     }
     HEAP32[(5468)>>2] = $82;
     HEAP32[(5480)>>2] = $85;
     $$0 = $70;
     return ($$0|0);
    }
    $107 = HEAP32[(5464)>>2]|0;
    $108 = ($107|0)==(0);
    if ($108) {
     $nb$0 = $4;
    } else {
     $109 = (0 - ($107))|0;
     $110 = $107 & $109;
     $111 = (($110) + -1)|0;
     $112 = $111 >>> 12;
     $113 = $112 & 16;
     $114 = $111 >>> $113;
     $115 = $114 >>> 5;
     $116 = $115 & 8;
     $117 = $116 | $113;
     $118 = $114 >>> $116;
     $119 = $118 >>> 2;
     $120 = $119 & 4;
     $121 = $117 | $120;
     $122 = $118 >>> $120;
     $123 = $122 >>> 1;
     $124 = $123 & 2;
     $125 = $121 | $124;
     $126 = $122 >>> $124;
     $127 = $126 >>> 1;
     $128 = $127 & 1;
     $129 = $125 | $128;
     $130 = $126 >>> $128;
     $131 = (($129) + ($130))|0;
     $132 = (5764 + ($131<<2)|0);
     $133 = HEAP32[$132>>2]|0;
     $134 = ((($133)) + 4|0);
     $135 = HEAP32[$134>>2]|0;
     $136 = $135 & -8;
     $137 = (($136) - ($4))|0;
     $rsize$0$i = $137;$t$0$i = $133;$v$0$i = $133;
     while(1) {
      $138 = ((($t$0$i)) + 16|0);
      $139 = HEAP32[$138>>2]|0;
      $140 = ($139|0)==(0|0);
      if ($140) {
       $141 = ((($t$0$i)) + 20|0);
       $142 = HEAP32[$141>>2]|0;
       $143 = ($142|0)==(0|0);
       if ($143) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $145 = $142;
       }
      } else {
       $145 = $139;
      }
      $144 = ((($145)) + 4|0);
      $146 = HEAP32[$144>>2]|0;
      $147 = $146 & -8;
      $148 = (($147) - ($4))|0;
      $149 = ($148>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $149 ? $148 : $rsize$0$i;
      $$v$0$i = $149 ? $145 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $145;$v$0$i = $$v$0$i;
     }
     $150 = HEAP32[(5476)>>2]|0;
     $151 = ($v$0$i$lcssa>>>0)<($150>>>0);
     if ($151) {
      _abort();
      // unreachable;
     }
     $152 = (($v$0$i$lcssa) + ($4)|0);
     $153 = ($v$0$i$lcssa>>>0)<($152>>>0);
     if (!($153)) {
      _abort();
      // unreachable;
     }
     $154 = ((($v$0$i$lcssa)) + 24|0);
     $155 = HEAP32[$154>>2]|0;
     $156 = ((($v$0$i$lcssa)) + 12|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($v$0$i$lcssa|0);
     do {
      if ($158) {
       $168 = ((($v$0$i$lcssa)) + 20|0);
       $169 = HEAP32[$168>>2]|0;
       $170 = ($169|0)==(0|0);
       if ($170) {
        $171 = ((($v$0$i$lcssa)) + 16|0);
        $172 = HEAP32[$171>>2]|0;
        $173 = ($172|0)==(0|0);
        if ($173) {
         $R$3$i = 0;
         break;
        } else {
         $R$1$i = $172;$RP$1$i = $171;
        }
       } else {
        $R$1$i = $169;$RP$1$i = $168;
       }
       while(1) {
        $174 = ((($R$1$i)) + 20|0);
        $175 = HEAP32[$174>>2]|0;
        $176 = ($175|0)==(0|0);
        if (!($176)) {
         $R$1$i = $175;$RP$1$i = $174;
         continue;
        }
        $177 = ((($R$1$i)) + 16|0);
        $178 = HEAP32[$177>>2]|0;
        $179 = ($178|0)==(0|0);
        if ($179) {
         $R$1$i$lcssa = $R$1$i;$RP$1$i$lcssa = $RP$1$i;
         break;
        } else {
         $R$1$i = $178;$RP$1$i = $177;
        }
       }
       $180 = ($RP$1$i$lcssa>>>0)<($150>>>0);
       if ($180) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$1$i$lcssa>>2] = 0;
        $R$3$i = $R$1$i$lcssa;
        break;
       }
      } else {
       $159 = ((($v$0$i$lcssa)) + 8|0);
       $160 = HEAP32[$159>>2]|0;
       $161 = ($160>>>0)<($150>>>0);
       if ($161) {
        _abort();
        // unreachable;
       }
       $162 = ((($160)) + 12|0);
       $163 = HEAP32[$162>>2]|0;
       $164 = ($163|0)==($v$0$i$lcssa|0);
       if (!($164)) {
        _abort();
        // unreachable;
       }
       $165 = ((($157)) + 8|0);
       $166 = HEAP32[$165>>2]|0;
       $167 = ($166|0)==($v$0$i$lcssa|0);
       if ($167) {
        HEAP32[$162>>2] = $157;
        HEAP32[$165>>2] = $160;
        $R$3$i = $157;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $181 = ($155|0)==(0|0);
     do {
      if (!($181)) {
       $182 = ((($v$0$i$lcssa)) + 28|0);
       $183 = HEAP32[$182>>2]|0;
       $184 = (5764 + ($183<<2)|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($v$0$i$lcssa|0)==($185|0);
       if ($186) {
        HEAP32[$184>>2] = $R$3$i;
        $cond$i = ($R$3$i|0)==(0|0);
        if ($cond$i) {
         $187 = 1 << $183;
         $188 = $187 ^ -1;
         $189 = HEAP32[(5464)>>2]|0;
         $190 = $189 & $188;
         HEAP32[(5464)>>2] = $190;
         break;
        }
       } else {
        $191 = HEAP32[(5476)>>2]|0;
        $192 = ($155>>>0)<($191>>>0);
        if ($192) {
         _abort();
         // unreachable;
        }
        $193 = ((($155)) + 16|0);
        $194 = HEAP32[$193>>2]|0;
        $195 = ($194|0)==($v$0$i$lcssa|0);
        if ($195) {
         HEAP32[$193>>2] = $R$3$i;
        } else {
         $196 = ((($155)) + 20|0);
         HEAP32[$196>>2] = $R$3$i;
        }
        $197 = ($R$3$i|0)==(0|0);
        if ($197) {
         break;
        }
       }
       $198 = HEAP32[(5476)>>2]|0;
       $199 = ($R$3$i>>>0)<($198>>>0);
       if ($199) {
        _abort();
        // unreachable;
       }
       $200 = ((($R$3$i)) + 24|0);
       HEAP32[$200>>2] = $155;
       $201 = ((($v$0$i$lcssa)) + 16|0);
       $202 = HEAP32[$201>>2]|0;
       $203 = ($202|0)==(0|0);
       do {
        if (!($203)) {
         $204 = ($202>>>0)<($198>>>0);
         if ($204) {
          _abort();
          // unreachable;
         } else {
          $205 = ((($R$3$i)) + 16|0);
          HEAP32[$205>>2] = $202;
          $206 = ((($202)) + 24|0);
          HEAP32[$206>>2] = $R$3$i;
          break;
         }
        }
       } while(0);
       $207 = ((($v$0$i$lcssa)) + 20|0);
       $208 = HEAP32[$207>>2]|0;
       $209 = ($208|0)==(0|0);
       if (!($209)) {
        $210 = HEAP32[(5476)>>2]|0;
        $211 = ($208>>>0)<($210>>>0);
        if ($211) {
         _abort();
         // unreachable;
        } else {
         $212 = ((($R$3$i)) + 20|0);
         HEAP32[$212>>2] = $208;
         $213 = ((($208)) + 24|0);
         HEAP32[$213>>2] = $R$3$i;
         break;
        }
       }
      }
     } while(0);
     $214 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($214) {
      $215 = (($rsize$0$i$lcssa) + ($4))|0;
      $216 = $215 | 3;
      $217 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$217>>2] = $216;
      $218 = (($v$0$i$lcssa) + ($215)|0);
      $219 = ((($218)) + 4|0);
      $220 = HEAP32[$219>>2]|0;
      $221 = $220 | 1;
      HEAP32[$219>>2] = $221;
     } else {
      $222 = $4 | 3;
      $223 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$223>>2] = $222;
      $224 = $rsize$0$i$lcssa | 1;
      $225 = ((($152)) + 4|0);
      HEAP32[$225>>2] = $224;
      $226 = (($152) + ($rsize$0$i$lcssa)|0);
      HEAP32[$226>>2] = $rsize$0$i$lcssa;
      $227 = HEAP32[(5468)>>2]|0;
      $228 = ($227|0)==(0);
      if (!($228)) {
       $229 = HEAP32[(5480)>>2]|0;
       $230 = $227 >>> 3;
       $231 = $230 << 1;
       $232 = (5500 + ($231<<2)|0);
       $233 = HEAP32[1365]|0;
       $234 = 1 << $230;
       $235 = $233 & $234;
       $236 = ($235|0)==(0);
       if ($236) {
        $237 = $233 | $234;
        HEAP32[1365] = $237;
        $$pre$i = ((($232)) + 8|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $232;
       } else {
        $238 = ((($232)) + 8|0);
        $239 = HEAP32[$238>>2]|0;
        $240 = HEAP32[(5476)>>2]|0;
        $241 = ($239>>>0)<($240>>>0);
        if ($241) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $238;$F1$0$i = $239;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $229;
       $242 = ((($F1$0$i)) + 12|0);
       HEAP32[$242>>2] = $229;
       $243 = ((($229)) + 8|0);
       HEAP32[$243>>2] = $F1$0$i;
       $244 = ((($229)) + 12|0);
       HEAP32[$244>>2] = $232;
      }
      HEAP32[(5468)>>2] = $rsize$0$i$lcssa;
      HEAP32[(5480)>>2] = $152;
     }
     $245 = ((($v$0$i$lcssa)) + 8|0);
     $$0 = $245;
     return ($$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $246 = ($bytes>>>0)>(4294967231);
   if ($246) {
    $nb$0 = -1;
   } else {
    $247 = (($bytes) + 11)|0;
    $248 = $247 & -8;
    $249 = HEAP32[(5464)>>2]|0;
    $250 = ($249|0)==(0);
    if ($250) {
     $nb$0 = $248;
    } else {
     $251 = (0 - ($248))|0;
     $252 = $247 >>> 8;
     $253 = ($252|0)==(0);
     if ($253) {
      $idx$0$i = 0;
     } else {
      $254 = ($248>>>0)>(16777215);
      if ($254) {
       $idx$0$i = 31;
      } else {
       $255 = (($252) + 1048320)|0;
       $256 = $255 >>> 16;
       $257 = $256 & 8;
       $258 = $252 << $257;
       $259 = (($258) + 520192)|0;
       $260 = $259 >>> 16;
       $261 = $260 & 4;
       $262 = $261 | $257;
       $263 = $258 << $261;
       $264 = (($263) + 245760)|0;
       $265 = $264 >>> 16;
       $266 = $265 & 2;
       $267 = $262 | $266;
       $268 = (14 - ($267))|0;
       $269 = $263 << $266;
       $270 = $269 >>> 15;
       $271 = (($268) + ($270))|0;
       $272 = $271 << 1;
       $273 = (($271) + 7)|0;
       $274 = $248 >>> $273;
       $275 = $274 & 1;
       $276 = $275 | $272;
       $idx$0$i = $276;
      }
     }
     $277 = (5764 + ($idx$0$i<<2)|0);
     $278 = HEAP32[$277>>2]|0;
     $279 = ($278|0)==(0|0);
     L123: do {
      if ($279) {
       $rsize$3$i = $251;$t$2$i = 0;$v$3$i = 0;
       label = 86;
      } else {
       $280 = ($idx$0$i|0)==(31);
       $281 = $idx$0$i >>> 1;
       $282 = (25 - ($281))|0;
       $283 = $280 ? 0 : $282;
       $284 = $248 << $283;
       $rsize$0$i5 = $251;$rst$0$i = 0;$sizebits$0$i = $284;$t$0$i4 = $278;$v$0$i6 = 0;
       while(1) {
        $285 = ((($t$0$i4)) + 4|0);
        $286 = HEAP32[$285>>2]|0;
        $287 = $286 & -8;
        $288 = (($287) - ($248))|0;
        $289 = ($288>>>0)<($rsize$0$i5>>>0);
        if ($289) {
         $290 = ($287|0)==($248|0);
         if ($290) {
          $rsize$412$i = $288;$t$411$i = $t$0$i4;$v$413$i = $t$0$i4;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $288;$v$1$i = $t$0$i4;
         }
        } else {
         $rsize$1$i = $rsize$0$i5;$v$1$i = $v$0$i6;
        }
        $291 = ((($t$0$i4)) + 20|0);
        $292 = HEAP32[$291>>2]|0;
        $293 = $sizebits$0$i >>> 31;
        $294 = (((($t$0$i4)) + 16|0) + ($293<<2)|0);
        $295 = HEAP32[$294>>2]|0;
        $296 = ($292|0)==(0|0);
        $297 = ($292|0)==($295|0);
        $or$cond1$i = $296 | $297;
        $rst$1$i = $or$cond1$i ? $rst$0$i : $292;
        $298 = ($295|0)==(0|0);
        $299 = $298&1;
        $300 = $299 ^ 1;
        $sizebits$0$$i = $sizebits$0$i << $300;
        if ($298) {
         $rsize$3$i = $rsize$1$i;$t$2$i = $rst$1$i;$v$3$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i5 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $sizebits$0$$i;$t$0$i4 = $295;$v$0$i6 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $301 = ($t$2$i|0)==(0|0);
      $302 = ($v$3$i|0)==(0|0);
      $or$cond$i = $301 & $302;
      if ($or$cond$i) {
       $303 = 2 << $idx$0$i;
       $304 = (0 - ($303))|0;
       $305 = $303 | $304;
       $306 = $249 & $305;
       $307 = ($306|0)==(0);
       if ($307) {
        $nb$0 = $248;
        break;
       }
       $308 = (0 - ($306))|0;
       $309 = $306 & $308;
       $310 = (($309) + -1)|0;
       $311 = $310 >>> 12;
       $312 = $311 & 16;
       $313 = $310 >>> $312;
       $314 = $313 >>> 5;
       $315 = $314 & 8;
       $316 = $315 | $312;
       $317 = $313 >>> $315;
       $318 = $317 >>> 2;
       $319 = $318 & 4;
       $320 = $316 | $319;
       $321 = $317 >>> $319;
       $322 = $321 >>> 1;
       $323 = $322 & 2;
       $324 = $320 | $323;
       $325 = $321 >>> $323;
       $326 = $325 >>> 1;
       $327 = $326 & 1;
       $328 = $324 | $327;
       $329 = $325 >>> $327;
       $330 = (($328) + ($329))|0;
       $331 = (5764 + ($330<<2)|0);
       $332 = HEAP32[$331>>2]|0;
       $t$4$ph$i = $332;
      } else {
       $t$4$ph$i = $t$2$i;
      }
      $333 = ($t$4$ph$i|0)==(0|0);
      if ($333) {
       $rsize$4$lcssa$i = $rsize$3$i;$v$4$lcssa$i = $v$3$i;
      } else {
       $rsize$412$i = $rsize$3$i;$t$411$i = $t$4$ph$i;$v$413$i = $v$3$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $334 = ((($t$411$i)) + 4|0);
       $335 = HEAP32[$334>>2]|0;
       $336 = $335 & -8;
       $337 = (($336) - ($248))|0;
       $338 = ($337>>>0)<($rsize$412$i>>>0);
       $$rsize$4$i = $338 ? $337 : $rsize$412$i;
       $t$4$v$4$i = $338 ? $t$411$i : $v$413$i;
       $339 = ((($t$411$i)) + 16|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if (!($341)) {
        $rsize$412$i = $$rsize$4$i;$t$411$i = $340;$v$413$i = $t$4$v$4$i;
        label = 90;
        continue;
       }
       $342 = ((($t$411$i)) + 20|0);
       $343 = HEAP32[$342>>2]|0;
       $344 = ($343|0)==(0|0);
       if ($344) {
        $rsize$4$lcssa$i = $$rsize$4$i;$v$4$lcssa$i = $t$4$v$4$i;
        break;
       } else {
        $rsize$412$i = $$rsize$4$i;$t$411$i = $343;$v$413$i = $t$4$v$4$i;
        label = 90;
       }
      }
     }
     $345 = ($v$4$lcssa$i|0)==(0|0);
     if ($345) {
      $nb$0 = $248;
     } else {
      $346 = HEAP32[(5468)>>2]|0;
      $347 = (($346) - ($248))|0;
      $348 = ($rsize$4$lcssa$i>>>0)<($347>>>0);
      if ($348) {
       $349 = HEAP32[(5476)>>2]|0;
       $350 = ($v$4$lcssa$i>>>0)<($349>>>0);
       if ($350) {
        _abort();
        // unreachable;
       }
       $351 = (($v$4$lcssa$i) + ($248)|0);
       $352 = ($v$4$lcssa$i>>>0)<($351>>>0);
       if (!($352)) {
        _abort();
        // unreachable;
       }
       $353 = ((($v$4$lcssa$i)) + 24|0);
       $354 = HEAP32[$353>>2]|0;
       $355 = ((($v$4$lcssa$i)) + 12|0);
       $356 = HEAP32[$355>>2]|0;
       $357 = ($356|0)==($v$4$lcssa$i|0);
       do {
        if ($357) {
         $367 = ((($v$4$lcssa$i)) + 20|0);
         $368 = HEAP32[$367>>2]|0;
         $369 = ($368|0)==(0|0);
         if ($369) {
          $370 = ((($v$4$lcssa$i)) + 16|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if ($372) {
           $R$3$i11 = 0;
           break;
          } else {
           $R$1$i9 = $371;$RP$1$i8 = $370;
          }
         } else {
          $R$1$i9 = $368;$RP$1$i8 = $367;
         }
         while(1) {
          $373 = ((($R$1$i9)) + 20|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if (!($375)) {
           $R$1$i9 = $374;$RP$1$i8 = $373;
           continue;
          }
          $376 = ((($R$1$i9)) + 16|0);
          $377 = HEAP32[$376>>2]|0;
          $378 = ($377|0)==(0|0);
          if ($378) {
           $R$1$i9$lcssa = $R$1$i9;$RP$1$i8$lcssa = $RP$1$i8;
           break;
          } else {
           $R$1$i9 = $377;$RP$1$i8 = $376;
          }
         }
         $379 = ($RP$1$i8$lcssa>>>0)<($349>>>0);
         if ($379) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$1$i8$lcssa>>2] = 0;
          $R$3$i11 = $R$1$i9$lcssa;
          break;
         }
        } else {
         $358 = ((($v$4$lcssa$i)) + 8|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359>>>0)<($349>>>0);
         if ($360) {
          _abort();
          // unreachable;
         }
         $361 = ((($359)) + 12|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$4$lcssa$i|0);
         if (!($363)) {
          _abort();
          // unreachable;
         }
         $364 = ((($356)) + 8|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==($v$4$lcssa$i|0);
         if ($366) {
          HEAP32[$361>>2] = $356;
          HEAP32[$364>>2] = $359;
          $R$3$i11 = $356;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $380 = ($354|0)==(0|0);
       do {
        if (!($380)) {
         $381 = ((($v$4$lcssa$i)) + 28|0);
         $382 = HEAP32[$381>>2]|0;
         $383 = (5764 + ($382<<2)|0);
         $384 = HEAP32[$383>>2]|0;
         $385 = ($v$4$lcssa$i|0)==($384|0);
         if ($385) {
          HEAP32[$383>>2] = $R$3$i11;
          $cond$i12 = ($R$3$i11|0)==(0|0);
          if ($cond$i12) {
           $386 = 1 << $382;
           $387 = $386 ^ -1;
           $388 = HEAP32[(5464)>>2]|0;
           $389 = $388 & $387;
           HEAP32[(5464)>>2] = $389;
           break;
          }
         } else {
          $390 = HEAP32[(5476)>>2]|0;
          $391 = ($354>>>0)<($390>>>0);
          if ($391) {
           _abort();
           // unreachable;
          }
          $392 = ((($354)) + 16|0);
          $393 = HEAP32[$392>>2]|0;
          $394 = ($393|0)==($v$4$lcssa$i|0);
          if ($394) {
           HEAP32[$392>>2] = $R$3$i11;
          } else {
           $395 = ((($354)) + 20|0);
           HEAP32[$395>>2] = $R$3$i11;
          }
          $396 = ($R$3$i11|0)==(0|0);
          if ($396) {
           break;
          }
         }
         $397 = HEAP32[(5476)>>2]|0;
         $398 = ($R$3$i11>>>0)<($397>>>0);
         if ($398) {
          _abort();
          // unreachable;
         }
         $399 = ((($R$3$i11)) + 24|0);
         HEAP32[$399>>2] = $354;
         $400 = ((($v$4$lcssa$i)) + 16|0);
         $401 = HEAP32[$400>>2]|0;
         $402 = ($401|0)==(0|0);
         do {
          if (!($402)) {
           $403 = ($401>>>0)<($397>>>0);
           if ($403) {
            _abort();
            // unreachable;
           } else {
            $404 = ((($R$3$i11)) + 16|0);
            HEAP32[$404>>2] = $401;
            $405 = ((($401)) + 24|0);
            HEAP32[$405>>2] = $R$3$i11;
            break;
           }
          }
         } while(0);
         $406 = ((($v$4$lcssa$i)) + 20|0);
         $407 = HEAP32[$406>>2]|0;
         $408 = ($407|0)==(0|0);
         if (!($408)) {
          $409 = HEAP32[(5476)>>2]|0;
          $410 = ($407>>>0)<($409>>>0);
          if ($410) {
           _abort();
           // unreachable;
          } else {
           $411 = ((($R$3$i11)) + 20|0);
           HEAP32[$411>>2] = $407;
           $412 = ((($407)) + 24|0);
           HEAP32[$412>>2] = $R$3$i11;
           break;
          }
         }
        }
       } while(0);
       $413 = ($rsize$4$lcssa$i>>>0)<(16);
       do {
        if ($413) {
         $414 = (($rsize$4$lcssa$i) + ($248))|0;
         $415 = $414 | 3;
         $416 = ((($v$4$lcssa$i)) + 4|0);
         HEAP32[$416>>2] = $415;
         $417 = (($v$4$lcssa$i) + ($414)|0);
         $418 = ((($417)) + 4|0);
         $419 = HEAP32[$418>>2]|0;
         $420 = $419 | 1;
         HEAP32[$418>>2] = $420;
        } else {
         $421 = $248 | 3;
         $422 = ((($v$4$lcssa$i)) + 4|0);
         HEAP32[$422>>2] = $421;
         $423 = $rsize$4$lcssa$i | 1;
         $424 = ((($351)) + 4|0);
         HEAP32[$424>>2] = $423;
         $425 = (($351) + ($rsize$4$lcssa$i)|0);
         HEAP32[$425>>2] = $rsize$4$lcssa$i;
         $426 = $rsize$4$lcssa$i >>> 3;
         $427 = ($rsize$4$lcssa$i>>>0)<(256);
         if ($427) {
          $428 = $426 << 1;
          $429 = (5500 + ($428<<2)|0);
          $430 = HEAP32[1365]|0;
          $431 = 1 << $426;
          $432 = $430 & $431;
          $433 = ($432|0)==(0);
          if ($433) {
           $434 = $430 | $431;
           HEAP32[1365] = $434;
           $$pre$i13 = ((($429)) + 8|0);
           $$pre$phi$i14Z2D = $$pre$i13;$F5$0$i = $429;
          } else {
           $435 = ((($429)) + 8|0);
           $436 = HEAP32[$435>>2]|0;
           $437 = HEAP32[(5476)>>2]|0;
           $438 = ($436>>>0)<($437>>>0);
           if ($438) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i14Z2D = $435;$F5$0$i = $436;
           }
          }
          HEAP32[$$pre$phi$i14Z2D>>2] = $351;
          $439 = ((($F5$0$i)) + 12|0);
          HEAP32[$439>>2] = $351;
          $440 = ((($351)) + 8|0);
          HEAP32[$440>>2] = $F5$0$i;
          $441 = ((($351)) + 12|0);
          HEAP32[$441>>2] = $429;
          break;
         }
         $442 = $rsize$4$lcssa$i >>> 8;
         $443 = ($442|0)==(0);
         if ($443) {
          $I7$0$i = 0;
         } else {
          $444 = ($rsize$4$lcssa$i>>>0)>(16777215);
          if ($444) {
           $I7$0$i = 31;
          } else {
           $445 = (($442) + 1048320)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 8;
           $448 = $442 << $447;
           $449 = (($448) + 520192)|0;
           $450 = $449 >>> 16;
           $451 = $450 & 4;
           $452 = $451 | $447;
           $453 = $448 << $451;
           $454 = (($453) + 245760)|0;
           $455 = $454 >>> 16;
           $456 = $455 & 2;
           $457 = $452 | $456;
           $458 = (14 - ($457))|0;
           $459 = $453 << $456;
           $460 = $459 >>> 15;
           $461 = (($458) + ($460))|0;
           $462 = $461 << 1;
           $463 = (($461) + 7)|0;
           $464 = $rsize$4$lcssa$i >>> $463;
           $465 = $464 & 1;
           $466 = $465 | $462;
           $I7$0$i = $466;
          }
         }
         $467 = (5764 + ($I7$0$i<<2)|0);
         $468 = ((($351)) + 28|0);
         HEAP32[$468>>2] = $I7$0$i;
         $469 = ((($351)) + 16|0);
         $470 = ((($469)) + 4|0);
         HEAP32[$470>>2] = 0;
         HEAP32[$469>>2] = 0;
         $471 = HEAP32[(5464)>>2]|0;
         $472 = 1 << $I7$0$i;
         $473 = $471 & $472;
         $474 = ($473|0)==(0);
         if ($474) {
          $475 = $471 | $472;
          HEAP32[(5464)>>2] = $475;
          HEAP32[$467>>2] = $351;
          $476 = ((($351)) + 24|0);
          HEAP32[$476>>2] = $467;
          $477 = ((($351)) + 12|0);
          HEAP32[$477>>2] = $351;
          $478 = ((($351)) + 8|0);
          HEAP32[$478>>2] = $351;
          break;
         }
         $479 = HEAP32[$467>>2]|0;
         $480 = ($I7$0$i|0)==(31);
         $481 = $I7$0$i >>> 1;
         $482 = (25 - ($481))|0;
         $483 = $480 ? 0 : $482;
         $484 = $rsize$4$lcssa$i << $483;
         $K12$0$i = $484;$T$0$i = $479;
         while(1) {
          $485 = ((($T$0$i)) + 4|0);
          $486 = HEAP32[$485>>2]|0;
          $487 = $486 & -8;
          $488 = ($487|0)==($rsize$4$lcssa$i|0);
          if ($488) {
           $T$0$i$lcssa = $T$0$i;
           label = 148;
           break;
          }
          $489 = $K12$0$i >>> 31;
          $490 = (((($T$0$i)) + 16|0) + ($489<<2)|0);
          $491 = $K12$0$i << 1;
          $492 = HEAP32[$490>>2]|0;
          $493 = ($492|0)==(0|0);
          if ($493) {
           $$lcssa157 = $490;$T$0$i$lcssa156 = $T$0$i;
           label = 145;
           break;
          } else {
           $K12$0$i = $491;$T$0$i = $492;
          }
         }
         if ((label|0) == 145) {
          $494 = HEAP32[(5476)>>2]|0;
          $495 = ($$lcssa157>>>0)<($494>>>0);
          if ($495) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa157>>2] = $351;
           $496 = ((($351)) + 24|0);
           HEAP32[$496>>2] = $T$0$i$lcssa156;
           $497 = ((($351)) + 12|0);
           HEAP32[$497>>2] = $351;
           $498 = ((($351)) + 8|0);
           HEAP32[$498>>2] = $351;
           break;
          }
         }
         else if ((label|0) == 148) {
          $499 = ((($T$0$i$lcssa)) + 8|0);
          $500 = HEAP32[$499>>2]|0;
          $501 = HEAP32[(5476)>>2]|0;
          $502 = ($500>>>0)>=($501>>>0);
          $not$7$i = ($T$0$i$lcssa>>>0)>=($501>>>0);
          $503 = $502 & $not$7$i;
          if ($503) {
           $504 = ((($500)) + 12|0);
           HEAP32[$504>>2] = $351;
           HEAP32[$499>>2] = $351;
           $505 = ((($351)) + 8|0);
           HEAP32[$505>>2] = $500;
           $506 = ((($351)) + 12|0);
           HEAP32[$506>>2] = $T$0$i$lcssa;
           $507 = ((($351)) + 24|0);
           HEAP32[$507>>2] = 0;
           break;
          } else {
           _abort();
           // unreachable;
          }
         }
        }
       } while(0);
       $508 = ((($v$4$lcssa$i)) + 8|0);
       $$0 = $508;
       return ($$0|0);
      } else {
       $nb$0 = $248;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(5468)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(5480)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(5480)>>2] = $514;
   HEAP32[(5468)>>2] = $511;
   $515 = $511 | 1;
   $516 = ((($514)) + 4|0);
   HEAP32[$516>>2] = $515;
   $517 = (($514) + ($511)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(5468)>>2] = 0;
   HEAP32[(5480)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $522 = (($512) + ($509)|0);
   $523 = ((($522)) + 4|0);
   $524 = HEAP32[$523>>2]|0;
   $525 = $524 | 1;
   HEAP32[$523>>2] = $525;
  }
  $526 = ((($512)) + 8|0);
  $$0 = $526;
  return ($$0|0);
 }
 $527 = HEAP32[(5472)>>2]|0;
 $528 = ($527>>>0)>($nb$0>>>0);
 if ($528) {
  $529 = (($527) - ($nb$0))|0;
  HEAP32[(5472)>>2] = $529;
  $530 = HEAP32[(5484)>>2]|0;
  $531 = (($530) + ($nb$0)|0);
  HEAP32[(5484)>>2] = $531;
  $532 = $529 | 1;
  $533 = ((($531)) + 4|0);
  HEAP32[$533>>2] = $532;
  $534 = $nb$0 | 3;
  $535 = ((($530)) + 4|0);
  HEAP32[$535>>2] = $534;
  $536 = ((($530)) + 8|0);
  $$0 = $536;
  return ($$0|0);
 }
 $537 = HEAP32[1483]|0;
 $538 = ($537|0)==(0);
 do {
  if ($538) {
   $539 = (_sysconf(30)|0);
   $540 = (($539) + -1)|0;
   $541 = $540 & $539;
   $542 = ($541|0)==(0);
   if ($542) {
    HEAP32[(5940)>>2] = $539;
    HEAP32[(5936)>>2] = $539;
    HEAP32[(5944)>>2] = -1;
    HEAP32[(5948)>>2] = -1;
    HEAP32[(5952)>>2] = 0;
    HEAP32[(5904)>>2] = 0;
    $543 = (_time((0|0))|0);
    $544 = $543 & -16;
    $545 = $544 ^ 1431655768;
    HEAP32[1483] = $545;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $546 = (($nb$0) + 48)|0;
 $547 = HEAP32[(5940)>>2]|0;
 $548 = (($nb$0) + 47)|0;
 $549 = (($547) + ($548))|0;
 $550 = (0 - ($547))|0;
 $551 = $549 & $550;
 $552 = ($551>>>0)>($nb$0>>>0);
 if (!($552)) {
  $$0 = 0;
  return ($$0|0);
 }
 $553 = HEAP32[(5900)>>2]|0;
 $554 = ($553|0)==(0);
 if (!($554)) {
  $555 = HEAP32[(5892)>>2]|0;
  $556 = (($555) + ($551))|0;
  $557 = ($556>>>0)<=($555>>>0);
  $558 = ($556>>>0)>($553>>>0);
  $or$cond1$i16 = $557 | $558;
  if ($or$cond1$i16) {
   $$0 = 0;
   return ($$0|0);
  }
 }
 $559 = HEAP32[(5904)>>2]|0;
 $560 = $559 & 4;
 $561 = ($560|0)==(0);
 L257: do {
  if ($561) {
   $562 = HEAP32[(5484)>>2]|0;
   $563 = ($562|0)==(0|0);
   L259: do {
    if ($563) {
     label = 173;
    } else {
     $sp$0$i$i = (5908);
     while(1) {
      $564 = HEAP32[$sp$0$i$i>>2]|0;
      $565 = ($564>>>0)>($562>>>0);
      if (!($565)) {
       $566 = ((($sp$0$i$i)) + 4|0);
       $567 = HEAP32[$566>>2]|0;
       $568 = (($564) + ($567)|0);
       $569 = ($568>>>0)>($562>>>0);
       if ($569) {
        $$lcssa153 = $sp$0$i$i;$$lcssa155 = $566;
        break;
       }
      }
      $570 = ((($sp$0$i$i)) + 8|0);
      $571 = HEAP32[$570>>2]|0;
      $572 = ($571|0)==(0|0);
      if ($572) {
       label = 173;
       break L259;
      } else {
       $sp$0$i$i = $571;
      }
     }
     $595 = HEAP32[(5472)>>2]|0;
     $596 = (($549) - ($595))|0;
     $597 = $596 & $550;
     $598 = ($597>>>0)<(2147483647);
     if ($598) {
      $599 = (_sbrk(($597|0))|0);
      $600 = HEAP32[$$lcssa153>>2]|0;
      $601 = HEAP32[$$lcssa155>>2]|0;
      $602 = (($600) + ($601)|0);
      $603 = ($599|0)==($602|0);
      if ($603) {
       $604 = ($599|0)==((-1)|0);
       if (!($604)) {
        $tbase$746$i = $599;$tsize$745$i = $597;
        label = 193;
        break L257;
       }
      } else {
       $br$2$ph$i = $599;$ssize$2$ph$i = $597;
       label = 183;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 173) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if (!($574)) {
      $575 = $573;
      $576 = HEAP32[(5936)>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $551;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($551) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[(5892)>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i17 = $587 & $588;
      if ($or$cond$i17) {
       $589 = HEAP32[(5900)>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $tbase$746$i = $573;$tsize$745$i = $ssize$0$i;
        label = 193;
        break L257;
       } else {
        $br$2$ph$i = $593;$ssize$2$ph$i = $ssize$0$i;
        label = 183;
       }
      }
     }
    }
   } while(0);
   L279: do {
    if ((label|0) == 183) {
     $605 = (0 - ($ssize$2$ph$i))|0;
     $606 = ($br$2$ph$i|0)!=((-1)|0);
     $607 = ($ssize$2$ph$i>>>0)<(2147483647);
     $or$cond7$i = $607 & $606;
     $608 = ($546>>>0)>($ssize$2$ph$i>>>0);
     $or$cond8$i = $608 & $or$cond7$i;
     do {
      if ($or$cond8$i) {
       $609 = HEAP32[(5940)>>2]|0;
       $610 = (($548) - ($ssize$2$ph$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         break L279;
        } else {
         $617 = (($613) + ($ssize$2$ph$i))|0;
         $ssize$5$i = $617;
         break;
        }
       } else {
        $ssize$5$i = $ssize$2$ph$i;
       }
      } else {
       $ssize$5$i = $ssize$2$ph$i;
      }
     } while(0);
     $618 = ($br$2$ph$i|0)==((-1)|0);
     if (!($618)) {
      $tbase$746$i = $br$2$ph$i;$tsize$745$i = $ssize$5$i;
      label = 193;
      break L257;
     }
    }
   } while(0);
   $619 = HEAP32[(5904)>>2]|0;
   $620 = $619 | 4;
   HEAP32[(5904)>>2] = $620;
   label = 190;
  } else {
   label = 190;
  }
 } while(0);
 if ((label|0) == 190) {
  $621 = ($551>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($551|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond5$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond10$i = $626 & $or$cond5$i;
   if ($or$cond10$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $$not$i = ($629>>>0)>($630>>>0);
    if ($$not$i) {
     $tbase$746$i = $622;$tsize$745$i = $629;
     label = 193;
    }
   }
  }
 }
 if ((label|0) == 193) {
  $631 = HEAP32[(5892)>>2]|0;
  $632 = (($631) + ($tsize$745$i))|0;
  HEAP32[(5892)>>2] = $632;
  $633 = HEAP32[(5896)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(5896)>>2] = $632;
  }
  $635 = HEAP32[(5484)>>2]|0;
  $636 = ($635|0)==(0|0);
  do {
   if ($636) {
    $637 = HEAP32[(5476)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$746$i>>>0)<($637>>>0);
    $or$cond11$i = $638 | $639;
    if ($or$cond11$i) {
     HEAP32[(5476)>>2] = $tbase$746$i;
    }
    HEAP32[(5908)>>2] = $tbase$746$i;
    HEAP32[(5912)>>2] = $tsize$745$i;
    HEAP32[(5920)>>2] = 0;
    $640 = HEAP32[1483]|0;
    HEAP32[(5496)>>2] = $640;
    HEAP32[(5492)>>2] = -1;
    $i$01$i$i = 0;
    while(1) {
     $641 = $i$01$i$i << 1;
     $642 = (5500 + ($641<<2)|0);
     $643 = ((($642)) + 12|0);
     HEAP32[$643>>2] = $642;
     $644 = ((($642)) + 8|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$01$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$01$i$i = $645;
     }
    }
    $646 = (($tsize$745$i) + -40)|0;
    $647 = ((($tbase$746$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$746$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(5484)>>2] = $654;
    HEAP32[(5472)>>2] = $655;
    $656 = $655 | 1;
    $657 = ((($654)) + 4|0);
    HEAP32[$657>>2] = $656;
    $658 = (($654) + ($655)|0);
    $659 = ((($658)) + 4|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[(5948)>>2]|0;
    HEAP32[(5488)>>2] = $660;
   } else {
    $sp$068$i = (5908);
    while(1) {
     $661 = HEAP32[$sp$068$i>>2]|0;
     $662 = ((($sp$068$i)) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$746$i|0)==($664|0);
     if ($665) {
      $$lcssa147 = $661;$$lcssa149 = $662;$$lcssa151 = $663;$sp$068$i$lcssa = $sp$068$i;
      label = 203;
      break;
     }
     $666 = ((($sp$068$i)) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$068$i = $667;
     }
    }
    if ((label|0) == 203) {
     $669 = ((($sp$068$i$lcssa)) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($635>>>0)>=($$lcssa147>>>0);
      $674 = ($635>>>0)<($tbase$746$i>>>0);
      $or$cond48$i = $674 & $673;
      if ($or$cond48$i) {
       $675 = (($$lcssa151) + ($tsize$745$i))|0;
       HEAP32[$$lcssa149>>2] = $675;
       $676 = HEAP32[(5472)>>2]|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($tsize$745$i) - ($683))|0;
       $686 = (($685) + ($676))|0;
       HEAP32[(5484)>>2] = $684;
       HEAP32[(5472)>>2] = $686;
       $687 = $686 | 1;
       $688 = ((($684)) + 4|0);
       HEAP32[$688>>2] = $687;
       $689 = (($684) + ($686)|0);
       $690 = ((($689)) + 4|0);
       HEAP32[$690>>2] = 40;
       $691 = HEAP32[(5948)>>2]|0;
       HEAP32[(5488)>>2] = $691;
       break;
      }
     }
    }
    $692 = HEAP32[(5476)>>2]|0;
    $693 = ($tbase$746$i>>>0)<($692>>>0);
    if ($693) {
     HEAP32[(5476)>>2] = $tbase$746$i;
     $757 = $tbase$746$i;
    } else {
     $757 = $692;
    }
    $694 = (($tbase$746$i) + ($tsize$745$i)|0);
    $sp$167$i = (5908);
    while(1) {
     $695 = HEAP32[$sp$167$i>>2]|0;
     $696 = ($695|0)==($694|0);
     if ($696) {
      $$lcssa144 = $sp$167$i;$sp$167$i$lcssa = $sp$167$i;
      label = 211;
      break;
     }
     $697 = ((($sp$167$i)) + 8|0);
     $698 = HEAP32[$697>>2]|0;
     $699 = ($698|0)==(0|0);
     if ($699) {
      $sp$0$i$i$i = (5908);
      break;
     } else {
      $sp$167$i = $698;
     }
    }
    if ((label|0) == 211) {
     $700 = ((($sp$167$i$lcssa)) + 12|0);
     $701 = HEAP32[$700>>2]|0;
     $702 = $701 & 8;
     $703 = ($702|0)==(0);
     if ($703) {
      HEAP32[$$lcssa144>>2] = $tbase$746$i;
      $704 = ((($sp$167$i$lcssa)) + 4|0);
      $705 = HEAP32[$704>>2]|0;
      $706 = (($705) + ($tsize$745$i))|0;
      HEAP32[$704>>2] = $706;
      $707 = ((($tbase$746$i)) + 8|0);
      $708 = $707;
      $709 = $708 & 7;
      $710 = ($709|0)==(0);
      $711 = (0 - ($708))|0;
      $712 = $711 & 7;
      $713 = $710 ? 0 : $712;
      $714 = (($tbase$746$i) + ($713)|0);
      $715 = ((($694)) + 8|0);
      $716 = $715;
      $717 = $716 & 7;
      $718 = ($717|0)==(0);
      $719 = (0 - ($716))|0;
      $720 = $719 & 7;
      $721 = $718 ? 0 : $720;
      $722 = (($694) + ($721)|0);
      $723 = $722;
      $724 = $714;
      $725 = (($723) - ($724))|0;
      $726 = (($714) + ($nb$0)|0);
      $727 = (($725) - ($nb$0))|0;
      $728 = $nb$0 | 3;
      $729 = ((($714)) + 4|0);
      HEAP32[$729>>2] = $728;
      $730 = ($722|0)==($635|0);
      do {
       if ($730) {
        $731 = HEAP32[(5472)>>2]|0;
        $732 = (($731) + ($727))|0;
        HEAP32[(5472)>>2] = $732;
        HEAP32[(5484)>>2] = $726;
        $733 = $732 | 1;
        $734 = ((($726)) + 4|0);
        HEAP32[$734>>2] = $733;
       } else {
        $735 = HEAP32[(5480)>>2]|0;
        $736 = ($722|0)==($735|0);
        if ($736) {
         $737 = HEAP32[(5468)>>2]|0;
         $738 = (($737) + ($727))|0;
         HEAP32[(5468)>>2] = $738;
         HEAP32[(5480)>>2] = $726;
         $739 = $738 | 1;
         $740 = ((($726)) + 4|0);
         HEAP32[$740>>2] = $739;
         $741 = (($726) + ($738)|0);
         HEAP32[$741>>2] = $738;
         break;
        }
        $742 = ((($722)) + 4|0);
        $743 = HEAP32[$742>>2]|0;
        $744 = $743 & 3;
        $745 = ($744|0)==(1);
        if ($745) {
         $746 = $743 & -8;
         $747 = $743 >>> 3;
         $748 = ($743>>>0)<(256);
         L331: do {
          if ($748) {
           $749 = ((($722)) + 8|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = ((($722)) + 12|0);
           $752 = HEAP32[$751>>2]|0;
           $753 = $747 << 1;
           $754 = (5500 + ($753<<2)|0);
           $755 = ($750|0)==($754|0);
           do {
            if (!($755)) {
             $756 = ($750>>>0)<($757>>>0);
             if ($756) {
              _abort();
              // unreachable;
             }
             $758 = ((($750)) + 12|0);
             $759 = HEAP32[$758>>2]|0;
             $760 = ($759|0)==($722|0);
             if ($760) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $761 = ($752|0)==($750|0);
           if ($761) {
            $762 = 1 << $747;
            $763 = $762 ^ -1;
            $764 = HEAP32[1365]|0;
            $765 = $764 & $763;
            HEAP32[1365] = $765;
            break;
           }
           $766 = ($752|0)==($754|0);
           do {
            if ($766) {
             $$pre9$i$i = ((($752)) + 8|0);
             $$pre$phi10$i$iZ2D = $$pre9$i$i;
            } else {
             $767 = ($752>>>0)<($757>>>0);
             if ($767) {
              _abort();
              // unreachable;
             }
             $768 = ((($752)) + 8|0);
             $769 = HEAP32[$768>>2]|0;
             $770 = ($769|0)==($722|0);
             if ($770) {
              $$pre$phi10$i$iZ2D = $768;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $771 = ((($750)) + 12|0);
           HEAP32[$771>>2] = $752;
           HEAP32[$$pre$phi10$i$iZ2D>>2] = $750;
          } else {
           $772 = ((($722)) + 24|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ((($722)) + 12|0);
           $775 = HEAP32[$774>>2]|0;
           $776 = ($775|0)==($722|0);
           do {
            if ($776) {
             $786 = ((($722)) + 16|0);
             $787 = ((($786)) + 4|0);
             $788 = HEAP32[$787>>2]|0;
             $789 = ($788|0)==(0|0);
             if ($789) {
              $790 = HEAP32[$786>>2]|0;
              $791 = ($790|0)==(0|0);
              if ($791) {
               $R$3$i$i = 0;
               break;
              } else {
               $R$1$i$i = $790;$RP$1$i$i = $786;
              }
             } else {
              $R$1$i$i = $788;$RP$1$i$i = $787;
             }
             while(1) {
              $792 = ((($R$1$i$i)) + 20|0);
              $793 = HEAP32[$792>>2]|0;
              $794 = ($793|0)==(0|0);
              if (!($794)) {
               $R$1$i$i = $793;$RP$1$i$i = $792;
               continue;
              }
              $795 = ((($R$1$i$i)) + 16|0);
              $796 = HEAP32[$795>>2]|0;
              $797 = ($796|0)==(0|0);
              if ($797) {
               $R$1$i$i$lcssa = $R$1$i$i;$RP$1$i$i$lcssa = $RP$1$i$i;
               break;
              } else {
               $R$1$i$i = $796;$RP$1$i$i = $795;
              }
             }
             $798 = ($RP$1$i$i$lcssa>>>0)<($757>>>0);
             if ($798) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$1$i$i$lcssa>>2] = 0;
              $R$3$i$i = $R$1$i$i$lcssa;
              break;
             }
            } else {
             $777 = ((($722)) + 8|0);
             $778 = HEAP32[$777>>2]|0;
             $779 = ($778>>>0)<($757>>>0);
             if ($779) {
              _abort();
              // unreachable;
             }
             $780 = ((($778)) + 12|0);
             $781 = HEAP32[$780>>2]|0;
             $782 = ($781|0)==($722|0);
             if (!($782)) {
              _abort();
              // unreachable;
             }
             $783 = ((($775)) + 8|0);
             $784 = HEAP32[$783>>2]|0;
             $785 = ($784|0)==($722|0);
             if ($785) {
              HEAP32[$780>>2] = $775;
              HEAP32[$783>>2] = $778;
              $R$3$i$i = $775;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $799 = ($773|0)==(0|0);
           if ($799) {
            break;
           }
           $800 = ((($722)) + 28|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = (5764 + ($801<<2)|0);
           $803 = HEAP32[$802>>2]|0;
           $804 = ($722|0)==($803|0);
           do {
            if ($804) {
             HEAP32[$802>>2] = $R$3$i$i;
             $cond$i$i = ($R$3$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $805 = 1 << $801;
             $806 = $805 ^ -1;
             $807 = HEAP32[(5464)>>2]|0;
             $808 = $807 & $806;
             HEAP32[(5464)>>2] = $808;
             break L331;
            } else {
             $809 = HEAP32[(5476)>>2]|0;
             $810 = ($773>>>0)<($809>>>0);
             if ($810) {
              _abort();
              // unreachable;
             }
             $811 = ((($773)) + 16|0);
             $812 = HEAP32[$811>>2]|0;
             $813 = ($812|0)==($722|0);
             if ($813) {
              HEAP32[$811>>2] = $R$3$i$i;
             } else {
              $814 = ((($773)) + 20|0);
              HEAP32[$814>>2] = $R$3$i$i;
             }
             $815 = ($R$3$i$i|0)==(0|0);
             if ($815) {
              break L331;
             }
            }
           } while(0);
           $816 = HEAP32[(5476)>>2]|0;
           $817 = ($R$3$i$i>>>0)<($816>>>0);
           if ($817) {
            _abort();
            // unreachable;
           }
           $818 = ((($R$3$i$i)) + 24|0);
           HEAP32[$818>>2] = $773;
           $819 = ((($722)) + 16|0);
           $820 = HEAP32[$819>>2]|0;
           $821 = ($820|0)==(0|0);
           do {
            if (!($821)) {
             $822 = ($820>>>0)<($816>>>0);
             if ($822) {
              _abort();
              // unreachable;
             } else {
              $823 = ((($R$3$i$i)) + 16|0);
              HEAP32[$823>>2] = $820;
              $824 = ((($820)) + 24|0);
              HEAP32[$824>>2] = $R$3$i$i;
              break;
             }
            }
           } while(0);
           $825 = ((($819)) + 4|0);
           $826 = HEAP32[$825>>2]|0;
           $827 = ($826|0)==(0|0);
           if ($827) {
            break;
           }
           $828 = HEAP32[(5476)>>2]|0;
           $829 = ($826>>>0)<($828>>>0);
           if ($829) {
            _abort();
            // unreachable;
           } else {
            $830 = ((($R$3$i$i)) + 20|0);
            HEAP32[$830>>2] = $826;
            $831 = ((($826)) + 24|0);
            HEAP32[$831>>2] = $R$3$i$i;
            break;
           }
          }
         } while(0);
         $832 = (($722) + ($746)|0);
         $833 = (($746) + ($727))|0;
         $oldfirst$0$i$i = $832;$qsize$0$i$i = $833;
        } else {
         $oldfirst$0$i$i = $722;$qsize$0$i$i = $727;
        }
        $834 = ((($oldfirst$0$i$i)) + 4|0);
        $835 = HEAP32[$834>>2]|0;
        $836 = $835 & -2;
        HEAP32[$834>>2] = $836;
        $837 = $qsize$0$i$i | 1;
        $838 = ((($726)) + 4|0);
        HEAP32[$838>>2] = $837;
        $839 = (($726) + ($qsize$0$i$i)|0);
        HEAP32[$839>>2] = $qsize$0$i$i;
        $840 = $qsize$0$i$i >>> 3;
        $841 = ($qsize$0$i$i>>>0)<(256);
        if ($841) {
         $842 = $840 << 1;
         $843 = (5500 + ($842<<2)|0);
         $844 = HEAP32[1365]|0;
         $845 = 1 << $840;
         $846 = $844 & $845;
         $847 = ($846|0)==(0);
         do {
          if ($847) {
           $848 = $844 | $845;
           HEAP32[1365] = $848;
           $$pre$i16$i = ((($843)) + 8|0);
           $$pre$phi$i17$iZ2D = $$pre$i16$i;$F4$0$i$i = $843;
          } else {
           $849 = ((($843)) + 8|0);
           $850 = HEAP32[$849>>2]|0;
           $851 = HEAP32[(5476)>>2]|0;
           $852 = ($850>>>0)<($851>>>0);
           if (!($852)) {
            $$pre$phi$i17$iZ2D = $849;$F4$0$i$i = $850;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i17$iZ2D>>2] = $726;
         $853 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$853>>2] = $726;
         $854 = ((($726)) + 8|0);
         HEAP32[$854>>2] = $F4$0$i$i;
         $855 = ((($726)) + 12|0);
         HEAP32[$855>>2] = $843;
         break;
        }
        $856 = $qsize$0$i$i >>> 8;
        $857 = ($856|0)==(0);
        do {
         if ($857) {
          $I7$0$i$i = 0;
         } else {
          $858 = ($qsize$0$i$i>>>0)>(16777215);
          if ($858) {
           $I7$0$i$i = 31;
           break;
          }
          $859 = (($856) + 1048320)|0;
          $860 = $859 >>> 16;
          $861 = $860 & 8;
          $862 = $856 << $861;
          $863 = (($862) + 520192)|0;
          $864 = $863 >>> 16;
          $865 = $864 & 4;
          $866 = $865 | $861;
          $867 = $862 << $865;
          $868 = (($867) + 245760)|0;
          $869 = $868 >>> 16;
          $870 = $869 & 2;
          $871 = $866 | $870;
          $872 = (14 - ($871))|0;
          $873 = $867 << $870;
          $874 = $873 >>> 15;
          $875 = (($872) + ($874))|0;
          $876 = $875 << 1;
          $877 = (($875) + 7)|0;
          $878 = $qsize$0$i$i >>> $877;
          $879 = $878 & 1;
          $880 = $879 | $876;
          $I7$0$i$i = $880;
         }
        } while(0);
        $881 = (5764 + ($I7$0$i$i<<2)|0);
        $882 = ((($726)) + 28|0);
        HEAP32[$882>>2] = $I7$0$i$i;
        $883 = ((($726)) + 16|0);
        $884 = ((($883)) + 4|0);
        HEAP32[$884>>2] = 0;
        HEAP32[$883>>2] = 0;
        $885 = HEAP32[(5464)>>2]|0;
        $886 = 1 << $I7$0$i$i;
        $887 = $885 & $886;
        $888 = ($887|0)==(0);
        if ($888) {
         $889 = $885 | $886;
         HEAP32[(5464)>>2] = $889;
         HEAP32[$881>>2] = $726;
         $890 = ((($726)) + 24|0);
         HEAP32[$890>>2] = $881;
         $891 = ((($726)) + 12|0);
         HEAP32[$891>>2] = $726;
         $892 = ((($726)) + 8|0);
         HEAP32[$892>>2] = $726;
         break;
        }
        $893 = HEAP32[$881>>2]|0;
        $894 = ($I7$0$i$i|0)==(31);
        $895 = $I7$0$i$i >>> 1;
        $896 = (25 - ($895))|0;
        $897 = $894 ? 0 : $896;
        $898 = $qsize$0$i$i << $897;
        $K8$0$i$i = $898;$T$0$i18$i = $893;
        while(1) {
         $899 = ((($T$0$i18$i)) + 4|0);
         $900 = HEAP32[$899>>2]|0;
         $901 = $900 & -8;
         $902 = ($901|0)==($qsize$0$i$i|0);
         if ($902) {
          $T$0$i18$i$lcssa = $T$0$i18$i;
          label = 281;
          break;
         }
         $903 = $K8$0$i$i >>> 31;
         $904 = (((($T$0$i18$i)) + 16|0) + ($903<<2)|0);
         $905 = $K8$0$i$i << 1;
         $906 = HEAP32[$904>>2]|0;
         $907 = ($906|0)==(0|0);
         if ($907) {
          $$lcssa = $904;$T$0$i18$i$lcssa139 = $T$0$i18$i;
          label = 278;
          break;
         } else {
          $K8$0$i$i = $905;$T$0$i18$i = $906;
         }
        }
        if ((label|0) == 278) {
         $908 = HEAP32[(5476)>>2]|0;
         $909 = ($$lcssa>>>0)<($908>>>0);
         if ($909) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$$lcssa>>2] = $726;
          $910 = ((($726)) + 24|0);
          HEAP32[$910>>2] = $T$0$i18$i$lcssa139;
          $911 = ((($726)) + 12|0);
          HEAP32[$911>>2] = $726;
          $912 = ((($726)) + 8|0);
          HEAP32[$912>>2] = $726;
          break;
         }
        }
        else if ((label|0) == 281) {
         $913 = ((($T$0$i18$i$lcssa)) + 8|0);
         $914 = HEAP32[$913>>2]|0;
         $915 = HEAP32[(5476)>>2]|0;
         $916 = ($914>>>0)>=($915>>>0);
         $not$$i20$i = ($T$0$i18$i$lcssa>>>0)>=($915>>>0);
         $917 = $916 & $not$$i20$i;
         if ($917) {
          $918 = ((($914)) + 12|0);
          HEAP32[$918>>2] = $726;
          HEAP32[$913>>2] = $726;
          $919 = ((($726)) + 8|0);
          HEAP32[$919>>2] = $914;
          $920 = ((($726)) + 12|0);
          HEAP32[$920>>2] = $T$0$i18$i$lcssa;
          $921 = ((($726)) + 24|0);
          HEAP32[$921>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       }
      } while(0);
      $1052 = ((($714)) + 8|0);
      $$0 = $1052;
      return ($$0|0);
     } else {
      $sp$0$i$i$i = (5908);
     }
    }
    while(1) {
     $922 = HEAP32[$sp$0$i$i$i>>2]|0;
     $923 = ($922>>>0)>($635>>>0);
     if (!($923)) {
      $924 = ((($sp$0$i$i$i)) + 4|0);
      $925 = HEAP32[$924>>2]|0;
      $926 = (($922) + ($925)|0);
      $927 = ($926>>>0)>($635>>>0);
      if ($927) {
       $$lcssa142 = $926;
       break;
      }
     }
     $928 = ((($sp$0$i$i$i)) + 8|0);
     $929 = HEAP32[$928>>2]|0;
     $sp$0$i$i$i = $929;
    }
    $930 = ((($$lcssa142)) + -47|0);
    $931 = ((($930)) + 8|0);
    $932 = $931;
    $933 = $932 & 7;
    $934 = ($933|0)==(0);
    $935 = (0 - ($932))|0;
    $936 = $935 & 7;
    $937 = $934 ? 0 : $936;
    $938 = (($930) + ($937)|0);
    $939 = ((($635)) + 16|0);
    $940 = ($938>>>0)<($939>>>0);
    $941 = $940 ? $635 : $938;
    $942 = ((($941)) + 8|0);
    $943 = ((($941)) + 24|0);
    $944 = (($tsize$745$i) + -40)|0;
    $945 = ((($tbase$746$i)) + 8|0);
    $946 = $945;
    $947 = $946 & 7;
    $948 = ($947|0)==(0);
    $949 = (0 - ($946))|0;
    $950 = $949 & 7;
    $951 = $948 ? 0 : $950;
    $952 = (($tbase$746$i) + ($951)|0);
    $953 = (($944) - ($951))|0;
    HEAP32[(5484)>>2] = $952;
    HEAP32[(5472)>>2] = $953;
    $954 = $953 | 1;
    $955 = ((($952)) + 4|0);
    HEAP32[$955>>2] = $954;
    $956 = (($952) + ($953)|0);
    $957 = ((($956)) + 4|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(5948)>>2]|0;
    HEAP32[(5488)>>2] = $958;
    $959 = ((($941)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$942>>2]=HEAP32[(5908)>>2]|0;HEAP32[$942+4>>2]=HEAP32[(5908)+4>>2]|0;HEAP32[$942+8>>2]=HEAP32[(5908)+8>>2]|0;HEAP32[$942+12>>2]=HEAP32[(5908)+12>>2]|0;
    HEAP32[(5908)>>2] = $tbase$746$i;
    HEAP32[(5912)>>2] = $tsize$745$i;
    HEAP32[(5920)>>2] = 0;
    HEAP32[(5916)>>2] = $942;
    $p$0$i$i = $943;
    while(1) {
     $960 = ((($p$0$i$i)) + 4|0);
     HEAP32[$960>>2] = 7;
     $961 = ((($960)) + 4|0);
     $962 = ($961>>>0)<($$lcssa142>>>0);
     if ($962) {
      $p$0$i$i = $960;
     } else {
      break;
     }
    }
    $963 = ($941|0)==($635|0);
    if (!($963)) {
     $964 = $941;
     $965 = $635;
     $966 = (($964) - ($965))|0;
     $967 = HEAP32[$959>>2]|0;
     $968 = $967 & -2;
     HEAP32[$959>>2] = $968;
     $969 = $966 | 1;
     $970 = ((($635)) + 4|0);
     HEAP32[$970>>2] = $969;
     HEAP32[$941>>2] = $966;
     $971 = $966 >>> 3;
     $972 = ($966>>>0)<(256);
     if ($972) {
      $973 = $971 << 1;
      $974 = (5500 + ($973<<2)|0);
      $975 = HEAP32[1365]|0;
      $976 = 1 << $971;
      $977 = $975 & $976;
      $978 = ($977|0)==(0);
      if ($978) {
       $979 = $975 | $976;
       HEAP32[1365] = $979;
       $$pre$i$i = ((($974)) + 8|0);
       $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $974;
      } else {
       $980 = ((($974)) + 8|0);
       $981 = HEAP32[$980>>2]|0;
       $982 = HEAP32[(5476)>>2]|0;
       $983 = ($981>>>0)<($982>>>0);
       if ($983) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $980;$F$0$i$i = $981;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $984 = ((($F$0$i$i)) + 12|0);
      HEAP32[$984>>2] = $635;
      $985 = ((($635)) + 8|0);
      HEAP32[$985>>2] = $F$0$i$i;
      $986 = ((($635)) + 12|0);
      HEAP32[$986>>2] = $974;
      break;
     }
     $987 = $966 >>> 8;
     $988 = ($987|0)==(0);
     if ($988) {
      $I1$0$i$i = 0;
     } else {
      $989 = ($966>>>0)>(16777215);
      if ($989) {
       $I1$0$i$i = 31;
      } else {
       $990 = (($987) + 1048320)|0;
       $991 = $990 >>> 16;
       $992 = $991 & 8;
       $993 = $987 << $992;
       $994 = (($993) + 520192)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 4;
       $997 = $996 | $992;
       $998 = $993 << $996;
       $999 = (($998) + 245760)|0;
       $1000 = $999 >>> 16;
       $1001 = $1000 & 2;
       $1002 = $997 | $1001;
       $1003 = (14 - ($1002))|0;
       $1004 = $998 << $1001;
       $1005 = $1004 >>> 15;
       $1006 = (($1003) + ($1005))|0;
       $1007 = $1006 << 1;
       $1008 = (($1006) + 7)|0;
       $1009 = $966 >>> $1008;
       $1010 = $1009 & 1;
       $1011 = $1010 | $1007;
       $I1$0$i$i = $1011;
      }
     }
     $1012 = (5764 + ($I1$0$i$i<<2)|0);
     $1013 = ((($635)) + 28|0);
     HEAP32[$1013>>2] = $I1$0$i$i;
     $1014 = ((($635)) + 20|0);
     HEAP32[$1014>>2] = 0;
     HEAP32[$939>>2] = 0;
     $1015 = HEAP32[(5464)>>2]|0;
     $1016 = 1 << $I1$0$i$i;
     $1017 = $1015 & $1016;
     $1018 = ($1017|0)==(0);
     if ($1018) {
      $1019 = $1015 | $1016;
      HEAP32[(5464)>>2] = $1019;
      HEAP32[$1012>>2] = $635;
      $1020 = ((($635)) + 24|0);
      HEAP32[$1020>>2] = $1012;
      $1021 = ((($635)) + 12|0);
      HEAP32[$1021>>2] = $635;
      $1022 = ((($635)) + 8|0);
      HEAP32[$1022>>2] = $635;
      break;
     }
     $1023 = HEAP32[$1012>>2]|0;
     $1024 = ($I1$0$i$i|0)==(31);
     $1025 = $I1$0$i$i >>> 1;
     $1026 = (25 - ($1025))|0;
     $1027 = $1024 ? 0 : $1026;
     $1028 = $966 << $1027;
     $K2$0$i$i = $1028;$T$0$i$i = $1023;
     while(1) {
      $1029 = ((($T$0$i$i)) + 4|0);
      $1030 = HEAP32[$1029>>2]|0;
      $1031 = $1030 & -8;
      $1032 = ($1031|0)==($966|0);
      if ($1032) {
       $T$0$i$i$lcssa = $T$0$i$i;
       label = 307;
       break;
      }
      $1033 = $K2$0$i$i >>> 31;
      $1034 = (((($T$0$i$i)) + 16|0) + ($1033<<2)|0);
      $1035 = $K2$0$i$i << 1;
      $1036 = HEAP32[$1034>>2]|0;
      $1037 = ($1036|0)==(0|0);
      if ($1037) {
       $$lcssa141 = $1034;$T$0$i$i$lcssa140 = $T$0$i$i;
       label = 304;
       break;
      } else {
       $K2$0$i$i = $1035;$T$0$i$i = $1036;
      }
     }
     if ((label|0) == 304) {
      $1038 = HEAP32[(5476)>>2]|0;
      $1039 = ($$lcssa141>>>0)<($1038>>>0);
      if ($1039) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$$lcssa141>>2] = $635;
       $1040 = ((($635)) + 24|0);
       HEAP32[$1040>>2] = $T$0$i$i$lcssa140;
       $1041 = ((($635)) + 12|0);
       HEAP32[$1041>>2] = $635;
       $1042 = ((($635)) + 8|0);
       HEAP32[$1042>>2] = $635;
       break;
      }
     }
     else if ((label|0) == 307) {
      $1043 = ((($T$0$i$i$lcssa)) + 8|0);
      $1044 = HEAP32[$1043>>2]|0;
      $1045 = HEAP32[(5476)>>2]|0;
      $1046 = ($1044>>>0)>=($1045>>>0);
      $not$$i$i = ($T$0$i$i$lcssa>>>0)>=($1045>>>0);
      $1047 = $1046 & $not$$i$i;
      if ($1047) {
       $1048 = ((($1044)) + 12|0);
       HEAP32[$1048>>2] = $635;
       HEAP32[$1043>>2] = $635;
       $1049 = ((($635)) + 8|0);
       HEAP32[$1049>>2] = $1044;
       $1050 = ((($635)) + 12|0);
       HEAP32[$1050>>2] = $T$0$i$i$lcssa;
       $1051 = ((($635)) + 24|0);
       HEAP32[$1051>>2] = 0;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    }
   }
  } while(0);
  $1053 = HEAP32[(5472)>>2]|0;
  $1054 = ($1053>>>0)>($nb$0>>>0);
  if ($1054) {
   $1055 = (($1053) - ($nb$0))|0;
   HEAP32[(5472)>>2] = $1055;
   $1056 = HEAP32[(5484)>>2]|0;
   $1057 = (($1056) + ($nb$0)|0);
   HEAP32[(5484)>>2] = $1057;
   $1058 = $1055 | 1;
   $1059 = ((($1057)) + 4|0);
   HEAP32[$1059>>2] = $1058;
   $1060 = $nb$0 | 3;
   $1061 = ((($1056)) + 4|0);
   HEAP32[$1061>>2] = $1060;
   $1062 = ((($1056)) + 8|0);
   $$0 = $1062;
   return ($$0|0);
  }
 }
 $1063 = (___errno_location()|0);
 HEAP32[$1063>>2] = 12;
 $$0 = 0;
 return ($$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi41Z2D = 0, $$pre$phi43Z2D = 0, $$pre$phiZ2D = 0, $$pre40 = 0, $$pre42 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0;
 var $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0;
 var $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0;
 var $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0;
 var $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0;
 var $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0;
 var $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0;
 var $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0;
 var $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0;
 var $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0;
 var $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0;
 var $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0;
 var $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0;
 var $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F18$0 = 0, $I20$0 = 0, $K21$0 = 0, $R$1 = 0, $R$1$lcssa = 0, $R$3 = 0, $R8$1 = 0, $R8$1$lcssa = 0, $R8$3 = 0, $RP$1 = 0, $RP$1$lcssa = 0, $RP10$1 = 0, $RP10$1$lcssa = 0;
 var $T$0 = 0, $T$0$lcssa = 0, $T$0$lcssa48 = 0, $cond20 = 0, $cond21 = 0, $not$ = 0, $p$1 = 0, $psize$1 = 0, $psize$2 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(5476)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $9 = (($1) + ($8)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $14 = (0 - ($12))|0;
   $15 = (($1) + ($14)|0);
   $16 = (($12) + ($8))|0;
   $17 = ($15>>>0)<($2>>>0);
   if ($17) {
    _abort();
    // unreachable;
   }
   $18 = HEAP32[(5480)>>2]|0;
   $19 = ($15|0)==($18|0);
   if ($19) {
    $104 = ((($9)) + 4|0);
    $105 = HEAP32[$104>>2]|0;
    $106 = $105 & 3;
    $107 = ($106|0)==(3);
    if (!($107)) {
     $p$1 = $15;$psize$1 = $16;
     break;
    }
    HEAP32[(5468)>>2] = $16;
    $108 = $105 & -2;
    HEAP32[$104>>2] = $108;
    $109 = $16 | 1;
    $110 = ((($15)) + 4|0);
    HEAP32[$110>>2] = $109;
    $111 = (($15) + ($16)|0);
    HEAP32[$111>>2] = $16;
    return;
   }
   $20 = $12 >>> 3;
   $21 = ($12>>>0)<(256);
   if ($21) {
    $22 = ((($15)) + 8|0);
    $23 = HEAP32[$22>>2]|0;
    $24 = ((($15)) + 12|0);
    $25 = HEAP32[$24>>2]|0;
    $26 = $20 << 1;
    $27 = (5500 + ($26<<2)|0);
    $28 = ($23|0)==($27|0);
    if (!($28)) {
     $29 = ($23>>>0)<($2>>>0);
     if ($29) {
      _abort();
      // unreachable;
     }
     $30 = ((($23)) + 12|0);
     $31 = HEAP32[$30>>2]|0;
     $32 = ($31|0)==($15|0);
     if (!($32)) {
      _abort();
      // unreachable;
     }
    }
    $33 = ($25|0)==($23|0);
    if ($33) {
     $34 = 1 << $20;
     $35 = $34 ^ -1;
     $36 = HEAP32[1365]|0;
     $37 = $36 & $35;
     HEAP32[1365] = $37;
     $p$1 = $15;$psize$1 = $16;
     break;
    }
    $38 = ($25|0)==($27|0);
    if ($38) {
     $$pre42 = ((($25)) + 8|0);
     $$pre$phi43Z2D = $$pre42;
    } else {
     $39 = ($25>>>0)<($2>>>0);
     if ($39) {
      _abort();
      // unreachable;
     }
     $40 = ((($25)) + 8|0);
     $41 = HEAP32[$40>>2]|0;
     $42 = ($41|0)==($15|0);
     if ($42) {
      $$pre$phi43Z2D = $40;
     } else {
      _abort();
      // unreachable;
     }
    }
    $43 = ((($23)) + 12|0);
    HEAP32[$43>>2] = $25;
    HEAP32[$$pre$phi43Z2D>>2] = $23;
    $p$1 = $15;$psize$1 = $16;
    break;
   }
   $44 = ((($15)) + 24|0);
   $45 = HEAP32[$44>>2]|0;
   $46 = ((($15)) + 12|0);
   $47 = HEAP32[$46>>2]|0;
   $48 = ($47|0)==($15|0);
   do {
    if ($48) {
     $58 = ((($15)) + 16|0);
     $59 = ((($58)) + 4|0);
     $60 = HEAP32[$59>>2]|0;
     $61 = ($60|0)==(0|0);
     if ($61) {
      $62 = HEAP32[$58>>2]|0;
      $63 = ($62|0)==(0|0);
      if ($63) {
       $R$3 = 0;
       break;
      } else {
       $R$1 = $62;$RP$1 = $58;
      }
     } else {
      $R$1 = $60;$RP$1 = $59;
     }
     while(1) {
      $64 = ((($R$1)) + 20|0);
      $65 = HEAP32[$64>>2]|0;
      $66 = ($65|0)==(0|0);
      if (!($66)) {
       $R$1 = $65;$RP$1 = $64;
       continue;
      }
      $67 = ((($R$1)) + 16|0);
      $68 = HEAP32[$67>>2]|0;
      $69 = ($68|0)==(0|0);
      if ($69) {
       $R$1$lcssa = $R$1;$RP$1$lcssa = $RP$1;
       break;
      } else {
       $R$1 = $68;$RP$1 = $67;
      }
     }
     $70 = ($RP$1$lcssa>>>0)<($2>>>0);
     if ($70) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$1$lcssa>>2] = 0;
      $R$3 = $R$1$lcssa;
      break;
     }
    } else {
     $49 = ((($15)) + 8|0);
     $50 = HEAP32[$49>>2]|0;
     $51 = ($50>>>0)<($2>>>0);
     if ($51) {
      _abort();
      // unreachable;
     }
     $52 = ((($50)) + 12|0);
     $53 = HEAP32[$52>>2]|0;
     $54 = ($53|0)==($15|0);
     if (!($54)) {
      _abort();
      // unreachable;
     }
     $55 = ((($47)) + 8|0);
     $56 = HEAP32[$55>>2]|0;
     $57 = ($56|0)==($15|0);
     if ($57) {
      HEAP32[$52>>2] = $47;
      HEAP32[$55>>2] = $50;
      $R$3 = $47;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $71 = ($45|0)==(0|0);
   if ($71) {
    $p$1 = $15;$psize$1 = $16;
   } else {
    $72 = ((($15)) + 28|0);
    $73 = HEAP32[$72>>2]|0;
    $74 = (5764 + ($73<<2)|0);
    $75 = HEAP32[$74>>2]|0;
    $76 = ($15|0)==($75|0);
    if ($76) {
     HEAP32[$74>>2] = $R$3;
     $cond20 = ($R$3|0)==(0|0);
     if ($cond20) {
      $77 = 1 << $73;
      $78 = $77 ^ -1;
      $79 = HEAP32[(5464)>>2]|0;
      $80 = $79 & $78;
      HEAP32[(5464)>>2] = $80;
      $p$1 = $15;$psize$1 = $16;
      break;
     }
    } else {
     $81 = HEAP32[(5476)>>2]|0;
     $82 = ($45>>>0)<($81>>>0);
     if ($82) {
      _abort();
      // unreachable;
     }
     $83 = ((($45)) + 16|0);
     $84 = HEAP32[$83>>2]|0;
     $85 = ($84|0)==($15|0);
     if ($85) {
      HEAP32[$83>>2] = $R$3;
     } else {
      $86 = ((($45)) + 20|0);
      HEAP32[$86>>2] = $R$3;
     }
     $87 = ($R$3|0)==(0|0);
     if ($87) {
      $p$1 = $15;$psize$1 = $16;
      break;
     }
    }
    $88 = HEAP32[(5476)>>2]|0;
    $89 = ($R$3>>>0)<($88>>>0);
    if ($89) {
     _abort();
     // unreachable;
    }
    $90 = ((($R$3)) + 24|0);
    HEAP32[$90>>2] = $45;
    $91 = ((($15)) + 16|0);
    $92 = HEAP32[$91>>2]|0;
    $93 = ($92|0)==(0|0);
    do {
     if (!($93)) {
      $94 = ($92>>>0)<($88>>>0);
      if ($94) {
       _abort();
       // unreachable;
      } else {
       $95 = ((($R$3)) + 16|0);
       HEAP32[$95>>2] = $92;
       $96 = ((($92)) + 24|0);
       HEAP32[$96>>2] = $R$3;
       break;
      }
     }
    } while(0);
    $97 = ((($91)) + 4|0);
    $98 = HEAP32[$97>>2]|0;
    $99 = ($98|0)==(0|0);
    if ($99) {
     $p$1 = $15;$psize$1 = $16;
    } else {
     $100 = HEAP32[(5476)>>2]|0;
     $101 = ($98>>>0)<($100>>>0);
     if ($101) {
      _abort();
      // unreachable;
     } else {
      $102 = ((($R$3)) + 20|0);
      HEAP32[$102>>2] = $98;
      $103 = ((($98)) + 24|0);
      HEAP32[$103>>2] = $R$3;
      $p$1 = $15;$psize$1 = $16;
      break;
     }
    }
   }
  } else {
   $p$1 = $1;$psize$1 = $8;
  }
 } while(0);
 $112 = ($p$1>>>0)<($9>>>0);
 if (!($112)) {
  _abort();
  // unreachable;
 }
 $113 = ((($9)) + 4|0);
 $114 = HEAP32[$113>>2]|0;
 $115 = $114 & 1;
 $116 = ($115|0)==(0);
 if ($116) {
  _abort();
  // unreachable;
 }
 $117 = $114 & 2;
 $118 = ($117|0)==(0);
 if ($118) {
  $119 = HEAP32[(5484)>>2]|0;
  $120 = ($9|0)==($119|0);
  if ($120) {
   $121 = HEAP32[(5472)>>2]|0;
   $122 = (($121) + ($psize$1))|0;
   HEAP32[(5472)>>2] = $122;
   HEAP32[(5484)>>2] = $p$1;
   $123 = $122 | 1;
   $124 = ((($p$1)) + 4|0);
   HEAP32[$124>>2] = $123;
   $125 = HEAP32[(5480)>>2]|0;
   $126 = ($p$1|0)==($125|0);
   if (!($126)) {
    return;
   }
   HEAP32[(5480)>>2] = 0;
   HEAP32[(5468)>>2] = 0;
   return;
  }
  $127 = HEAP32[(5480)>>2]|0;
  $128 = ($9|0)==($127|0);
  if ($128) {
   $129 = HEAP32[(5468)>>2]|0;
   $130 = (($129) + ($psize$1))|0;
   HEAP32[(5468)>>2] = $130;
   HEAP32[(5480)>>2] = $p$1;
   $131 = $130 | 1;
   $132 = ((($p$1)) + 4|0);
   HEAP32[$132>>2] = $131;
   $133 = (($p$1) + ($130)|0);
   HEAP32[$133>>2] = $130;
   return;
  }
  $134 = $114 & -8;
  $135 = (($134) + ($psize$1))|0;
  $136 = $114 >>> 3;
  $137 = ($114>>>0)<(256);
  do {
   if ($137) {
    $138 = ((($9)) + 8|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = ((($9)) + 12|0);
    $141 = HEAP32[$140>>2]|0;
    $142 = $136 << 1;
    $143 = (5500 + ($142<<2)|0);
    $144 = ($139|0)==($143|0);
    if (!($144)) {
     $145 = HEAP32[(5476)>>2]|0;
     $146 = ($139>>>0)<($145>>>0);
     if ($146) {
      _abort();
      // unreachable;
     }
     $147 = ((($139)) + 12|0);
     $148 = HEAP32[$147>>2]|0;
     $149 = ($148|0)==($9|0);
     if (!($149)) {
      _abort();
      // unreachable;
     }
    }
    $150 = ($141|0)==($139|0);
    if ($150) {
     $151 = 1 << $136;
     $152 = $151 ^ -1;
     $153 = HEAP32[1365]|0;
     $154 = $153 & $152;
     HEAP32[1365] = $154;
     break;
    }
    $155 = ($141|0)==($143|0);
    if ($155) {
     $$pre40 = ((($141)) + 8|0);
     $$pre$phi41Z2D = $$pre40;
    } else {
     $156 = HEAP32[(5476)>>2]|0;
     $157 = ($141>>>0)<($156>>>0);
     if ($157) {
      _abort();
      // unreachable;
     }
     $158 = ((($141)) + 8|0);
     $159 = HEAP32[$158>>2]|0;
     $160 = ($159|0)==($9|0);
     if ($160) {
      $$pre$phi41Z2D = $158;
     } else {
      _abort();
      // unreachable;
     }
    }
    $161 = ((($139)) + 12|0);
    HEAP32[$161>>2] = $141;
    HEAP32[$$pre$phi41Z2D>>2] = $139;
   } else {
    $162 = ((($9)) + 24|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ((($9)) + 12|0);
    $165 = HEAP32[$164>>2]|0;
    $166 = ($165|0)==($9|0);
    do {
     if ($166) {
      $177 = ((($9)) + 16|0);
      $178 = ((($177)) + 4|0);
      $179 = HEAP32[$178>>2]|0;
      $180 = ($179|0)==(0|0);
      if ($180) {
       $181 = HEAP32[$177>>2]|0;
       $182 = ($181|0)==(0|0);
       if ($182) {
        $R8$3 = 0;
        break;
       } else {
        $R8$1 = $181;$RP10$1 = $177;
       }
      } else {
       $R8$1 = $179;$RP10$1 = $178;
      }
      while(1) {
       $183 = ((($R8$1)) + 20|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($184|0)==(0|0);
       if (!($185)) {
        $R8$1 = $184;$RP10$1 = $183;
        continue;
       }
       $186 = ((($R8$1)) + 16|0);
       $187 = HEAP32[$186>>2]|0;
       $188 = ($187|0)==(0|0);
       if ($188) {
        $R8$1$lcssa = $R8$1;$RP10$1$lcssa = $RP10$1;
        break;
       } else {
        $R8$1 = $187;$RP10$1 = $186;
       }
      }
      $189 = HEAP32[(5476)>>2]|0;
      $190 = ($RP10$1$lcssa>>>0)<($189>>>0);
      if ($190) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP10$1$lcssa>>2] = 0;
       $R8$3 = $R8$1$lcssa;
       break;
      }
     } else {
      $167 = ((($9)) + 8|0);
      $168 = HEAP32[$167>>2]|0;
      $169 = HEAP32[(5476)>>2]|0;
      $170 = ($168>>>0)<($169>>>0);
      if ($170) {
       _abort();
       // unreachable;
      }
      $171 = ((($168)) + 12|0);
      $172 = HEAP32[$171>>2]|0;
      $173 = ($172|0)==($9|0);
      if (!($173)) {
       _abort();
       // unreachable;
      }
      $174 = ((($165)) + 8|0);
      $175 = HEAP32[$174>>2]|0;
      $176 = ($175|0)==($9|0);
      if ($176) {
       HEAP32[$171>>2] = $165;
       HEAP32[$174>>2] = $168;
       $R8$3 = $165;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $191 = ($163|0)==(0|0);
    if (!($191)) {
     $192 = ((($9)) + 28|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = (5764 + ($193<<2)|0);
     $195 = HEAP32[$194>>2]|0;
     $196 = ($9|0)==($195|0);
     if ($196) {
      HEAP32[$194>>2] = $R8$3;
      $cond21 = ($R8$3|0)==(0|0);
      if ($cond21) {
       $197 = 1 << $193;
       $198 = $197 ^ -1;
       $199 = HEAP32[(5464)>>2]|0;
       $200 = $199 & $198;
       HEAP32[(5464)>>2] = $200;
       break;
      }
     } else {
      $201 = HEAP32[(5476)>>2]|0;
      $202 = ($163>>>0)<($201>>>0);
      if ($202) {
       _abort();
       // unreachable;
      }
      $203 = ((($163)) + 16|0);
      $204 = HEAP32[$203>>2]|0;
      $205 = ($204|0)==($9|0);
      if ($205) {
       HEAP32[$203>>2] = $R8$3;
      } else {
       $206 = ((($163)) + 20|0);
       HEAP32[$206>>2] = $R8$3;
      }
      $207 = ($R8$3|0)==(0|0);
      if ($207) {
       break;
      }
     }
     $208 = HEAP32[(5476)>>2]|0;
     $209 = ($R8$3>>>0)<($208>>>0);
     if ($209) {
      _abort();
      // unreachable;
     }
     $210 = ((($R8$3)) + 24|0);
     HEAP32[$210>>2] = $163;
     $211 = ((($9)) + 16|0);
     $212 = HEAP32[$211>>2]|0;
     $213 = ($212|0)==(0|0);
     do {
      if (!($213)) {
       $214 = ($212>>>0)<($208>>>0);
       if ($214) {
        _abort();
        // unreachable;
       } else {
        $215 = ((($R8$3)) + 16|0);
        HEAP32[$215>>2] = $212;
        $216 = ((($212)) + 24|0);
        HEAP32[$216>>2] = $R8$3;
        break;
       }
      }
     } while(0);
     $217 = ((($211)) + 4|0);
     $218 = HEAP32[$217>>2]|0;
     $219 = ($218|0)==(0|0);
     if (!($219)) {
      $220 = HEAP32[(5476)>>2]|0;
      $221 = ($218>>>0)<($220>>>0);
      if ($221) {
       _abort();
       // unreachable;
      } else {
       $222 = ((($R8$3)) + 20|0);
       HEAP32[$222>>2] = $218;
       $223 = ((($218)) + 24|0);
       HEAP32[$223>>2] = $R8$3;
       break;
      }
     }
    }
   }
  } while(0);
  $224 = $135 | 1;
  $225 = ((($p$1)) + 4|0);
  HEAP32[$225>>2] = $224;
  $226 = (($p$1) + ($135)|0);
  HEAP32[$226>>2] = $135;
  $227 = HEAP32[(5480)>>2]|0;
  $228 = ($p$1|0)==($227|0);
  if ($228) {
   HEAP32[(5468)>>2] = $135;
   return;
  } else {
   $psize$2 = $135;
  }
 } else {
  $229 = $114 & -2;
  HEAP32[$113>>2] = $229;
  $230 = $psize$1 | 1;
  $231 = ((($p$1)) + 4|0);
  HEAP32[$231>>2] = $230;
  $232 = (($p$1) + ($psize$1)|0);
  HEAP32[$232>>2] = $psize$1;
  $psize$2 = $psize$1;
 }
 $233 = $psize$2 >>> 3;
 $234 = ($psize$2>>>0)<(256);
 if ($234) {
  $235 = $233 << 1;
  $236 = (5500 + ($235<<2)|0);
  $237 = HEAP32[1365]|0;
  $238 = 1 << $233;
  $239 = $237 & $238;
  $240 = ($239|0)==(0);
  if ($240) {
   $241 = $237 | $238;
   HEAP32[1365] = $241;
   $$pre = ((($236)) + 8|0);
   $$pre$phiZ2D = $$pre;$F18$0 = $236;
  } else {
   $242 = ((($236)) + 8|0);
   $243 = HEAP32[$242>>2]|0;
   $244 = HEAP32[(5476)>>2]|0;
   $245 = ($243>>>0)<($244>>>0);
   if ($245) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $242;$F18$0 = $243;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$1;
  $246 = ((($F18$0)) + 12|0);
  HEAP32[$246>>2] = $p$1;
  $247 = ((($p$1)) + 8|0);
  HEAP32[$247>>2] = $F18$0;
  $248 = ((($p$1)) + 12|0);
  HEAP32[$248>>2] = $236;
  return;
 }
 $249 = $psize$2 >>> 8;
 $250 = ($249|0)==(0);
 if ($250) {
  $I20$0 = 0;
 } else {
  $251 = ($psize$2>>>0)>(16777215);
  if ($251) {
   $I20$0 = 31;
  } else {
   $252 = (($249) + 1048320)|0;
   $253 = $252 >>> 16;
   $254 = $253 & 8;
   $255 = $249 << $254;
   $256 = (($255) + 520192)|0;
   $257 = $256 >>> 16;
   $258 = $257 & 4;
   $259 = $258 | $254;
   $260 = $255 << $258;
   $261 = (($260) + 245760)|0;
   $262 = $261 >>> 16;
   $263 = $262 & 2;
   $264 = $259 | $263;
   $265 = (14 - ($264))|0;
   $266 = $260 << $263;
   $267 = $266 >>> 15;
   $268 = (($265) + ($267))|0;
   $269 = $268 << 1;
   $270 = (($268) + 7)|0;
   $271 = $psize$2 >>> $270;
   $272 = $271 & 1;
   $273 = $272 | $269;
   $I20$0 = $273;
  }
 }
 $274 = (5764 + ($I20$0<<2)|0);
 $275 = ((($p$1)) + 28|0);
 HEAP32[$275>>2] = $I20$0;
 $276 = ((($p$1)) + 16|0);
 $277 = ((($p$1)) + 20|0);
 HEAP32[$277>>2] = 0;
 HEAP32[$276>>2] = 0;
 $278 = HEAP32[(5464)>>2]|0;
 $279 = 1 << $I20$0;
 $280 = $278 & $279;
 $281 = ($280|0)==(0);
 do {
  if ($281) {
   $282 = $278 | $279;
   HEAP32[(5464)>>2] = $282;
   HEAP32[$274>>2] = $p$1;
   $283 = ((($p$1)) + 24|0);
   HEAP32[$283>>2] = $274;
   $284 = ((($p$1)) + 12|0);
   HEAP32[$284>>2] = $p$1;
   $285 = ((($p$1)) + 8|0);
   HEAP32[$285>>2] = $p$1;
  } else {
   $286 = HEAP32[$274>>2]|0;
   $287 = ($I20$0|0)==(31);
   $288 = $I20$0 >>> 1;
   $289 = (25 - ($288))|0;
   $290 = $287 ? 0 : $289;
   $291 = $psize$2 << $290;
   $K21$0 = $291;$T$0 = $286;
   while(1) {
    $292 = ((($T$0)) + 4|0);
    $293 = HEAP32[$292>>2]|0;
    $294 = $293 & -8;
    $295 = ($294|0)==($psize$2|0);
    if ($295) {
     $T$0$lcssa = $T$0;
     label = 130;
     break;
    }
    $296 = $K21$0 >>> 31;
    $297 = (((($T$0)) + 16|0) + ($296<<2)|0);
    $298 = $K21$0 << 1;
    $299 = HEAP32[$297>>2]|0;
    $300 = ($299|0)==(0|0);
    if ($300) {
     $$lcssa = $297;$T$0$lcssa48 = $T$0;
     label = 127;
     break;
    } else {
     $K21$0 = $298;$T$0 = $299;
    }
   }
   if ((label|0) == 127) {
    $301 = HEAP32[(5476)>>2]|0;
    $302 = ($$lcssa>>>0)<($301>>>0);
    if ($302) {
     _abort();
     // unreachable;
    } else {
     HEAP32[$$lcssa>>2] = $p$1;
     $303 = ((($p$1)) + 24|0);
     HEAP32[$303>>2] = $T$0$lcssa48;
     $304 = ((($p$1)) + 12|0);
     HEAP32[$304>>2] = $p$1;
     $305 = ((($p$1)) + 8|0);
     HEAP32[$305>>2] = $p$1;
     break;
    }
   }
   else if ((label|0) == 130) {
    $306 = ((($T$0$lcssa)) + 8|0);
    $307 = HEAP32[$306>>2]|0;
    $308 = HEAP32[(5476)>>2]|0;
    $309 = ($307>>>0)>=($308>>>0);
    $not$ = ($T$0$lcssa>>>0)>=($308>>>0);
    $310 = $309 & $not$;
    if ($310) {
     $311 = ((($307)) + 12|0);
     HEAP32[$311>>2] = $p$1;
     HEAP32[$306>>2] = $p$1;
     $312 = ((($p$1)) + 8|0);
     HEAP32[$312>>2] = $307;
     $313 = ((($p$1)) + 12|0);
     HEAP32[$313>>2] = $T$0$lcssa;
     $314 = ((($p$1)) + 24|0);
     HEAP32[$314>>2] = 0;
     break;
    } else {
     _abort();
     // unreachable;
    }
   }
  }
 } while(0);
 $315 = HEAP32[(5492)>>2]|0;
 $316 = (($315) + -1)|0;
 HEAP32[(5492)>>2] = $316;
 $317 = ($316|0)==(0);
 if ($317) {
  $sp$0$in$i = (5916);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $318 = ($sp$0$i|0)==(0|0);
  $319 = ((($sp$0$i)) + 8|0);
  if ($318) {
   break;
  } else {
   $sp$0$in$i = $319;
  }
 }
 HEAP32[(5492)>>2] = -1;
 return;
}
function _calloc($n_elements,$elem_size) {
 $n_elements = $n_elements|0;
 $elem_size = $elem_size|0;
 var $$ = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $req$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n_elements|0)==(0);
 if ($0) {
  $req$0 = 0;
 } else {
  $1 = Math_imul($elem_size, $n_elements)|0;
  $2 = $elem_size | $n_elements;
  $3 = ($2>>>0)>(65535);
  if ($3) {
   $4 = (($1>>>0) / ($n_elements>>>0))&-1;
   $5 = ($4|0)==($elem_size|0);
   $$ = $5 ? $1 : -1;
   $req$0 = $$;
  } else {
   $req$0 = $1;
  }
 }
 $6 = (_malloc($req$0)|0);
 $7 = ($6|0)==(0|0);
 if ($7) {
  return ($6|0);
 }
 $8 = ((($6)) + -4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $9 & 3;
 $11 = ($10|0)==(0);
 if ($11) {
  return ($6|0);
 }
 _memset(($6|0),0,($req$0|0))|0;
 return ($6|0);
}
function runPostSets() {
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0 | 0, $1$1 ^ $a$1 | 0, $1$0 | 0, $1$1 | 0) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0 | 0, $2$1 ^ $b$1 | 0, $2$0 | 0, $2$1 | 0) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0 | 0, tempRet0 ^ $7$1 | 0, $7$0 | 0, $7$1 | 0) | 0;
  return $10$0 | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0 | 0, $1$1 ^ $a$1 | 0, $1$0 | 0, $1$1 | 0) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0 | 0, $2$1 ^ $b$1 | 0, $2$0 | 0, $2$1 | 0) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0 | 0, HEAP32[$rem + 4 >> 2] ^ $1$1 | 0, $1$0 | 0, $1$1 | 0) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0 | 0, $137$1 | 0, $r_sroa_0_0_insert_insert42$0 | 0, $r_sroa_0_0_insert_insert42$1 | 0) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0 | 0, $r_sroa_0_0_insert_insert42$1 | 0, $151$0 & $d_sroa_0_0_insert_insert99$0 | 0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1 | 0) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



  
function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&1](a1|0)|0;
}


function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&7](a1|0,a2|0,a3|0)|0;
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&7](a1|0);
}

function b0(p0) {
 p0 = p0|0; nullFunc_ii(0);return 0;
}
function b1(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(1);return 0;
}
function b2(p0) {
 p0 = p0|0; nullFunc_vi(2);
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_ii = [b0,___stdio_close];
var FUNCTION_TABLE_iiii = [b1,b1,___stdout_write,___stdio_seek,b1,___stdio_write,b1,b1];
var FUNCTION_TABLE_vi = [b2,b2,b2,b2,_cleanup_429,b2,b2,b2];

  return { _i64Subtract: _i64Subtract, _free: _free, _Init8085: _Init8085, _i64Add: _i64Add, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _bitshift64Lshr: _bitshift64Lshr, _ExecuteProgram: _ExecuteProgram, ___errno_location: ___errno_location, _bitshift64Shl: _bitshift64Shl, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_ii: dynCall_ii, dynCall_iiii: dynCall_iiii, dynCall_vi: dynCall_vi };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Subtract.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__free.apply(null, arguments);
};

var real__Init8085 = asm["_Init8085"]; asm["_Init8085"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__Init8085.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Add.apply(null, arguments);
};

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__malloc.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Lshr.apply(null, arguments);
};

var real__ExecuteProgram = asm["_ExecuteProgram"]; asm["_ExecuteProgram"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__ExecuteProgram.apply(null, arguments);
};

var real____errno_location = asm["___errno_location"]; asm["___errno_location"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real____errno_location.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Shl.apply(null, arguments);
};
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _free = Module["_free"] = asm["_free"];
var _Init8085 = Module["_Init8085"] = asm["_Init8085"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memset = Module["_memset"] = asm["_memset"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _ExecuteProgram = Module["_ExecuteProgram"] = asm["_ExecuteProgram"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===




function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)');
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    process['exit'](status);
  } else if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}

Module["noExitRuntime"] = true;

run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



module.exports = Module;

