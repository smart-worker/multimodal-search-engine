import numpy as np
import faiss
import os
import pickle
import json
from datetime import datetime

# Global variables
faiss_index = None
file_paths = []  # List of file paths corresponding to embeddings
file_metadata = []  # Additional metadata for each file
EMBEDDING_DIM = 512
INDEX_FILE = "faiss_index.bin"
METADATA_FILE = "index_metadata.pkl"

def initialize_faiss_index():
    """Initializes the FAISS index if it doesn't exist."""
    global faiss_index
    if faiss_index is None:
        # Use Inner Product for normalized embeddings (equivalent to cosine similarity)
        faiss_index = faiss.IndexFlatIP(EMBEDDING_DIM)
        print(f"🔧 Initialized FAISS index with dimension {EMBEDDING_DIM}")

def save_index():
    """Save the FAISS index and metadata to disk"""
    try:
        if faiss_index is not None and faiss_index.ntotal > 0:
            faiss.write_index(faiss_index, INDEX_FILE)
            
            metadata = {
                'file_paths': file_paths,
                'file_metadata': file_metadata,
                'embedding_dim': EMBEDDING_DIM,
                'total_items': faiss_index.ntotal,
                'last_updated': datetime.now().isoformat()
            }
            
            with open(METADATA_FILE, 'wb') as f:
                pickle.dump(metadata, f)
            
            print(f"💾 Saved index with {faiss_index.ntotal} items")
        else:
            print("⚠️  No index to save or index is empty")
    except Exception as e:
        print(f"❌ Error saving index: {e}")

def load_index():
    """Load the FAISS index and metadata from disk"""
    global faiss_index, file_paths, file_metadata
    
    try:
        if os.path.exists(INDEX_FILE) and os.path.exists(METADATA_FILE):
            # Load FAISS index
            faiss_index = faiss.read_index(INDEX_FILE)
            
            # Load metadata
            with open(METADATA_FILE, 'rb') as f:
                metadata = pickle.load(f)
            
            file_paths = metadata.get('file_paths', [])
            file_metadata = metadata.get('file_metadata', [])
            
            print(f"📂 Loaded index with {faiss_index.ntotal} items")
            print(f"📅 Last updated: {metadata.get('last_updated', 'Unknown')}")
            
            return True
        else:
            print("📁 No existing index found, will create new one")
            return False
    except Exception as e:
        print(f"❌ Error loading index: {e}")
        return False

def add_embedding(file_path: str, embedding, file_type: str = "unknown", extra_metadata: dict = None):
    """
    Enhanced version with richer metadata support
    """
    initialize_faiss_index()
    
    try:
        # Convert embedding to numpy array if it isn't already
        if isinstance(embedding, list):
            embedding = np.array(embedding, dtype=np.float32)
        elif isinstance(embedding, np.ndarray):
            embedding = embedding.astype(np.float32)
        else:
            print(f"❌ Invalid embedding type: {type(embedding)}")
            return False
        
        # Ensure correct shape
        embedding = embedding.reshape(1, -1)
        
        # Verify dimension
        if embedding.shape[1] != EMBEDDING_DIM:
            print(f"❌ Embedding dimension mismatch. Expected {EMBEDDING_DIM}, got {embedding.shape[1]}")
            return False
        
        # Normalize embedding for cosine similarity
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        # Add to FAISS index
        faiss_index.add(embedding)
        
        # Enhanced metadata
        metadata = {
            'file_path': file_path,
            'file_type': file_type,
            'filename': os.path.basename(file_path),
            'added_at': datetime.now().isoformat(),
            'file_size': os.path.getsize(file_path) if os.path.exists(file_path) else 0
        }
        
        # Add extra metadata if provided
        if extra_metadata:
            metadata.update(extra_metadata)
        
        # Store metadata
        file_paths.append(file_path)
        file_metadata.append(metadata)
        
        print(f"✅ Added {os.path.basename(file_path)} to index (Total: {faiss_index.ntotal})")
        
        # Save every 5 additions for real-time scenarios
        if faiss_index.ntotal % 5 == 0:
            save_index()
        
        return True
        
    except Exception as e:
        print(f"❌ Error adding embedding: {e}")
        import traceback
        traceback.print_exc()
        return False


def search_similar(embedding, num_results: int = 5):
    """
    Searches for similar embeddings in the database using FAISS.
    Returns list of dictionaries with file info and similarity scores.
    """
    print(f"🔍 Searching for {num_results} similar items...")
    
    if faiss_index is None or faiss_index.ntotal == 0:
        print("📭 FAISS index is not initialized or is empty.")
        return []
    
    try:
        # Convert and normalize embedding
        if isinstance(embedding, list):
            embedding = np.array(embedding, dtype=np.float32)
        elif isinstance(embedding, np.ndarray):
            embedding = embedding.astype(np.float32)
        
        embedding = embedding.reshape(1, -1)
        
        # Normalize for cosine similarity
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        # Search
        scores, indices = faiss_index.search(embedding, min(num_results, faiss_index.ntotal))
        
        # Format results
        results = []
        for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
            if idx != -1 and idx < len(file_paths):  # Valid result
                result = {
                    'rank': i + 1,
                    'file_path': file_paths[idx],
                    'filename': os.path.basename(file_paths[idx]),
                    'similarity_score': float(score),
                    'file_type': file_metadata[idx].get('file_type', 'unknown') if idx < len(file_metadata) else 'unknown'
                }
                results.append(result)
        
        print(f"✅ Found {len(results)} similar items")
        return results
        
    except Exception as e:
        print(f"❌ Error during FAISS search: {e}")
        return []

def reset_index():
    """Reset the index (clear all data)"""
    global faiss_index, file_paths, file_metadata
    faiss_index = None
    file_paths = []
    file_metadata = []
    
    # Remove saved files
    for file in [INDEX_FILE, METADATA_FILE]:
        if os.path.exists(file):
            os.remove(file)
    
    print("🗑️  Index has been reset")

# Load existing index on module import
load_index()
