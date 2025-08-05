"use client";
import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Alert,
  Typography,
  Tabs,
  Tab,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardMedia,
  CardContent,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
} from "@mui/material";
import {
  ArrowForward,
  Image as ImageIcon,
  TextFields,
  GraphicEq,
  CloudUpload,
  VolumeUp,
  FilterList,
} from "@mui/icons-material";

const API_URL = "http://localhost:5001";

export default function MultiSearch({ dbName }) {
  const [searchMode, setSearchMode] = useState(0); // 0: text, 1: image, 2: audio
  const [query, setQuery] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [numResults, setNumResults] = useState(5);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInfo, setSearchInfo] = useState(null);
  const [searchFilter, setSearchFilter] = useState({
    showImages: true,
    showAudio: true,
  });

  const resultOptions = [3, 5, 8, 10, 15, 20];

  // Filtering logic
  const filteredResults = results.filter(
    (r) =>
      (searchFilter.showImages && r.file_type === "image") ||
      (searchFilter.showAudio && r.file_type === "audio")
  );
  const resultCounts = results.reduce((acc, r) => {
    acc[r.file_type] = (acc[r.file_type] || 0) + 1;
    return acc;
  }, {});

  // Handle file input
  const fileInputRef = useRef();
  function handleFileChange(e) {
    setUploadedFile(e.target.files[0]);
  }

  // Handle filter checkbox
  function handleFilterChange(e) {
    setSearchFilter((f) => ({ ...f, [e.target.name]: e.target.checked }));
  }

  // Do search
  async function handleSearch() {
    setLoading(true);
    setResults([]);
    setError(null);
    setSearchInfo(null);
    try {
      let data, res;
      if (searchMode === 0) {
        res = await fetch(`${API_URL}/search_text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: query,
            num_results: numResults,
            db_name: dbName,
          }),
        });
      } else {
        const formData = new FormData();
        const endpoint = searchMode === 1 ? "search_image" : "search_audio";
        const key = searchMode === 1 ? "image" : "audio";
        formData.append(key, uploadedFile);
        formData.append("db_name", dbName);
        formData.append("num_results", numResults);
        res = await fetch(`${API_URL}/${endpoint}`, {
          method: "POST",
          body: formData,
        });
      }
      data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      setSearchInfo({ db: dbName, num_results: numResults, searchMode });
      setSearchFilter({ showImages: true, showAudio: true }); // reset filters after new search
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  // Keydown for Enter to search (text mode only)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchMode === 0 && !loading) handleSearch();
  };

  const formatFilename = (fn) =>
    fn
      .replace(/^.*[\\\/]/, "")
      .replace(/\.[^/.]+$/, "")
      .substring(0, 20);

  return (
    <Paper elevation={3} sx={{ mb: 4, p: { xs: 2, md: 3 } }}>
      {/* Tabs and Search Bar */}
      <Tabs
        value={searchMode}
        variant="fullWidth"
        onChange={(_, v) => {
          setResults([]);
          setSearchMode(v);
          setUploadedFile(null);
          setQuery("");
          setError(null);
        }}
        sx={{
          mb: 2,
          "& .MuiTab-root": { fontSize: { xs: "1rem", sm: "1.1rem" } },
          "& .Mui-selected": { color: "#1976d2 !important", fontWeight: 600 },
        }}
      >
        <Tab icon={<TextFields />} label="Text" />
        <Tab icon={<ImageIcon />} label="Image" />
        <Tab icon={<GraphicEq />} label="Audio" />
      </Tabs>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: { xs: "stretch", sm: "center" },
          mb: 2,
        }}
      >
        {/* Main mode-specific search UI */}
        {searchMode === 0 ? (
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search for images and audio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        ) : (
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUpload />}
            sx={{ flexGrow: 1 }}
          >
            {uploadedFile
              ? uploadedFile.name
              : searchMode === 1
              ? "Choose image"
              : "Choose audio"}
            <input
              type="file"
              hidden
              accept={searchMode === 1 ? "image/*" : "audio/*"}
              onChange={handleFileChange}
              disabled={loading}
              ref={fileInputRef}
            />
          </Button>
        )}
        {/* #results */}
        <FormControl sx={{ minWidth: { xs: 90, sm: 120 } }}>
          <InputLabel>Results</InputLabel>
          <Select
            value={numResults}
            label="Results"
            onChange={(e) => setNumResults(e.target.value)}
            disabled={loading}
          >
            {resultOptions.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Search Button */}
        <IconButton
          color="primary"
          onClick={handleSearch}
          disabled={
            loading || (searchMode === 0 ? !query.trim() : !uploadedFile)
          }
          size="large"
          sx={{
            bgcolor: "primary.main",
            color: "white",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <ArrowForward />
          )}
        </IconButton>
      </Box>

      {/* Error handler */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filter Bar */}
      {results.length > 0 && !loading && (
        <Box sx={{ mb: 2, p: 1, backgroundColor: "#f8f9fa", borderRadius: 2 }}>
          <FormGroup
            row
            sx={{ flexWrap: "wrap", justifyContent: "center", gap: 1 }}
          >
            <FilterList sx={{ mr: 1, color: "primary.main" }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={searchFilter.showImages}
                  onChange={handleFilterChange}
                  name="showImages"
                  color="primary"
                />
              }
              label={
                <span>
                  <ImageIcon fontSize="small" /> Images (
                  {resultCounts.image || 0})
                </span>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={searchFilter.showAudio}
                  onChange={handleFilterChange}
                  name="showAudio"
                  color="primary"
                />
              }
              label={
                <span>
                  <VolumeUp fontSize="small" /> Audio ({resultCounts.audio || 0}
                  )
                </span>
              }
            />
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 2, display: { xs: "none", sm: "block" } }}
            />
            <Typography variant="body2" color="textSecondary">
              Showing {filteredResults.length} of {results.length} results
            </Typography>
          </FormGroup>
        </Box>
      )}

      {/* Results Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {filteredResults.map((result, i) => (
          <Grid item xs={12} sm={6} lg={4} key={i}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: { xs: 2, sm: 3 },
                boxShadow: { xs: 2, sm: 3 },
                position: "relative",
                mb: 1,
              }}
            >
              {/* Image result */}
              {result.file_type === "image" && (
                <>
                  <CardMedia
                    component="img"
                    image={`http://localhost:5001/static/${result.filename}`}
                    alt={formatFilename(result.filename)}
                    sx={{ height: { xs: 170, sm: 200 }, objectFit: "cover" }}
                  />
                  <CardContent>
                    <Typography variant="body2" color="textSecondary" noWrap>
                      <ImageIcon
                        fontSize="small"
                        sx={{ verticalAlign: "middle", mr: 0.5 }}
                      />{" "}
                      {formatFilename(result.filename)}
                    </Typography>
                  </CardContent>
                </>
              )}
              {/* Audio result */}
              {result.file_type === "audio" && (
                <>
                  <Box
                    sx={{
                      p: 2,
                      minHeight: 130,
                      background:
                        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    }}
                  >
                    <Box sx={{ fontSize: 42, mb: 1 }}>🎵</Box>
                    <audio controls style={{ width: "100%" }}>
                      <source
                        src={`http://localhost:5001/static/${result.filename}`}
                        type="audio/mpeg"
                      />
                      <source
                        src={`http://localhost:5001/static/${result.filename}`}
                        type="audio/wav"
                      />
                      <source
                        src={`http://localhost:5001/static/${result.filename}`}
                        type="audio/mp3"
                      />
                    </audio>
                  </Box>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary" noWrap>
                      <VolumeUp
                        fontSize="small"
                        sx={{ verticalAlign: "middle", mr: 0.5 }}
                      />{" "}
                      {formatFilename(result.filename)}
                    </Typography>
                  </CardContent>
                </>
              )}
              {/* Score Badges */}
              <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                <Chip
                  label={`${(result.similarity_score * 100).toFixed(0)}%`}
                  color="primary"
                  size="small"
                />
              </Box>
              <Box sx={{ position: "absolute", top: 8, left: 8 }}>
                <Chip
                  label={`#${result.rank}`}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Friendly empty states */}
      {results.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
          <Typography variant="h6">No results yet. Try searching!</Typography>
        </Box>
      )}
      {filteredResults.length === 0 && results.length !== 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          <Typography variant="body1">
            No results match the filter. Change filter options above.
          </Typography>
        </Box>
      )}
      {loading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Searching...
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
