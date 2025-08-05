import requests
import os
from pathlib import Path

BASE_URL = "http://localhost:5001"

images = ["car","cat",'children_play','dog1','dog2','piano']
audios = ['barking','birds','meow','piano','waves']

def index_file(file_path, file_type):
    """Index a single file"""
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'type': file_type}
            response = requests.post(f"{BASE_URL}/index_file", files=files, data=data)
        
        if response.status_code == 200:
            print(f"✅ Indexed: {file_path}")
            return True
        else:
            print(f"❌ Failed to index {file_path}: {response.json()}")
            return False
    except Exception as e:
        print(f"❌ Error indexing {file_path}: {e}")
        return False

def create_test_index():
    """Create a test index with sample files"""
    print("🚀 Creating test index...")
    
    total_indexed = 0
    
    # Index images
    print("\n📸 Indexing images...")
    for image_name in images:
        image_path = f'index_files/images/{image_name}.jpg'
        if os.path.exists(image_path):
            if index_file(image_path, 'image'):
                total_indexed += 1
        else:
            print(f"⚠️  File not found: {image_path}")
    
    # Index audio files  
    print("\n🎵 Indexing audio files...")
    for audio_name in audios:
        audio_path = f'index_files/audios/{audio_name}.mp3'
        if os.path.exists(audio_path):
            if index_file(audio_path, 'audio'):
                total_indexed += 1
        else:
            print(f"⚠️  File not found: {audio_path}")
    
    # Check final status
    response = requests.get(f"{BASE_URL}/status")
    if response.status_code == 200:
        status = response.json()
        print(f"\n📊 Index Status:")
        print(f"   Total indexed items: {status['indexed_items']}")
        print(f"   Models loaded: {status['models_loaded']}")
        print(f"   Successfully processed: {total_indexed} files")
    
    print("\n🎉 Test index creation complete!")

if __name__ == "__main__":
    create_test_index()
