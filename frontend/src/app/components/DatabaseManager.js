"use client";
import React, { useState, useEffect, forwardRef } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";

const API_URL = "http://localhost:5001";

export default function DatabaseManager({
  databases,
  setDatabases,
  selectedDb,
  setSelectedDb,
  loading,
  setLoading,
  refreshDbListRef,
}) {
  const [createDbName, setCreateDbName] = useState("");
  const [creating, setCreating] = useState(false);
  const [snack, setSnack] = useState(null);

  async function fetchDatabases() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/list_databases`);
      const data = await res.json();
      setDatabases(data);
      // Select first db by default if none chosen
      if (data && !data.find((db) => db.db_name === selectedDb)) {
        setSelectedDb(data.length ? data[0].db_name : null);
      }
    } catch (e) {
      setDatabases([]);
      setSnack({ type: "error", text: "Failed to fetch databases" });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDatabases();
    // Expose refresh to parent via ref
    if (refreshDbListRef) refreshDbListRef.current = fetchDatabases;
    // eslint-disable-next-line
  }, []);

  async function handleCreate() {
    if (!createDbName || !/^[a-zA-Z_][a-zA-Z0-9_]{2,32}$/.test(createDbName)) {
      setSnack({
        type: "error",
        text: "Use 3-32 letters, numbers, _; start with letter/_",
      });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/create_database`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db_name: createDbName }),
      });
      const data = await res.json();
      if (data.success) {
        setSnack({ type: "success", text: "Database created!" });
        setCreateDbName("");
        await fetchDatabases();
        setSelectedDb(createDbName);
      } else {
        setSnack({ type: "error", text: data.message });
      }
    } catch (e) {
      setSnack({ type: "error", text: "Error creating database" });
    }
    setCreating(false);
  }

  return (
    <Paper
      elevation={2}
      sx={{ mb: 5, p: 3, display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <FormControl sx={{ minWidth: 160, flex: 1 }}>
          <InputLabel>Select DB</InputLabel>
          <Select
            value={selectedDb || ""}
            label="Select DB"
            onChange={(e) => setSelectedDb(e.target.value)}
            disabled={loading || !databases.length}
          >
            {databases.map((db) => (
              <MenuItem key={db.db_name} value={db.db_name}>
                {db.db_name} ({db.ntotal} items)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="New Database Name"
          size="small"
          variant="outlined"
          value={createDbName}
          onChange={(e) => setCreateDbName(e.target.value)}
          placeholder="e.g. my_collection"
          sx={{ width: { xs: "100%", sm: 200 } }}
          disabled={creating}
        />
        <Button variant="contained" onClick={handleCreate} disabled={creating}>
          {creating ? (
            <CircularProgress color="inherit" size={22} />
          ) : (
            "Create DB"
          )}
        </Button>
        <Button
          variant="outlined"
          onClick={fetchDatabases}
          sx={{ minWidth: { xs: 0, sm: 80 } }}
        >
          Refresh
        </Button>
      </Box>
      {databases && selectedDb && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
          Using: <b>{selectedDb}</b>
          {(() => {
            const found = databases.find((db) => db.db_name === selectedDb);
            if (!found) return null;
            return (
              <>
                {" "}
                | {found.ntotal} items | Updated{" "}
                {found.last_updated?.slice(0, 19).replace("T", " ")}
              </>
            );
          })()}
        </Typography>
      )}
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {snack && <Alert severity={snack.type}>{snack.text}</Alert>}
      </Snackbar>
    </Paper>
  );
}
