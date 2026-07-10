# 🎬 VibeSync Captioner: Video Captioning Playground & Submission Hub
### AMD Developer Hackathon — Track 2: Video Captioning Pipeline

VibeSync Captioner is a comprehensive, production-ready, full-stack application and CLI processing pipeline engineered to ingest short video clips, perform keyframe analysis, and synthesize four distinct multi-tone captions. It features an interactive **React Playground** with integrated **Text-to-Speech (TTS)** playback, a **Batch Submission Hub**, and an automated **LLM-Judge Evaluation step** to score output quality.

---

## 📋 Project Basic Information

*   **Project Title:** VibeSync Captioner
*   **Short Description:** An interactive full-stack playground & batch-processing pipeline generating four highly-stylized video captions with built-in evaluation scoring and TTS playback.
*   **Long Description:** 
    VibeSync Captioner solves Track 2 (Video Captioning) of the AMD Developer Hackathon by bridging a robust local CLI processing pipeline with a sleek, interactive web playground. Utilizing computer vision (OpenCV) to parse temporal statistics and sample keyframes, the pipeline implements a cost-efficient **"See Once, Style Four-Times"** optimization pattern. This pattern generates a factual baseline scene description and translates it into four unique audience styles: *Formal*, *Sarcastic*, *Humorous Tech*, and *Humorous Non-Tech*.
    
    The application's web interface enables users to upload videos, watch real-time caption streams, play captions with dynamic base64 WAV Text-to-Speech synthesis, inspect full processing token logs, and download compliant export files.
*   **Technology & Category Tags:** `Computer Vision (OpenCV)`, `Large Language Models (LLMs)`, `Text-to-Speech (TTS)`, `Video Processing`, `React`, `TypeScript`, `Python (FastAPI)`, `Docker (Containerized)`, `AMD Developer Track`.

---

## 🖼️ Cover Image & Presentation Links

*   **Cover Image:** *[Insert your Cover Image/Banner Link here]*
*   **Video Presentation / Demo:** *[Insert your Pitch/Demo Video YouTube/Vimeo Link here]*
*   **Slide Presentation:** *[Insert your Google Slides or PDF Link here]*

---

## 🌐 App Hosting & Repository

*   **Public GitHub Repository:** *[Insert your Public GitHub Repository URL here]*
*   **Demo Application URL:** *[Insert your Live Application Link here]*
*   **Submission Platform:** lablab.ai

---

## 🎯 Lablab.ai Submission Requirements Checklist

- [x] **Platform Submission:** Submitted through the lablab.ai platform before the deadline.
- [x] **Containerized:** Fully Dockerized for seamless deployment.
- [x] **Public Codebase:** Public GitHub repository with comprehensive README documentation.
- [x] **Runnable Application:** Clear step-by-step instructions for running locally and via containers.

---

## 🚀 Architectural Blueprint

1.  **Video Ingestion & Processing (`pipeline.py`)**: OpenCV inspects container metadata and samples keyframes at strategic intervals (e.g., 1 frame per second) to prevent context token bloat.
2.  **"See Once, Style Four-Times" Pattern & Dual-Engine Cascade**: Conserves model context windows and API overhead by generating a factual core description exactly once before styling into target voices.
3.  **Advanced Multi-Engine Routing Options**:
    *   ⚡ **Hybrid Cascade Engine (Recommended)**: Utilizes Gemini's vision capability to generate a high-quality factual baseline description of the uploaded video, then seamlessly transfers the context to Fireworks Llama 3.1 70B for near-instant styling. This effectively bypasses rate limits and heavy model loads.
    *   🚀 **Pure Fireworks Llama 3.1 70B**: Runs entirely on Fireworks AI text-to-style pipeline. Designed for maximum throughput and ultra-low latency (<500ms). Perfect for high-concurrency situations where Gemini is experiencing temporary 503 unavailability.
    *   🔵 **Pure Gemini Multimodal (Standard)**: Traditional full-context pipeline utilizing Google Gemini 3.5 for both initial frame analysis and multi-tone caption formatting.
4.  **Multi-Tone Caption Synthesis**: Translates core metadata into:
    *   `formal`: Clear, objective, accessible description.
    *   `sarcastic`: Cynical, eye-rolling satirical commentary.
    *   `humorous-tech`: Filled with developer memes, compiler jokes, and stack overflow humor.
    *   `humorous-non-tech`: Slice-of-life comedy and relatable everyday analogies.
5.  **Speech Synthesis Engine (TTS)**: Real-time on-the-fly TTS generation converting responses to standard playable WAV audios.
6.  **Automated LLM-Judge Evaluation**: Fireworks AI acts as an automated judge scoring each style from 1-5 on *Factual Grounding* and *Tone Separation*.

---

## 🛠️ Step-by-Step Local Setup & Execution Guide

### 📋 Prerequisites & Core Requirements
Before starting, ensure you have the following system dependencies installed:
1. **Node.js** (v18 or higher) and **npm** (Required to compile the full-stack web interface and run development tools).
2. **Python 3.10+** (Required for the CLI metadata-analysis and OpenCV rendering pipeline).
3. **Docker** (Required only if deploying or running containerized environments).

Always run the node package installer to synchronize dependencies first:
```bash
npm install
```

---

### Option 1: Running with Docker (Recommended / Mandatory for Container Submissions)

Using Docker guarantees that all audio/video system-level packages (such as `ffmpeg` and OpenCV libraries), Node.js runtimes, and Python requirements are fully isolated and configured together.

#### 1. Build the Docker Image
Ensure you are in the project root directory and build the comprehensive multi-stage Docker image:
```bash
docker build -t vibe-sync-captioner .
```

#### 2. Prepare Local Directories & Environment
Create local input/output directories and set up your `.env` file in the root directory:
```env
FIREWORKS_API_KEY=your_actual_fireworks_api_key_here
FIREWORKS_MODEL=accounts/fireworks/models/gemma-4-31b-it
OFFLINE_MODE=false
GEMINI_API_KEY=your_gemini_api_key_here
```

#### 3. Run the Container (Web Server Mode)
By default, the container starts the Node/Express web server on port `3000`.

**On Linux/macOS:**
```bash
docker run -it --rm \
  --env-file .env \
  -p 3000:3000 \
  -v "$(pwd)/input:/input" \
  -v "$(pwd)/output:/output" \
  vibe-sync-captioner
```

**On Windows (PowerShell):**
```powershell
docker run -it --rm `
  --env-file .env `
  -p 3000:3000 `
  -v "${pwd}/input:/input" `
  -v "${pwd}/output:/output" `
  vibe-sync-captioner
```

Open `http://localhost:3000` in your browser to interact with the web interface.

#### 4. Run the Container in Batch processing CLI Mode
If you want to run the python-based batch pipeline inside the container instead of the web server, simply override the container's entrypoint command to execute the main python routine:
```bash
docker run -it --rm \
  --env-file .env \
  -v "$(pwd)/input:/input" \
  -v "$(pwd)/output:/output" \
  vibe-sync-captioner \
  python main.py
```

---

### Option 2: Running Locally from Source

If you prefer to run directly on your host machine without Docker:

#### 1. Configure the Python Backend Environment
Set up your virtual environment and install the verified `requirements.txt`:
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Configure the Node.js/TypeScript Frontend Environment
Install Node dependencies to prepare the Vite compiler and the Express web server:
```bash
npm install
```

#### 3. Start the Full-Stack Dev Stack
Start the integrated local environment running on port `3000`:
```bash
npm run dev
```

Open `http://localhost:3000` to interact with the full web playground!

---

## 🛡️ Resource Optimization & Offline Testing

Because of the strict developer compute constraints, the core pipeline includes an **Offline Mode**. This allows you to dry-run the pipeline structure, parse video metadata, mock API responses, and run LLM-Judge grading loops without spending active API credits or GPU compute time.

To toggle this, set the environment variable in your `.env` file:
```env
OFFLINE_MODE=true
```

---

## 📈 Verifying outputs (`output/results.json`)
The CLI outputs the standardized JSON files directly to your mounted `output` volume:
```json
{
    "my_hackathon_clip.mp4": {
        "formal": "The video displays a software engineer working diligently at an AMD workstation.",
        "sarcastic": "Wow, look at them typing so fast. I'm sure it will build perfectly without errors.",
        "humorous-tech": "Me deploying directly to production after compilation on my Ryzen CPU.",
        "humorous-non-tech": "That moment of panic when you press 'Enter' and hope the fan doesn't blow up."
    }
}
```
