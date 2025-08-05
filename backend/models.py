import torch
from transformers import CLIPProcessor, CLIPModel
import wav2clip

# Global model variables
CLIP_MODEL = None
CLIP_PROCESSOR = None
WAV2CLIP_MODEL = None

def load_models():
    """Loads the CLIP and Wav2CLIP models"""
    global CLIP_MODEL, CLIP_PROCESSOR, WAV2CLIP_MODEL
    
    print("Loading CLIP and Wav2CLIP models...")

    # Load CLIP models
    try:
        print("Loading CLIP model...")
        CLIP_MODEL = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        CLIP_PROCESSOR = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        print("✅ CLIP models loaded successfully.")
        
        # Verify they're actually loaded
        print(f"CLIP_MODEL type: {type(CLIP_MODEL)}")
        print(f"CLIP_PROCESSOR type: {type(CLIP_PROCESSOR)}")
        
    except Exception as e:
        print(f"❌ Error loading CLIP models: {e}")
        CLIP_MODEL = None
        CLIP_PROCESSOR = None

    # Test Wav2CLIP availability (loaded on-demand in embeddings.py)
    try:
        print("Testing Wav2CLIP model availability...")
        test_model = wav2clip.get_model()
        WAV2CLIP_MODEL = "available"  # Just a flag
        print("✅ Wav2CLIP model available.")
        
    except Exception as e:
        print(f"❌ Error loading Wav2CLIP model: {e}")
        WAV2CLIP_MODEL = None

    print("Model loading process completed.")
    
    # Print final status for debugging
    print(f"Final status - CLIP_MODEL loaded: {CLIP_MODEL is not None}")
    print(f"Final status - CLIP_PROCESSOR loaded: {CLIP_PROCESSOR is not None}")
    print(f"Final status - WAV2CLIP_MODEL available: {WAV2CLIP_MODEL is not None}")

def get_model_status():
    """Returns the current status of loaded models"""
    return {
        "clip_loaded": CLIP_MODEL is not None and CLIP_PROCESSOR is not None,
        "wav2clip_loaded": WAV2CLIP_MODEL is not None
    }

# Load models when module is imported
print("models.py: Initializing models...")
load_models()
