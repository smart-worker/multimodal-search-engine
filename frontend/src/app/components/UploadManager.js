import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Image,
  Music,
  FileText,
} from "lucide-react";

const BACKEND_URL = "http://localhost:5001";
const UploadManager = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [recentUploads, setRecentUploads] = useState([]);
  const fileInputRef = useRef(null);

  // Drag and drop handlers
  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

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
        // Update status to uploading
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

          // ✅ ENHANCED: Update status after each successful upload
          if (onUploadSuccess) {
            onUploadSuccess();
          }
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

    // ✅ Final status refresh (in case any uploads were missed)
    if (onUploadSuccess && successCount > 0) {
      onUploadSuccess();
    }
  };

  const fetchRecentUploads = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/recent_uploads`);
      if (response.ok) {
        const data = await response.json();
        setRecentUploads(data.recent_uploads);
      }
    } catch (error) {
      console.error("Error fetching recent uploads:", error);
    }
  };

  // Fetch recent uploads on component mount
  React.useEffect(() => {
    fetchRecentUploads();
  }, []);

  const getFileIcon = (type) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "audio":
        return <Music className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "uploading":
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Upload & Index Files
          </h2>
          <p className="text-gray-600 mt-1">
            Upload images and audio files to add them to your searchable index
          </p>
        </div>

        {/* Upload Area */}
        <div className="p-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors"
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-lg text-gray-600">
                Drop files here or{" "}
                <span className="text-blue-600 hover:text-blue-500 cursor-pointer">
                  browse
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports: JPG, PNG, GIF, MP3, WAV, M4A, OGG
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*"
            onChange={(e) => handleFiles(Array.from(e.target.files))}
            className="hidden"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Files to Upload
            </h3>
            <div className="space-y-3">
              {files.map((fileObj) => (
                <div
                  key={fileObj.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(fileObj.type)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {fileObj.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {fileObj.type} •{" "}
                        {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(fileObj.status)}
                    {fileObj.status === "pending" && (
                      <button
                        onClick={() => removeFile(fileObj.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => setFiles([])}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={uploading}
              >
                Clear All
              </button>
              <button
                onClick={uploadFiles}
                disabled={uploading || files.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : `Upload ${files.length} Files`}
              </button>
            </div>
          </div>
        )}

        {/* Recent Uploads */}
        {recentUploads.length > 0 && (
          <div className="border-t border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Uploads
                </h3>
                <button
                  onClick={fetchRecentUploads}
                  className="text-blue-600 hover:text-blue-500 text-sm"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentUploads.map((upload, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      {getFileIcon(upload.type)}
                      <p className="font-medium text-gray-900 truncate">
                        {upload.filename}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">
                      Model: {upload.model_used}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(upload.added_at).toLocaleString()}
                    </p>
                    {upload.type === "image" && (
                      <img
                        src={upload.file_url}
                        alt={upload.filename}
                        className="mt-2 w-full h-20 object-cover rounded"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadManager;
