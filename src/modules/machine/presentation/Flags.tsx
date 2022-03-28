import { Refresh } from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/system";
import React, { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { Flag } from "../domain/cpu";
import { setFlag } from "./machine-slice";

const flags: Flag[] = ["c", "p", "ac", "z", "s"];

const getFlagDisplayName = (flag: Flag) => {
    return {
        c: "Carry",
        p: "Parity",
        ac: "Aux Carry",
        z: "Zero",
        s: "Sign",
    }[flag];
};

const FlagName = styled(Typography)({
    paddingTop: "10px"
});

const FlagItem = ({ flag, value }) => {
    const dispatch = useAppDispatch();
    const onFlagChange = useCallback((ev, checked) => dispatch(setFlag({ flag, value: checked })), [dispatch]);

    return (
        <Grid container spacing={2}>
            <Grid item xs={9}>
                <FlagName variant="body1">
                    {getFlagDisplayName(flag)}
                </FlagName>
            </Grid>
            <Grid item xs={3}>
                <Switch checked={value} onChange={onFlagChange}/>
            </Grid>
        </Grid>
    );
};

export const Flags = () => {
    const cpu = useAppSelector((state) => state.machine.cpu);

    return (
        <section>
            <Grid container spacing={2}>
                <Grid item xs={9}>
                    <Typography variant="h6">Flags</Typography>
                </Grid>
                <Grid item xs={3}>
                    <Refresh />
                </Grid>
            </Grid>
            <List>
                {flags.map((flag: Flag) => (
                    <ListItem key={flag}>
                        <FlagItem flag={flag} value={cpu.flags[flag]} />
                    </ListItem>
                ))}
            </List>
        </section>
    );
};
