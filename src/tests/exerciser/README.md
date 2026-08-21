# CP/M instruction exercisers

These suites check the emulator core against the CP/M test ROMs that 8080
emulator projects have used as a reference for decades. Unlike the unit tests in
`src/tests`, which assert on cases we thought to write down, the exercisers walk
the operand space and CRC the entire machine state after every instruction. A
single flag wrong in a single addressing mode changes the CRC.

`8080EXM` alone executes about 2.9 billion instructions and compares 25 CRCs
against values captured from real hardware.

## Running them

```sh
pnpm test                                          # 8080PRE, TST8080, CPUTEST (about 1s)
RUN_8080EXM=1 npx vitest run src/tests/exerciser   # adds 8080EXM (about 35s)
```

`8080EXM` is opt-in because it is tens of seconds rather than one. Everything
else runs as part of the normal suite.

## Why this builds natively instead of using the browser build

`harness.c` compiles `src/core/8085.c` with the host compiler and links it into
a small CP/M host. It is the same C source the browser build ships, so the
semantics under test are the real ones, but:

* `scripts/build-emulator.sh` passes `-s WASM=0`, so the browser artifact is
  asm.js. Running billions of instructions through it would take hours.
* Trapping BDOS calls from JavaScript would mean stepping one instruction at a
  time across a process boundary, which is far slower still.

The core needs almost nothing from Emscripten -- an export annotation and an
async sleep -- so `shim/emscripten.h` supplies both and no Emscripten toolchain
is required to run these tests. `io_write`, normally provided by
`simulator-library.js`, is stubbed in the harness; the ROMs never drive an I/O
port.

What this does *not* cover is the JavaScript glue in `src/core/simulator.js`.
That is deliberate -- the unit tests exercise that path, and what the ROMs are
for is CPU semantics.

## The 8080/8085 problem

The ROMs were written for an Intel 8080 and CRC the whole PSW byte via
`PUSH PSW`. The 8085 differs from the 8080 in two ways that show up there, so a
perfectly correct 8085 would mismatch every published CRC:

1. **PSW bits 5 and 1.** On the 8080 these are not flags: bit 5 reads 0 and bit
   1 reads 1. The 8085 reuses them for the undocumented K and V flags.
2. **Auxiliary carry on logical AND.** Per the Intel *8080/8085 Assembly
   Language Programming Manual*: "The 8085 logical AND instructions always set
   the auxiliary flag ON. The 8080 logical AND instructions set the flag to
   reflect the logical OR of bit 3 of the values involved in the AND operation."

Rather than patch the ROMs -- which would invalidate the published CRCs and
leave us maintaining a modified binary -- the core carries an 8080 compatibility
switch, `set_8080_compat()`, that the harness turns on and nothing else uses. It
is off in normal operation, so sim8085 remains an 8085.

The cost is that the 8085 behaviour of those specific bits is not what the
exercisers validate. That is covered instead by the targeted unit tests:
`ana.test.js` and `ani.test.js` for the AND auxiliary carry, and `dsub.test.js`,
`rstv.test.js` and `jx5.test.js` for V and K.

## ROM provenance

Retrieved from [`superzazu/8080`](https://github.com/superzazu/8080), the
commonly used mirror of this test set.

| File | Origin |
| --- | --- |
| `8080PRE.COM` | Preliminary 8080/8085 CPU exerciser, Frank Cringle and Ian Bartholomew |
| `TST8080.COM` | 8080/8085 CPU Diagnostic v1.0, Microcosm Associates (1980) |
| `CPUTEST.COM` | Diagnostics II v1.2 CPU test, SuperSoft Associates (1981) |
| `8080EXM.COM` | 8080 instruction exerciser; Frank Cringle's `zexlax` adapted to the 8080 by Ian Bartholomew, CRC reporting added by Mike Douglas |

```
6e3286e11bb1a8f47b8ee1280b4a067be813193363e3223c99b0d21912f44aeb  8080EXM.COM
18eb3c79cba42c0718f160be6a1853cb64cdce7aa47d65780189a57bdd98c4e0  8080PRE.COM
e61a9a75348c774486c2207080ea4effbf6c2367fdace31b0731081a4144030b  CPUTEST.COM
9561c6fb6c99efe3de00eb77e4044fd102151058b39ac2d7bce10483838a08e7  TST8080.COM
```

## Bugs this found

Two real defects on the first run, both in an instruction the unit tests already
covered:

* **`DAA` never cleared the auxiliary carry.** It only ever assigned 1, so an AC
  standing from a previous instruction survived even when adding six to the low
  nibble produced no carry out of bit 3. Caught by `CPUTEST` as
  `REGISTER f CONTAINS 16H BUT SHOULD CONTAIN 06H`.
* **`DAA` could clear the carry flag.** It finished with
  `ArithFlagsA(state, res, UPDATE_CARRY)`, which recomputes carry from the
  result. `DAA` only ever sets carry; one already standing on entry must survive.

A third was found while reading the code to add the compatibility switch:
`LogicFlagsA` took an `ac` argument and ignored it, hardcoding `AC = 0`. Every
`ANA`/`ANI` site passed 1 intending the 8085 rule, and it was silently
discarded.
