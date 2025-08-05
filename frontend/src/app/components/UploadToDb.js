"use client";
import React, { useState } from "react";
import {
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";

const API_URL = "http://localhost:5001";

export default function UploadToDb({ dbName, onUpload }) {
  const [fileType, setFileType] = useState("image");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setMsg(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("db_name", dbName);
    formData.append("type", fileType);
    try {
      const res = await fetch(`${API_URL}/upload_file`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success)
        setMsg({
          type: "success",
          text: "Content indexed and ready for search!",
        });
      else setMsg({ type: "error", text: data.error || "Upload failed" });
      setFile(null);
      if (onUpload) onUpload();
    } catch (e) {
      setMsg({ type: "error", text: "Network/upload error" });
    }
    setLoading(false);
  }

  return (
    <Paper
      elevation={1}
      sx={{ mb: 4, p: 2, display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Typography variant="subtitle1">
        Upload to <b>{dbName}</b>:
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: { sm: "center" },
        }}
      >
        <FormControl sx={{ width: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={fileType}
            label="Type"
            onChange={(e) => setFileType(e.target.value)}
          >
            <MenuItem value="image">Image</MenuItem>
            <MenuItem value="audio">Audio</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          component="label"
          startIcon={<CloudUpload />}
          sx={{ flexGrow: 1 }}
        >
          {file ? file.name : `Choose ${fileType}`}
          <input
            type="file"
            accept={fileType === "image" ? "image/*" : "audio/*"}
            hidden
            onChange={(e) => setFile(e.target.files[0])}
            disabled={loading}
          />
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? <CircularProgress size={22} /> : "Upload & Index"}
        </Button>
      </Box>
      {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
    </Paper>
  );
}
