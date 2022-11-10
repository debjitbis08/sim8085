import { Cpu, Flag } from "../domain/cpu";
import { SetFlagCommand } from "./set-flag-command";

export const setFlagUseCase = (cmd: SetFlagCommand): Cpu => {
    return { ...cmd.cpu, flags: { ...cmd.cpu.flags, [cmd.flag]: cmd.value } };
};
