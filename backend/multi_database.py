import os
import pickle
import faiss
import numpy as np
from datetime import datetime

INDEX_FOLDER = "faiss_indexes"
os.makedirs(INDEX_FOLDER, exist_ok=True)

EMBEDDING_DIM = 512

def _index_paths(db_name):
    idx = os.path.join(INDEX_FOLDER, f"{db_name}.index")
    meta = os.path.join(INDEX_FOLDER, f"{db_name}_metadata.pkl")
    return idx, meta

def create_database(db_name):
    idx_path, meta_path = _index_paths(db_name)
    if os.path.exists(idx_path) or os.path.exists(meta_path):
        return False, "Database already exists"
    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    faiss.write_index(index, idx_path)
    metadata = {'file_paths': [], 'file_metadata': [], 'last_updated': datetime.now().isoformat()}
    with open(meta_path, 'wb') as f:
        pickle.dump(metadata, f)
    return True, "Database created"

def list_databases():
    db_names = []
    if not os.path.exists(INDEX_FOLDER):
        return []
    for fname in os.listdir(INDEX_FOLDER):
        if fname.endswith(".index"):
            db_names.append(fname.replace(".index", ""))
    return db_names

def load_faiss(db_name):
    idx_path, meta_path = _index_paths(db_name)
    if not os.path.exists(idx_path) or not os.path.exists(meta_path):
        return None, None, "Database not found"
    index = faiss.read_index(idx_path)
    with open(meta_path, "rb") as f:
        meta = pickle.load(f)
    return index, meta, None

def save_faiss(db_name, index, meta):
    idx_path, meta_path = _index_paths(db_name)
    faiss.write_index(index, idx_path)
    with open(meta_path, "wb") as f:
        pickle.dump(meta, f)

def add_embedding_to_db(db_name, file_path, embedding, file_type):
    index, meta, err = load_faiss(db_name)
    if err:
        return False, err
    emb = np.array(embedding, dtype=np.float32).reshape(1, -1)
    norm = np.linalg.norm(emb)
    if norm != 0:
        emb = emb / norm
    index.add(emb)
    meta['file_paths'].append(file_path)
    meta['file_metadata'].append({
        'file_path': file_path,
        'file_type': file_type,
        'filename': os.path.basename(file_path),
        'added_at': datetime.now().isoformat()
    })
    meta['last_updated'] = datetime.now().isoformat()
    save_faiss(db_name, index, meta)
    return True, "Added"

def search_in_db(db_name, embedding, num_results=5):
    index, meta, err = load_faiss(db_name)
    if err:
        return []
    emb = np.array(embedding, dtype=np.float32).reshape(1, -1)
    norm = np.linalg.norm(emb)
    if norm != 0:
        emb = emb / norm
    scores, indices = index.search(emb, min(num_results, index.ntotal))
    results = []
    for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
        if idx != -1 and idx < len(meta['file_paths']):
            meta_info = meta['file_metadata'][idx]
            results.append({
                'rank': i+1,
                'file_path': meta_info['file_path'],
                'filename': meta_info['filename'],
                'similarity_score': float(score),
                'file_type': meta_info.get('file_type', 'unknown')
            })
    return results

def db_info(db_name):
    idx_path, meta_path = _index_paths(db_name)
    try:
        index, meta, err = load_faiss(db_name)
        if err: return None
        return {
            "db_name": db_name,
            "ntotal": index.ntotal,
            "last_updated": meta["last_updated"],
            "num_files": len(meta["file_paths"]),
            "types": list(set([m.get("file_type") for m in meta['file_metadata']]))
        }
    except Exception:
        return None
