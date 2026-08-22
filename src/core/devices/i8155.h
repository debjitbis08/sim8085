// The Intel 8155's command register and timer, as the SDK-85 uses them.
//
// The part is RAM, three I/O ports and a 14-bit timer. On the SDK-85 the RAM is
// simply mapped on the address bus like any other memory, and the rest answers
// on the port space at 20h-25h. The timer is the interesting half: its input is
// wired to the processor's CLK OUT, so it counts t-states, and its output goes
// to TRAP.
//
// That is how the monitor single steps. It loads the timer with a count chosen
// so that TIMER OUT fires one user instruction after the monitor has restored
// the user's registers and jumped to them, and the resulting TRAP lands in
// STP25, which stops the timer and saves the user's state again.
#ifndef SIM8085_I8155_H
#define SIM8085_I8155_H

#include <stdint.h>
#include <string.h>

#include "../bus.h"

#define I8155_PORT_BASE    0x20
#define I8155_PORT_COUNT   6
#define I8155_COMMAND      0x20
#define I8155_TIMER_LOW    0x24
#define I8155_TIMER_HIGH   0x25

// The timer command occupies the top two bits of the command register.
#define I8155_TIMER_NOP       0x00
#define I8155_TIMER_STOP      0x40
#define I8155_TIMER_STOP_TC   0x80
#define I8155_TIMER_START     0xc0

typedef struct {
    uint8_t command;
    uint8_t ports[3];
    // The reload value is 14 bits; the top two bits of the high byte are the
    // output mode, which decides the shape of TIMER OUT rather than its period.
    uint16_t reload;
    uint8_t mode;
    uint16_t counter;
    int running;
    // TIMER OUT has pulsed, and whether the processor could yet have seen it.
    //
    // The 8085 samples its interrupt inputs late in an instruction, so a pulse
    // arriving exactly on an instruction boundary misses that sample and is
    // caught at the end of the next instruction. The monitor's single step
    // depends on it: its count is chosen so terminal count falls precisely
    // where the user's first instruction begins, and the TRAP has to arrive
    // after that instruction has run rather than instead of it.
    int timed_out;
    int reportable;
    // The start command arrives part way through an OUT, and the timer begins
    // on the next clock edge after it. Counting that instruction's whole length
    // would start the timer early by most of an instruction.
    int just_started;
    int timeouts;
} I8155;

static inline void i8155_reset(I8155 *d) {
    memset(d, 0, sizeof(*d));
}

static inline void i8155_start(I8155 *d) {
    d->counter = d->reload ? d->reload : 0x3fff;
    d->running = 1;
    d->just_started = 1;
}

static inline uint8_t i8155_read(I8155 *d, uint16_t port) {
    switch (port & 0x07) {
        case 0:  // status: bit 6 reports that the timer has run out
            return (uint8_t)((d->timed_out || d->reportable) ? 0x40 : 0x00);
        case 1: case 2: case 3:
            return d->ports[(port & 0x07) - 1];
        default:
            return 0;
    }
}

static inline void i8155_write(I8155 *d, uint16_t port, uint8_t value) {
    switch (port & 0x07) {
        case 0:
            d->command = value;
            switch (value & 0xc0) {
                case I8155_TIMER_START: i8155_start(d); break;
                case I8155_TIMER_STOP:  d->running = 0; d->timed_out = 0; d->reportable = 0; break;
                case I8155_TIMER_STOP_TC: break;   // stops itself at terminal count
                default: break;                     // NOP leaves the timer alone
            }
            break;
        case 1: case 2: case 3:
            d->ports[(port & 0x07) - 1] = value;
            break;
        case 4:
            d->reload = (uint16_t)((d->reload & 0x3f00) | value);
            break;
        case 5:
            d->reload = (uint16_t)((d->reload & 0x00ff) | ((value & 0x3f) << 8));
            d->mode = (uint8_t)(value & 0xc0);
            break;
        default:
            break;
    }
}

// Counts the processor's clock. The count is reloaded at terminal count, which
// is what the auto-reload modes do; the monitor stops the timer in its handler
// long before that matters.
static inline void i8155_tick(I8155 *d, uint32_t tstates) {
    // A pulse from the previous instruction becomes visible now.
    if (d->timed_out) d->reportable = 1;
    if (!d->running) return;
    if (d->just_started) {
        d->just_started = 0;
        return;
    }
    while (tstates) {
        uint32_t step = tstates < d->counter ? tstates : d->counter;
        d->counter = (uint16_t)(d->counter - step);
        tstates -= step;
        if (d->counter == 0) {
            d->timed_out = 1;
            d->timeouts++;
            d->counter = d->reload ? d->reload : 0x3fff;
            if ((d->command & 0xc0) == I8155_TIMER_STOP_TC) d->running = 0;
        }
    }
}

static uint8_t i8155_bus_read(Device *self, uint16_t port) {
    return i8155_read((I8155 *)self->ctx, port);
}

static void i8155_bus_write(Device *self, uint16_t port, uint8_t value) {
    i8155_write((I8155 *)self->ctx, port, value);
}

// TIMER OUT goes to TRAP on the SDK-85. It is a pulse, not a level, so it is
// reported once and then released; the processor latches TRAP itself.
static uint8_t i8155_bus_irq(Device *self) {
    I8155 *d = (I8155 *)self->ctx;
    if (!d->reportable) return 0;
    d->reportable = 0;
    d->timed_out = 0;
    return IRQ_TRAP;
}

static void i8155_bus_tick(Device *self, uint32_t tstates) {
    i8155_tick((I8155 *)self->ctx, tstates);
}

static inline Device i8155_device(I8155 *chip) {
    Device device;
    device.name = "8155";
    device.ctx = chip;
    device.read = i8155_bus_read;
    device.write = i8155_bus_write;
    device.irq = i8155_bus_irq;
    device.tick = i8155_bus_tick;
    return device;
}

#endif
