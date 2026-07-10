import base64
import io
import json
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from gtts import gTTS
from typing import Dict, Any

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from backend.config import settings
from backend.schemas import (
    CaptionGenerationRequest,
    CaptionGenerationResponse,
    TTSRequest,
    TTSResponse,
    RefineSubmissionRequest,
    RefineSubmissionResponse,
)

app = FastAPI(title="Video Captioning Backend - FastAPI")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_llm(temperature: float = 0.7) -> ChatOpenAI:
    api_key = settings.fireworks_api_key or os.environ.get("FIREWORKS_API_KEY")
    if not api_key:
        # Check if they have passed it through default Env
        api_key = os.getenv("FIREWORKS_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="FIREWORKS_API_KEY environment variable is missing in the workspace secrets."
        )
    return ChatOpenAI(
        api_key=api_key,
        base_url="https://api.fireworks.ai/inference/v1",
        model=settings.fireworks_model,
        temperature=temperature,
    )

@app.post("/api/generate-captions", response_model=CaptionGenerationResponse)
async def generate_captions(request: CaptionGenerationRequest):
    try:
        desc = request.description or ""
        if not desc and not request.videoBase64:
            raise HTTPException(
                status_code=400, 
                detail="Please provide either a video file, a preset, or a description."
            )

        if not desc:
            desc = "A video clip uploaded by the user."

        parser = JsonOutputParser(pydantic_object=CaptionGenerationResponse)
        
        prompt_text = (
            "You are an expert video captioner, visual analyst, and comedic narrator.\n"
            "Analyze the provided description of the video's visual contents and generate "
            "exactly four distinct captioned narratives in these styles:\n\n"
            "1. formal: A clear, objective, professional description of what occurs in the video. Ideal for accessibility, archiving, and indexing.\n"
            "2. sarcastic: A dry, cynical, humorous, eye-rolling caption that makes fun of the situations, human reactions, or objects shown.\n"
            "3. humorousTech: An amusing narration geared toward software engineers and tech-savvy people. Fill this with coder memes, stack overflow frustrations, compiler errors, spaghetti code references, or server crashes.\n"
            "4. humorousNonTech: A relatable, slice-of-life comedic caption targeting a general audience. Use everyday analogies, human awkwardness, dramatic over-exaggeration, or funny comparisons.\n\n"
            "Visual Content Description:\n"
            "{description}\n\n"
            "{custom_directive}\n\n"
            "Make each caption around 2 to 4 sentences long. Ensure they are creative, highly engaging, and represent their specific style perfectly.\n"
            "Respond in a valid JSON structure matching the schema.\n"
            "{format_instructions}"
        )

        custom_dir = f'Apply these additional custom guidelines: "{request.customPrompt}"' if request.customPrompt else ""

        prompt = ChatPromptTemplate.from_template(prompt_text)
        llm = get_llm(temperature=request.temperature)

        chain = prompt | llm | parser

        result = chain.invoke({
            "description": desc,
            "custom_directive": custom_dir,
            "format_instructions": parser.get_format_instructions(),
        })

        # Ensure correct keys are present
        for key in ["formal", "sarcastic", "humorousTech", "humorousNonTech"]:
            if key not in result:
                result[key] = f"Caption for style {key}"

        return result

    except Exception as e:
        import logging
        logging.exception("Caption generation failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-tts", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="Text is required for Text-to-Speech.")

        lang = "en"
        tld = "com"
        
        voice_lower = request.voice.lower() if request.voice else "kore"
        if "puck" in voice_lower:
            tld = "co.uk"
        elif "zephyr" in voice_lower:
            tld = "ca"
        elif "charon" in voice_lower:
            tld = "co.in"
        elif "fenrir" in voice_lower:
            tld = "com.au"

        tts = gTTS(text=request.text, lang=lang, tld=tld, slow=False)
        
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        
        audio_b64 = base64.b64encode(fp.read()).decode("utf-8")
        return TTSResponse(audioBase64=audio_b64)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/refine-submission", response_model=RefineSubmissionResponse)
async def refine_submission(request: RefineSubmissionRequest):
    try:
        mode = request.mode
        project_data = request.projectData
        
        llm = get_llm(temperature=0.7)

        if mode == "refine-description":
            prompt_text = (
                "Review and refine the following draft descriptions for a hackathon project.\n"
                "Title: {title}\n"
                "Short Description (draft): {short_desc}\n"
                "Long Description (draft): {long_desc}\n"
                "Technology Tags: {tags}\n\n"
                "Task: Output a highly polished, professional, and exciting:\n"
                "1. Short Description (max 150 characters, punched with high-impact value proposition)\n"
                "2. Long Description (comprehensive, explaining the problem solved, unique video analysis pipeline, and user benefit)\n"
                "3. Suggested Tags (add any missing modern technology tags related to this)\n\n"
                "Respond in a clear, clean Markdown format with headers."
            )
            prompt = ChatPromptTemplate.from_template(prompt_text)
            chain = prompt | llm
            result = chain.invoke({
                "title": project_data.title,
                "short_desc": project_data.shortDescription,
                "long_desc": project_data.longDescription,
                "tags": project_data.tags,
            })
            return RefineSubmissionResponse(refinedText=result.content)

        elif mode == "readme":
            prompt_text = (
                "Generate a stunning, professional, and comprehensive README.md file for the following hackathon submission.\n"
                "Title: {title}\n"
                "Short Description: {short_desc}\n"
                "Long Description: {long_desc}\n"
                "Technology Tags: {tags}\n"
                "GitHub Repository: {github_url}\n"
                "Live Application URL: {app_url}\n\n"
                "Your generated README.md MUST include:\n"
                "- A stylish project header and logo placeholder\n"
                "- Key Features (emphasizing the four distinct captioning styles: formal, sarcastic, humorous-tech, and humorous-non-tech)\n"
                "- Architecture overview (FastAPI Python backend with LangChain, Fireworks AI, and Vite React 19 SPA frontend with Tailwind CSS)\n"
                "- Local Setup & Installation Instructions (clear step-by-step commands for setting up python virtualenv, pip install, and npm run dev)\n"
                "- Docker Containerization instructions (how to build and run the Docker image safely, in keeping with lablab.ai containerized requirements)\n"
                "- Usage Walkthrough\n"
                "- Submission Details & Credits\n\n"
                "Make it highly organized, utilizing clean Markdown tables, code blocks, and visual dividers."
            )
            prompt = ChatPromptTemplate.from_template(prompt_text)
            chain = prompt | llm
            result = chain.invoke({
                "title": project_data.title,
                "short_desc": project_data.shortDescription,
                "long_desc": project_data.longDescription,
                "tags": project_data.tags,
                "github_url": project_data.githubUrl or "To be configured",
                "app_url": project_data.appUrl or "To be configured",
            })
            return RefineSubmissionResponse(refinedText=result.content)

        elif mode == "docker":
            prompt_text = (
                "Create a production-ready Dockerfile and docker-compose.yml configuration for containerizing this FastAPI + Vite full-stack application.\n"
                "Project Title: {title}\n"
                "Server framework: Python FastAPI (uvicorn)\n"
                "Client framework: Vite React 19 SPA (served statically or built with multi-stage Docker to serve via FastAPI/nginx)\n"
                "Start command: uvicorn backend.main:app --host 0.0.0.0 --port 3000\n"
                "Internal port: 3000\n\n"
                "Task:\n"
                "1. Provide a step-by-step explained Dockerfile using a multi-stage build (build stage for React + production stage for Python and running uvicorn) to keep the image lightweight.\n"
                "2. Provide a docker-compose.yml configuration that sets up the port mapping 3000:3000 and references the environment variable FIREWORKS_API_KEY.\n"
                "3. Provide simple instructions on how to build and run the container locally.\n\n"
                "Output the code blocks clearly."
            )
            prompt = ChatPromptTemplate.from_template(prompt_text)
            chain = prompt | llm
            result = chain.invoke({"title": project_data.title})
            return RefineSubmissionResponse(refinedText=result.content)

        else:
            raise HTTPException(status_code=400, detail="Invalid refinement mode specified.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
