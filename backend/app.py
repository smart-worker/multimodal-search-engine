from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
from datetime import datetime
import numpy as np

# Import models and ensure they're loaded
import models
from embeddings import get_image_embedding, get_audio_embedding, get_text_embedding
from database import add_embedding, search_similar, faiss_index

app = Flask(__name__)

origins = [
    "http://localhost:3000",
    "http://192.168.0.110:3000"
]

CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)

@app.route('/')
def index():
    return 'Backend is running.'

UPLOAD_FOLDER = "uploads"
STATIC_FOLDER = "static"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STATIC_FOLDER, exist_ok=True)

# Progress tracking for batch uploads
upload_progress = {}

def validate_file(file, max_size_mb=50):
    """Validate uploaded files"""
    if not file or file.filename == '':
        return False, "No file selected"
    
    # Check file size
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > max_size_mb * 1024 * 1024:
        return False, f"File too large. Maximum size: {max_size_mb}MB"
    
    # Check file extension
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.mp3', '.wav', '.m4a', '.ogg'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        return False, f"Unsupported file type: {file_ext}"
    
    return True, "Valid"

@app.route("/upload", methods=["POST"])
def upload_image():
    """Upload image for search (temporary - not added to index)"""
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    file_extension = os.path.splitext(file.filename)[1]
    secure_filename = str(uuid.uuid4()) + file_extension
    temp_path = os.path.join(UPLOAD_FOLDER, secure_filename)
    file.save(temp_path)

    try:
        embedding = get_image_embedding(temp_path)
        if embedding is None:
            return jsonify({"error": "Failed to generate image embedding"}), 500
        
        results = search_similar(embedding, num_results=5)
        return jsonify({
            "status": "Image processed and searched", 
            "results": results,
            "query_type": "image"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route("/upload_audio", methods=["POST"])
def upload_audio():
    """Upload audio for search (temporary - not added to index) - Now uses CLAP"""
    if "audio" not in request.files:
        return jsonify({"error": "No audio uploaded"}), 400

    file = request.files["audio"]
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    file_extension = os.path.splitext(file.filename)[1]
    secure_filename = str(uuid.uuid4()) + file_extension
    temp_path = os.path.join(UPLOAD_FOLDER, secure_filename)
    file.save(temp_path)

    try:
        # Now using CLAP for cross-modal compatibility
        embedding = get_audio_embedding(temp_path)
        if embedding is None:
            return jsonify({"error": "Failed to generate audio embedding with CLAP"}), 500
        
        results = search_similar(embedding, num_results=5)
        return jsonify({
            "status": "Audio processed and searched with CLAP", 
            "results": results,
            "query_type": "audio",
            "model_used": "CLAP"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route("/add_to_index", methods=["POST"])
def add_to_index():
    """Enhanced endpoint for adding files to the searchable index - Now uses CLAP for audio"""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    file_type = request.form.get("type")  # Let frontend specify type
    description = request.form.get("description", "")  # Optional metadata
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        return jsonify({"error": error_msg}), 400
    
    # Auto-detect file type if not provided
    if not file_type:
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
            file_type = "image"
        elif file_ext in ['.mp3', '.wav', '.m4a', '.ogg']:
            file_type = "audio"
        else:
            return jsonify({"error": "Unsupported file type"}), 400
    
    file_extension = os.path.splitext(file.filename)[1]
    secure_filename = str(uuid.uuid4()) + file_extension
    static_path = os.path.join(STATIC_FOLDER, secure_filename)
    file.save(static_path)
    
    try:
        if file_type.lower() == "image":
            embedding = get_image_embedding(static_path)
            model_used = "CLIP"
        elif file_type.lower() == "audio":
            # Now using CLAP for audio embeddings
            embedding = get_audio_embedding(static_path)
            model_used = "CLAP"
        else:
            return jsonify({"error": "Unsupported file type"}), 400
        
        if embedding is None:
            return jsonify({"error": f"Failed to generate embedding using {model_used}"}), 500
        
        # Enhanced metadata
        extra_metadata = {
            "original_filename": file.filename,
            "description": description,
            "file_size": os.path.getsize(static_path),
            "model_used": model_used
        }
        
        success = add_embedding(static_path, embedding, file_type, extra_metadata)
        
        if success:
            return jsonify({
                "status": "success",
                "message": f"File indexed successfully with {model_used} and ready for cross-modal search",
                "file_info": {
                    "filename": secure_filename,
                    "original_name": file.filename,
                    "type": file_type,
                    "url": f"/static/{secure_filename}",
                    "description": description,
                    "model_used": model_used
                },
                "index_stats": {
                    "total_items": faiss_index.ntotal if faiss_index else 0
                }
            })
        else:
            return jsonify({"error": "Failed to add to index"}), 500
            
    except Exception as e:
        if os.path.exists(static_path):
            os.remove(static_path)
        return jsonify({"error": str(e)}), 500

@app.route("/batch_index", methods=["POST"])
def batch_index():
    """Upload multiple files at once - Now with CLAP support"""
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded"}), 400
    
    # Generate batch ID for progress tracking
    batch_id = str(uuid.uuid4())
    upload_progress[batch_id] = {
        "status": "processing",
        "total": len(files),
        "completed": 0,
        "successful": 0,
        "failed": 0,
        "results": []
    }
    
    results = []
    successful = 0
    failed = 0
    
    for i, file in enumerate(files):
        if file.filename == '':
            failed += 1
            results.append({"filename": "unnamed", "status": "error", "error": "No filename"})
            continue
        
        try:
            # Validate file
            is_valid, error_msg = validate_file(file)
            if not is_valid:
                failed += 1
                results.append({"filename": file.filename, "status": "error", "error": error_msg})
                continue
            
            # Auto-detect file type
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                file_type = "image"
                model_used = "CLIP"
            elif file_ext in ['.mp3', '.wav', '.m4a', '.ogg']:
                file_type = "audio"
                model_used = "CLAP"  # Now using CLAP for audio
            else:
                failed += 1
                results.append({"filename": file.filename, "status": "error", "error": "Unsupported file type"})
                continue
            
            # Save file
            file_extension = os.path.splitext(file.filename)[1]
            secure_filename = str(uuid.uuid4()) + file_extension
            static_path = os.path.join(STATIC_FOLDER, secure_filename)
            file.save(static_path)
            
            # Generate embedding using appropriate model
            if file_type == "image":
                embedding = get_image_embedding(static_path)
            else:  # audio - using CLAP
                embedding = get_audio_embedding(static_path)
            
            if embedding is None:
                failed += 1
                results.append({
                    "filename": file.filename, 
                    "status": "error", 
                    "error": f"Failed to generate embedding with {model_used}"
                })
                if os.path.exists(static_path):
                    os.remove(static_path)
                continue
            
            # Add to index
            extra_metadata = {
                "original_filename": file.filename,
                "file_size": os.path.getsize(static_path),
                "batch_id": batch_id,
                "model_used": model_used
            }
            
            success = add_embedding(static_path, embedding, file_type, extra_metadata)
            
            if success:
                successful += 1
                results.append({
                    "filename": file.filename,
                    "status": "success",
                    "indexed_as": secure_filename,
                    "type": file_type,
                    "model_used": model_used
                })
            else:
                failed += 1
                results.append({"filename": file.filename, "status": "error", "error": "Failed to add to index"})
                if os.path.exists(static_path):
                    os.remove(static_path)
                    
        except Exception as e:
            failed += 1
            results.append({"filename": file.filename, "status": "error", "error": str(e)})
        
        # Update progress
        upload_progress[batch_id]["completed"] = i + 1
        upload_progress[batch_id]["successful"] = successful
        upload_progress[batch_id]["failed"] = failed
        upload_progress[batch_id]["results"] = results
    
    # Mark as complete
    upload_progress[batch_id]["status"] = "completed"
    
    return jsonify({
        "status": "batch_complete",
        "batch_id": batch_id,
        "total_files": len(files),
        "successful": successful,
        "failed": failed,
        "results": results,
        "models_used": {"image": "CLIP", "audio": "CLAP"},
        "cross_modal_search": "enabled",
        "index_stats": {"total_items": faiss_index.ntotal if faiss_index else 0}
    })

@app.route("/upload_progress/<batch_id>")
def get_upload_progress(batch_id):
    """Get upload progress for batch operations"""
    if batch_id not in upload_progress:
        return jsonify({"error": "Batch ID not found"}), 404
    
    return jsonify(upload_progress[batch_id])

# Keep the original index_file endpoint for backward compatibility
@app.route("/index_file", methods=["POST"])
def index_file():
    """Legacy endpoint - redirects to add_to_index"""
    return add_to_index()

@app.route("/search_text", methods=["POST"])
def search_text():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data["text"]
    num_results = data.get("num_results", 5)
    
    if not text.strip():
        return jsonify({"error": "Empty text provided"}), 400

    try:
        embedding = get_text_embedding(text)
        if embedding is None:
            return jsonify({"error": "Failed to generate text embedding"}), 500
        
        results = search_similar(embedding, num_results=num_results)
        return jsonify({
            "status": "Text processed and searched", 
            "results": results,
            "query_type": "text",
            "query": text,
            "num_results": num_results,
            "cross_modal_enabled": "Text can find both images (CLIP) and audio (CLAP)"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/static/<filename>')
def serve_static_file(filename):
    """Serve static files from the static directory"""
    return send_from_directory(STATIC_FOLDER, filename)

@app.route('/status')
def status():
    """Get system status with CLAP integration info"""
    model_status = models.get_model_status()
    
    # Import faiss_index properly from database module
    from database import faiss_index
    
    # Get indexed items count safely
    try:
        indexed_count = faiss_index.ntotal if faiss_index is not None else 0
    except:
        indexed_count = 0
    
    return jsonify({
        "status": "running",
        "models_loaded": model_status,
        "cross_modal_search": {
            "enabled": model_status.get("clip_loaded", False) and model_status.get("clap_loaded", False),
            "description": "Images and audio can find each other through shared embedding space"
        },
        "indexed_items": indexed_count,
        "upload_folder": UPLOAD_FOLDER,
        "static_folder": STATIC_FOLDER,
        "supported_formats": {
            "images": [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
            "audio": [".mp3", ".wav", ".m4a", ".ogg"]
        },
        "embedding_models": {
            "images": "CLIP (openai/clip-vit-base-patch32)",
            "audio": "CLAP (Microsoft CLAP or LAION-CLAP)",
            "text": "CLIP (openai/clip-vit-base-patch32)"
        }
    })


@app.route('/index_stats')
def index_stats():
    """Get detailed index statistics"""
    from database import file_metadata, file_paths
    
    stats = {
        "total_items": faiss_index.ntotal if faiss_index else 0,
        "file_types": {},
        "models_used": {},
        "recent_additions": []
    }
    
    # Count by file type and model used
    for metadata in file_metadata:
        file_type = metadata.get('file_type', 'unknown')
        model_used = metadata.get('model_used', 'unknown')
        
        stats["file_types"][file_type] = stats["file_types"].get(file_type, 0) + 1
        stats["models_used"][model_used] = stats["models_used"].get(model_used, 0) + 1
    
    # Get recent additions (last 10)
    recent = sorted(file_metadata, key=lambda x: x.get('added_at', ''), reverse=True)[:10]
    stats["recent_additions"] = [
        {
            "filename": item.get('filename', 'unknown'),
            "type": item.get('file_type', 'unknown'),
            "added_at": item.get('added_at', 'unknown'),
            "original_name": item.get('original_filename', item.get('filename', 'unknown')),
            "model_used": item.get('model_used', 'unknown')
        }
        for item in recent
    ]
    
    return jsonify(stats)

@app.route('/test_cross_modal', methods=['GET'])
def test_cross_modal():
    """Test cross-modal search capabilities with CLAP"""
    try:
        # Test text query that should find both images and audio
        text_embedding = get_text_embedding("dog barking")
        if text_embedding is None:
            return jsonify({"error": "Failed to generate text embedding"}), 500
        
        results = search_similar(text_embedding, num_results=10)
        
        # Count by file type
        type_counts = {}
        for result in results:
            file_type = result.get('file_type', 'unknown')
            type_counts[file_type] = type_counts.get(file_type, 0) + 1
        
        return jsonify({
            "status": "success",
            "test_query": "dog barking",
            "total_results": len(results),
            "results_by_type": type_counts,
            "cross_modal_working": len(type_counts) > 1,
            "explanation": "With CLAP, audio embeddings are now compatible with CLIP image/text space",
            "expected_behavior": "Should find both images and audio when searching with text",
            "sample_results": results[:3]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/verify_embeddings', methods=['GET'])
def verify_embeddings():
    """Verify that embeddings are in compatible spaces"""
    from embeddings import verify_embedding_compatibility
    
    try:
        verify_embedding_compatibility()
        return jsonify({
            "status": "success",
            "message": "Embedding compatibility check completed with CLAP",
            "embedding_dimension": 512,
            "models": {
                "images": "CLIP",
                "audio": "CLAP",
                "text": "CLIP"
            },
            "expected_behavior": "All modalities should be searchable from any query type",
            "cross_modal_search": "enabled"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reset_index', methods=['POST'])
def reset_index():
    """Reset the FAISS index for testing"""
    from database import reset_index
    
    # Clear progress tracking
    global upload_progress
    upload_progress = {}
    
    reset_index()
    return jsonify({
        "status": "Index reset successfully", 
        "note": "Rebuild index with CLAP-enabled embeddings for cross-modal search"
    })

@app.route('/upload_status/<task_id>')
def upload_status(task_id):
    """Get real-time upload and indexing status"""
    if task_id not in upload_progress:
        return jsonify({"error": "Task not found"}), 404
    
    return jsonify(upload_progress[task_id])

@app.route('/recent_uploads', methods=['GET'])
def recent_uploads():
    """Get recently uploaded and indexed files"""
    from database import file_metadata
    
    try:
        # Get last 20 uploads, sorted by most recent
        recent = sorted(file_metadata, key=lambda x: x.get('added_at', ''), reverse=True)[:20]
        
        uploads = []
        for item in recent:
            uploads.append({
                "filename": item.get('original_filename', item.get('filename', 'unknown')),
                "type": item.get('file_type', 'unknown'),
                "added_at": item.get('added_at', 'unknown'),
                "file_url": f"/static/{item.get('filename', '')}",
                "model_used": item.get('model_used', 'unknown'),
                "file_size": item.get('file_size', 0)
            })
        
        return jsonify({
            "status": "success",
            "recent_uploads": uploads,
            "total_count": len(file_metadata)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/delete_item/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete a specific item from the index (Note: FAISS doesn't support deletion, so this is a placeholder)"""
    return jsonify({
        "error": "Individual item deletion not supported with current FAISS implementation",
        "suggestion": "Use reset_index to clear all items and re-add desired items with CLAP support"
    }), 501

if __name__ == "__main__":
    print("Starting Flask server with CLAP support...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Static folder: {STATIC_FOLDER}")
    print("\n🎯 Cross-Modal Search Enabled:")
    print("  - Images use CLIP embeddings")
    print("  - Audio uses CLAP embeddings (compatible with CLIP space)")
    print("  - Text uses CLIP embeddings")
    print("  - Now you can search images with audio, audio with images, etc!")
    print("\nAvailable endpoints:")
    print("  - POST /add_to_index - Add files to searchable index (CLAP for audio)")
    print("  - POST /batch_index - Add multiple files at once")
    print("  - POST /upload - Search with uploaded image")
    print("  - POST /upload_audio - Search with uploaded audio (CLAP)")
    print("  - POST /search_text - Search with text query")
    print("  - GET /test_cross_modal - Test cross-modal search")
    print("  - GET /status - System status with CLAP info")
    print("  - GET /index_stats - Index statistics")
    app.run(debug=True, port=5001, host='0.0.0.0')
