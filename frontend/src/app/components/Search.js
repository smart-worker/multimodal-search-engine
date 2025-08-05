"use client";

import React, { useState } from "react";
import {
  TextField,
  IconButton,
  Grid,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Box,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Button,
  Paper,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
} from "@mui/material";
import {
  ArrowForward,
  VolumeUp,
  Image as ImageIcon,
  TextFields,
  CloudUpload,
  GraphicEq,
  FilterList,
} from "@mui/icons-material";

const Search = () => {
  const [searchMode, setSearchMode] = useState(0);
  const [query, setQuery] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [numResults, setNumResults] = useState(5);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInfo, setSearchInfo] = useState(null);

  // NEW: Filter state - both enabled by default
  const [searchFilter, setSearchFilter] = useState({
    showImages: true,
    showAudio: true,
  });

  const handleTabChange = (event, newValue) => {
    setSearchMode(newValue);
    setQuery("");
    setUploadedFile(null);
    setError(null);
    setResults([]);
    setSearchInfo(null);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setError(null);
    }
  };

  const handleSearch = async () => {
    if (searchMode === 0 && !query.trim()) return;
    if ((searchMode === 1 || searchMode === 2) && !uploadedFile) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSearchInfo(null);

    try {
      let response;

      if (searchMode === 0) {
        response = await fetch("http://localhost:5001/search_text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: query,
            num_results: numResults,
          }),
        });
      } else {
        const formData = new FormData();
        const endpoint = searchMode === 1 ? "upload" : "upload_audio";
        const fileKey = searchMode === 1 ? "image" : "audio";

        formData.append(fileKey, uploadedFile);

        response = await fetch(`http://localhost:5001/${endpoint}`, {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results || []);
      setSearchInfo({
        status: data.status,
        query: searchMode === 0 ? data.query : uploadedFile.name,
        queryType: data.query_type,
        requestedResults: numResults,
        searchMode: ["text", "image", "audio"][searchMode],
      });
    } catch (err) {
      setError(err.message);
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Filter change handler
  const handleFilterChange = (event) => {
    const { name, checked } = event.target;
    setSearchFilter((prev) => ({ ...prev, [name]: checked }));
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !loading && searchMode === 0) {
      handleSearch();
    }
  };

  const formatFilename = (filename) => {
    return filename
      .replace(/^.*[\\\/]/, "")
      .replace(/\.[^/.]+$/, "")
      .substring(0, 20);
  };

  const resultOptions = [3, 5, 8, 10, 15, 20];

  const getSearchButtonDisabled = () => {
    if (loading) return true;
    if (searchMode === 0) return !query.trim();
    return !uploadedFile;
  };

  // NEW: Filter results based on user selection
  const filteredResults = results.filter((result) => {
    if (result.file_type === "image" && !searchFilter.showImages) return false;
    if (result.file_type === "audio" && !searchFilter.showAudio) return false;
    return true;
  });

  // NEW: Count results by type for display
  const resultCounts = results.reduce((acc, result) => {
    acc[result.file_type] = (acc[result.file_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 700, md: 1000, lg: 1200 },
        margin: "auto",
        padding: { xs: 2, sm: 3 },
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: { xs: 3, sm: 5 } }}>
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: 300,
            color: "#1976d2",
            fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3rem" },
          }}
        >
          🔍 Multimodal Search Engine
        </Typography>
        <Typography
          variant="subtitle1"
          color="textSecondary"
          sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
        >
          Search across images and audio using text, images, or audio files
        </Typography>
      </Box>

      {/* Search Mode Tabs */}
      <Paper
        elevation={2}
        sx={{
          maxWidth: { xs: "100%", sm: 600, md: 900 },
          margin: "0 auto 3rem auto",
          borderRadius: { xs: 2, sm: 3 },
          overflow: "hidden",
        }}
      >
        <Tabs
          value={searchMode}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              minHeight: { xs: 56, sm: 72 },
              fontSize: { xs: "0.8rem", sm: "1rem", md: "1.1rem" },
              fontWeight: 500,
              textTransform: "none",
              padding: { xs: "8px 4px", sm: "12px 16px" },
              "&:hover": {
                backgroundColor: "rgba(25, 118, 210, 0.04)",
              },
            },
            "& .Mui-selected": {
              color: "#1976d2 !important",
              fontWeight: 600,
            },
            "& .MuiTabs-indicator": {
              height: { xs: 3, sm: 4 },
              borderRadius: "2px 2px 0 0",
            },
          }}
        >
          <Tab
            icon={<TextFields sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />}
            label="Text"
            sx={{ gap: { xs: 0.5, sm: 1 } }}
          />
          <Tab
            icon={<ImageIcon sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />}
            label="Image"
            sx={{ gap: { xs: 0.5, sm: 1 } }}
          />
          <Tab
            icon={<GraphicEq sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />}
            label="Audio"
            sx={{ gap: { xs: 0.5, sm: 1 } }}
          />
        </Tabs>

        {/* Search Controls Container */}
        <Box sx={{ p: { xs: 2, sm: 3 }, backgroundColor: "#fafafa" }}>
          {/* Text Search */}
          {searchMode === 0 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: { xs: 2, sm: 2 },
              }}
            >
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search for images and audio..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                size="medium"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: { xs: 2, sm: 3 },
                    fontSize: { xs: "1rem", sm: "1.1rem" },
                    backgroundColor: "white",
                  },
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  flexDirection: { xs: "row", sm: "row" },
                  alignItems: "center",
                }}
              >
                <FormControl
                  sx={{
                    minWidth: { xs: 100, sm: 120 },
                    flex: { xs: 1, sm: "none" },
                  }}
                  size="medium"
                >
                  <InputLabel>Results</InputLabel>
                  <Select
                    value={numResults}
                    label="Results"
                    onChange={(e) => setNumResults(e.target.value)}
                    disabled={loading}
                    sx={{
                      backgroundColor: "white",
                      borderRadius: { xs: 2, sm: 3 },
                    }}
                  >
                    {resultOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  color="primary"
                  onClick={handleSearch}
                  disabled={getSearchButtonDisabled()}
                  size="large"
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    "&:hover": { bgcolor: "primary.dark" },
                    "&:disabled": { bgcolor: "grey.300" },
                    p: { xs: 1.5, sm: 1.8 },
                    borderRadius: { xs: 2, sm: 3 },
                    minWidth: { xs: 48, sm: 56 },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <ArrowForward />
                  )}
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Image Upload */}
          {searchMode === 1 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: { xs: 2, sm: 2 },
              }}
            >
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{
                  minHeight: { xs: 48, sm: 56 },
                  borderRadius: { xs: 2, sm: 3 },
                  textTransform: "none",
                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                  flexGrow: 1,
                  backgroundColor: "white",
                  borderStyle: "dashed",
                  borderWidth: 2,
                  padding: { xs: "10px 16px", sm: "12px 20px" },
                  "&:hover": {
                    borderStyle: "dashed",
                    borderWidth: 2,
                  },
                }}
                disabled={loading}
              >
                {uploadedFile
                  ? `Selected: ${uploadedFile.name.substring(0, 20)}...`
                  : "Upload Image (JPG, PNG)"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </Button>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <FormControl
                  sx={{ minWidth: { xs: 100, sm: 120 } }}
                  size="medium"
                >
                  <InputLabel>Results</InputLabel>
                  <Select
                    value={numResults}
                    label="Results"
                    onChange={(e) => setNumResults(e.target.value)}
                    disabled={loading}
                    sx={{
                      backgroundColor: "white",
                      borderRadius: { xs: 2, sm: 3 },
                    }}
                  >
                    {resultOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  color="primary"
                  onClick={handleSearch}
                  disabled={getSearchButtonDisabled()}
                  size="large"
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    "&:hover": { bgcolor: "primary.dark" },
                    "&:disabled": { bgcolor: "grey.300" },
                    p: { xs: 1.5, sm: 1.8 },
                    borderRadius: { xs: 2, sm: 3 },
                    minWidth: { xs: 48, sm: 56 },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <ArrowForward />
                  )}
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Audio Upload */}
          {searchMode === 2 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: { xs: 2, sm: 2 },
              }}
            >
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{
                  minHeight: { xs: 48, sm: 56 },
                  borderRadius: { xs: 2, sm: 3 },
                  textTransform: "none",
                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                  flexGrow: 1,
                  backgroundColor: "white",
                  borderStyle: "dashed",
                  borderWidth: 2,
                  padding: { xs: "10px 16px", sm: "12px 20px" },
                  "&:hover": {
                    borderStyle: "dashed",
                    borderWidth: 2,
                  },
                }}
                disabled={loading}
              >
                {uploadedFile
                  ? `Selected: ${uploadedFile.name.substring(0, 20)}...`
                  : "Upload Audio (MP3, WAV)"}
                <input
                  type="file"
                  hidden
                  accept="audio/*"
                  onChange={handleFileUpload}
                />
              </Button>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <FormControl
                  sx={{ minWidth: { xs: 100, sm: 120 } }}
                  size="medium"
                >
                  <InputLabel>Results</InputLabel>
                  <Select
                    value={numResults}
                    label="Results"
                    onChange={(e) => setNumResults(e.target.value)}
                    disabled={loading}
                    sx={{
                      backgroundColor: "white",
                      borderRadius: { xs: 2, sm: 3 },
                    }}
                  >
                    {resultOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  color="primary"
                  onClick={handleSearch}
                  disabled={getSearchButtonDisabled()}
                  size="large"
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    "&:hover": { bgcolor: "primary.dark" },
                    "&:disabled": { bgcolor: "grey.300" },
                    p: { xs: 1.5, sm: 1.8 },
                    borderRadius: { xs: 2, sm: 3 },
                    minWidth: { xs: 48, sm: 56 },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <ArrowForward />
                  )}
                </IconButton>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Error Display */}
      {error && (
        <Box sx={{ mb: 3, maxWidth: 800, margin: "0 auto" }}>
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        </Box>
      )}

      {/* Search Info */}
      {searchInfo && !loading && (
        <Box sx={{ mb: 3, textAlign: "center", px: { xs: 1, sm: 0 } }}>
          <Typography
            variant="h6"
            color="textPrimary"
            sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
            Found {results.length} of {searchInfo.requestedResults} results for
            &quot;{formatFilename(searchInfo.query)}&quot;
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 1,
              mt: 1,
              flexWrap: "wrap",
            }}
          >
            <Chip
              label={`${searchInfo.searchMode} search`}
              color="primary"
              variant="outlined"
              size="small"
              icon={
                searchInfo.searchMode === "text" ? (
                  <TextFields fontSize="small" />
                ) : searchInfo.searchMode === "image" ? (
                  <ImageIcon fontSize="small" />
                ) : (
                  <GraphicEq fontSize="small" />
                )
              }
            />
            <Chip
              label={`Top ${searchInfo.requestedResults} requested`}
              color="secondary"
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
      )}

      {/* NEW: Filter Controls - Only show when there are results */}
      {results.length > 0 && !loading && (
        <Box
          sx={{
            maxWidth: 900,
            margin: "0 auto 3rem auto",
            textAlign: "center",
          }}
        >
          <Paper
            elevation={1}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              backgroundColor: "#f8f9fa",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <FilterList sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" color="primary" sx={{ fontWeight: 500 }}>
                Filter Results
              </Typography>
            </Box>

            <FormGroup
              row
              sx={{
                justifyContent: "center",
                gap: { xs: 2, sm: 4 },
                flexWrap: "wrap",
              }}
            >
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ImageIcon fontSize="small" />
                    <Typography>Images ({resultCounts.image || 0})</Typography>
                  </Box>
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <VolumeUp fontSize="small" />
                    <Typography>Audio ({resultCounts.audio || 0})</Typography>
                  </Box>
                }
              />
            </FormGroup>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="textSecondary">
              Showing {filteredResults.length} of {results.length} results
            </Typography>
          </Paper>
        </Box>
      )}

      {/* No Results */}
      {!loading &&
        results.length === 0 &&
        (query || uploadedFile) &&
        !error && (
          <Box sx={{ textAlign: "center", py: { xs: 4, sm: 6 } }}>
            <Typography
              variant="h5"
              color="textSecondary"
              gutterBottom
              sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
            >
              No results found
            </Typography>
            <Typography
              variant="body1"
              color="textSecondary"
              sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              Try different keywords or upload a different file
            </Typography>
          </Box>
        )}

      {/* No Filtered Results */}
      {!loading && results.length > 0 && filteredResults.length === 0 && (
        <Box sx={{ textAlign: "center", py: { xs: 4, sm: 6 } }}>
          <Typography
            variant="h5"
            color="textSecondary"
            gutterBottom
            sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
          >
            No results match current filters
          </Typography>
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            Try enabling more filter options above
          </Typography>
        </Box>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ textAlign: "center", py: { xs: 4, sm: 6 } }}>
          <CircularProgress size={50} />
          <Typography
            variant="h6"
            color="textSecondary"
            sx={{
              mt: 2,
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Searching for top {numResults} results using{" "}
            {["text", "image", "audio"][searchMode]}...
          </Typography>
        </Box>
      )}

      {/* Results Grid - Now using filteredResults instead of results */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {filteredResults.map((result, index) => (
          <Grid item xs={12} sm={6} lg={4} key={index}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: { xs: 2, sm: 3 },
                boxShadow: { xs: 2, sm: 3 },
                "&:hover": {
                  boxShadow: { xs: 4, sm: 6 },
                  transform: "translateY(-2px)",
                },
                transition: "all 0.3s ease-in-out",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Image Display */}
              {result.file_type === "image" && (
                <>
                  <CardMedia
                    component="img"
                    image={`http://localhost:5001/static/${result.filename}`}
                    alt={formatFilename(result.filename)}
                    sx={{
                      height: { xs: 180, sm: 200 },
                      objectFit: "cover",
                      backgroundColor: "#f5f5f5",
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <ImageIcon color="primary" fontSize="small" />
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        IMAGE
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      noWrap
                      title={result.filename}
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                    >
                      {formatFilename(result.filename)}
                    </Typography>
                  </CardContent>
                </>
              )}

              {/* Audio Display */}
              {result.file_type === "audio" && (
                <>
                  <Box
                    sx={{
                      p: { xs: 2, sm: 3 },
                      background:
                        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                      minHeight: { xs: 180, sm: 200 },
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        mb: 2,
                        fontSize: { xs: 48, sm: 64 },
                        background:
                          "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))",
                      }}
                    >
                      🎵
                    </Box>
                    <audio
                      controls
                      style={{
                        width: "100%",
                        marginBottom: 8,
                        borderRadius: 8,
                        backgroundColor: "rgba(255,255,255,0.9)",
                      }}
                    >
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
                      Your browser does not support the audio element.
                    </audio>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <VolumeUp color="secondary" fontSize="small" />
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        AUDIO
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      noWrap
                      title={result.filename}
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                    >
                      {formatFilename(result.filename)}
                    </Typography>
                  </CardContent>
                </>
              )}

              {/* Similarity Score */}
              <Box
                sx={{
                  position: "absolute",
                  top: { xs: 6, sm: 8 },
                  right: { xs: 6, sm: 8 },
                  zIndex: 2,
                }}
              >
                <Chip
                  label={`${(result.similarity_score * 100).toFixed(0)}%`}
                  color="primary"
                  size="small"
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "rgba(25, 118, 210, 0.9)",
                    color: "white",
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  }}
                />
              </Box>

              {/* Rank Badge */}
              <Box
                sx={{
                  position: "absolute",
                  top: { xs: 6, sm: 8 },
                  left: { xs: 6, sm: 8 },
                  zIndex: 2,
                }}
              >
                <Chip
                  label={`#${result.rank}`}
                  variant="outlined"
                  size="small"
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.9)",
                    fontWeight: "bold",
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  }}
                />
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footer */}
      {results.length > 0 && (
        <Box
          sx={{
            textAlign: "center",
            mt: { xs: 4, sm: 6 },
            pt: { xs: 2, sm: 3 },
            borderTop: "1px solid #eee",
          }}
        >
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
          >
            Powered by CLIP + Wav2CLIP multimodal embeddings
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Search;
