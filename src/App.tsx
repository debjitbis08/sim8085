import React from "react";
import logo from "../logo-dark.png";
import "./App.css";
import {
    Box,
    CssBaseline,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import Header from "./components/header/Header";
import { Cpu } from "./modules/machine/presentation/Cpu";
import CodingArea from "./modules/editor/presentation/CodingArea";


interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function App() {
    const [tabValue, setTabValue] = React.useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <React.Fragment>
            <CssBaseline />
            <div className="App">
                <Header/>
                <main>
                    <Box sx={{ width: 1 }}>
                        <Box
                            display="grid"
                            gridTemplateColumns="repeat(12, 1fr)"
                            gap={2}
                        >
                            <Box gridColumn="span 4">
                                <Box
      sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: 224 }}
    >
                                <Tabs orientation="vertical"
                                    value={tabValue}
                                    onChange={handleTabChange}
                                >
                                    <Tab label="CPU"></Tab>
                                    <Tab label="Memory"></Tab>
                                    <Tab label="I/O"></Tab>
                                </Tabs>
                                <TabPanel value={tabValue} index={0}>
                                    <Cpu/>
                                </TabPanel>
                                <TabPanel value={tabValue} index={1}>
                                    Coming Soon..
                                </TabPanel>
                                <TabPanel value={tabValue} index={2}>
                                    Coming Soon..
                                </TabPanel>
                                </Box>
                            </Box>
                            <Box gridColumn="span 5">
                                <CodingArea/>
                            </Box>
                            <Box gridColumn="span 3">
                                <span>xs=4</span>
                            </Box>
                        </Box>
                    </Box>
                </main>
            </div>
        </React.Fragment>
    );
}

export default App;
