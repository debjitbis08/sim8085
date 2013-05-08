(function () {
    'use strict';


    var createSymbolTable = function (source) {
    };

    var generateObjectCode = function () {
    };

    var assemble = function (source) {
        if (!Array.isArray(source)) {
            throw new Error("source should be an array of source code lines");
        }

        createSymbolTable(source);
        var objcode = generateObjectCode();
        
        return objcode;
    };
})();
