import cv2
import yt_dlp

def get_video_capture(url):
    ydl_opts = {
        # This tells yt-dlp to find the best video with exactly 144px height
        # If 144p isn't available, it falls back to the "worst" (lowest) quality
        'format': 'best[height=480]/worst', 
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info.get('url')
            
            if not stream_url:
                print("Could not find stream URL.")
                return None
            
            cap = cv2.VideoCapture(stream_url)
            
            # Keep the buffer tiny to ensure we stay at the "Live" edge
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) 
            
            return cap
            
    except Exception as e:
        print(f"Error: {e}")
        return None

# --- Testing Loop ---
