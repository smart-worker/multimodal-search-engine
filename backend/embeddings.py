import numpy as np
import torch
from PIL import Image
import librosa
import wav2clip
from transformers import CLIPProcessor, CLIPModel

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
        # Load and process image
        image = Image.open(image_path).convert("RGB")
        inputs = CLIP_PROCESSOR(images=image, return_tensors="pt")
        
        with torch.no_grad():
            image_features = CLIP_MODEL.get_image_features(pixel_values=inputs.pixel_values)
            # Normalize for cosine similarity
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        
        embedding = image_features.squeeze().cpu().numpy()
        print(f"✅ Generated image embedding with shape: {embedding.shape}")
        
        return embedding
        
    except Exception as e:
        print(f"❌ Error generating image embedding for {image_path}: {e}")
        import traceback
        traceback.print_exc()
        return None

def get_audio_embedding(audio_path, target_sr=22050):
    """Generates a single audio embedding using Wav2CLIP"""
    print(f"🎵 Generating embedding for audio: {audio_path}")
    
    try:
        # Use enhanced audio loading function
        waveform, sample_rate = load_audio(audio_path, target_sr)
        
        # Load Wav2CLIP model
        model = wav2clip.get_model()
        
        # Generate embedding
        embedding = wav2clip.embed_audio(waveform, model)
        
        # Convert to numpy if it's a tensor
        if isinstance(embedding, torch.Tensor):
            embedding = embedding.cpu().numpy()
        
        # Ensure it's a flat array and normalize
        embedding = embedding.flatten()
        embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
        
        print(f"✅ Generated audio embedding with shape: {embedding.shape}")
        print(f"   Embedding norm: {np.linalg.norm(embedding):.4f}")
        
        return embedding
        
    except Exception as e:
        print(f"❌ Error generating audio embedding for {audio_path}: {e}")
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
            # Normalize for cosine similarity
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        
        embedding = text_features.squeeze().cpu().numpy()
        print(f"✅ Generated text embedding with shape: {embedding.shape}")
        
        return embedding
        
    except Exception as e:
        print(f"❌ Error generating text embedding for '{text}': {e}")
        import traceback
        traceback.print_exc()
        return None
