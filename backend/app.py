from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid

# Import models and ensure they're loaded
import models
from embeddings import get_image_embedding, get_audio_embedding, get_text_embedding
from database import add_embedding, search_similar

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

@app.route("/upload", methods=["POST"])
def upload_image():
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
        embedding = get_audio_embedding(temp_path)
        if embedding is None:
            return jsonify({"error": "Failed to generate audio embedding"}), 500
        
        results = search_similar(embedding, num_results=5)
        return jsonify({
            "status": "Audio processed and searched", 
            "results": results,
            "query_type": "audio"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route("/index_file", methods=["POST"])
def index_file():
    """Index files (images/audio) into the database for future searches"""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    file_type = request.form.get("type", "image")
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    file_extension = os.path.splitext(file.filename)[1]
    secure_filename = str(uuid.uuid4()) + file_extension
    static_path = os.path.join(STATIC_FOLDER, secure_filename)
    file.save(static_path)
    
    try:
        if file_type.lower() == "image":
            embedding = get_image_embedding(static_path)
        elif file_type.lower() == "audio":
            embedding = get_audio_embedding(static_path)
        else:
            return jsonify({"error": "Unsupported file type"}), 400
        
        if embedding is None:
            return jsonify({"error": "Failed to generate embedding"}), 500
        
        add_embedding(static_path, embedding, file_type)
        
        return jsonify({
            "status": "File indexed successfully",
            "file_path": static_path,
            "file_type": file_type
        })
    except Exception as e:
        if os.path.exists(static_path):
            os.remove(static_path)
        return jsonify({"error": str(e)}), 500

@app.route("/search_text", methods=["POST"])
def search_text():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data["text"]
    num_results = data.get("num_results", 5)  # Get num_results from request
    
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
            "num_results": num_results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/static/<filename>')
def serve_static_file(filename):
    """Serve static files from the static directory"""
    return send_from_directory(STATIC_FOLDER, filename)

@app.route('/status')
def status():
    """Get system status"""
    from database import faiss_index
    
    return jsonify({
        "status": "running",
        "models_loaded": {
            "clip": models.CLIP_MODEL is not None and models.CLIP_PROCESSOR is not None,
            "wav2clip": models.WAV2CLIP_MODEL is not None
        },
        "indexed_items": faiss_index.ntotal if faiss_index else 0
    })

@app.route('/reset_index', methods=['POST'])
def reset_index():
    """Reset the FAISS index for testing"""
    from database import reset_index
    reset_index()
    return jsonify({"status": "Index reset successfully"})

if __name__ == "__main__":
    print("Starting Flask server...")
    app.run(debug=True, port=5001, host='0.0.0.0')
