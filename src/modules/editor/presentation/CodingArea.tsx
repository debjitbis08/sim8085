import { BugReport, Build, PlayArrow, Stop } from "@mui/icons-material";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useAppDispatch } from "../../../hooks";
import React, { useCallback, useState } from "react";
import Editor from "./Editor";
import { assemble, updateCode } from "./editor-slice";
import Assembled from "./Assembled";

const CodingArea = () => {
    const [view, setView] = useState("code");
    const dispatch = useAppDispatch();
    const onCodeChange = useCallback((code: string | undefined) => {
        if (code) return dispatch(updateCode(code));
    }, [dispatch]);
    const onAssemble = useCallback(() => dispatch(assemble()), [dispatch]);
    const onViewChange = (
        event: React.MouseEvent<HTMLElement>,
        newView: string | null,) => setView(newView || "code");

    return (
        <div>
        <Grid container spacing={2}>
            <Grid item>
                <ToggleButtonGroup color="primary" value={view} onChange={onViewChange} exclusive>
                    <ToggleButton value="code">Code</ToggleButton>
                    <ToggleButton value="assembled">Assembled</ToggleButton>
                </ToggleButtonGroup>
            </Grid>
            <Grid item>
                <TextField label="Load At" variant="standard" />
            </Grid>
            <Grid item>
                <ButtonGroup
                    variant="outlined"
                    aria-label="toolbar"
                >
                    <Button onClick={onAssemble}><Build/></Button>
                    <Button><PlayArrow/></Button>
                    <Button><BugReport/></Button>
                    <Button><Stop/></Button>
                </ButtonGroup>
            </Grid>
        </Grid>
        <Editor onChange={onCodeChange}/>
        <Assembled/>
        </div>
    );
};

export default CodingArea;
