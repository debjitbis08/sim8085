# Practice Problems — Master List

Tracking list for the practice/tutorials feature. This is a **backlog**, not a
publishing plan: everything worth having eventually is listed here, and the
`Status` column says how far along it is.

Not a content collection entry — the loaders in `src/content/config.js` only
match `*/index.md` and `*/step-*.md`, so this top-level file is ignored by the
build.

## How to read this

| Status | Meaning |
| --- | --- |
| `live` | Authored as a practice problem under `src/content/practice/<slug>/` |
| `doc` | Has a docs article under `src/content/docs/docs/en/programs/`, not yet a step-by-step exercise |
| `todo` | On the list, nothing written yet |
| `blocked` | Cannot be checked by the current harness (see [Blocked](#blocked-on-harness-support)) |

`Tier` is the intended `difficulty` frontmatter value: `beg` / `int` / `adv`.

Slugs are proposed directory names. Where a docs article already exists its
slug is noted, since the two should either match or be deliberately
cross-linked.

## Priority for the first pass

The near-term shortlist, chosen so that each one introduces exactly one new
idea on top of the previous:

1. `add-two-8bit-numbers` — **live**
2. `sum-an-array` — **live**
3. `subtract-two-8bit-numbers` — flags in the other direction
4. `swap-two-bytes` — the classic "you need a third place" problem
5. `largest-in-array` — comparison inside a loop
6. `count-ones-in-byte` — rotate + carry
7. `add-two-16bit-numbers` — register pairs
8. `multiply-8bit-repeated-addition` — nested control flow
9. `block-transfer` — two pointers
10. `ascending-sort-bubble` — the first genuinely hard one

---

## 1. Fundamentals and data transfer

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `load-and-store-a-byte` | Copy a byte from one memory location to another | beg | todo |
| `swap-two-bytes` | Swap two 8-bit numbers in memory | beg | doc (`swap-8bit-numbers`) |
| `swap-register-pairs` | Exchange the contents of two register pairs | beg | todo |
| `fill-a-memory-block` | Fill N bytes of memory with a constant | beg | todo |
| `block-transfer` | Copy a block of N bytes to another address | beg | todo |
| `block-transfer-overlapping` | Copy a block where source and destination overlap | int | todo |
| `exchange-two-blocks` | Exchange two blocks of memory | int | todo |

## 2. 8-bit arithmetic

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `add-two-8bit-numbers` | Add two 8-bit numbers | beg | **live** |
| `add-two-8bit-with-carry` | Add two 8-bit numbers, store the carry as a 16-bit result | beg | todo |
| `subtract-two-8bit-numbers` | Subtract two 8-bit numbers | beg | todo |
| `subtract-with-borrow` | Subtract and record the borrow | beg | todo |
| `twos-complement` | Find the 2's complement of a byte | beg | todo |
| `ones-complement` | Find the 1's complement of a byte | beg | todo |
| `increment-decrement-byte` | Increment / decrement a memory location | beg | todo |
| `absolute-difference` | Absolute difference of two bytes | beg | todo |
| `average-of-two-bytes` | Average of two 8-bit numbers | beg | todo |
| `sum-an-array` | Sum of N 8-bit numbers | beg | **live** (doc: `sum-array-elements`) |
| `sum-an-array-16bit-result` | Sum of N bytes into a 16-bit total | int | todo |
| `array-average` | Average of an array of bytes | int | todo |

## 3. 16-bit arithmetic

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `add-two-16bit-numbers` | Add two 16-bit numbers | beg | todo |
| `subtract-two-16bit-numbers` | Subtract two 16-bit numbers | int | todo |
| `add-16bit-with-carry-out` | 16-bit addition producing a 17th carry bit | int | todo |
| `increment-16bit-with-flags` | Increment a 16-bit value and set flags correctly | int | todo |
| `sum-of-16bit-array` | Sum an array of 16-bit values | adv | todo |
| `multi-byte-addition` | Add two multi-byte (N-byte) numbers | adv | todo |
| `multi-byte-subtraction` | Subtract two multi-byte numbers | adv | todo |

## 4. Multiplication and division

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `multiply-8bit-repeated-addition` | Multiply two 8-bit numbers by repeated addition | int | doc (`multiply-8bit-numbers`) |
| `multiply-8bit-shift-add` | Multiply using rotate-and-add | adv | todo |
| `divide-8bit-repeated-subtraction` | Divide by repeated subtraction (quotient + remainder) | int | todo |
| `divide-8bit-shift` | Divide using the shift method | adv | todo |
| `divide-16bit-by-8bit` | 16-bit ÷ 8-bit division | adv | todo |
| `square-of-a-number` | Square of an 8-bit number | int | todo |
| `square-using-lookup-table` | Square of a digit using a lookup table | int | todo |
| `cube-of-a-number` | Cube of an 8-bit number | int | todo |
| `square-root` | Integer square root of a number | adv | todo |
| `nth-power` | Compute x to the power n | adv | todo |
| `factorial-of-number` | Factorial of a number (16-bit result) | adv | doc (`factorial-of-number`) |
| `fibonacci-series` | Generate the first N Fibonacci numbers | int | todo |
| `gcd-of-two-numbers` | GCD of two 8-bit numbers | adv | todo |
| `lcm-of-two-numbers` | LCM of two 8-bit numbers | adv | todo |

## 5. Logic and bit manipulation

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `mask-a-nibble` | Extract the high / low nibble of a byte | beg | todo |
| `swap-nibbles` | Swap the two nibbles of a byte | beg | todo |
| `set-clear-test-a-bit` | Set, clear and test a given bit | beg | todo |
| `count-ones-in-byte` | Count the 1 bits in a byte | int | doc (`count-ones-in-byte`) |
| `count-zeros-in-byte` | Count the 0 bits in a byte | int | todo |
| `find-parity` | Determine the parity of a number | int | todo |
| `check-even-or-odd` | Test whether a number is even or odd | beg | todo |
| `rotate-byte-left-right` | Rotate a byte through / without carry | beg | todo |
| `reverse-bits-in-byte` | Reverse the bit order of a byte | adv | todo |
| `logical-ops-on-two-bytes` | AND / OR / XOR two bytes and store each result | beg | todo |
| `check-bit-pattern` | Test whether a byte matches a mask | int | todo |
| `demorgans-law-verify` | Verify De Morgan's law for two bytes | int | todo |
| `evaluate-boolean-expression` | Evaluate a given Boolean expression over bytes | int | todo |

## 6. Branching, comparison and counting

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `compare-two-numbers` | Compare two bytes and store the larger | beg | todo |
| `largest-of-three` | Largest of three numbers | beg | todo |
| `count-positive-negative-zero` | Count positive, negative and zero elements | int | todo |
| `count-negative-elements` | Count negative (MSB set) elements in an array | int | doc (`count-negative-elements-in-array`) |
| `count-even-odd-in-array` | Count even and odd numbers in an array | int | todo |
| `count-occurrences` | Count how many times a value appears in an array | int | todo |
| `check-positive-or-negative` | Test whether a number is positive or negative | beg | todo |
| `count-positive-and-odd` | Count elements that are both positive and odd | int | todo |
| `check-palindrome-block` | Check whether a block of bytes is a palindrome | adv | todo |

## 7. Arrays and block operations

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `largest-in-array` | Largest number in an array | beg | doc (`largest-number-in-array`) |
| `smallest-in-array` | Smallest number in an array | beg | todo |
| `largest-and-smallest` | Largest and smallest in one pass | int | doc (`largest-smallest-in-array`) |
| `reverse-an-array` | Reverse a block in memory in place | int | doc (`reversing-an-array`) |
| `separate-even-and-odd` | Split an array into even and odd lists | int | todo |
| `separate-positive-negative` | Split an array by sign | int | todo |
| `merge-two-sorted-arrays` | Merge two sorted arrays | adv | todo |
| `remove-duplicates` | Remove duplicate values from a sorted array | adv | todo |
| `second-largest` | Second largest element in an array | adv | todo |
| `rotate-array` | Rotate an array by one position | int | todo |

## 8. Searching and sorting

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `linear-search` | Search for a value in an array | beg | todo |
| `binary-search` | Binary search in a sorted array | adv | todo |
| `ascending-sort-bubble` | Sort an array in ascending order (bubble sort) | int | todo |
| `descending-sort-bubble` | Sort an array in descending order | int | todo |
| `selection-sort` | Sort using selection sort | adv | todo |
| `insertion-sort` | Sort using insertion sort | adv | todo |

## 9. BCD and code conversion

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `bcd-addition` | Add two BCD numbers using `DAA` | int | todo |
| `bcd-subtraction` | Subtract two BCD numbers | adv | todo |
| `bcd-to-binary` | Convert packed two-digit BCD to binary | int | doc (`convert-bcd-to-binary`) |
| `binary-to-bcd` | Convert a byte to its BCD (decimal) digits | int | todo |
| `pack-bcd-digits` | Pack two unpacked BCD digits into one byte | beg | todo |
| `unpack-bcd-digits` | Unpack a BCD byte into two digits | beg | todo |
| `hex-to-ascii` | Convert a hex digit to its ASCII code | int | todo |
| `ascii-to-hex` | Convert an ASCII character to its hex value | int | todo |
| `binary-to-ascii` | Convert a byte to an ASCII digit string | adv | todo |
| `bcd-to-seven-segment` | Convert a BCD digit to a 7-segment code via lookup | int | todo |
| `gray-to-binary` | Convert Gray code to binary | adv | todo |
| `binary-to-gray-array` | Convert a whole array from binary to Gray code | adv | todo |
| `gray-to-binary-array` | Convert a whole array from Gray code to binary | adv | todo |
| `binary-to-gray` | Convert binary to Gray code | adv | todo |
| `excess-3-conversion` | Convert BCD to Excess-3 and back | adv | todo |

## 10. Expression evaluation and series

Underrepresented in written tutorials but heavily covered on YouTube, where
"evaluate this expression" is a standard exam-style exercise. Good material
because each one composes routines the learner has already built.

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `evaluate-a-squared-minus-b-squared` | Evaluate (a*a) - (b*b) | int | todo |
| `evaluate-wx-minus-yz` | Evaluate (w*x) - (y*z) | int | todo |
| `ap-series` | Generate an arithmetic progression | int | todo |
| `sum-of-n-natural-numbers` | Sum of the first N natural numbers | beg | todo |

## 11. Stack and subroutines

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `push-pop-basics` | Save and restore registers around a routine | beg | todo |
| `call-a-subroutine` | Factor repeated work into a subroutine | beg | todo |
| `subroutine-with-parameters` | Pass arguments in registers and return a result | int | todo |
| `nested-subroutines` | Call a subroutine from inside a subroutine | int | todo |
| `recursive-factorial` | Factorial via recursion on the stack | adv | todo |
| `swap-via-stack` | Exchange two values using only the stack | int | todo |

## 12. Strings and ASCII

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `string-length` | Length of a null-terminated string | beg | todo |
| `string-copy` | Copy a string | beg | todo |
| `string-compare` | Compare two strings for equality | int | todo |
| `string-reverse` | Reverse a string in place | int | todo |
| `uppercase-to-lowercase` | Convert a string to lower case | int | todo |
| `count-vowels` | Count vowels in a string | int | todo |
| `find-substring` | Find a substring within a string | adv | todo |
| `find-first-non-blank` | Find the first non-blank character | beg | todo |
| `find-last-non-blank` | Find the last non-blank character | int | todo |
| `replace-leading-zeros` | Replace leading zeros with blanks | int | todo |
| `ascii-string-to-binary` | Parse an ASCII digit string into a number (atoi) | adv | todo |
| `binary-to-ascii-string` | Format a number as an ASCII string (itoa) | adv | todo |
| `truncate-decimal-string` | Truncate a decimal string to integer form | adv | todo |
| `string-is-numeric` | Decide whether a string is all digits | int | todo |
| `increment-numeric-string` | Increment a number held as ASCII digits | adv | todo |

## 13. Timing and counters

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `delay-loop` | Write a calibrated delay loop | int | todo |
| `nested-delay-loop` | Build a longer delay from nested loops | int | todo |
| `up-counter` | Count up from 00H to FFH | beg | todo |
| `down-counter` | Count down to zero | beg | todo |
| `bcd-up-counter` | Decimal (BCD) counter using `DAA` | int | todo |

## 14. Data structures

The largest single gap the international sources exposed. Indian lab manuals
treat memory as a flat array and stop there; Leventhal and Zaks both devote a
full chapter to lists, tables and chains. These teach indirection, which
nothing else on this list really does.

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `add-entry-to-list` | Append an entry to an unordered list | int | todo |
| `remove-entry-from-list` | Remove an entry from a list and close the gap | int | todo |
| `check-an-ordered-list` | Verify a list is in order | int | todo |
| `add-entry-to-ordered-list` | Insert into a sorted list, keeping it sorted | adv | todo |
| `jump-table-with-key` | Dispatch to a routine through a jump table | adv | todo |
| `ordered-jump-table` | Dispatch through a key-searched jump table | adv | todo |
| `linked-list-traverse` | Walk a chained list and sum it | adv | todo |
| `linked-list-insert` | Add an element to a chained list | adv | todo |
| `implement-a-stack` | Build a push/pop stack in a memory buffer | int | todo |
| `ring-buffer` | Circular queue with head and tail pointers | adv | todo |

## 15. Data integrity, parity and signed arithmetic

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `checksum-of-data` | Compute a checksum over a block | int | todo |
| `verify-checksum` | Validate a block against its stored checksum | int | todo |
| `add-even-parity-to-ascii` | Set the parity bit on ASCII characters | int | todo |
| `check-even-parity` | Verify parity across a block of characters | int | todo |
| `self-checking-numbers` | Generate/verify a check digit (Luhn style) | adv | todo |
| `signed-comparison` | Compare two signed bytes correctly | int | todo |
| `signed-division` | Signed binary division | adv | todo |
| `sign-of-an-integer` | Signum: return -1, 0 or +1 | beg | todo |
| `justify-binary-fraction` | Normalise a binary fraction | adv | todo |
| `lfsr-random-number` | Pseudo-random bytes from a shift register | adv | todo |

## 16. Classic programming challenges

Recognisable to any programmer regardless of syllabus, which makes them good
marketing as well as good practice. Sourced from Rosetta Code's Z80 corpus and
general CS curricula rather than from microprocessor courses.

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `fizzbuzz` | FizzBuzz | int | todo |
| `collatz-sequence` | Hailstone / Collatz sequence | int | todo |
| `ethiopian-multiplication` | Russian peasant multiplication | int | todo |
| `towers-of-hanoi` | Towers of Hanoi (recursion on the stack) | adv | todo |
| `quicksort` | Quicksort | adv | todo |
| `binary-digits` | Print the binary representation of a byte | beg | todo |
| `find-first-set-bit` | Find the first and last set bit | int | todo |
| `show-ascii-table` | Generate the printable ASCII table | beg | todo |
| `integer-overflow-demo` | Demonstrate and detect overflow | beg | todo |
| `sum-of-squares` | Sum of the squares of an array | int | todo |
| `word-assembly-disassembly` | Split a byte into nibbles and rebuild it | beg | todo |

## 17. Optimisation challenges

A problem type none of the sources offer, but which the harness already
supports: `budgetTstates` is in the step schema. Leventhal devotes a chapter to
"reorganising to use less memory" and "reorganising to use less time" — that
chapter is an exercise format, not a topic. The idea: hand the learner a
*working* program and require a faster or smaller one that still passes every
case.

| Slug | Title | Tier | Status |
| --- | --- | --- | --- |
| `optimise-sum-for-speed` | Rewrite an array sum under a tight T-state budget | int | todo |
| `optimise-multiply-for-speed` | Beat repeated addition using shift-and-add | adv | todo |
| `multiply-by-constant` | Multiply by 10 using only shifts and adds | int | todo |
| `divide-by-constant` | Divide by a constant without a division loop | adv | todo |
| `shrink-a-program` | Match a byte-count budget for a given task | adv | todo |

Needs one harness addition: a **byte-size budget** alongside the existing
T-state budget, and a step type that ships working code as the starter rather
than a skeleton.

---

## Blocked on harness support

The check runner in `src/lib/practice/assert.js` compares **registers, flags
and memory** only. Anything whose observable result is a port write, an
interrupt, or elapsed real time cannot be graded yet. These stay on the list
because they are staples of university lab manuals, but each needs harness work
first.

| Slug | Title | Needs |
| --- | --- | --- |
| `delay-and-output` | Delay loop and output to a port | Port-write assertions (doc exists) |
| `led-blink-pattern` | Generate a pattern on an output port | Port-write assertions + a trace of writes over time |
| `square-wave-generation` | Square wave on an output port | Timed trace of port writes |
| `traffic-light-controller` | Traffic light sequencing | Port trace + a longer T-state budget |
| `stepper-motor-control` | Drive a stepper motor sequence | Port trace |
| `waveform-generation-dac` | Ramp / triangle wave via a DAC | Port trace |
| `seven-segment-display` | Drive a multiplexed 7-segment display | Port trace |
| `keyboard-scan` | Scan a matrix keypad | Port *reads* as test inputs |
| `interrupt-driven-counter` | Count interrupt occurrences | Ability to fire RST 5.5/6.5/7.5 in a test case |
| `sim-rim-square-wave` | Square wave on the SOD pin using `SIM` | Observable SOD serial output pin + timed trace |
| `debounce-a-switch` | Debounce a switch in software | Port reads that change between polls |
| `real-time-clock-interrupt` | Maintain a clock from a periodic interrupt | Timed interrupt injection |
| `digital-stopwatch` | Countdown stopwatch with keypad and display | Port reads + writes (Leventhal project #1) |
| `digital-thermometer` | Read and display a temperature | ADC input via port (Leventhal project #2) |
| `automatic-lawn-irrigation` | Irrigation controller from sensor inputs | Port reads + writes (doc exists) |

Two harness features unlock nearly all of the above:

1. **Port I/O in test cases** — `setup.ports` for input values and an
   `expect.portWrites` sequence.
2. **Interrupt injection** — a way for a case to raise an interrupt at a given
   T-state.

---

## Sources consulted

The list was cross-checked against what students are actually assigned and
searching for, not just what seemed reasonable.

### A note on geography

The first pass drew almost entirely on Indian sources, because that is where
the 8085 is still taught as a first-year subject. That is a real bias worth
naming: those sources converge hard on a fixed lab-manual canon and, between
them, contain almost no data structures, no data-integrity work, no string
parsing, and no optimisation exercises.

The fix is not to look for 8085 material elsewhere — there is little, since the
rest of the world moved to MIPS, LC-3, ARM and RISC-V for teaching. It is to
use the **8080 lineage**, which is thoroughly international. The 8085 is an
8080 superset and the Z80 is an 8080 superset, so American and European
8080/Z80 material ports to the 8085 with essentially no translation, and the
Leventhal books below are written for the 8080A/8085 *by name*.

### International sources

- **Lance Leventhal, [*8080A/8085 Assembly Language Programming*](https://planemo.org/retro/downloads/z100/manuals/cpm/8080a-8085_Assembly_Language_Programming-Leventhal.pdf)** (Osborne/McGraw-Hill, developed at Grossmont College, California). The most valuable source found for this list, in any language or country. It is a *course*, with graded problem sets at the end of every chapter, written for our exact CPU. Its chapter problems supplied: checksums, parity generation and checking, self-checking numbers, signed division, binary fraction justification, sum of squares, word assembly/disassembly, first/last non-blank character, leading-zero replacement, decimal-string truncation, and ASCII↔binary string parsing. Its "Tables and Lists" chapter is the origin of the entire data-structures section, and its "Re-design: reorganising to use less memory / less time" chapter is the origin of the optimisation section.
- **Leventhal & Saville, [*8080/8085 Assembly Language Subroutines*](https://archive.org/details/80808085assembly0000leve)** (Osborne/McGraw-Hill, 476pp). A reference library of working routines covering array, bit and string manipulation, code conversion, summation, sorting and searching. Useful later as a solution-quality benchmark rather than as a problem source.
- **Rodnay Zaks, [*Programming the Z80*](https://archive.org/details/Programming_The_Z80_Third_Edition_Rodnay_Zaks)** (Sybex, 1979 — an international bestseller, translated widely). Explicitly a "learn by doing" book with exercises throughout. Its Data Structures and Application Examples chapters corroborate the lists/queues/tables material; Appendix G is an 8080→Z80 equivalence table, which is what makes the port trivial in reverse.
- **[Rosetta Code — Z80 Assembly](https://rosettacode.org/wiki/Category:Z80_Assembly)** (127 tasks). A cross-language task corpus, so the tasks are chosen by general programmers rather than by microprocessor lecturers. Most entries are language-feature tasks that do not apply, but it supplied the classic-challenges section: FizzBuzz, Collatz/hailstone, Ethiopian multiplication, Towers of Hanoi, quicksort, signum, first/last set bit, binary digits, integer overflow, ASCII table, numeric-string handling, and an LFSR random generator.
- **[Intel, *8080/8085 Assembly Language Programming Manual* (1981)](https://bitsavers.trailing-edge.com/components/intel/MCS80/9800301D_8080_8085_Assembly_Language_Programming_Manual_May81.pdf)** — the primary reference for what the instruction set actually affords.
- **[Z80 Assembly Language course notes, Fullerton College (US)](https://staffwww.fullcoll.edu/aclifton/cs241/lecture-z80-assembly.html)** — a Western CS course using the Z80; its exercises (sum 1..10, reverse a string via subroutine) confirm the same early progression we chose.

### Indian sources (first pass)

Still the best guide to what our actual users are assigned and examined on, and
the reason the arithmetic/array/sorting core of this list is weighted the way
it is.

- Existing Sim8085 docs: [8085 Assembly Programming Tutorials](https://www.sim8085.com/docs/en/programs/samples/) — the 12 programs already written up
- [Intel Microprocessor 8085 Essential and Basic Programs (List) — BragitOff](https://www.bragitoff.com/2014/11/intel-microprocessor-8085-essential-basic-programs-list/)
- [Microprocessor Lab Manual EEC-553 (Dronacharya)](https://gnindia.dronacharya.info/ECE/Downloads/Labmanuals/Microprocessor_Lab_Manual.pdf) — 8 graded experiments: hex/decimal add & subtract, BCD add & subtract, multiply by addition and by rotation, divide by repeated subtraction and by rotation, largest in array, smallest in array, 8251 and 8253 interfacing
- [Microprocessor Lab EEC-456 (Dronacharya)](https://gnindia.dronacharya.info/IT/Downloads/Labmanuals/Microprocessor_Lab_17012013.pdf) — largest/smallest, temperature conversion, squares, ascending/descending sort, interfacing
- [MICROPROCESSOR AND INTERFACING (EE-319-F) Lab Manual](https://ggnindia.dronacharya.info/EEE/Downloads/Labmanuals/5th_Semester/MICROPROCESSOR_lab.pdf) — 8255 interfacing, stepper motor, waveform generation
- [ashwek/8085 on GitHub](https://github.com/ashwek/8085) — a student's own working set: 16-bit add, N-byte add, ascending/descending order, division, even/odd, largest, smallest, multiply, subtract
- GeeksforGeeks 8085 program series — [add two 8-bit numbers](https://www.geeksforgeeks.org/assembly-language-program-8085-microprocessor-add-two-8-bit-numbers/), [count the number of ones](https://www.geeksforgeeks.org/assembly-language-program-8085-microprocessor-count-number-ones-contents-register-b/), [linear search](https://www.geeksforgeeks.org/8085-program-for-linear-search-set-2/), [binary search](https://www.geeksforgeeks.org/computer-organization-architecture/8085-program-for-binary-search/), [search a number in an array](https://www.geeksforgeeks.org/8085-program-search-number-array-n-numbers/), [square root](https://www.geeksforgeeks.org/8085-program-find-square-root-number/), [BCD to hexadecimal](https://www.geeksforgeeks.org/8085-program-to-convert-an-8-bit-bcd-number-into-hexadecimal-number/), [binary to ASCII](https://www.geeksforgeeks.org/8085-code-convert-binary-number-ascii-code/)
- TutorialsPoint 8085 program series — [BCD to HEX](https://www.tutorialspoint.com/8085-program-to-convert-bcd-to-hex), [HEX to BCD](https://www.tutorialspoint.com/8085-program-to-convert-hex-to-bcd), bubble sort ascending/descending
- [8080/8085 Assembly Language Programming Manual (Intel, 1981)](https://bitsavers.trailing-edge.com/components/intel/MCS80/9800301D_8080_8085_Assembly_Language_Programming_Manual_May81.pdf) — the primary reference for what the instruction set actually affords
- [GATE ECE previous-year questions on 8085 programming](https://questions.examside.com/past-years/gate/gate-ece/microprocessors/instruction-set-and-programming-with-8085) — trace-the-program style questions, useful later for a "predict the result" exercise type
- [Question Bank: Microprocessor 8085](https://www.slideshare.net/slideshow/question-bank-microprocessor-8085/249858229) and [8085 Assembly Language Programs List](https://www.scribd.com/document/477696585/LIST-OF-8085-PROGRAM-DONE)
- YouTube — [Scratch Learners, *Assembly language programs in 8085 microprocessor*](https://www.youtube.com/playlist?list=PLndX8heiWwErijxt7FpnRilO2KV4UhFmN) (36 videos, all programs). The single most useful source found: it is a pure problem list with no theory. Every one of its 36 topics is now represented here. It is the reason this list has expression evaluation, AP series, lookup-table squares, De Morgan verification, array-wide Gray/binary conversion, and compound-predicate counting — none of which appear in the written tutorial sites.
- YouTube — [Bharat Acharya Education, *8085 Hindi*](https://www.youtube.com/playlist?list=PLfzBO7vcQZ1IMDUDXph5wB9csF-yYD4GC) (34 videos). Almost entirely theory: architecture, pin diagram, flags, instruction groups, timing diagrams, then 8259 / 8255 / 8253-54 / 8155 / DMA. Only ~4 programming videos (Programming Parts 1–3, and SIM/RIM square wave). Contributed no new problems, but is strong evidence for two things: peripheral interfacing dominates the taught syllabus, and `SIM`/`RIM` with the SOD pin is a topic we cannot currently exercise.
- YouTube: [8085 Microprocessor Data Transfer Techniques playlist](https://www.youtube.com/playlist?list=PLDBgkUSbSNK5FiY3rffGRj4PGHL8FUm7H), [BCD to binary conversion](https://www.youtube.com/watch?v=f9ADl_DXPOI) — confirms block transfer and code conversion are heavily-taught topics

### What the sources agree on

Every source without exception carries: **add / subtract (8- and 16-bit),
multiply and divide by repeated addition/subtraction, largest and smallest in
an array, ascending and descending sort, block transfer, BCD ↔ binary
conversion, and counting bits**. Those are the ones to write first.

Interfacing experiments (8255, 8251, 8253, 8155, 8259, stepper, DAC, traffic
light) are just as universal in *lab manuals and video courses*, but all of
them land in the blocked table above. The Bharat Acharya playlist spends 16 of
its 34 videos on exactly this material, which is a fair signal of how much of
the taught syllabus we currently cannot offer practice for.

### Where the international sources disagree with the Indian ones

They do not contradict each other on the core — both camps teach the same
arithmetic, array and sorting canon. They differ in what they add on top:

| Theme | Indian lab manuals / YouTube | Leventhal, Zaks, Rosetta Code |
| --- | --- | --- |
| Data structures | Essentially absent | A full chapter: lists, jump tables, chained lists |
| Data integrity | Absent | Checksums, parity, check digits |
| String parsing | Character counting only | Full ASCII↔number conversion, tokenising, validation |
| Signed arithmetic | MSB tests only | Signed compare and signed division as first-class topics |
| Optimisation | Not an exercise type | An entire chapter on re-design for size and speed |
| Peripheral ICs | Dominant (8255, 8259, 8253) | Present but secondary to software technique |
| Classic puzzles | Absent | FizzBuzz, Hanoi, Collatz, quicksort |

The practical conclusion: keep the Indian canon as the **spine** of the
catalogue, because that is what users arrive looking for, and use the
international material for the **upper half** of the difficulty curve, where
the Indian sources simply run out of problems.
