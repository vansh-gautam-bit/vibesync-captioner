import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

_backend_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_backend_dir)
_env_path = os.path.join(_root_dir, ".env")

# Fallback to parent directory if .env is not found in the project root
if not os.path.exists(_env_path):
    _parent_env_path = os.path.join(os.path.dirname(_root_dir), ".env")
    if os.path.exists(_parent_env_path):
        _env_path = _parent_env_path

class Settings(BaseSettings):
    # Fireworks API settings
    fireworks_api_key: Optional[str] = None
    fireworks_model: str = "accounts/fireworks/models/llama-v3p1-70b-instruct"
    
    # Optional Gemini key for backup or other features
    gemini_api_key: Optional[str] = None
    
    # App port and host
    port: int = 8000
    host: str = "127.0.0.1"

    model_config = SettingsConfigDict(
        env_file=_env_path, 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
