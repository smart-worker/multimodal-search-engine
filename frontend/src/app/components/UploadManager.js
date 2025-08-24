"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Box,
  Grid,
  Chip,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Fade,
  Zoom,
  Avatar,
  Stack,
  Divider,
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  CheckCircle,
  Error,
  Image,
  AudioFile,
  Refresh,
  FileUpload,
  Psychology,
  Speed,
} from "@mui/icons-material";

// Backend URL constant
const BACKEND_URL = "http://localhost:5001";

const UploadManager = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Drag and drop handlers
  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");
      return isImage || isAudio;
    });

    setFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: "pending",
        type: file.type.startsWith("image/") ? "image" : "audio",
        progress: 0,
      })),
    ]);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const fileObj of files) {
      try {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileObj.id ? { ...f, status: "uploading", progress: 0 } : f
          )
        );

        const formData = new FormData();
        formData.append("file", fileObj.file);
        formData.append("type", fileObj.type);
        formData.append("description", "");

        const response = await fetch(`${BACKEND_URL}/add_to_index`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id
                ? {
                    ...f,
                    status: "success",
                    progress: 100,
                    result: result,
                  }
                : f
            )
          );
          successCount++;
        } else {
          const error = await response.json();
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id
                ? {
                    ...f,
                    status: "error",
                    progress: 0,
                    error: error.error,
                  }
                : f
            )
          );
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileObj.id
              ? {
                  ...f,
                  status: "error",
                  progress: 0,
                  error: error.message,
                }
              : f
          )
        );
      }
    }

    setUploading(false);
    fetchRecentUploads();

    if (
      onUploadSuccess &&
      typeof onUploadSuccess === "function" &&
      successCount > 0
    ) {
      try {
        await onUploadSuccess();
      } catch (error) {
        console.error("Error refreshing status:", error);
      }
    }
  };

  const fetchRecentUploads = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/recent_uploads`);
      if (response.ok) {
        const data = await response.json();
        setRecentUploads(data.recent_uploads || []);
      }
    } catch (error) {
      console.error("Error fetching recent uploads:", error);
    }
  };

  React.useEffect(() => {
    fetchRecentUploads();
  }, []);

  const getFileIcon = (type) => {
    return type === "image" ? <Image /> : <AudioFile />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "uploading":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      {/* Hero Section */}
      <Card
        sx={{
          mb: 4,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          overflow: "visible",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                mr: 2,
                width: 56,
                height: 56,
              }}
            >
              <FileUpload sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Upload & Index Files
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Transform your media into searchable AI-powered content
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Psychology sx={{ mr: 1, opacity: 0.8 }} />
              <Typography variant="body2">AI-Powered Indexing</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Speed sx={{ mr: 1, opacity: 0.8 }} />
              <Typography variant="body2">Instant Searchability</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Zoom in timeout={500}>
        <Card sx={{ mb: 4, overflow: "visible" }}>
          <CardContent sx={{ p: 4 }}>
            <Paper
              elevation={dragOver ? 8 : 0}
              sx={{
                p: 8,
                textAlign: "center",
                border: dragOver ? "3px dashed #1976d2" : "2px dashed #e0e0e0",
                borderRadius: 3,
                background: dragOver
                  ? "linear-gradient(45deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.1) 100%)"
                  : "linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: dragOver ? "scale(1.02)" : "scale(1)",
                "&:hover": {
                  borderColor: "#1976d2",
                  transform: "scale(1.01)",
                  boxShadow: "0 8px 25px rgba(25, 118, 210, 0.15)",
                },
              }}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Zoom in timeout={300}>
                <CloudUpload
                  sx={{
                    fontSize: 80,
                    color: dragOver ? "#1976d2" : "#bdbdbd",
                    mb: 3,
                    transition: "all 0.3s ease",
                  }}
                />
              </Zoom>

              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: dragOver ? "#1976d2" : "#424242",
                  transition: "color 0.3s ease",
                }}
              >
                {dragOver
                  ? "Drop your files here!"
                  : "Drag & Drop or Click to Upload"}
              </Typography>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 2, fontSize: "1.1rem" }}
              >
                Upload images and audio to make them searchable with AI
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  icon={<Image />}
                  label="JPG, PNG, GIF, BMP"
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
                <Chip
                  icon={<AudioFile />}
                  label="MP3, WAV, M4A, OGG"
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
              </Box>
            </Paper>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*"
              onChange={(e) => handleFiles(Array.from(e.target.files))}
              style={{ display: "none" }}
            />
          </CardContent>
        </Card>
      </Zoom>

      {/* File List */}
      {files.length > 0 && (
        <Fade in timeout={500}>
          <Card sx={{ mb: 4, borderRadius: 3, overflow: "visible" }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Typography variant="h5" fontWeight="600" sx={{ flexGrow: 1 }}>
                  Ready to Upload ({files.length} files)
                </Typography>
                <Chip
                  label={`${
                    files.filter((f) => f.status === "success").length
                  } processed`}
                  color="success"
                  variant="outlined"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                {files.map((fileObj, index) => (
                  <Fade in timeout={200 * (index + 1)} key={fileObj.id}>
                    <Paper
                      elevation={1}
                      sx={{
                        mb: 2,
                        p: 3,
                        borderRadius: 2,
                        borderLeft: `4px solid ${
                          fileObj.status === "success"
                            ? "#4caf50"
                            : fileObj.status === "error"
                            ? "#f44336"
                            : fileObj.status === "uploading"
                            ? "#2196f3"
                            : "#e0e0e0"
                        }`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 3,
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar
                          sx={{
                            mr: 2,
                            bgcolor:
                              fileObj.type === "image" ? "#e3f2fd" : "#fff3e0",
                            color:
                              fileObj.type === "image" ? "#1976d2" : "#f57c00",
                          }}
                        >
                          {getFileIcon(fileObj.type)}
                        </Avatar>

                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" fontWeight="600">
                            {fileObj.file.name}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mt: 0.5,
                            }}
                          >
                            <Chip
                              label={fileObj.type}
                              size="small"
                              variant="outlined"
                              color={
                                fileObj.type === "image" ? "primary" : "warning"
                              }
                            />
                            <Typography variant="body2" color="text.secondary">
                              {formatFileSize(fileObj.file.size)}
                            </Typography>
                          </Box>

                          {fileObj.status === "uploading" && (
                            <Box sx={{ mt: 2 }}>
                              <LinearProgress
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: "rgba(25, 118, 210, 0.1)",
                                }}
                              />
                              <Typography
                                variant="caption"
                                color="primary"
                                sx={{ mt: 0.5, display: "block" }}
                              >
                                Processing with AI models...
                              </Typography>
                            </Box>
                          )}

                          {fileObj.status === "error" && (
                            <Alert
                              severity="error"
                              sx={{ mt: 2, borderRadius: 2 }}
                            >
                              {fileObj.error}
                            </Alert>
                          )}
                        </Box>

                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {fileObj.status === "success" && (
                            <Zoom in>
                              <CheckCircle
                                color="success"
                                sx={{ fontSize: 28 }}
                              />
                            </Zoom>
                          )}
                          {fileObj.status === "error" && (
                            <Error color="error" sx={{ fontSize: 28 }} />
                          )}
                          {fileObj.status === "pending" && (
                            <IconButton
                              onClick={() => removeFile(fileObj.id)}
                              sx={{
                                color: "error.main",
                                "&:hover": {
                                  bgcolor: "error.light",
                                  color: "white",
                                },
                              }}
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Fade>
                ))}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Button
                  onClick={() => setFiles([])}
                  disabled={uploading}
                  color="secondary"
                  startIcon={<Delete />}
                  sx={{ borderRadius: 2 }}
                >
                  Clear All
                </Button>
                <Button
                  variant="contained"
                  onClick={uploadFiles}
                  disabled={uploading || files.length === 0}
                  startIcon={<CloudUpload />}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    background:
                      "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                    "&:hover": {
                      background:
                        "linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)",
                    },
                  }}
                >
                  {uploading ? "Processing..." : `Upload ${files.length} Files`}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* Success Message */}
      {files.some((f) => f.status === "success") && (
        <Fade in>
          <Alert
            severity="success"
            sx={{
              mb: 4,
              borderRadius: 2,
              fontSize: "1.1rem",
              "& .MuiAlert-icon": { fontSize: 28 },
            }}
          >
            🎉 Files successfully indexed! They&apos;re now searchable using
            text, images, or audio queries.
          </Alert>
        </Fade>
      )}

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <Fade in timeout={800}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h5" fontWeight="600">
                  Recent Uploads
                </Typography>
                <Button
                  onClick={fetchRecentUploads}
                  startIcon={<Refresh />}
                  sx={{ borderRadius: 2 }}
                >
                  Refresh
                </Button>
              </Box>

              <Grid container spacing={3}>
                {recentUploads.slice(0, 12).map((upload, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Zoom in timeout={200 * (index + 1)}>
                      <Paper
                        sx={{
                          borderRadius: 3,
                          overflow: "hidden",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: 6,
                          },
                        }}
                      >
                        {/* Thumbnail/Preview */}
                        <Box
                          sx={{
                            height: 120,
                            bgcolor: "#f5f5f5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {upload.type === "image" ? (
                            <img
                              src={`${BACKEND_URL}${upload.file_url}`}
                              alt={upload.filename}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <AudioFile
                              sx={{ fontSize: 48, color: "#f57c00" }}
                            />
                          )}
                        </Box>

                        {/* Content */}
                        <Box sx={{ p: 2 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight="600"
                            sx={{ mb: 1 }}
                            noWrap
                            title={upload.filename}
                          >
                            {upload.filename}
                          </Typography>

                          <Box sx={{ display: "flex", gap: 0.5, mb: 1.5 }}>
                            <Chip
                              label={upload.type}
                              size="small"
                              color={
                                upload.type === "image" ? "primary" : "warning"
                              }
                            />
                            <Chip
                              label={upload.model_used}
                              size="small"
                              variant="outlined"
                            />
                          </Box>

                          <Typography variant="caption" color="text.secondary">
                            {new Date(upload.added_at).toLocaleDateString()} at{" "}
                            {new Date(upload.added_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Typography>
                        </Box>
                      </Paper>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>

              {recentUploads.length > 12 && (
                <Box sx={{ textAlign: "center", mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing 12 of {recentUploads.length} uploads
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Fade>
      )}
    </Box>
  );
};

export default UploadManager;
