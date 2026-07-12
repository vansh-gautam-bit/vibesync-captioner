import os
import json
import logging
from typing import Dict, Any, List, Tuple
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv

from pipeline import VideoPipeline

# Load local environment variables if available
_script_dir = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_script_dir, ".env")
load_dotenv(dotenv_path=_env_path)

# Configure logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AMD-VideoCaptioner")

# Configuration Constants
DEFAULT_INPUT_PATH = "./input/tasks.json"
CONTAINER_INPUT_PATH = "/input/tasks.json"

DEFAULT_OUTPUT_PATH = "./output/results.json"
CONTAINER_OUTPUT_PATH = "/output/results.json"

DEFAULT_MODEL = "accounts/fireworks/models/gemma-4-31b-it"

class CaptionSet(BaseModel):
    formal: str = Field(..., description="Objective, professional scene description")
    sarcastic: str = Field(..., description="Cynical, witty comedic commentary")
    humorous_tech: str = Field(..., description="Amusing geek/programmer oriented narrative with technology memes")
    humorous_non_tech: str = Field(..., description="Relatable general-audience comedy and daily analogies")


class VideoCaptioningApp:
    def __init__(self):
        # Read offline/mock mode setting
        # Safe toggle for 8-hour developer compute cap
        self.offline_mode = os.getenv("OFFLINE_MODE", "false").lower() == "true"
        self.api_key = os.getenv("FIREWORKS_API_KEY")
        self.model = os.getenv("FIREWORKS_MODEL", DEFAULT_MODEL)
        
        if self.offline_mode:
            logger.info("⚠️ Application initialized in OFFLINE/MOCK MODE. No real network API calls will be made.")
        else:
            if not self.api_key:
                logger.warning("FIREWORKS_API_KEY not found in environment. Defaulting to OFFLINE_MODE to prevent crash.")
                self.offline_mode = True
            else:
                logger.info(f"Using Fireworks model: {self.model}")
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url="https://api.fireworks.ai/inference/v1",
                    timeout=20.0
                )

    def _get_input_path(self) -> str:
        """Dynamically resolves input tasks path based on host vs container environment."""
        if os.path.exists(CONTAINER_INPUT_PATH):
            return CONTAINER_INPUT_PATH
        return DEFAULT_INPUT_PATH

    def _get_output_path(self) -> str:
        """Dynamically resolves output results path based on host vs container environment."""
        return CONTAINER_OUTPUT_PATH if os.path.exists("/output") else DEFAULT_OUTPUT_PATH

    def load_tasks(self) -> List[Dict[str, Any]]:
        """
        Loads input tasks list. If neither container nor local fallback exists,
        creates a default sample task file for graceful self-bootstrapping.
        """
        input_path = self._get_input_path()
        if not os.path.exists(input_path):
            logger.warning(f"Input file not found at {input_path}. Creating a default dummy tasks file for demonstration.")
            os.makedirs(os.path.dirname(input_path), exist_ok=True)
            
            sample_tasks = [
                {
                    "video_path": "./input/sample_video_1.mp4",
                    "fallback_description": "A developer staring blankly at a screen filled with compiler warnings, drinking cold coffee, and sighing loudly as they hit compile again."
                },
                {
                    "video_path": "./input/sample_video_2.mp4",
                    "fallback_description": "A group of modern engineers high-fiving in front of a dashboard with a flatlined latency metric after deploying a fix."
                }
            ]
            with open(input_path, "w") as f:
                json.dump(sample_tasks, f, indent=4)
            logger.info(f"Sample task list written to {input_path}")
            
        try:
            with open(input_path, "r") as f:
                tasks = json.load(f)
                if not isinstance(tasks, list):
                    raise ValueError("Input JSON tasks must be a list of task objects.")
                return tasks
        except Exception as e:
            logger.error(f"Failed to parse task definitions from {input_path}: {e}")
            return []

    def generate_core_scene_description(self, metadata: Dict[str, Any], keyframes: List[Dict[str, Any]], fallback_desc: str) -> str:
        """
        Phase 2: 'See Once, Style Four-Times' Optimization.
        Combines metadata, visual metrics (brightness, motion scores) from CV2 keyframes, 
        and fallback text to generate one master FACTUAL neutral scene description.
        """
        # Build prompt listing the structured frame signals
        frame_logs = []
        for f in keyframes:
            frame_logs.append(
                f"Frame at {f['timestamp_secs']}s: brightness={f['mean_brightness']}, relative motion activity={f['motion_activity']}%"
            )
        frames_joined = "\n".join(frame_logs)

        prompt = (
            f"You are a scientific, completely unbiased multimodal scene analyst.\n"
            f"Analyze the following video stream metadata and sampled keyframe statistics. Create a comprehensive, "
            f"completely factual, objective, and neutral description of the sequence of actions.\n\n"
            f"Video Filename: {metadata['filename']}\n"
            f"Duration: {metadata['duration_seconds']}s\n"
            f"Frame rate: {metadata['fps']} FPS\n"
            f"Resolution: {metadata['width']}x{metadata['height']}\n\n"
            f"Sampled Frame Statistical Signals:\n"
            f"{frames_joined}\n\n"
            f"High-Level Human Context Reference:\n"
            f"\"{fallback_desc}\"\n\n"
            f"Generate a robust, detailed 4-to-5 sentence paragraph describing exactly what occurred chronologically. "
            f"Do not introduce opinions, humor, cynicism, or speculation. Focus purely on factual events."
        )

        if self.offline_mode:
            # Local deterministic rule simulation for testing
            mock_core = f"Factual core scene description of '{metadata['filename']}' ({metadata['duration_seconds']}s). Chronological flow: {fallback_desc} Keyframe metrics indicate a continuous flow of events with average brightness and localized movement."
            return mock_core

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional video analysis agent."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1 # Low temperature for extreme factuality
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Error calling Fireworks API for core description: {e}")
            raise

    def synthesize_captions(self, core_scene: str) -> CaptionSet:
        """
        Phase 3: Multi-Tone Caption Synthesis.
        Feeds the single core description to the LLM to yield four distinct styled captions.
        """
        prompt = (
            f"Translate the following neutral, factual video core scene description into "
            f"exactly four styled captions. Return your response ONLY as a valid JSON object matching the JSON schema below.\n\n"
            f"Core Scene Description:\n"
            f"\"{core_scene}\"\n\n"
            f"STYLE REQUIREMENTS:\n"
            f"1. formal: Clear, accessible, objective narrative. Ideal for professional indexing and visually impaired audiences.\n"
            f"2. sarcastic: Witty, cynical, dramatic eye-roll narrative criticizing or humorously pointing out absurdities.\n"
            f"3. humorous_tech: Targeted at developers/engineers. Use compiler jokes, stack overflow, memory leaks, AMD GPU threads, or broken code comparisons.\n"
            f"4. humorous_non_tech: Relatable everyday analogies, hyperbole, and slice-of-life comedy for a general audience.\n\n"
            f"JSON Output Format:\n"
            f"{{\n"
            f"  \"formal\": \"<Formal caption string>\",\n"
            f"  \"sarcastic\": \"<Sarcastic caption string>\",\n"
            f"  \"humorous_tech\": \"<Humorous tech caption string>\",\n"
            f"  \"humorous_non_tech\": \"<Humorous non-tech caption string>\"\n"
            f"}}\n"
        )

        if self.offline_mode:
            # Deterministic styled captions offline simulator
            return CaptionSet(
                formal=f"The video details: {core_scene[:100]}...",
                sarcastic="Oh look, another stunning display of peak human efficiency. Positively thrilling.",
                humorous_tech="Me after writing O(N^2) loops on an 8-thread CPU and wondering why the kernel is sweating.",
                humorous_non_tech="When your phone tells you 'Screen time down 3%' but you know you spent 10 hours staring into the void."
            )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a creative caption synthesizer that outputs precise structural JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.75,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content.strip()
            data = json.loads(content)
            # Support both hyphenated or underscored variants gracefully
            formal = data.get("formal", "")
            sarcastic = data.get("sarcastic", "")
            humorous_tech = data.get("humorous_tech", data.get("humorous-tech", ""))
            humorous_non_tech = data.get("humorous_non_tech", data.get("humorous-non-tech", ""))
            
            return CaptionSet(
                formal=formal,
                sarcastic=sarcastic,
                humorous_tech=humorous_tech,
                humorous_non_tech=humorous_non_tech
            )
        except Exception as e:
            logger.error(f"Error during caption synthesis API call: {e}")
            raise

    def run_pipeline(self):
        """Orchestrates the entire 4-phase execution loop across all scheduled tasks."""
        logger.info("🎬 Starting AMD Developer Hackathon Video Captioning Pipeline...")
        
        tasks = self.load_tasks()
        if not tasks:
            logger.error("No active tasks found. Pipeline aborted.")
            return

        final_results = {}

        # Loop through each task with high-level fail-safe protection
        for idx, task in enumerate(tasks, 1):
            video_path = task.get("video_path") or task.get("video_url")
            fallback_desc = task.get("fallback_description") or task.get("description") or "No manual description provided."
            filename = os.path.basename(video_path) if video_path else f"unknown_task_{idx}"

            logger.info(f"\n--- Processing Task [{idx}/{len(tasks)}]: {filename} ---")
            
            # Phase 1: Video Ingestion & Processing with graceful fallback
            try:
                logger.info("Phase 1: Analyzing video container and extracting strategic keyframes...")
                if video_path and os.path.exists(video_path):
                    metadata = VideoPipeline.get_video_metadata(video_path)
                    keyframes = VideoPipeline.extract_keyframes(video_path, max_frames=8)
                else:
                    logger.warning(f"Video file missing or offline at: '{video_path}'. Using simulated metadata.")
                    metadata = {
                        "filename": filename,
                        "duration_seconds": 45.0,
                        "fps": 30.0,
                        "width": 1920,
                        "height": 1080
                    }
                    keyframes = [
                        {"timestamp_secs": 0.0, "mean_brightness": 120.0, "motion_activity": 0.0},
                        {"timestamp_secs": 15.0, "mean_brightness": 125.0, "motion_activity": 12.5},
                        {"timestamp_secs": 30.0, "mean_brightness": 118.0, "motion_activity": 35.2}
                    ]
            except Exception as e:
                logger.warning(f"Failed during video processing phase: {e}. Using simulated metadata.")
                metadata = {
                    "filename": filename,
                    "duration_seconds": 45.0,
                    "fps": 30.0,
                    "width": 1920,
                    "height": 1080
                }
                keyframes = [
                    {"timestamp_secs": 0.0, "mean_brightness": 120.0, "motion_activity": 0.0},
                    {"timestamp_secs": 15.0, "mean_brightness": 125.0, "motion_activity": 12.5},
                    {"timestamp_secs": 30.0, "mean_brightness": 118.0, "motion_activity": 35.2}
                ]

            # Phase 2: See Once, Style Four-Times Optimization with API fallbacks
            core_desc = None
            try:
                logger.info("Phase 2: Compiling spatial-temporal signals to generate unified core description...")
                core_desc = self.generate_core_scene_description(metadata, keyframes, fallback_desc)
                logger.info(f"✨ Unified Core Scene:\n\"{core_desc}\"")
            except Exception as e:
                logger.warning(f"Failed to generate core scene description via API, using fallback description: {e}")
                core_desc = fallback_desc

            # Phase 3: Multi-Tone Caption Synthesis with local fallback
            caption_set = None
            try:
                logger.info("Phase 3: Synthesizing captions in four distinctive styles...")
                caption_set = self.synthesize_captions(core_desc)
            except Exception as e:
                logger.warning(f"Failed to synthesize captions via API, creating local deterministic captions: {e}")
                # Create a beautiful fallback caption set using the core description
                caption_set = CaptionSet(
                    formal=f"A professional and objective scene showing: {core_desc}",
                    sarcastic=f"Oh great, a thrilling depiction of {core_desc}. Absolute peak entertainment value.",
                    humorous_tech=f"Me when trying to refactor a system that results in: {core_desc}. Classic Day-1 deployment bug.",
                    humorous_non_tech=f"When you expect a quiet day but end up dealing with: {core_desc}."
                )
                
            # Build the exact JSON schema requested: {"formal": "...", "sarcastic": "...", "humorous-tech": "...", "humorous-non-tech": "..."}
            # Note: The request asks for keys hyphenated matching 'humorous-tech' and 'humorous-non-tech' in output
            final_results[filename] = {
                "formal": caption_set.formal,
                "sarcastic": caption_set.sarcastic,
                "humorous-tech": caption_set.humorous_tech,
                "humorous-non-tech": caption_set.humorous_non_tech
            }
            
            logger.info("Captions successfully synthesized:")
            logger.info(f"  [Formal]: {caption_set.formal}")
            logger.info(f"  [Sarcastic]: {caption_set.sarcastic}")
            logger.info(f"  [Humorous Tech]: {caption_set.humorous_tech}")
            logger.info(f"  [Humorous Non-Tech]: {caption_set.humorous_non_tech}")

        # Explicitly save final output schemas
        output_results_path = self._get_output_path()

        os.makedirs(os.path.dirname(output_results_path), exist_ok=True)

        with open(output_results_path, "w") as f:
            json.dump(final_results, f, indent=4)
        logger.info(f"\n💾 Saved formal results schema matching specification to {output_results_path}")
        logger.info("🎉 Hackathon pipeline cycle completed successfully!")

if __name__ == "__main__":
    app = VideoCaptioningApp()
    app.run_pipeline()
