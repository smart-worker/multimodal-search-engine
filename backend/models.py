import torch
from transformers import CLIPProcessor, CLIPModel

# Global model variables
CLIP_MODEL = None
CLIP_PROCESSOR = None
CLAP_MODEL = None

def load_models():
    """Loads the CLIP and CLAP models"""
    global CLIP_MODEL, CLIP_PROCESSOR, CLAP_MODEL
    
    print("Loading CLIP and CLAP models...")

    # Load CLIP models
    try:
        print("Loading CLIP model...")
        CLIP_MODEL = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        CLIP_PROCESSOR = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        print("✅ CLIP models loaded successfully.")
        
    except Exception as e:
        print(f"❌ Error loading CLIP models: {e}")
        CLIP_MODEL = None
        CLIP_PROCESSOR = None

    # Load CLAP model
    try:
        print("Loading CLAP model...")
        
        # Try msclap first (Microsoft CLAP implementation)
        try:
            from msclap import CLAP
            CLAP_MODEL = CLAP(version='2023', use_cuda=torch.cuda.is_available())
            print("✅ CLAP model (msclap) loaded successfully.")
            
        except ImportError:
            print("msclap not available, trying laion-clap...")
            
            # Fallback to laion-clap
            try:
                import laion_clap
                CLAP_MODEL = laion_clap.CLAP_Module(enable_fusion=False)
                CLAP_MODEL.load_ckpt()  # Load pre-trained weights
                print("✅ CLAP model (laion-clap) loaded successfully.")
                
            except ImportError:
                print("❌ Neither msclap nor laion-clap is available.")
                print("Please install: pip install msclap")
                CLAP_MODEL = None
                
    except Exception as e:
        print(f"❌ Error loading CLAP model: {e}")
        CLAP_MODEL = None

    print("Model loading process completed.")
    print(f"Final status - CLIP_MODEL loaded: {CLIP_MODEL is not None}")
    print(f"Final status - CLIP_PROCESSOR loaded: {CLIP_PROCESSOR is not None}")
    print(f"Final status - CLAP_MODEL loaded: {CLAP_MODEL is not None}")

def get_model_status():
    """Returns the current status of loaded models"""
    return {
        "clip_loaded": CLIP_MODEL is not None and CLIP_PROCESSOR is not None,
        "clap_loaded": CLAP_MODEL is not None,
        "clap_type": type(CLAP_MODEL).__name__ if CLAP_MODEL else None
    }

# Load models when module is imported
print("models.py: Initializing models...")
load_models()
