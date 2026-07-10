from pydantic import BaseModel, Field
from typing import Optional

class CaptionGenerationRequest(BaseModel):
    videoBase64: Optional[str] = None
    videoMimeType: Optional[str] = None
    description: Optional[str] = None
    temperature: float = 0.7
    customPrompt: Optional[str] = ""

class CaptionGenerationResponse(BaseModel):
    formal: str = Field(..., description="Professional, accessible, accurate description of the video")
    sarcastic: str = Field(..., description="Cynical, sarcastic, witty comedic commentary of the video")
    humorousTech: str = Field(..., description="Tech jokes, code jokes, nerd perspective on the video")
    humorousNonTech: str = Field(..., description="General audience humor, relatable situations about the video")

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "Kore"

class TTSResponse(BaseModel):
    audioBase64: str

class ProjectData(BaseModel):
    title: str
    shortDescription: str
    longDescription: str
    tags: str
    coverImageUrl: Optional[str] = ""
    videoPresentationUrl: Optional[str] = ""
    slidePresentationUrl: Optional[str] = ""
    githubUrl: Optional[str] = ""
    demoPlatform: Optional[str] = ""
    appUrl: Optional[str] = ""
    isContainerized: bool = True
    hasReadme: bool = True
    isRunnable: bool = True

class RefineSubmissionRequest(BaseModel):
    mode: str  # "refine-description" | "readme" | "docker"
    projectData: ProjectData

class RefineSubmissionResponse(BaseModel):
    refinedText: str
