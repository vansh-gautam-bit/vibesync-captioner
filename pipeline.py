import os
import cv2
import numpy as np
import logging
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VideoPipeline")

class VideoPipeline:
    """
    Video ingestion and frame processing engine using OpenCV.
    Responsible for opening, validating, and extracting keyframes from video files
    while optimizing token consumption for downstream vision/multimodal LLMs.
    """
    
    @staticmethod
    def get_video_metadata(video_path: str) -> Dict[str, Any]:
        """
        Opens a video file, validates its format, and retrieves detailed metadata.
        Raises an exception if the video is corrupt or cannot be opened.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")
            
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise IOError(f"Failed to open video container. File may be corrupt or codec is unsupported: {video_path}")
            
        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Prevent division by zero
            duration_secs = (total_frames / fps) if fps > 0 else 0.0
            
            metadata = {
                "path": video_path,
                "filename": os.path.basename(video_path),
                "fps": fps,
                "total_frames": total_frames,
                "width": width,
                "height": height,
                "duration_seconds": round(duration_secs, 2),
            }
            logger.info(f"Successfully loaded metadata for {metadata['filename']}: {width}x{height}, {fps} FPS, {duration_secs:.2f}s")
            return metadata
        finally:
            cap.release()

    @staticmethod
    def extract_keyframes(video_path: str, max_frames: int = 10, sample_interval_secs: float = 1.0) -> List[Dict[str, Any]]:
        """
        Extracts strategic keyframes from the video file at a configurable rate (e.g., 1 frame per second).
        Limits the total number of extracted frames to prevent downstream API token bloat.
        
        Returns:
            A list of dictionaries, each containing:
                - "timestamp_secs": Time location of the frame in seconds
                - "frame_index": The index of the frame
                - "mean_brightness": Average brightness (proxy for visual features)
                - "motion_activity": Estimated pixel difference from the prior frame
        """
        metadata = VideoPipeline.get_video_metadata(video_path)
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise IOError(f"Could not reopen video for frame extraction: {video_path}")
            
        extracted_keyframes = []
        fps = metadata["fps"]
        total_frames = metadata["total_frames"]
        
        if fps <= 0 or total_frames <= 0:
            cap.release()
            return []
            
        # Determine the frame steps based on sample_interval_secs
        frame_step = int(fps * sample_interval_secs)
        if frame_step <= 0:
            frame_step = 1
            
        prev_gray_frame = None
        
        try:
            current_idx = 0
            next_target_idx = 0
            while len(extracted_keyframes) < max_frames and current_idx < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                if current_idx == next_target_idx:
                    # Calculate simple visual metrics to pass as factual signals
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    mean_brightness = float(np.mean(gray))
                    
                    # Simple motion estimation from previous extracted frame
                    motion_score = 0.0
                    if prev_gray_frame is not None:
                        # Resize to a smaller common size to quickly calculate difference
                        resized_current = cv2.resize(gray, (100, 100))
                        resized_prev = cv2.resize(prev_gray_frame, (100, 100))
                        frame_diff = cv2.absdiff(resized_current, resized_prev)
                        motion_score = float(np.sum(frame_diff) / (100 * 100 * 255.0)) * 100.0
                        
                    prev_gray_frame = gray
                    timestamp = round(current_idx / fps, 2)
                    
                    extracted_keyframes.append({
                        "timestamp_secs": timestamp,
                        "frame_index": current_idx,
                        "mean_brightness": round(mean_brightness, 2),
                        "motion_activity": round(motion_score, 2)
                    })
                    
                    next_target_idx += frame_step
                    
                current_idx += 1
                
            logger.info(f"Extracted {len(extracted_keyframes)} keyframes from {metadata['filename']}")
            return extracted_keyframes
        except Exception as e:
            logger.error(f"Error during keyframe extraction: {str(e)}")
            raise
        finally:
            cap.release()

if __name__ == "__main__":
    # Self-test code
    print("Testing VideoPipeline class definition...")
    try:
        # Create a tiny mock video file to verify it works or catches error gracefully
        VideoPipeline.get_video_metadata("non_existent_file.mp4")
    except Exception as e:
        print(f"Pipeline caught expected error: {e}")
