import { Cpu, Flag } from "../domain/cpu";

export interface SetFlagCommand {
    cpu: Cpu,
    flag: Flag,
    value: boolean
}
