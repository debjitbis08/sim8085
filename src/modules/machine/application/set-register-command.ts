import { Cpu, Register } from "../domain/cpu";

export interface SetRegisterCommand {
    cpu: Cpu,
    register: Register,
    value: number
}
