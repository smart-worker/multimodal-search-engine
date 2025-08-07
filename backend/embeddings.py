import numpy as np
import torch
from PIL import Image
import librosa

def load_audio(file_path, target_sr=22050):
    """Enhanced audio loading with proper resampling and normalization"""
    waveform, sr = librosa.load(file_path, sr=None)
    if sr != target_sr:
        waveform = librosa.resample(waveform, orig_sr=sr, target_sr=target_sr)
        sr = target_sr
    max_abs_value = np.max(np.abs(waveform))
    if max_abs_value > 0:
        waveform = waveform / max_abs_value
    return waveform, sr

def get_image_embedding(image_path):
    """Generates a single image embedding using CLIP"""
    from models import CLIP_MODEL, CLIP_PROCESSOR
    
    print(f"🖼️  Generating embedding for image: {image_path}")
    
    if CLIP_PROCESSOR is None or CLIP_MODEL is None:
        print("❌ CLIP models not loaded.")
        import models
        models.load_models()
        if CLIP_PROCESSOR is None or CLIP_MODEL is None:
            return None
    
    try:
        image = Image.open(image_path).convert("RGB")
        inputs = CLIP_PROCESSOR(images=image, return_tensors="pt")
        
        with torch.no_grad():
            image_features = CLIP_MODEL.get_image_features(pixel_values=inputs.pixel_values)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        
        embedding = image_features.squeeze().cpu().numpy()
        print(f"✅ Generated image embedding with shape: {embedding.shape}")
        
        return embedding
        
    except Exception as e:
        print(f"❌ Error generating image embedding for {image_path}: {e}")
        import traceback
        traceback.print_exc()
        return None

def get_audio_embedding(audio_path):
    """Generates audio embedding using CLAP (CLIP-compatible)"""
    from models import CLAP_MODEL
    
    print(f"🎵 Generating CLAP embedding for audio: {audio_path}")
    
    if CLAP_MODEL is None:
        print("❌ CLAP model not loaded")
        return None
    
    try:
        # Check which CLAP implementation we're using
        if hasattr(CLAP_MODEL, 'get_audio_embeddings'):
            # msclap implementation
            audio_embeddings = CLAP_MODEL.get_audio_embeddings([audio_path])
            embedding = audio_embeddings[0]
            
        elif hasattr(CLAP_MODEL, 'get_audio_embedding_from_filelist'):
            # laion-clap implementation
            audio_embeddings = CLAP_MODEL.get_audio_embedding_from_filelist([audio_path], use_tensor=False)
            embedding = audio_embeddings[0]
            
        else:
            print("❌ Unknown CLAP model implementation")
            return None
        
        # Convert to numpy if needed
        if isinstance(embedding, torch.Tensor):
            embedding = embedding.cpu().numpy()
        
        embedding = embedding.flatten()
        
        # Ensure 512 dimensions to match CLIP
        expected_dim = 512
        if embedding.shape[0] != expected_dim:
            if embedding.shape[0] > expected_dim:
                embedding = embedding[:expected_dim]
            else:
                padded = np.zeros(expected_dim, dtype=np.float32)
                padded[:embedding.shape[0]] = embedding
                embedding = padded
        
        # Normalize for cosine similarity
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        print(f"✅ Generated CLAP audio embedding with shape: {embedding.shape}")
        return embedding
        
    except Exception as e:
        print(f"❌ Error generating CLAP audio embedding for {audio_path}: {e}")
        import traceback
        traceback.print_exc()
        return None

def get_text_embedding(text):
    """Generates a text embedding using CLIP text encoder"""
    from models import CLIP_MODEL, CLIP_PROCESSOR
    
    print(f"📝 Generating embedding for text: '{text[:50]}...'")
    
    if CLIP_PROCESSOR is None or CLIP_MODEL is None:
        print("❌ CLIP models not loaded.")
        import models
        models.load_models()
        if CLIP_PROCESSOR is None or CLIP_MODEL is None:
            return None
    
    try:
        inputs = CLIP_PROCESSOR(text=[text], return_tensors="pt", padding=True, truncation=True)
        
        with torch.no_grad():
            text_features = CLIP_MODEL.get_text_features(
                input_ids=inputs.input_ids,
                attention_mask=inputs.attention_mask
            )
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        
        embedding = text_features.squeeze().cpu().numpy()
        print(f"✅ Generated text embedding with shape: {embedding.shape}")
        
        return embedding
        
    except Exception as e:
        print(f"❌ Error generating text embedding for '{text}': {e}")
        import traceback
        traceback.print_exc()
        return None

def verify_embedding_compatibility():
    """Verify that all embedding types produce compatible vectors"""
    print("🔍 Verifying embedding compatibility...")
    
    try:
        test_text = "a dog barking"
        text_emb = get_text_embedding(test_text)
        
        if text_emb is not None:
            print(f"✅ Text embedding shape: {text_emb.shape}")
            print(f"   Text embedding norm: {np.linalg.norm(text_emb):.4f}")
        
        print("🎯 All embeddings should be 512-dimensional and normalized for proper cross-modal search")
        
    except Exception as e:
        print(f"❌ Error in compatibility check: {e}")
