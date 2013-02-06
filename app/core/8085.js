define([utils, RAM], function (utils, RAM) {

    /* Constants */
    var ADDR_MAX = 65535,
        DATA_MAX = 255;

    var pins = {
        RESETIN: 0,
        RESETOUT: 0,
        RD: 0,
        WR: 0
    };

    var registers = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        H: 0,
        L: 0,
        flags: {
            carry: 0,
            sign: 0,
            zero: 0,
            parity: 0,
            auxiliary: 0
        },
        IR: 0
    },
    /**
     * Program Counter
     */
    PC = 0,
    /**
     * Stack Pointer
     */
    SP = ADDR_MAX,
    /**
     * Instruction Decoder
     */
    decoder = {},
    /**
     * Buses
     */
    addressBus = 0,
    internalDataBus = 0,
    dataBus = 0;
    
    var signals = {
        "MEMR": "MemoryRead",
        "MEMW": "MemoryWrite",
        "IOR" : "IORead",
        "IOW" : "IOWrite",
        "RD": "Read"
    };

    var fetchInstruction,
        getDataBusValue,
        memoryRead,
        executeInstruction,
        init;

    init = function () {
    };

    getDataBusValue = function () {
        return dataBus;
    };

    setDataBusValue = function (data) {
        if (data > DATA_MAX) {
            throw(new RangeError("Data value out of range."));    
        }
        dataBus = data;
    };

    fetchInstruction = function () {
        memoryRead(PC, function () {
            IR = internalDataBus;
            executeInstruction();
        });
        PC += 1;
        return PC;
    };

    executeInstruction = function () {
        decoder.execute(IR);
    };

    memoryRead = function (addr, callback) {
        if (addr > ADDR_MAX) {
            throw(new RangeError("Address value out of range."));    
        }
        addressBus = addr;
        RAM.sendSignal(signals.RD, function (data) {
            internalDataBus = getDataBusValue(); 
            callback();
        });
    };

    decoder.execute = function (IR) {
        instructions[IR]();
    };

    var instructions = [],
        i = 0;

    (function () {

        function setRegister (register, data) {
            if (data > 0xFF) {
                data -= 256;
            }
            register = data;
        }

        function isCarry (a, b, op) {
            if (op !== '+' || op !== '-') {
                throw new Error("op should be either \"+\" or \"-\"");
            }
            if (op === "+") {
                return !(a + b < DATA_MAX + 1);
            }
            else {
                return a < b;
            }
        }

        function checkAndSetCarry (a, b, op) {
            register.flags.carry = (isCarry(a, b, op)) ? 1 : 0;
        }

        function getParity (data) {
            var mask = 1,
                cnt = 0;

            while (mask) {
                if (data & mask)
                    cnt++;
                mask <<= 1;
            }
            return (cnt % 2 === 0 ? 1 : 0);
        }

        function isAuxillaryCarry (a, b, op) {
          /* zero the higher 4 bits */
          a <<= 4;
          a >>= 4;
          b <<= 4;
          b >>= 4;

          if (op == '+')
            return ((a + b) >= 16);
          else
            return ((a - b) > a);
        }
         
        function checkAndSetFlags (result) {
            registers.flags.zero = (result === 0);

            var data = (DATA_MAX + 1) / 2;
            if (data > 0xFF) {
                data -= 256;
            }
            registers.flags.s = (result >= data);

            registers.flags.p = getParity(result);
        }

        function ACI (data) {
            if (data > 0xFF) {
                throw new RangeError("ACI: Data cannot be more than 1 byte");
            }
            var registerABackup = registers.A;
            setRegister(registers.A, registers.A + data + registers.flags.carry);
            checkAndSetCarry(registerABackup, registerABackup + data + registers.flags.carry);
            checkAndSetFlags(registers.A);
        }
        
        /**
         * NOP
         */
        instructions[0x0] = function () {
        };

        /**
         * LXI B, D16
         */
        instructions[0x1] = function () {
        };

        /**
         * STAX B
         */
        instructions[0x2] = function () {
        };
        
        /**
         * INX B
         */
        instructions[0x3] = function () {
        };

        /**
         * INR B
         */
        instructions[0x4] = function () {
        };

        /**
         * DCR B
         */
        instructions[0x5] = function () {
        };

        /**
         * MVR B, D8
         */
        instructions[0x6] = function () {
        };

        /**
         * RLC
         */
        instructions[0x7] = function () {
        };

        /**
         * --
         */
        instructions[0x8] = function () {
        };

        /**
         * DAD B
         */
        instructions[0x9] = function () {
        };

        /**
         * LDAX B
         */
        instructions[0xA] = function () {
        };

        /**
         * DCX B
         */
        instructions[0xB] = function () {
        };

        /**
         * INR C
         */
        instructions[0xC] = function () {
        };

        /**
         * DCR C
         */
        instructions[0xD] = function () {
        };

        /**
         * MVI C, D8
         */
        instructions[0xE] = function () {
        };

        /**
         * RRC
         */
        instructions[0xF] = function () {
        };

        /**
         * --
         */
        instructions[0x10] = function () {
        };

        /**
         * LXI D, D16
         */
        instructions[0x11] = function () {
        };

        /**
         * STAX D
         */
        instructions[0x12] = function () {
        };

        /**
         * INX D
         */
        instructions[0x13] = function () {
        };

    })();

    /**
     * Return 8085 interfacing functions
     */
    return {
        getAddressBusValue: function () {
            return addressBus;
        },
        setDataBusValue: setDataBusValue,
        getDataBusValue: getDataBusValue,
        executeProgram: function (startAt) {
            PC = startAt;
            fetchInstruction();
        }
    };

});
