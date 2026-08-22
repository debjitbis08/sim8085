// The Intel SDK-85 as it was shipped.
//
// Three chips answer on the address bus and nothing else is fitted, so the
// expansion space is genuinely empty and reads there float. The processor
// cannot tell the difference between any of them: each is simply whatever the
// address decoder selected.
//
//   0000-07FF  8355/8755   2K of mask ROM, the monitor
//   1800-18FF  8279        keyboard and display, data port
//   1900-19FF  8279        keyboard and display, command port
//   2000-20FF  8155        256 bytes of RAM
//   ports 20-25 8155        command register, I/O ports and timer
//
// The 8279 occupies two whole pages because its select decodes nothing below
// A8; see devices/i8279.h.
#ifndef SIM8085_SDK85_H
#define SIM8085_SDK85_H

#include "../bus.h"
#include "../devices/i8155.h"
#include "../devices/i8279.h"

#define SDK85_ROM_PAGE  0x00
#define SDK85_ROM_PAGES 0x08
#define SDK85_RAM_PAGE  0x20
#define SDK85_RAM_PAGES 0x01

typedef struct {
    I8279 keyboard;
    Device keyboard_device;
    I8155 support;
    Device support_device;
} SDK85;

// `backing` is the 64K store the ROM and RAM pages are cut from, so that a
// loader can put an image into ROM space the way burning the part would.
static inline void sdk85_attach(SDK85 *board, Bus *bus, uint8_t *backing, uint8_t *ports) {
    bus_reset(bus);
    bus_map_ports(bus, ports);

    bus_map_memory(bus, backing, SDK85_ROM_PAGE, SDK85_ROM_PAGES, 0);
    bus_map_memory(bus, backing, SDK85_RAM_PAGE, SDK85_RAM_PAGES, 1);

    i8279_reset(&board->keyboard);
    board->keyboard_device = i8279_device(&board->keyboard);
    bus_map_device(bus, &board->keyboard_device, I8279_BASE >> 8, I8279_PAGES);

    // The 8155's RAM is mapped above as ordinary memory; this is the rest of
    // the part -- its command register, ports and timer -- on the port space.
    i8155_reset(&board->support);
    board->support_device = i8155_device(&board->support);
    bus_map_port_device(bus, &board->support_device, I8155_PORT_BASE, I8155_PORT_COUNT);
}

#endif
