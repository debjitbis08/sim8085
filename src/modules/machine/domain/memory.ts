export interface Memory {
    data: number[]
};

export const create = (): Memory => ({ data: new Array(0xffff) });
export const set = (location: number, value: number, memory: Memory): Memory => {
    if (location > 0xffff || location < 0) {
        throw new RangeError("Location out of range while setting memory");
    }
    if (value > 0xff || value < 0) {
        throw new RangeError("Value out of range while setting memory");
    }

    return { data: [...memory.data.splice(0, location), value, ...memory.data.slice(location + 1)] };
}

export const get = (location: number, memory: Memory): number => {
    if (location > 0xffff || location < 0) {
        throw new RangeError("Location out of range while getting memory");
    }

    return memory.data[location];
}

export const reset = (): Memory => create();
