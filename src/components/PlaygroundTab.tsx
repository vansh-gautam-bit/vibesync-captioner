import React, { useState, useRef, useEffect } from "react";
import { 
  Video, Upload, Play, Square, Volume2, Copy, Check, Sparkles, 
  Sliders, Wand2, ShieldAlert, FileText, ChevronRight, RefreshCw,
  Clock, Info, Trash2, Activity, Layers, Database, PlayCircle, StopCircle,
  Image, FileAudio
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRESET_VIDEOS, TTS_VOICES } from "../data";
import { PresetVideo, GeneratedCaptions } from "../types";

// Media Type helper
const getMediaType = (file: File | null) => {
  if (!file) return null;
  if (file.type) {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("image/")) return "image";
  }
  // Fallback based on extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  const videoExts = ["mp4", "webm", "ogg", "mov", "avi", "mkv", "m4v", "3gp"];
  const audioExts = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus"];
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
  
  if (ext && videoExts.includes(ext)) return "video";
  if (ext && audioExts.includes(ext)) return "audio";
  if (ext && imageExts.includes(ext)) return "image";
  return null;
};

// Mime Type helper
const getMimeType = (file: File | null) => {
  if (!file) return "video/mp4";
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'mkv': return 'video/x-matroska';
    case 'mp3': return 'audio/mp3';
    case 'wav': return 'audio/wav';
    case 'm4a': return 'audio/x-m4a';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'video/mp4';
  }
};

export default function PlaygroundTab() {
  // Input Selection States
  const [sourceType, setSourceType] = useState<"preset" | "upload">("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_VIDEOS[0].id);
  const [manualDescription, setManualDescription] = useState<string>(PRESET_VIDEOS[0].description);
  
  // File upload states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [videoBase64, setVideoBase64] = useState<string>("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  // Creative Control States
  const [temperature, setTemperature] = useState<number>(0.7);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [engine, setEngine] = useState<"hybrid" | "fireworks" | "gemini">("hybrid");

  // API Call States
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedCaptions | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    totalProcessed: 148,
    narrationsBuilt: 592,
    avgLatency: "0.85s",
    activeEngine: "Cascading v1.1"
  });

  // API Config Status
  const [configStatus, setConfigStatus] = useState<{
    geminiConfigured: boolean;
    fireworksConfigured: boolean;
    fireworksModel: string;
    availableModels?: string[];
  } | null>(null);

  const fetchConfigStatus = async () => {
    try {
      const res = await fetch("/api/config-status");
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch configuration status:", err);
    }
  };

  useEffect(() => {
    fetchConfigStatus();
  }, []);

  // TTS Voice States
  const [selectedVoice, setSelectedVoice] = useState<string>("Kore");
  const [playingStyle, setPlayingStyle] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Copy success states
  const [copiedStyle, setCopiedStyle] = useState<string | null>(null);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mediaType = getMediaType(file);
      if (!mediaType) {
        setError("Unsupported file format. Please choose a valid video, audio, or image file.");
        return;
      }
      
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        setError("File size exceeds 25MB. Please choose a smaller file.");
        return;
      }
      
      setUploadedFile(file);
      setError(null);
      setIsProcessingFile(true);
      
      // Generate object URL for preview
      const objectUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(objectUrl);

      // Convert to Base64
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result) {
          const base64String = result.split(",")[1];
          setVideoBase64(base64String);
        } else {
          setError("Failed to process the uploaded file.");
        }
        setIsProcessingFile(false);
      };
      reader.onerror = () => {
        setError("Error reading the uploaded file.");
        setIsProcessingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setVideoBase64("");
    setIsProcessingFile(false);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl("");
    }
  };

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const mediaType = getMediaType(file);
      if (!mediaType) {
        setError("Unsupported file format. Please drop a valid video, audio, or image file.");
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setError("File size exceeds 25MB. Please select a smaller file.");
        return;
      }

      setUploadedFile(file);
      setError(null);
      setIsProcessingFile(true);
      setVideoPreviewUrl(URL.createObjectURL(file));

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result) {
          const base64String = result.split(",")[1];
          setVideoBase64(base64String);
        } else {
          setError("Failed to process the dropped file.");
        }
        setIsProcessingFile(false);
      };
      reader.onerror = () => {
        setError("Error reading the dropped file.");
        setIsProcessingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Preset Selection Handler
  const handlePresetSelect = (preset: PresetVideo) => {
    setSelectedPresetId(preset.id);
    setManualDescription(preset.description);
  };

  // Submit Generation Request
  const handleGenerate = async () => {
    setLoading(true);
    setLoadingStep(1);
    setError(null);
    setResults(null);

    // Stop active audio if any
    stopAudio();

    // Fake steps timer for gorgeous loader UX
    const stepTimer = setInterval(() => {
      setLoadingStep(prev => (prev < 4 ? prev + 1 : 4));
    }, 1200);

    try {
      const payload: any = {
        temperature,
        customPrompt,
        engine,
      };

      if (sourceType === "preset") {
        payload.description = manualDescription;
      } else {
        if (!videoBase64) {
          throw new Error("Please upload a media file first.");
        }
        payload.videoBase64 = videoBase64;
        payload.videoMimeType = getMimeType(uploadedFile);
        if (manualDescription) {
          payload.description = manualDescription;
        }
      }

      const response = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to generate captions.");
      }

      clearInterval(stepTimer);
      setResults(data);
      setStats(prev => ({
        ...prev,
        totalProcessed: prev.totalProcessed + 1,
        narrationsBuilt: prev.narrationsBuilt + 4
      }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  };

  // Copy Caption to Clipboard
  const copyToClipboard = (text: string, styleName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStyle(styleName);
    setTimeout(() => setCopiedStyle(null), 2000);
  };

  // Convert 24kHz 16-bit Mono RAW PCM to a playable WAV Blob URL
  const convertPcmToWav = (base64Pcm: string, sampleRate: number = 24000): string => {
    const binaryString = window.atob(base64Pcm);
    const len = binaryString.length;
    const pcmBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      pcmBytes[i] = binaryString.charCodeAt(i);
    }

    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    const writeStringHelper = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    /* RIFF identifier */
    writeStringHelper(0, "RIFF");
    /* file length */
    view.setUint32(4, 36 + len, true);
    /* RIFF type */
    writeStringHelper(8, "WAVE");
    /* format chunk identifier */
    writeStringHelper(12, "fmt ");
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM = 1) */
    view.setUint16(20, 1, true);
    /* channel count (Mono = 1) */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align */
    view.setUint16(32, 2, true);
    /* bits per sample (16-bit) */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeStringHelper(36, "data");
    /* chunk length */
    view.setUint32(40, len, true);

    const wavBytes = new Uint8Array(44 + len);
    wavBytes.set(new Uint8Array(wavHeader), 0);
    wavBytes.set(pcmBytes, 44);

    const blob = new Blob([wavBytes], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  };

  // Play Text-to-Speech Audio
  const playSpeech = async (text: string, styleName: string) => {
    if (playingStyle === styleName) {
      stopAudio();
      return;
    }

    // Stop current audio if any
    stopAudio();
    setPlayingStyle(styleName);

    try {
      const response = await fetch("/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate TTS.");
      }

      const audioUrl = convertPcmToWav(data.audioBase64, 24000);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      
      audio.onended = () => {
        setPlayingStyle(null);
        activeAudioRef.current = null;
      };

      await audio.play();
    } catch (err: any) {
      console.error("TTS Playback Error:", err);
      setError("Failed to play Speech: " + (err.message || "TTS service unavailable."));
      setPlayingStyle(null);
    }
  };

  const stopAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setPlayingStyle(null);
  };

  return (
    <div className="space-y-8" id="playground-tab-root">
      
      {/* Intro Banner: Vercel-like sleek card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#121829] to-[#0b0e17] rounded-2xl border border-slate-800/80 p-6 md:p-8" id="intro-banner">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-60 h-60 bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-semibold tracking-wider uppercase border border-indigo-500/20 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Multi-Voice Synthesis
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight font-sans text-white">
              VibeSync Video Playground
            </h2>
            <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
              Compose intelligent multi-perspective voice scripts and styled subtitling models natively. Provide a developer preset scenario or drop your own MP4 video.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-300">
            <span className="px-3 py-1.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-indigo-300">📋 Formal</span>
            <span className="px-3 py-1.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-violet-300">🙄 Sarcastic</span>
            <span className="px-3 py-1.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-emerald-300">💻 Tech Humor</span>
            <span className="px-3 py-1.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-amber-300">🎨 Real Life</span>
          </div>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard-grid">
        {[
          { label: "Total Clips Styled", value: stats.totalProcessed, icon: Video, color: "text-indigo-400" },
          { label: "Narrations Generated", value: stats.narrationsBuilt, icon: Layers, color: "text-violet-400" },
          { label: "Active Latency", value: stats.avgLatency, icon: Activity, color: "text-emerald-400" },
          { label: "Engine Pipeline", value: stats.activeEngine, icon: Database, color: "text-amber-400" },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div 
              key={idx}
              className="bg-[#111625]/90 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-md relative group hover:border-slate-700/80 transition-all"
            >
              <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800/60 group-hover:scale-110 transition-transform ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{item.label}</div>
                <div className="text-base font-extrabold text-white">{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="playground-controls-grid">
        
        {/* Left Column: Video and Presets */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-6 space-y-5" id="source-selector-card">
            
            {/* Source Tab Toggle */}
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-4">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" /> Video Resource
              </h3>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/60">
                <button
                  id="preset-mode-btn"
                  onClick={() => {
                    setSourceType("preset");
                    const preset = PRESET_VIDEOS.find(p => p.id === selectedPresetId);
                    if (preset) setManualDescription(preset.description);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sourceType === "preset"
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Presets
                </button>
                <button
                  id="upload-mode-btn"
                  onClick={() => {
                    setSourceType("upload");
                    setManualDescription("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sourceType === "upload"
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* Presets Mode */}
            {sourceType === "preset" && (
              <div className="space-y-4 animate-fadeIn" id="presets-container">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Choose an intelligent video mockup scenario representing typical short presentation formats:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {PRESET_VIDEOS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        id={`preset-card-${preset.id}`}
                        onClick={() => handlePresetSelect(preset)}
                        className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group ${
                          isSelected
                            ? "bg-[#161d33] border-indigo-500/40 shadow-lg shadow-indigo-950/20"
                            : "bg-[#0b0e17]/80 border-slate-800/80 hover:border-slate-700 hover:bg-[#0f1420]"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-bl-lg" />
                        )}
                        <div className="font-bold text-xs text-white flex items-center gap-2 mb-1.5">
                          <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'} transition-colors`}>
                            <Video className="w-3.5 h-3.5" />
                          </span>
                          {preset.title}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed pl-1">
                          {preset.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500 pl-1">
                          <span>Vibe: {preset.vibe}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-600" /> {preset.duration}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload Mode */}
            {sourceType === "upload" && (
              <div className="space-y-4 animate-fadeIn" id="upload-container">
                <input
                  type="file"
                  ref={fileInputRef}
                  id="video-uploader"
                  accept="video/*,audio/*,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessingFile}
                />
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!uploadedFile && !isProcessingFile) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative group ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-500/5 shadow-inner"
                      : uploadedFile
                      ? "border-emerald-500/40 bg-emerald-500/[0.02] cursor-default"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/75 cursor-pointer"
                  }`}
                >
                  {isProcessingFile ? (
                    <div className="space-y-3 py-6 flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      <p className="text-xs text-slate-200 font-bold">Encoding media asset...</p>
                      <p className="text-[10px] text-slate-500">Preparing high-fidelity stream for pipeline routing</p>
                    </div>
                  ) : !uploadedFile ? (
                    <div className="space-y-3">
                      <div className="mx-auto w-10 h-10 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-105 transition-all">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">
                          Drag and drop your media file here
                        </p>
                        <p className="text-[10px] text-slate-500">
                          or click to browse local storage (Max file size: 25MB)
                        </p>
                        <p className="text-[9px] text-indigo-400">
                          Supports MP4, MOV, MP3, WAV, PNG, JPG
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-left relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-400 border border-emerald-500/20">
                          {getMediaType(uploadedFile) === "image" ? (
                            <Image className="w-4 h-4" />
                          ) : getMediaType(uploadedFile) === "audio" ? (
                            <FileAudio className="w-4 h-4" />
                          ) : (
                            <Video className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200 line-clamp-1">{uploadedFile.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUploadedFile();
                        }}
                        className="p-1.5 bg-slate-900 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-slate-800 hover:border-red-500/20 transition-all cursor-pointer relative z-20"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Instant Media Preview inside custom glass box */}
                {videoPreviewUrl && uploadedFile && (
                  <div className="rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 p-2 relative shadow-inner group">
                    <div className="absolute top-4 left-4 z-20 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[9px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                      LIVE MEDIA PLAYER ({getMediaType(uploadedFile)?.toUpperCase()})
                    </div>
                    {getMediaType(uploadedFile) === "video" && (
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full h-auto max-h-[260px] rounded-xl object-contain bg-black"
                      />
                    )}
                    {getMediaType(uploadedFile) === "audio" && (
                      <div className="w-full p-8 bg-[#0b0e17] rounded-xl border border-slate-800/60 flex flex-col items-center justify-center space-y-4">
                        <Volume2 className="w-12 h-12 text-indigo-400 animate-pulse" />
                        <audio
                          src={videoPreviewUrl}
                          controls
                          className="w-full font-sans text-xs"
                        />
                      </div>
                    )}
                    {getMediaType(uploadedFile) === "image" && (
                      <img
                        src={videoPreviewUrl}
                        alt="Uploaded preview"
                        className="w-full h-auto max-h-[260px] rounded-xl object-contain bg-black"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Visual Metadata Override Textarea */}
            <div className="space-y-2">
              <label htmlFor="description-input" className="block text-xs font-bold text-slate-300">
                Visual Context & Scene Breakdown
              </label>
              <textarea
                id="description-input"
                rows={3}
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder={
                  sourceType === "preset"
                    ? "Choose a preset above..."
                    : "Describe key action, visual cues, emotions, and settings to give the engine extra context about the clip..."
                }
                className="w-full text-slate-200 text-xs p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed font-sans placeholder:text-slate-600"
              />
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                Provide specific frame cues, text logs, or project details to yield accurate voice overlays.
              </p>
            </div>

          </div>
        </div>

        {/* Right Column: Style configuration & action trigger */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-6 space-y-5" id="engine-selector-card">
            
            <h3 className="font-semibold text-white text-base flex items-center gap-2 border-b border-slate-800/60 pb-4">
              <Sliders className="w-4 h-4 text-violet-400" /> Synthesis Configuration
            </h3>

            {/* Model Engine Select */}
            <div className="space-y-2" id="ai-engine-control">
              <label htmlFor="ai-engine-select" className="block text-xs font-bold text-slate-300">
                Styling Translation Engine
              </label>
              <select
                id="ai-engine-select"
                value={engine}
                onChange={(e) => setEngine(e.target.value as any)}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200 font-semibold"
              >
                <option value="hybrid">⚡ Hybrid Cascade (Vision Understanding + High-Speed Styling)</option>
                <option value="fireworks">🚀 High-Throughput Styling (Ultra-fast / Zero Cloud Queue)</option>
                <option value="gemini">🔵 High-Fidelity Multimodal (Standard Pipeline)</option>
              </select>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {engine === "hybrid" && "Leverages multimodal vision mapping with high-throughput styling engines. Optimized for speed and quality."}
                {engine === "fireworks" && "High-speed text-to-style pipeline designed for massive throughput and ultra-low latency."}
                {engine === "gemini" && "Full end-to-end multimodal pipeline utilizing native attention layers."}
              </p>

              {/* API Integration Status Widget */}
              <div className="mt-3.5 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5" id="api-status-widget">
                <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-800/40 pb-2">
                  <span className="text-slate-400">API Connection Status</span>
                  <button 
                    onClick={fetchConfigStatus}
                    className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                    title="Refresh connection status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Google Gemini API</span>
                    {configStatus ? (
                      configStatus.geminiConfigured ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold font-mono text-[10px] bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Missing
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Checking...</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium font-sans">Fireworks AI Engine</span>
                    {configStatus ? (
                      configStatus.fireworksConfigured ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold font-mono text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Setup Required
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Checking...</span>
                    )}
                  </div>
                </div>

                {configStatus && configStatus.fireworksConfigured && (
                  <div className="pt-2 border-t border-slate-800/40 space-y-1.5" id="fireworks-accessible-models">
                    <span className="text-[10px] font-bold text-indigo-400 font-mono block">Accessible Fireworks Models:</span>
                    {configStatus.availableModels && configStatus.availableModels.length > 0 ? (
                      <div className="max-h-[85px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                        {configStatus.availableModels.slice(0, 4).map((model) => (
                          <div key={model} className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 bg-slate-900/60 border border-slate-800/50 px-1.5 py-0.5 rounded">
                            <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                            <span className="truncate" title={model}>
                              {model.replace("accounts/fireworks/models/", "")}
                            </span>
                          </div>
                        ))}
                        {configStatus.availableModels.length > 4 && (
                          <div className="text-[8px] font-mono text-slate-500 text-center pt-0.5">
                            + {configStatus.availableModels.length - 4} more models accessible
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[9px] text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded p-1.5 leading-normal">
                        No custom serverless models returned from API key. The system will fallback to default cascading (Llama 3.3/3.1) and Gemini.
                      </div>
                    )}
                  </div>
                )}

                {configStatus && !configStatus.fireworksConfigured && (engine === "fireworks" || engine === "hybrid") && (
                  <div className="pt-2 border-t border-slate-800/40 text-[10px] text-slate-400 space-y-2 leading-relaxed">
                    <div className="flex gap-1.5 text-indigo-300 font-bold items-start">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>How to Configure Fireworks API:</span>
                    </div>
                    <ol className="list-decimal list-inside pl-1 space-y-1 text-slate-400 font-sans">
                      <li>Go to <strong className="text-slate-300 font-medium">Settings</strong> in your AI Studio editor menu (top right).</li>
                      <li>Add a new secret/environment variable.</li>
                      <li>Set the Key name to <code className="text-indigo-400 bg-indigo-500/5 px-1 py-0.5 rounded border border-indigo-500/10 font-mono text-[10px]">FIREWORKS_API_KEY</code>.</li>
                      <li>Paste your Fireworks API key as the Value.</li>
                    </ol>
                    <p className="text-[9px] text-slate-500 italic mt-1 font-sans">
                      *Connecting Fireworks shifts high-throughput styling away from Gemini, boosting reliability when Gemini is overloaded.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Slider control: Temperature */}
            <div className="space-y-2" id="temperature-control">
              <div className="flex justify-between items-center">
                <label htmlFor="temp-slider" className="text-xs font-bold text-slate-300">
                  Creative Stylization Bias
                </label>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/25">
                  Temp: {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                id="temp-slider"
                min="0.2"
                max="1.2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>Standard (0.2)</span>
                <span>Hyper-Creative (1.2)</span>
              </div>
            </div>

            {/* TTS Voice Select */}
            <div className="space-y-2" id="tts-voice-control">
              <label htmlFor="tts-voice-select" className="block text-xs font-bold text-slate-300">
                Text-To-Speech Narrator Voice
              </label>
              <select
                id="tts-voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200 font-semibold"
              >
                {TTS_VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Choose the perfect narrator persona to read the styled captions out loud dynamically.
              </p>
            </div>

            {/* Custom Directives / Constraints */}
            <div className="space-y-2" id="custom-directives-control">
              <label htmlFor="custom-instructions-input" className="block text-xs font-bold text-slate-300">
                Visual Accents & Custom Prompts
              </label>
              <input
                type="text"
                id="custom-instructions-input"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Reference 'Docker logs', make it extra sarcastic..."
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200 placeholder:text-slate-600"
              />
              <p className="text-[10px] text-slate-500">
                Inject custom phrases or stylistic directives straight into the subtitle generator.
              </p>
            </div>

            {/* Generation Trigger Button */}
            <div className="pt-2" id="action-trigger-container">
              <button
                id="generate-captions-btn"
                onClick={handleGenerate}
                disabled={loading || (sourceType === "upload" && !videoBase64)}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase shadow-lg transition-all flex items-center justify-center gap-2 text-white ${
                  loading 
                    ? "bg-slate-800 cursor-not-allowed text-slate-500 border border-slate-700/60" 
                    : sourceType === "upload" && !videoBase64
                    ? "bg-indigo-600/30 text-indigo-300/50 cursor-not-allowed border border-indigo-500/10"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 active:scale-[0.98] border border-indigo-500/20 shadow-indigo-950/40"
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    Cascade Pipeline Active...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-indigo-300" />
                    Compose Styled Captions
                  </>
                )}
              </button>
              {sourceType === "upload" && !videoBase64 && (
                <span className="block text-center text-[9px] text-slate-500 mt-2 font-mono">
                  *Awaiting local media attachment before synthesis.
                </span>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Error state display */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5 flex items-start gap-4 text-left" 
            id="playground-error-card"
          >
            <div className="p-1.5 bg-red-500/15 rounded-lg text-red-400 border border-red-500/20">
              <ShieldAlert className="w-5 h-5 shrink-0" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-300">Processing Interrupted</h4>
              <p className="text-xs text-red-400/90 leading-relaxed font-sans">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Multi-Step Loading Screen */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-[#111625] rounded-2xl border border-slate-800/80 p-10 text-center flex flex-col items-center justify-center space-y-6 relative overflow-hidden" 
            id="playground-loading-card"
          >
            {/* Spinning loading halo */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-900 border-t-indigo-500 border-r-violet-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-indigo-400 absolute top-5 left-5 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-extrabold text-white">
                Cascading Generation Suite Active
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Synthesizing multi-modal frame matrices, transcribing audio waveforms, and applying custom creative styles...
              </p>
            </div>

            {/* Gorgeous Multi-Step Visual Checklist */}
            <div className="w-full max-w-sm bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 text-left font-mono text-[11px]">
              {[
                { step: 1, text: "Extracting temporal video features and vision cues" },
                { step: 2, text: "Feeding keyframes into Gemini native attention layers" },
                { step: 3, text: "Formatting styled humorous text logs via high-throughput LLM" },
                { step: 4, text: "Rendering audio vocalizations for active voice-over tracks" }
              ].map((s) => {
                const isPassed = loadingStep > s.step;
                const isActive = loadingStep === s.step;
                return (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isPassed ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      isActive ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse" :
                      "bg-slate-900 text-slate-600 border border-slate-800/80"
                    }`}>
                      {isPassed ? "✓" : s.step}
                    </div>
                    <span className={`${
                      isPassed ? "text-slate-400 line-through" :
                      isActive ? "text-indigo-300 font-semibold" :
                      "text-slate-600"
                    }`}>
                      {s.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Bento Layout - styled with individual glows */}
      <AnimatePresence>
        {results && !loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6" 
            id="playground-results-container"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" /> Synthesized Narration Styles
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Output status:</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono border border-emerald-500/25">Cached & Playable</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left" id="results-bento-grid">
              
              {/* 1. Formal Style (Sleek Emerald theme) */}
              <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4 shadow-md hover:border-emerald-500/25 transition-all group relative overflow-hidden" id="caption-card-formal">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 text-[9px] font-bold uppercase tracking-wider rounded-lg font-mono">
                      📋 Formal Accessibility
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Structured & Clear</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    {results.formal}
                  </p>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-slate-800/60">
                  {playingStyle === "formal" ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite]" />
                        <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.15s]" />
                        <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.3s]" />
                        <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.45s]" />
                      </div>
                      <span>Narration playing</span>
                    </div>
                  ) : <span className="text-[10px] text-slate-500 font-mono">Click to play synthesized track</span>}
                  
                  <div className="flex justify-end gap-2">
                    <button
                      id="tts-btn-formal"
                      onClick={() => playSpeech(results.formal, "formal")}
                      className={`p-2 rounded-lg text-slate-400 hover:text-emerald-400 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-emerald-500/30 transition-all ${
                        playingStyle === "formal" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 animate-pulse" : ""
                      }`}
                      title={playingStyle === "formal" ? "Stop Voice" : "Voice Over (TTS)"}
                    >
                      {playingStyle === "formal" ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      id="copy-btn-formal"
                      onClick={() => copyToClipboard(results.formal, "formal")}
                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-emerald-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                    >
                      {copiedStyle === "formal" ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 text-[10px] font-mono">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Sarcastic Style (Sleek Purple/Violet theme) */}
              <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4 shadow-md hover:border-violet-500/25 transition-all group relative overflow-hidden" id="caption-card-sarcastic">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/[0.02] rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-violet-500/10 text-violet-300 border border-violet-500/25 text-[9px] font-bold uppercase tracking-wider rounded-lg font-mono">
                      🙄 Sarcastic Commentary
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Cynical / Dry Humor</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans italic">
                    "{results.sarcastic}"
                  </p>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-slate-800/60">
                  {playingStyle === "sarcastic" ? (
                    <div className="flex items-center gap-1.5 text-xs text-violet-400 font-mono">
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-2.5 bg-violet-400 rounded-full animate-[bounce_0.8s_infinite]" />
                        <span className="w-0.5 h-3 bg-violet-400 rounded-full animate-[bounce_0.8s_infinite_0.15s]" />
                        <span className="w-0.5 h-1.5 bg-violet-400 rounded-full animate-[bounce_0.8s_infinite_0.3s]" />
                        <span className="w-0.5 h-2.5 bg-violet-400 rounded-full animate-[bounce_0.8s_infinite_0.45s]" />
                      </div>
                      <span>Narration playing</span>
                    </div>
                  ) : <span className="text-[10px] text-slate-500 font-mono">Click to play synthesized track</span>}
                  
                  <div className="flex justify-end gap-2">
                    <button
                      id="tts-btn-sarcastic"
                      onClick={() => playSpeech(results.sarcastic, "sarcastic")}
                      className={`p-2 rounded-lg text-slate-400 hover:text-violet-400 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-violet-500/30 transition-all ${
                        playingStyle === "sarcastic" ? "bg-violet-500/15 text-violet-300 border-violet-500/40 animate-pulse" : ""
                      }`}
                      title={playingStyle === "sarcastic" ? "Stop Voice" : "Voice Over (TTS)"}
                    >
                      {playingStyle === "sarcastic" ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      id="copy-btn-sarcastic"
                      onClick={() => copyToClipboard(results.sarcastic, "sarcastic")}
                      className="p-2 rounded-lg text-slate-400 hover:text-violet-400 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-violet-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                    >
                      {copiedStyle === "sarcastic" ? (
                        <>
                          <Check className="w-4 h-4 text-violet-400" />
                          <span className="text-violet-400 text-[10px] font-mono">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Humorous Tech (Sleek Indigo/Coder theme) */}
              <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4 shadow-md hover:border-indigo-500/25 transition-all group relative overflow-hidden" id="caption-card-humor-tech">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.02] rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 text-[9px] font-bold uppercase tracking-wider rounded-lg font-mono">
                      💻 Humorous Tech Logs
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Developer Perspective</span>
                  </div>
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/60 text-[11px] font-mono leading-relaxed text-indigo-300 select-all">
                    <span className="text-slate-600 select-none"># trace-logs.err</span>
                    <p className="mt-1 font-mono">
                      {results.humorousTech}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-slate-800/60">
                  {playingStyle === "humorousTech" ? (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-mono">
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-2.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite]" />
                        <span className="w-0.5 h-3 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite_0.15s]" />
                        <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite_0.3s]" />
                        <span className="w-0.5 h-2.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite_0.45s]" />
                      </div>
                      <span>Narration playing</span>
                    </div>
                  ) : <span className="text-[10px] text-slate-500 font-mono">Click to play synthesized track</span>}
                  
                  <div className="flex justify-end gap-2">
                    <button
                      id="tts-btn-humorousTech"
                      onClick={() => playSpeech(results.humorousTech, "humorousTech")}
                      className={`p-2 rounded-lg text-slate-400 hover:text-indigo-400 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/30 transition-all ${
                        playingStyle === "humorousTech" ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/40 animate-pulse" : ""
                      }`}
                      title={playingStyle === "humorousTech" ? "Stop Voice" : "Voice Over (TTS)"}
                    >
                      {playingStyle === "humorousTech" ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      id="copy-btn-humorousTech"
                      onClick={() => copyToClipboard(results.humorousTech, "humorousTech")}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                    >
                      {copiedStyle === "humorousTech" ? (
                        <>
                          <Check className="w-4 h-4 text-indigo-400" />
                          <span className="text-indigo-400 text-[10px] font-mono">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Humorous Non-Tech Style (Sleek Amber/Relatable theme) */}
              <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4 shadow-md hover:border-amber-500/25 transition-all group relative overflow-hidden" id="caption-card-humor-nontech">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.02] rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9px] font-bold uppercase tracking-wider rounded-lg font-mono">
                      🎨 Humorous Non-Tech
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Real-World Analogies</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    {results.humorousNonTech}
                  </p>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-slate-800/60">
                  {playingStyle === "humorousNonTech" ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-2.5 bg-amber-400 rounded-full animate-[bounce_0.8s_infinite]" />
                        <span className="w-0.5 h-3 bg-amber-400 rounded-full animate-[bounce_0.8s_infinite_0.15s]" />
                        <span className="w-0.5 h-1.5 bg-amber-400 rounded-full animate-[bounce_0.8s_infinite_0.3s]" />
                        <span className="w-0.5 h-2.5 bg-amber-400 rounded-full animate-[bounce_0.8s_infinite_0.45s]" />
                      </div>
                      <span>Narration playing</span>
                    </div>
                  ) : <span className="text-[10px] text-slate-500 font-mono">Click to play synthesized track</span>}
                  
                  <div className="flex justify-end gap-2">
                    <button
                      id="tts-btn-humorousNonTech"
                      onClick={() => playSpeech(results.humorousNonTech, "humorousNonTech")}
                      className={`p-2 rounded-lg text-slate-400 hover:text-amber-400 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-amber-500/30 transition-all ${
                        playingStyle === "humorousNonTech" ? "bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse" : ""
                      }`}
                      title={playingStyle === "humorousNonTech" ? "Stop Voice" : "Voice Over (TTS)"}
                    >
                      {playingStyle === "humorousNonTech" ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      id="copy-btn-humorousNonTech"
                      onClick={() => copyToClipboard(results.humorousNonTech, "humorousNonTech")}
                      className="p-2 rounded-lg text-slate-400 hover:text-amber-400 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-amber-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                    >
                      {copiedStyle === "humorousNonTech" ? (
                        <>
                          <Check className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 text-[10px] font-mono">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
