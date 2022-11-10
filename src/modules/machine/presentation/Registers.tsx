import { Refresh } from "@mui/icons-material";
import { Grid, List, ListItem, ListItemText, Typography } from "@mui/material";
import React, { useCallback, useState } from "react";
import EditableWordDisplay from "../../../components/editable-display/EditableWordDisplay";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { getPswLow, getRegister, getRegisterPair, Register, RegisterPair } from "../domain/cpu";
import { setRegister } from "./machine-slice";

const registerPairs: { high: Register, low: Register | "Flags", name?: string }[] = [
    {
        high: "A", low: "Flags", name: "PSW"
    },
    {
        high: "B", low: "C"
    },
    {
        high: "D", low: "E"
    },
    {
        high: "H", low: "L"
    }
];

const RegisterItem = ({ registerPair, high, low }: { registerPair: { high: Register, low: Register | "Flags", name?: string }, high: number, low: number }) => {
    const name = registerPair.name || `${registerPair.high}${registerPair.low}`;
    const dispatch = useAppDispatch();
    const onRegisterChange = useCallback((word: number, which: "high" | "low") => dispatch(setRegister({ register: registerPair[which], value: word })), [dispatch]);

    return (
        <ListItem key={name}
            secondaryAction={
                <Refresh/>
            }
        >
            <ListItemText primary={name}/>
            <EditableWordDisplay high={high} low={low} radix={16} editBytes onChange={onRegisterChange}/>
        </ListItem>
    );
};

export const Registers = () => {
    const cpu = useAppSelector((state) => state.machine.cpu);

    return (
        <section>
            <Grid container spacing={2}>
                <Grid item>
                    <Typography variant="h6">Registers</Typography>
                </Grid>
                <Grid item>
                    <Refresh />
                </Grid>
            </Grid>
            <List>
                {registerPairs.map((registerPair) => (
                    <RegisterItem registerPair={registerPair} high={getRegister(cpu, registerPair.high)} low={registerPair.low === "Flags" ? getPswLow(cpu) : getRegister(cpu, registerPair.low)}/>
                ))}
            </List>
        </section>
    );
};
