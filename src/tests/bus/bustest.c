// Exercises the address bus directly: read-only pages, unmapped space, device
// dispatch, the separate port space, and interrupt lines driven by a device.
//
// These are the behaviours a flat array cannot express, so none of them could
// be tested before bus.h existed.
#include <fcntl.h>
#include <string.h>
#include <unistd.h>

#include "8085.c"

void io_write(int address, int value) { (void)address; (void)value; }

static int failures = 0;

static void check(const char *what, long got, long want) {
    if (got == want) {
        printf("ok   %s\n", what);
    } else {
        printf("FAIL %s: got %ld want %ld\n", what, got, want);
        failures++;
    }
}

// A device that remembers the last address and value it saw, answers reads with
// the low byte of the address, and drives RST 5.5 while it has anything queued.
typedef struct {
    uint16_t last_address;
    uint8_t last_value;
    int reads;
    int queued;
    int ticks;
} Fake;

static uint8_t fake_read(Device *self, uint16_t address) {
    Fake *f = self->ctx;
    f->last_address = address;
    f->reads++;
    // Reading it takes one item, exactly as reading a FIFO would.
    if (f->queued > 0) f->queued--;
    return (uint8_t)(address & 0xff);
}

static void fake_write(Device *self, uint16_t address, uint8_t value) {
    Fake *f = self->ctx;
    f->last_address = address;
    f->last_value = value;
}

static uint8_t fake_irq(Device *self) {
    Fake *f = self->ctx;
    return f->queued > 0 ? IRQ_RST55 : 0;
}

// Drives RST 7.5 rather than RST 5.5, and never lets go.
static uint8_t fake_irq_r75(Device *self) {
    Fake *f = self->ctx;
    return f->queued > 0 ? IRQ_RST75 : 0;
}

static void fake_tick(Device *self, uint32_t tstates) {
    (void)tstates;
    ((Fake *)self->ctx)->ticks++;
}

static State8085 *fresh(void) {
    fflush(stdout);
    int saved = dup(STDOUT_FILENO), devnull = open("/dev/null", O_WRONLY);
    dup2(devnull, STDOUT_FILENO);
    State8085 *cpu = Init8085();
    fflush(stdout);
    dup2(saved, STDOUT_FILENO);
    close(devnull);
    close(saved);
    return cpu;
}

int main(void) {
    State8085 *cpu = fresh();
    Fake fake;
    memset(&fake, 0, sizeof(fake));
    Device device = { "fake", &fake, fake_read, fake_write, fake_irq };

    // The default machine is RAM everywhere.
    mem_write(cpu, 0x1234, 0xab);
    check("default machine stores and returns a byte", mem_read(cpu, 0x1234), 0xab);

    // A read-only page drops writes but still reads its backing store.
    cpu->memory[0x0500] = 0x5a;
    bus_map_memory(&cpu->bus, cpu->memory, 0x05, 1, 0);
    mem_write(cpu, 0x0500, 0xff);
    check("a write to a read-only page is dropped", mem_read(cpu, 0x0500), 0x5a);

    // Unmapped space floats high, and writes to it go nowhere.
    cpu->bus.read_page[0x06] = NULL;
    cpu->bus.write_page[0x06] = NULL;
    cpu->bus.device_page[0x06] = NULL;
    mem_write(cpu, 0x0600, 0x11);
    check("an unmapped read floats high", mem_read(cpu, 0x0600), 0xff);

    // A device answers for its whole page, and sees the low address lines --
    // which is how a chip tells its own registers apart.
    bus_map_device(&cpu->bus, &device, 0x40, 1);
    check("a device answers a read", mem_read(cpu, 0x4022), 0x22);
    check("a device sees the full address", fake.last_address, 0x4022);
    check("a device answers anywhere in its page", mem_read(cpu, 0x40f0), 0xf0);
    mem_write(cpu, 0x4055, 0x7e);
    check("a device receives a write", fake.last_value, 0x7e);

    // The port space decodes separately: the same number is a different place.
    Fake port_fake;
    memset(&port_fake, 0, sizeof(port_fake));
    Device port_device = { "port", &port_fake, fake_read, fake_write, NULL };
    bus_map_port_device(&cpu->bus, &port_device, 0x40, 1);
    bus_port_write(&cpu->bus, 0x40, 0x99);
    check("a port device receives a write", port_fake.last_value, 0x99);
    check("the memory device was not touched by the port write", fake.last_value, 0x7e);

    // An interrupt line driven by a device. The vector at 002Ch returns at
    // once, and 0100h counts how many times it was reached.
    State8085 *irq_cpu = fresh();
    Fake keys;
    memset(&keys, 0, sizeof(keys));
    Device key_device = { "keys", &keys, fake_read, fake_write, fake_irq };
    bus_map_device(&irq_cpu->bus, &key_device, 0x40, 1);

    irq_cpu->memory[0x002c] = 0x3a;                       // LDA 4000h -- takes one item
    irq_cpu->memory[0x002d] = 0x00;
    irq_cpu->memory[0x002e] = 0x40;
    irq_cpu->memory[0x002f] = 0x34;                       // INR M
    irq_cpu->memory[0x0030] = 0xfb;                       // EI
    irq_cpu->memory[0x0031] = 0xc9;                       // RET
    irq_cpu->memory[0x0200] = 0x21;                       // LXI H,0100h
    irq_cpu->memory[0x0201] = 0x00;
    irq_cpu->memory[0x0202] = 0x01;
    irq_cpu->memory[0x0203] = 0xfb;                       // EI
    irq_cpu->memory[0x0204] = 0xc3;                       // JMP 0204h
    irq_cpu->memory[0x0205] = 0x04;
    irq_cpu->memory[0x0206] = 0x02;
    irq_cpu->pc = 0x0200;
    irq_cpu->sp = 0x0fff;
    irq_cpu->r5_mask = 0;

    keys.queued = 1;
    ExecutionStats8085 stats;
    memset(&stats, 0, sizeof(stats));
    for (int i = 0; i < 5000; i++) Emulate8085Op(irq_cpu, 0xFFFF, &stats);
    check("one queued item is delivered once", irq_cpu->memory[0x0100], 1);

    keys.queued = 3;
    for (int i = 0; i < 5000; i++) Emulate8085Op(irq_cpu, 0xFFFF, &stats);
    check("three queued items are delivered three times", irq_cpu->memory[0x0100], 4);

    // A line asserted by hand must survive a device being attached. The device
    // here drives nothing, so with the two sources combined the request stands;
    // taking the devices' output alone would erase it.
    State8085 *host_cpu = fresh();
    Fake quiet;
    memset(&quiet, 0, sizeof(quiet));
    Device quiet_device = { "quiet", &quiet, fake_read, fake_write, fake_irq };
    bus_map_device(&host_cpu->bus, &quiet_device, 0x40, 1);
    host_cpu->memory[0x002c] = 0x34;                      // INR M
    host_cpu->memory[0x002d] = 0xfb;                      // EI
    host_cpu->memory[0x002e] = 0xc9;                      // RET
    host_cpu->memory[0x0200] = 0x21;                      // LXI H,0100h
    host_cpu->memory[0x0201] = 0x00;
    host_cpu->memory[0x0202] = 0x01;
    host_cpu->memory[0x0203] = 0xfb;                      // EI
    host_cpu->memory[0x0204] = 0xc3;                      // JMP 0204h
    host_cpu->memory[0x0205] = 0x04;
    host_cpu->memory[0x0206] = 0x02;
    host_cpu->pc = 0x0200;
    host_cpu->sp = 0x0fff;
    host_cpu->r5_mask = 0;
    triggerInterrupt(host_cpu, 55, 1);
    memset(&stats, 0, sizeof(stats));
    for (int i = 0; i < 5000; i++) Emulate8085Op(host_cpu, 0xFFFF, &stats);
    check("a hand-asserted line survives a device being attached",
          host_cpu->memory[0x0100] > 0, 1);

    // RST 7.5 latches on an edge. A device holding the line high must produce
    // one interrupt, not one on every pass round the loop.
    State8085 *edge_cpu = fresh();
    Fake held;
    memset(&held, 0, sizeof(held));
    held.queued = 1;                                      // drives its line for ever
    Device held_device = { "held", &held, fake_read, fake_write, fake_irq_r75 };
    bus_map_device(&edge_cpu->bus, &held_device, 0x40, 1);
    edge_cpu->memory[0x003c] = 0x34;                      // INR M
    edge_cpu->memory[0x003d] = 0xfb;                      // EI
    edge_cpu->memory[0x003e] = 0xc9;                      // RET
    edge_cpu->memory[0x0200] = 0x21;                      // LXI H,0100h
    edge_cpu->memory[0x0201] = 0x00;
    edge_cpu->memory[0x0202] = 0x01;
    edge_cpu->memory[0x0203] = 0xfb;                      // EI
    edge_cpu->memory[0x0204] = 0xc3;                      // JMP 0204h
    edge_cpu->memory[0x0205] = 0x04;
    edge_cpu->memory[0x0206] = 0x02;
    edge_cpu->pc = 0x0200;
    edge_cpu->sp = 0x0fff;
    edge_cpu->r7_mask = 0;
    memset(&stats, 0, sizeof(stats));
    for (int i = 0; i < 5000; i++) Emulate8085Op(edge_cpu, 0xFFFF, &stats);
    check("a held RST 7.5 line latches once", edge_cpu->memory[0x0100], 1);

    // One chip answering in both address spaces is still one chip. Registering
    // it twice would clock it twice per instruction, and a timer counting the
    // processor's clock would then run at double speed.
    State8085 *both_cpu = fresh();
    Fake both;
    memset(&both, 0, sizeof(both));
    Device both_device = { "both", &both, fake_read, fake_write, NULL, fake_tick };
    bus_map_device(&both_cpu->bus, &both_device, 0x50, 1);
    bus_map_port_device(&both_cpu->bus, &both_device, 0x50, 1);
    check("a device in both address spaces is registered once", both_cpu->bus.device_count, 1);
    memset(&stats, 0, sizeof(stats));
    for (int i = 0; i < 100; i++) Emulate8085Op(both_cpu, 0xFFFF, &stats);
    check("a device in both address spaces is clocked once per instruction", both.ticks, 100);

    // The registry is finite, and a chip that answers but is never clocked or
    // polled is worse than one that is absent, so mapping fails rather than
    // half succeeding.
    State8085 *full_cpu = fresh();
    static Fake spares[BUS_MAX_DEVICES + 1];
    static Device spare_devices[BUS_MAX_DEVICES + 1];
    int mapped = 0;
    for (int i = 0; i <= BUS_MAX_DEVICES; i++) {
        memset(&spares[i], 0, sizeof(Fake));
        spare_devices[i].name = "spare";
        spare_devices[i].ctx = &spares[i];
        spare_devices[i].read = fake_read;
        spare_devices[i].write = fake_write;
        spare_devices[i].irq = NULL;
        spare_devices[i].tick = NULL;
        mapped += bus_map_device(&full_cpu->bus, &spare_devices[i], 0x60 + i, 1);
    }
    check("the registry accepts no more than it can clock", mapped, BUS_MAX_DEVICES);
    // The page it would have taken still behaves as it did before: writing and
    // reading back gives the byte, where the device would have answered with
    // the low half of the address instead.
    uint16_t refused = (uint16_t)(((0x60 + BUS_MAX_DEVICES) << 8) | 0x12);
    mem_write(full_cpu, refused, 0x5a);
    check("a device that could not be registered is not mapped either",
          mem_read(full_cpu, refused), 0x5a);

    printf("%s\n", failures ? "RESULT FAIL" : "RESULT OK");
    return failures ? 1 : 0;
}
