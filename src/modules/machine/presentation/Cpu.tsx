import { Flags } from './Flags';
import React from 'react';
import { Registers } from "./Registers";
import Grid from '@mui/material/Grid';

export const Cpu = () => {
    return (
        <Grid container spacing={2}>
            <Grid item lg={7}>
                <Registers/>
            </Grid>
            <Grid item lg={5}>
                <Flags/>
            </Grid>
        </Grid>
    )
};
