import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  FileText, Image, Presentation, Code, Globe, Sparkles, 
  CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Download, 
  Play, BookOpen, Settings, ListTodo
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { COPILOT_PROMPTS } from "../data";
import { SubmissionData } from "../types";

export default function SubmissionHubTab() {
  // Default values for standard project submission
  const [formData, setFormData] = useState<SubmissionData>({
    title: "VibeSync Captioner",
    shortDescription: "A premium AI-powered video captioning pipeline that generates highly contextual, multi-voice subtitles and narrated audio tracks.",
    longDescription: "VibeSync Captioner is a high-performance video captioning playground and styling pipeline. It accepts short video clips and processes them through an optimized Express backend with multi-engine cascading support. The engine instantly synthesizes customized subtitles across four distinctive modes: formal narration, dry sarcastic humor, light-hearted tech commentary, and relatable real-world analogies. It also bundles full Text-to-Speech audio options so users can hear custom narrations play back in real-time.",
    tags: "TypeScript, React, Express, Vite, Tailwind CSS, Docker, High-Throughput API",
    coverImageUrl: "https://unsplash.com/photos/V3js0huX5P0",
    videoPresentationUrl: "https://youtu.be/ZAXLcrMkfUA",
    slidePresentationUrl: "https://docs.google.com/presentation/d/1NyPbLQ_9-KTOIaa0va69jbX2oBYRzYhk/edit?usp=sharing&ouid=101306952013196198287&rtpof=true&sd=true",
    githubUrl: "https://github.com/vansh-gautam-bit/vibesync-captioner",
    demoPlatform: "Google Cloud Run",
    appUrl: "https://ais-pre-kp73cmw7wqihxjkhf7okvi-967387521715.asia-east1.run.app",
    isContainerized: true,
    hasReadme: true,
    isRunnable: true
  });

  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotResult, setCopilotResult] = useState<string | null>(null);
  const [copilotMode, setCopilotMode] = useState<string | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [copiedCopilot, setCopiedCopilot] = useState<boolean>(false);

  // Form Change Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Checkbox state toggles
  const handleCheckboxToggle = (name: keyof SubmissionData) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Realtime Completeness Score Calculator
  const getCompletenessStats = () => {
    let score = 0;
    const items = [
      { name: "Title", met: !!formData.title },
      { name: "Short Description", met: !!formData.shortDescription && formData.shortDescription.length > 20 },
      { name: "Long Description", met: !!formData.longDescription && formData.longDescription.length > 50 },
      { name: "Tech Tags", met: !!formData.tags },
      { name: "Cover Image", met: !!formData.coverImageUrl },
      { name: "Video Presentation", met: !!formData.videoPresentationUrl },
      { name: "Slide Presentation", met: !!formData.slidePresentationUrl },
      { name: "GitHub Repo", met: !!formData.githubUrl },
      { name: "App Hosting Platform", met: !!formData.demoPlatform },
      { name: "Application URL", met: !!formData.appUrl },
      { name: "Dockerized Check", met: formData.isContainerized },
      { name: "README Check", met: formData.hasReadme },
      { name: "Runnable Check", met: formData.isRunnable }
    ];

    const metCount = items.filter(item => item.met).length;
    const pct = Math.round((metCount / items.length) * 100);

    return { pct, items };
  };

  const { pct: scorePct, items: scoreItems } = getCompletenessStats();

  // Call Submission Helper AI
  const runCopilotAction = async (mode: string) => {
    setCopilotLoading(true);
    setCopilotError(null);
    setCopilotResult(null);
    setCopilotMode(mode);

    try {
      const response = await fetch("/api/refine-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          projectData: formData
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to communicate with AI helper.");
      }

      setCopilotResult(data.refinedText);
    } catch (err: any) {
      console.error(err);
      setCopilotError(err.message || "An unexpected error occurred during AI refinement.");
    } finally {
      setCopilotLoading(false);
    }
  };

  // Copy AI output
  const handleCopyCopilot = () => {
    if (copilotResult) {
      navigator.clipboard.writeText(copilotResult);
      setCopiedCopilot(true);
      setTimeout(() => setCopiedCopilot(false), 2000);
    }
  };

  // Download AI output
  const handleDownloadCopilot = () => {
    if (!copilotResult) return;
    
    let filename = "submission-asset.md";
    if (copilotMode === "readme") filename = "README.md";
    else if (copilotMode === "docker") filename = "Dockerfile";
    else if (copilotMode === "refine-description") filename = "refined_descriptions.md";

    const element = document.createElement("a");
    const file = new Blob([copilotResult], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8" id="submission-hub-root">
      
      {/* Left Column: Form Sections & Requirements */}
      <div className="xl:col-span-7 space-y-6 text-left">
        
        {/* Basic Info Form */}
        <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-6 space-y-5" id="form-basic-info">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-base">Basic Information</h3>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="form-title" className="text-xs font-bold text-slate-300">Project Title</label>
              <input
                type="text"
                id="form-title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
                placeholder="Name your video captioning engine"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label htmlFor="form-tags" className="text-xs font-bold text-slate-300">Technology & Category Tags</label>
              <input
                type="text"
                id="form-tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
                placeholder="TypeScript, React, Gemini API, Docker, Express"
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <label htmlFor="form-shortDescription" className="text-xs font-bold text-slate-300">Short Description (lablab.ai Card)</label>
              <input
                type="text"
                id="form-shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleInputChange}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
                placeholder="High-impact pitch sentence under 150 chars"
              />
            </div>

            {/* Long Description */}
            <div className="space-y-1.5">
              <label htmlFor="form-longDescription" className="text-xs font-bold text-slate-300">Long Description (Detailed Overview)</label>
              <textarea
                id="form-longDescription"
                name="longDescription"
                rows={4}
                value={formData.longDescription}
                onChange={handleInputChange}
                className="w-full text-xs p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200 leading-relaxed placeholder:text-slate-600"
                placeholder="Describe your implementation, unique pipeline features, and visual architecture..."
              />
            </div>
          </div>
        </div>

        {/* Presentation & Graphics Form */}
        <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-6 space-y-5" id="form-media">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">
              <Presentation className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-base">Cover Image and Presentations</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="form-coverImageUrl" className="text-xs font-bold text-slate-300">Cover Image URL</label>
              <input
                type="text"
                id="form-coverImageUrl"
                name="coverImageUrl"
                value={formData.coverImageUrl}
                onChange={handleInputChange}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="form-videoPresentationUrl" className="text-xs font-bold text-slate-300">Video Presentation Link</label>
              <input
                type="text"
                id="form-videoPresentationUrl"
                name="videoPresentationUrl"
                value={formData.videoPresentationUrl}
                onChange={handleInputChange}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
                placeholder="https://youtu.be/..."
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="form-slidePresentationUrl" className="text-xs font-bold text-slate-300">Slide Presentation URL</label>
              <input
                type="text"
                id="form-slidePresentationUrl"
                name="slidePresentationUrl"
                value={formData.slidePresentationUrl}
                onChange={handleInputChange}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
                placeholder="https://docs.google.com/presentation/d/..."
              />
            </div>
          </div>
        </div>

        {/* Code & Hosting Form */}
        <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-6 space-y-5" id="form-hosting">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-base">App Hosting and Code Repository</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="form-githubUrl" className="text-xs font-bold text-slate-300">Public GitHub Repository</label>
                <input
                  type="text"
                  id="form-githubUrl"
                  name="githubUrl"
                  value={formData.githubUrl}
                  onChange={handleInputChange}
                  className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
                  placeholder="https://github.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="form-demoPlatform" className="text-xs font-bold text-slate-300">Demo Application Platform</label>
                <input
                  type="text"
                  id="form-demoPlatform"
                  name="demoPlatform"
                  value={formData.demoPlatform}
                  onChange={handleInputChange}
                  className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
                  placeholder="Google Cloud Run, Vercel, Railway"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="form-appUrl" className="text-xs font-bold text-slate-300">Live Application URL</label>
              <input
                type="text"
                id="form-appUrl"
                name="appUrl"
                value={formData.appUrl}
                onChange={handleInputChange}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

      </div>

      {/* Right Column: Completeness Score, Requirements Checklist & AI Co-Pilot */}
      <div className="xl:col-span-5 space-y-6 text-left">
        
        {/* Progress & Verification Card */}
        <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-6 space-y-5 shadow-lg relative overflow-hidden" id="completeness-score-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/[0.02] rounded-full blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-400" /> Draft Completeness
            </h3>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">
              {scorePct}% Ready
            </span>
          </div>

          {/* Animated custom horizontal gauge */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-[2px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${scorePct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
            />
          </div>

          {/* Strict Hackathon Checklist */}
          <div className="space-y-3 pt-4 border-t border-slate-850" id="submission-checklist">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Rigorous Standards</p>
            
            <div className="space-y-3 text-xs">
              
              <button
                onClick={() => handleCheckboxToggle("isContainerized")}
                className="flex items-start gap-3 w-full text-left group transition-all"
                id="chk-containerized"
              >
                <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                  formData.isContainerized 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "border-slate-800 hover:border-indigo-500/40 bg-slate-950"
                }`}>
                  {formData.isContainerized && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-200 group-hover:text-white transition-colors">Containerized Deployment</p>
                  <p className="text-[10px] text-slate-500 leading-snug">Submission is fully Dockerized and runnable on production environments.</p>
                </div>
              </button>

              <button
                onClick={() => handleCheckboxToggle("hasReadme")}
                className="flex items-start gap-3 w-full text-left group transition-all"
                id="chk-readme"
              >
                <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                  formData.hasReadme 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "border-slate-800 hover:border-indigo-500/40 bg-slate-950"
                }`}>
                  {formData.hasReadme && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-200 group-hover:text-white transition-colors">Public Repository & README</p>
                  <p className="text-[10px] text-slate-500 leading-snug">Contains complete setup blueprints, parameters, and cascading specs.</p>
                </div>
              </button>

              <button
                onClick={() => handleCheckboxToggle("isRunnable")}
                className="flex items-start gap-3 w-full text-left group transition-all"
                id="chk-runnable"
              >
                <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                  formData.isRunnable 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "border-slate-800 hover:border-indigo-500/40 bg-slate-950"
                }`}>
                  {formData.isRunnable && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-200 group-hover:text-white transition-colors">Runnable Live Application URL</p>
                  <p className="text-[10px] text-slate-500 leading-snug">Exposes a fast sandbox deployment URL of this interactive player.</p>
                </div>
              </button>

            </div>
          </div>
        </div>

        {/* AI Co-Pilot Helper Panel */}
        <div className="bg-[#111625] rounded-2xl border border-slate-800/80 p-6 space-y-5" id="ai-copilot-card">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Submission Co-Pilot
            </h3>
            <span className="text-[9px] font-bold font-mono text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
              Gemini Pro Core
            </span>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed">
            Generate customized submission assets instantly. Choose a blueprint assistant template, and VibeSync will compile optimal files utilizing your current metadata.
          </p>

          {/* Prompt Templates with glowing hover effects */}
          <div className="grid grid-cols-2 gap-2.5" id="copilot-templates-grid">
            {[
              { id: "refine-description", label: "Refine Pitch", icon: FileText },
              { id: "readme", label: "Generate README", icon: BookOpen },
              { id: "docker", label: "Docker Config", icon: Code },
              { id: "expand-tags", label: "Expand Tagsets", icon: Globe }
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => runCopilotAction(t.id === "expand-tags" ? "refine-description" : t.id)}
                  disabled={copilotLoading}
                  className="p-3 text-left bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs flex flex-col justify-between h-20 transition-all select-none group"
                >
                  <Icon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-300 group-hover:text-white text-[11px] leading-tight mt-2">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* AI Result Box */}
          <AnimatePresence>
            {copilotLoading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center bg-slate-950 border border-slate-850 rounded-xl flex flex-col items-center justify-center space-y-3" 
                id="copilot-loader"
              >
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-300 font-mono">Synthesizing markdown template files...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {copilotError && (
            <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex gap-2 text-red-400 text-xs text-left animate-fadeIn" id="copilot-error">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{copilotError}</span>
            </div>
          )}

          {/* Co-Pilot results render with ReactMarkdown inside elegant glass scrollbox */}
          <AnimatePresence>
            {copilotResult && !copilotLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3" 
                id="copilot-result-box"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[10px]">BLUEPRINT MANIFEST</span>
                  <div className="flex gap-1.5">
                    <button
                      id="copilot-btn-copy"
                      onClick={handleCopyCopilot}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1 font-semibold text-[10px]"
                    >
                      {copiedCopilot ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      id="copilot-btn-download"
                      onClick={handleDownloadCopilot}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1 font-semibold text-[10px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div 
                  className="bg-slate-950 p-4 border border-slate-850 rounded-xl max-h-80 overflow-y-auto text-xs text-slate-300 font-sans leading-relaxed text-left space-y-4 shadow-inner" 
                  id="copilot-markdown-container"
                >
                  <div className="markdown-body">
                    <ReactMarkdown>{copilotResult}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
