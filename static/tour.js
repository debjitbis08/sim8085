function start () {
    var tour = {
        id: "tutorial",
        steps: [
            {
                target: document.querySelector(".coding-area__editor-container"),
                placement: "right",
                title: "Code Editor",
                content: "Enter your ASM code here. Note, if you are using the below boilerplate code write your code after the start label, otherwise it will not execute."
            },
            {
                target: document.querySelector(".coding-area__btn-toolbar .btn-group .btn:first-child"),
                placement: "bottom",
                title: "Compile Button",
                content: "Use this button to compile and load the compiled opcodes into memory at location 0x0800. The compiled output is shown below the editor.",
                xOffset: 'center',
                arrowOffset: 'center'
            },
            {
                target: document.querySelector(".coding-area__btn-toolbar .btn-group .btn:nth-child(2)"),
                placement: "bottom",
                title: "Run Button",
                content: "Use this button to run your compiled and loaded program. This button is only enabled if you have compiled and loaded your code.",
                xOffset: 'center',
                arrowOffset: 'center'
            },
            {
                target: document.querySelector(".coding-area__btn-toolbar .btn-group .btn:nth-child(3)"),
                placement: "bottom",
                title: "Step Button",
                content: "This button can be used to step through your code one instruction at a time. This button is only enabled if you have compiled and loaded your code.",
                xOffset: 'center',
                arrowOffset: 'center'
            },
            {
                target: document.querySelector(".coding-area__btn-toolbar .btn-group .btn:nth-child(4)"),
                placement: "bottom",
                title: "Stop Execution",
                content: "This button stops execution and returns to editing mode. This button is only enabled if you have compiled and loaded your code.",
                xOffset: 'center',
                arrowOffset: 'center'
            },
            {
                target: document.querySelector(".coding-area__btn-toolbar .btn-group:nth-child(2) .btn"),
                placement: "bottom",
                title: "Reset Everything",
                content: "Reset the registers, flags and memory cells to their default values.",
                xOffset: 'center',
                arrowOffset: 'center'
            },
            {
                target: document.querySelector(".registers-view"),
                placement: "right",
                title: "View and Edit Registers",
                content: "The register section shows the values of registers and allows editing of values by double clicking on the values. Note that SP and PC values are non-editable.",
                arrowOffset: 'center'
            },
            {
                target: document.querySelector(".flags-view"),
                placement: "right",
                title: "View and Edit Flags",
                content: "The flags section can be used to view the value of the flags as they change and also set or unset them manually.",
                arrowOffset: 'center'
            },
            {
                target: document.querySelector(".memory-view"),
                placement: "left",
                title: "View and Edit memory locations",
                content: "The memory view shows all the 65536 (0xFFFF) memory cells availble to 8085. Double click on the value to edit them.",
                arrowOffset: 'center'
            },
            {
                target: document.querySelector(".memory-view__paginator"),
                placement: "top",
                title: "Memory View Start Address",
                content: "This dropdown is used to change the range of values that the currently visible in the memory view. For more details on how to use this, view the tutorial video available by clicking the Help text in the navigation area at top."
            },
            {
                target: document.querySelector(".memory-view__addr-range"),
                placement: "top",
                title: "Memory View Range Control",
                content: "Use this to get more finer control on what range of addresses are visible in the memory area. For more details on how to use this, view the tutorial video available by clicking the Help text in the navigation area at top."
            },
            {
                target: document.querySelector(".memory-view__jump-to-addr"),
                placement: "bottom",
                title: "Jump to address",
                content: "Enter an address value in hexdecimal and the below grid will change to show the location."
            },
            {
                target: document.querySelector(".nav__help"),
                placement: "bottom",
                title: "Help",
                content: "View a tutorial on how to use the interface.",
                xOffset: 'center',
                arrowOffset: 'center'
            }
        ]
    };
    hopscotch.startTour(tour);
    hopscotch.listen("end", function () {
        localStorage.setItem('tour-done', 1);
    })
}

module.exports = { start: start };