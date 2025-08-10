"use client";

import React, { useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
  Chip,
} from "@mui/material";
import Search from "./components/Search";
import UploadManager from "./components/UploadManager";
import { Database, SearchIcon, Upload } from "lucide-react";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#fafafa",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 300,
    },
    h6: {
      fontWeight: 400,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
      },
    },
  },
});

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [systemStatus, setSystemStatus] = useState({});

  React.useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch("http://localhost:5001/status");
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
      }
    } catch (error) {
      console.error("Error fetching system status:", error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        {/* Header */}
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Database style={{ marginRight: 12 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Multi-Modal Search Engine
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip
                label={`Indexed: ${systemStatus.indexed_items || 0}`}
                variant="outlined"
                size="small"
                sx={{ color: "white", borderColor: "rgba(255,255,255,0.5)" }}
              />
              <Chip
                label={
                  systemStatus.cross_modal_search?.enabled
                    ? "Cross-Modal ON"
                    : "Cross-Modal OFF"
                }
                variant="filled"
                size="small"
                color={
                  systemStatus.cross_modal_search?.enabled ? "success" : "error"
                }
              />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Navigation Tabs */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab
              icon={<SearchIcon size={16} />}
              label="Search"
              iconPosition="start"
            />
            <Tab
              icon={<Upload size={16} />}
              label="Upload & Index"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Content */}
        <TabPanel value={activeTab} index={0}>
          <Search />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <UploadManager onUploadSuccess={fetchSystemStatus} />
        </TabPanel>
      </div>
    </ThemeProvider>
  );
}

export default App;
