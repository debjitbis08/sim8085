import { Cpu, Register, setRegister } from "../domain/cpu";
import { SetRegisterCommand } from "./set-register-command";

export const setRegisterUseCase = (cmd: SetRegisterCommand): Cpu => {
    return setRegister(cmd.cpu, cmd.register, cmd.value);
};
