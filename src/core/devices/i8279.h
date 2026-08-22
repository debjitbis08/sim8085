// A model of the Intel 8279 keyboard and display controller, as the SDK-85
// wires it and as the monitor ROM drives it.
//
// On the SDK-85 the 8279 is memory mapped, not on the I/O ports: 1800h is the
// data port and 1900h the command port. The monitor reads a key with
//
//     LXI H,CNTRL / MVI M,READ / DCR H / MOV A,M
//
// -- command 40h to 1900h, then one byte from 1800h -- and writes the display
// the same way, a command to 1900h followed by data bytes to 1800h.
//
// Only the parts the monitor uses are modelled: the keyboard FIFO, the display
// RAM with its auto-incrementing address, and the interrupt line. The line is
// level sensitive on real hardware and stays high while the FIFO has anything
// in it, which is why it is recomputed from the FIFO depth before every
// instruction rather than being pulsed.
#ifndef SDK85_I8279_H
#define SDK85_I8279_H

#include <stdint.h>
#include <string.h>

#include "../bus.h"

// The SDK-85 wires the 8279's A0 to address line A8, so 1800h-18FFh is the
// data port and 1900h-19FFh the command port. The chip decodes nothing below
// that, which is why it answers across both pages rather than at two single
// addresses.
#define I8279_BASE    0x1800
#define I8279_PAGES   2
#define I8279_COMMAND_LINE 0x0100

static inline int i8279_is_command(uint16_t address) {
    return (address & I8279_COMMAND_LINE) != 0;
}

#define I8279_FIFO_DEPTH 8
#define I8279_DISPLAY_BYTES 16

typedef struct {
    uint8_t fifo[I8279_FIFO_DEPTH];
    int count;
    uint8_t display[I8279_DISPLAY_BYTES];
    int display_address;
    int auto_increment;
    int reading_fifo;
    // Counts of what the monitor asked for, so a test can tell that a command
    // was issued and not merely that memory happened to hold a value.
    int commands_seen;
    int display_writes;
} I8279;

static inline void i8279_reset(I8279 *d) {
    memset(d, 0, sizeof(*d));
    memset(d->display, 0xff, sizeof(d->display));
}

// Queues a keypress. Returns 0 if the FIFO is full, as the real part would
// simply drop it.
static inline int i8279_press(I8279 *d, uint8_t code) {
    if (d->count >= I8279_FIFO_DEPTH) return 0;
    d->fifo[d->count++] = code & 0x3f;
    return 1;
}

// The interrupt line: high while a key is waiting to be read.
static inline int i8279_irq(const I8279 *d) { return d->count > 0; }

static inline uint8_t i8279_read(I8279 *d, uint16_t address) {
    if (i8279_is_command(address)) {
        // Status: the low three bits are the number of characters in the FIFO.
        return (uint8_t)(d->count & 0x07);
    }
    if (!d->reading_fifo || d->count == 0) return 0;
    uint8_t key = d->fifo[0];
    memmove(d->fifo, d->fifo + 1, (size_t)(--d->count));
    return key;
}

static inline void i8279_write(I8279 *d, uint16_t address, uint8_t value) {
    if (i8279_is_command(address)) {
        d->commands_seen++;
        switch (value & 0xe0) {
            case 0x40: // read FIFO: the next data read comes from the keyboard
                d->reading_fifo = 1;
                break;
            case 0x80: // write display RAM, with address and auto-increment
                d->reading_fifo = 0;
                d->display_address = value & 0x0f;
                d->auto_increment = (value & 0x10) != 0;
                break;
            case 0xc0: // clear
                memset(d->display, 0xff, sizeof(d->display));
                break;
            default:   // mode set and the rest need no state here
                break;
        }
        return;
    }
    d->display[d->display_address] = value;
    d->display_writes++;
    if (d->auto_increment) d->display_address = (d->display_address + 1) & 0x0f;
}

// The chip as it hangs on the bus.
static uint8_t i8279_bus_read(Device *self, uint16_t address) {
    return i8279_read((I8279 *)self->ctx, address);
}

static void i8279_bus_write(Device *self, uint16_t address, uint8_t value) {
    i8279_write((I8279 *)self->ctx, address, value);
}

// The 8279's interrupt output goes to RST 5.5 on the SDK-85. It is a level:
// high for as long as a key is waiting to be read.
static uint8_t i8279_bus_irq(Device *self) {
    return i8279_irq((I8279 *)self->ctx) ? IRQ_RST55 : 0;
}

static inline Device i8279_device(I8279 *chip) {
    Device device;
    device.name = "8279";
    device.ctx = chip;
    device.read = i8279_bus_read;
    device.write = i8279_bus_write;
    device.irq = i8279_bus_irq;
    return device;
}

#endif
