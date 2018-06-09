<a name="0.1.6"></a>
## [0.1.6](https://github.com/debjitbis08/sim8085/compare/v0.1.5...v0.1.6) (2018-06-09)


### Bug Fixes

* **assembler:** Fix parsing of numbers ([8e171da](https://github.com/debjitbis08/sim8085/commit/8e171da))



<a name="0.1.5"></a>
## [0.1.5](https://github.com/debjitbis08/sim8085/compare/v0.1.3...v0.1.5) (2018-06-04)


### Bug Fixes

* **assembler:** Fix issue with assembling DB ([7d46d3e](https://github.com/debjitbis08/sim8085/commit/7d46d3e))


### Features

* **ci:** Add script to auto generate changelog ([d8998fd](https://github.com/debjitbis08/sim8085/commit/d8998fd))



<a name="0.1.3"></a>
## [0.1.3](https://github.com/debjitbis08/sim8085/compare/v0.1.2...v0.1.3) (2018-04-18)


### Bug Fixes

* **emulator:** Fix emulation of CALL and RET ([de08766](https://github.com/debjitbis08/sim8085/commit/de08766))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/debjitbis08/sim8085/compare/v0.1.1...v0.1.2) (2018-04-18)


### Bug Fixes

* **assembler:** Fix wrong address for labels ([47b72b2](https://github.com/debjitbis08/sim8085/commit/47b72b2))
* **editor:** Fix highlighting of JZ instruction ([1f76de3](https://github.com/debjitbis08/sim8085/commit/1f76de3))
* **emulator:** Fix update of AC flag ([cf1f17e](https://github.com/debjitbis08/sim8085/commit/cf1f17e))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/debjitbis08/sim8085/compare/837aac6...v0.1.1) (2018-04-17)


### Bug Fixes

* **assembler:** Better errors for incomplete ops ([6457c05](https://github.com/debjitbis08/sim8085/commit/6457c05))
* **assembler:** Fix code gen for numeric literals ([d7039b7](https://github.com/debjitbis08/sim8085/commit/d7039b7))
* **assembler:** Fix compile of lines with space ([a5c8b91](https://github.com/debjitbis08/sim8085/commit/a5c8b91))
* **assembler:** Fix compiling of code comments ([b93bee5](https://github.com/debjitbis08/sim8085/commit/b93bee5))
* **assembler:** Fix parsing of basic structures ([fa8d803](https://github.com/debjitbis08/sim8085/commit/fa8d803))
* **assembler:** Fix parsing of blank lines at eof ([ad409a7](https://github.com/debjitbis08/sim8085/commit/ad409a7))
* **assembler:** Show better error when line has problem ([0bb54ae](https://github.com/debjitbis08/sim8085/commit/0bb54ae))
* **instruction:** Fix lxi to reject accumulator ([7301a86](https://github.com/debjitbis08/sim8085/commit/7301a86))
* **instruction:** Fixes lxi, same as last commit ([f1bb0f8](https://github.com/debjitbis08/sim8085/commit/f1bb0f8))
* **instruction:** Make jump properly relocatable ([2ead55e](https://github.com/debjitbis08/sim8085/commit/2ead55e))
* **ui:** Fix introduction tour ([9825e25](https://github.com/debjitbis08/sim8085/commit/9825e25))
* **ui:** Fix reading value from memory in JS ([d8f2f1d](https://github.com/debjitbis08/sim8085/commit/d8f2f1d))
* **ui:** Fix tour for buttons ([48a33a9](https://github.com/debjitbis08/sim8085/commit/48a33a9))
* **ui:** Fix updating memory location ([5f25eba](https://github.com/debjitbis08/sim8085/commit/5f25eba))
* **ui:** Hide alert message after timeout ([2319766](https://github.com/debjitbis08/sim8085/commit/2319766))
* **ui:** Move Brave banner to header ([5477c22](https://github.com/debjitbis08/sim8085/commit/5477c22))
* **ui:** Show different error for infinite loop ([664653d](https://github.com/debjitbis08/sim8085/commit/664653d))
* **ui:** Update compile icon to avoid confusion ([79fdcf0](https://github.com/debjitbis08/sim8085/commit/79fdcf0))
* **ui:** Use https URL for vimeo lib ([a6485fd](https://github.com/debjitbis08/sim8085/commit/a6485fd))


### Features

* **assembler:** Add errors for undefined labels ([1297040](https://github.com/debjitbis08/sim8085/commit/1297040))
* **assembler:** Add push a alias for push psw ([837aac6](https://github.com/debjitbis08/sim8085/commit/837aac6))
* **directive:** Add DB directive ([d4868e8](https://github.com/debjitbis08/sim8085/commit/d4868e8))
* **emulator:** Increase cycle limit to 10000 ([b246900](https://github.com/debjitbis08/sim8085/commit/b246900))
* **instruction:** Add JNC and fix all jumps ([e2f32a6](https://github.com/debjitbis08/sim8085/commit/e2f32a6))
* **track:** Track errors using Sentry ([48416e7](https://github.com/debjitbis08/sim8085/commit/48416e7))
* **ui:** Add external link to vimeo ([f42e8dd](https://github.com/debjitbis08/sim8085/commit/f42e8dd))
* **ui:** Add input to jump to memory location ([5076475](https://github.com/debjitbis08/sim8085/commit/5076475))
* **ui:** Add introduction tour ([469369f](https://github.com/debjitbis08/sim8085/commit/469369f))
* **ui:** Add outdated browser warning ([6729f6b](https://github.com/debjitbis08/sim8085/commit/6729f6b))
* **ui:** Add tutorial video ([f571990](https://github.com/debjitbis08/sim8085/commit/f571990))
* **ui:** Move stop button at end ([240fa66](https://github.com/debjitbis08/sim8085/commit/240fa66))
* **ui:** Show error execution failure ([5580b71](https://github.com/debjitbis08/sim8085/commit/5580b71))
* **ui:** Show info after compilation is successful ([736b8fc](https://github.com/debjitbis08/sim8085/commit/736b8fc))



