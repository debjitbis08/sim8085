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

#define I8279_DATA    0x1800
#define I8279_COMMAND 0x1900

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
    if (address == I8279_COMMAND) {
        // Status: the low three bits are the number of characters in the FIFO.
        return (uint8_t)(d->count & 0x07);
    }
    if (!d->reading_fifo || d->count == 0) return 0;
    uint8_t key = d->fifo[0];
    memmove(d->fifo, d->fifo + 1, (size_t)(--d->count));
    return key;
}

static inline void i8279_write(I8279 *d, uint16_t address, uint8_t value) {
    if (address == I8279_COMMAND) {
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

#endif
