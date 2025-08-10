import React, { useState } from "react";
import { Search, Upload, Image, Music, FileText } from "lucide-react";

const SearchInterface = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("text");

  const handleTextSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/search_text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: searchQuery,
          num_results: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSearch = async (file, endpoint) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append(searchType, file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Multi-Modal Search
          </h2>
          <p className="text-gray-600 mt-1">
            Search your indexed content using text, images, or audio
          </p>
        </div>

        <div className="p-6">
          {/* Search Type Selector */}
          <div className="flex space-x-4 mb-6">
            {["text", "image", "audio"].map((type) => (
              <button
                key={type}
                onClick={() => setSearchType(type)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  searchType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} Search
              </button>
            ))}
          </div>

          {/* Text Search */}
          {searchType === "text" && (
            <div className="flex space-x-2 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleTextSearch()}
                placeholder="Search for images and audio using text..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleTextSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          )}

          {/* File Search */}
          {(searchType === "image" || searchType === "audio") && (
            <div className="mb-6">
              <input
                type="file"
                accept={searchType === "image" ? "image/*" : "audio/*"}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const endpoint =
                      searchType === "image" ? "/upload" : "/upload_audio";
                    handleFileSearch(file, endpoint);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Search Results ({searchResults.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(result.file_type)}
                        <span className="text-sm font-medium text-gray-900">
                          {result.filename}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        #{result.rank}
                      </span>
                    </div>

                    <div className="mb-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${result.similarity_score * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Similarity: {(result.similarity_score * 100).toFixed(1)}
                        %
                      </p>
                    </div>

                    {result.file_type === "image" && (
                      <img
                        src={result.file_path.replace("static/", "/static/")}
                        alt={result.filename}
                        className="w-full h-24 object-cover rounded"
                      />
                    )}

                    {result.file_type === "audio" && (
                      <audio
                        controls
                        className="w-full mt-2"
                        src={result.file_path.replace("static/", "/static/")}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;
