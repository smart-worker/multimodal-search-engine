import requests
import os
from pathlib import Path

BASE_URL = "http://localhost:5001"

images = ["car", "cat", 'children_play', 'dog1', 'dog2', 'piano']
audios = ['barking', 'birds', 'meow', 'piano', 'waves']

def index_file(file_path, file_type):
    """Index a single file using the updated endpoint"""
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'type': file_type}
            # Use the updated endpoint
            response = requests.post(f"{BASE_URL}/add_to_index", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Indexed: {file_path}")
            print(f"   Model used: {result.get('file_info', {}).get('model_used', 'unknown')}")
            return True
        else:
            print(f"❌ Failed to index {file_path}: {response.text}")
            try:
                error_detail = response.json()
                print(f"   Error details: {error_detail}")
            except:
                print(f"   Raw response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error indexing {file_path}: {e}")
        return False

def check_server_status():
    """Check if the server is running and models are loaded"""
    try:
        response = requests.get(f"{BASE_URL}/status")
        if response.status_code == 200:
            status = response.json()
            print("🔍 Server Status Check:")
            print(f"   Server running: ✅")
            print(f"   CLIP loaded: {'✅' if status['models_loaded'].get('clip_loaded') else '❌'}")
            print(f"   CLAP loaded: {'✅' if status['models_loaded'].get('clap_loaded') else '❌'}")
            
            if not status['models_loaded'].get('clip_loaded'):
                print("⚠️  CLIP model not loaded - image processing will fail")
            if not status['models_loaded'].get('clap_loaded'):
                print("⚠️  CLAP model not loaded - audio processing will fail")
                
            return status['models_loaded'].get('clip_loaded') and status['models_loaded'].get('clap_loaded')
        else:
            print(f"❌ Server not responding: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        print("💡 Make sure your Flask server is running on port 5001")
        return False

def reset_index():
    """Reset the index before building a new one"""
    try:
        response = requests.post(f"{BASE_URL}/reset_index")
        if response.status_code == 200:
            print("🗑️  Index reset successfully")
            return True
        else:
            print(f"⚠️  Failed to reset index: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error resetting index: {e}")
        return False

def create_test_index():
    """Create a test index with sample files"""
    print("🚀 Creating test index with CLAP support...")
    
    # Check server status first
    if not check_server_status():
        print("❌ Server or models not ready. Please start the server and ensure models are loaded.")
        return
    
    # Reset index for clean start
    print("\n🗑️  Resetting existing index...")
    reset_index()
    
    total_indexed = 0
    
    # Index images
    print("\n📸 Indexing images...")
    for image_name in images:
        image_path = f'index_files/images/{image_name}.jpg'
        if os.path.exists(image_path):
            print(f"Processing: {image_path}")
            if index_file(image_path, 'image'):
                total_indexed += 1
        else:
            print(f"⚠️  File not found: {image_path}")
    
    # Index audio files  
    print("\n🎵 Indexing audio files...")
    for audio_name in audios:
        audio_path = f'index_files/audios/{audio_name}.mp3'
        if os.path.exists(audio_path):
            print(f"Processing: {audio_path}")
            if index_file(audio_path, 'audio'):
                total_indexed += 1
        else:
            print(f"⚠️  File not found: {audio_path}")
    
    # Check final status
    print("\n📊 Final Index Status:")
    try:
        response = requests.get(f"{BASE_URL}/status")
        if response.status_code == 200:
            status = response.json()
            print(f"   Total indexed items: {status['indexed_items']}")
            print(f"   Models loaded: {status['models_loaded']}")
            print(f"   Cross-modal search: {status.get('cross_modal_search', {}).get('enabled', 'unknown')}")
            print(f"   Successfully processed: {total_indexed} files")
            
            # Get detailed stats
            stats_response = requests.get(f"{BASE_URL}/index_stats")
            if stats_response.status_code == 200:
                stats = stats_response.json()
                print(f"   File types: {stats.get('file_types', {})}")
                print(f"   Models used: {stats.get('models_used', {})}")
        else:
            print(f"❌ Failed to get status: {response.text}")
    except Exception as e:
        print(f"❌ Error getting final status: {e}")
    
    print(f"\n🎉 Test index creation complete!")
    print(f"🎯 Cross-modal search should now work:")
    print(f"   - Image queries will find related audio")
    print(f"   - Audio queries will find related images")
    print(f"   - Text queries will find both images and audio")

def test_cross_modal_search():
    """Test cross-modal search functionality"""
    print("\n🧪 Testing cross-modal search...")
    try:
        response = requests.get(f"{BASE_URL}/test_cross_modal")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Cross-modal test: {result.get('status')}")
            print(f"   Test query: '{result.get('test_query')}'")
            print(f"   Results by type: {result.get('results_by_type', {})}")
            print(f"   Cross-modal working: {result.get('cross_modal_working', False)}")
        else:
            print(f"❌ Cross-modal test failed: {response.text}")
    except Exception as e:
        print(f"❌ Error testing cross-modal search: {e}")

if __name__ == "__main__":
    create_test_index()
    
    # Test cross-modal functionality
    test_cross_modal_search()
