// The 8085's address bus, and the chips hanging off it.
//
// A real 8085 has no idea what answers a memory access. It puts an address on
// A0-A15, asserts RD or WR, and whichever chip's select decodes that address
// drives the data bus. "Memory mapped I/O" is not a mode the processor has; it
// is just a peripheral wired to answer at some addresses. On the SDK-85 the
// 8279 keyboard controller answers at 1800h and 1900h exactly as the RAM
// answers at 2000h.
//
// A chip select is a decode of the high address lines, so the map falls on
// 256-byte boundaries. That is why the bus dispatches per page: the table below
// is the address decoder, not an approximation of one. It also gives mirroring
// for free -- a chip whose select ignores the low address lines answers across
// its whole page, which is what the real parts do.
//
// The common case, a page of plain memory, costs one pointer load and one
// branch, and with the default machine every page is memory.
#ifndef SIM8085_BUS_H
#define SIM8085_BUS_H

#include <stdint.h>
#include <string.h>

// The maskable interrupt inputs, plus TRAP, as a bitmask. A device drives the
// lines it is asserting; the CPU samples them. They are levels, not events:
// RST 5.5 and 6.5 stay high while their device still wants attention, which is
// what stops one keypress from being read over and over.
#define IRQ_TRAP  0x01
#define IRQ_RST55 0x02
#define IRQ_RST65 0x04
#define IRQ_RST75 0x08

typedef struct Device Device;

struct Device {
    const char *name;
    void *ctx;
    // Address is the full 16 bits, so a device that decodes low lines can see
    // them -- the 8279 tells its data and command ports apart that way.
    uint8_t (*read)(Device *self, uint16_t address);
    void (*write)(Device *self, uint16_t address, uint8_t value);
    // Which interrupt lines this device is driving right now.
    uint8_t (*irq)(Device *self);
    // Devices are clocked. On the SDK-85 the 8155's timer input is wired to the
    // processor's CLK OUT, so it counts t-states, which is how the monitor
    // arranges for a TRAP one instruction after it starts the timer.
    void (*tick)(Device *self, uint32_t tstates);
};

#define BUS_PAGES 256
#define BUS_PAGE_SIZE 256
#define BUS_MAX_DEVICES 8

typedef struct {
    // Non-NULL when the page is plain storage: the pointer is the page itself.
    uint8_t *read_page[BUS_PAGES];
    // NULL for a read-only page, so writes to ROM fall through and are dropped.
    uint8_t *write_page[BUS_PAGES];
    Device *device_page[BUS_PAGES];
    Device *devices[BUS_MAX_DEVICES];
    int device_count;
    // The 8085 has a second, separate address space of 256 ports, selected by
    // the IO/M line rather than by anything in the address itself. It decodes
    // the same way, so it gets the same treatment.
    uint8_t *port_memory;
    Device *port_device[BUS_PAGES];
} Bus;

// Nothing mapped: reads float high, writes go nowhere.
static inline void bus_reset(Bus *bus) {
    memset(bus, 0, sizeof(*bus));
}

static inline void bus_map_memory(Bus *bus, uint8_t *backing, int first_page, int pages, int writable) {
    for (int i = 0; i < pages; i++) {
        int page = (first_page + i) & (BUS_PAGES - 1);
        bus->read_page[page] = backing + (size_t)page * BUS_PAGE_SIZE;
        bus->write_page[page] = writable ? bus->read_page[page] : NULL;
        bus->device_page[page] = NULL;
    }
}

static inline void bus_map_device(Bus *bus, Device *device, int first_page, int pages) {
    if (bus->device_count < BUS_MAX_DEVICES) {
        bus->devices[bus->device_count++] = device;
    }
    for (int i = 0; i < pages; i++) {
        int page = (first_page + i) & (BUS_PAGES - 1);
        bus->read_page[page] = NULL;
        bus->write_page[page] = NULL;
        bus->device_page[page] = device;
    }
}

// The default machine: 64K of read/write memory and no peripherals, which is
// what sim8085 has always presented and what every program written against it
// expects.
static inline void bus_map_flat_ram(Bus *bus, uint8_t *backing) {
    bus_reset(bus);
    bus_map_memory(bus, backing, 0, BUS_PAGES, 1);
}

static inline uint8_t bus_read(Bus *bus, uint16_t address) {
    uint8_t *page = bus->read_page[address >> 8];
    if (page) return page[address & 0xff];
    Device *device = bus->device_page[address >> 8];
    if (device && device->read) return device->read(device, address);
    // Nothing drove the bus. Real hardware floats, and a floating bus reads as
    // all ones far more often than as zero.
    return 0xff;
}

static inline void bus_write(Bus *bus, uint16_t address, uint8_t value) {
    uint8_t *page = bus->write_page[address >> 8];
    if (page) {
        page[address & 0xff] = value;
        return;
    }
    Device *device = bus->device_page[address >> 8];
    if (device && device->write) device->write(device, address, value);
    // Otherwise the page is read-only or unmapped, and the write is dropped
    // exactly as it would be on the board.
}

static inline void bus_map_ports(Bus *bus, uint8_t *backing) {
    bus->port_memory = backing;
}

static inline void bus_map_port_device(Bus *bus, Device *device, int first_port, int ports) {
    if (bus->device_count < BUS_MAX_DEVICES) {
        bus->devices[bus->device_count++] = device;
    }
    for (int i = 0; i < ports; i++) {
        bus->port_device[(first_port + i) & 0xff] = device;
    }
}

static inline uint8_t bus_port_read(Bus *bus, uint8_t port) {
    Device *device = bus->port_device[port];
    if (device && device->read) return device->read(device, port);
    return bus->port_memory ? bus->port_memory[port] : 0xff;
}

static inline void bus_port_write(Bus *bus, uint8_t port, uint8_t value) {
    Device *device = bus->port_device[port];
    if (device && device->write) {
        device->write(device, port, value);
        return;
    }
    if (bus->port_memory) bus->port_memory[port] = value;
}

static inline void bus_tick(Bus *bus, uint32_t tstates) {
    for (int i = 0; i < bus->device_count; i++) {
        Device *device = bus->devices[i];
        if (device && device->tick) device->tick(device, tstates);
    }
}

// The interrupt inputs, as driven by everything on the bus at this instant.
static inline uint8_t bus_irq(Bus *bus) {
    uint8_t lines = 0;
    for (int i = 0; i < bus->device_count; i++) {
        Device *device = bus->devices[i];
        if (device && device->irq) lines |= device->irq(device);
    }
    return lines;
}

#endif
