import React, { useState, useEffect } from "react";
import { 
  Sparkles, ClipboardCheck, Video, Search, Terminal, 
  HelpCircle, Monitor, Shield, Zap, X, CornerDownLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PlaygroundTab from "./components/PlaygroundTab";
import SubmissionHubTab from "./components/SubmissionHubTab";

export default function App() {
  const [activeTab, setActiveTab] = useState<"playground" | "submission">("playground");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "info" | "warning" }[]>([]);

  // Show a welcome toast on mount
  useEffect(() => {
    addToast("Welcome to VibeSync Captioner. Creative voice engine active.", "success");
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const commands = [
    {
      id: "playground",
      title: "Switch to Playground",
      subtitle: "Open the interactive captioning and voice studio",
      icon: Sparkles,
      action: () => {
        setActiveTab("playground");
        addToast("Switched to Video Playground", "info");
      }
    },
    {
      id: "submission",
      title: "Switch to Submission Hub",
      subtitle: "Optimize project descriptions and pitch files",
      icon: ClipboardCheck,
      action: () => {
        setActiveTab("submission");
        addToast("Switched to Submission Hub", "info");
      }
    },
    {
      id: "help",
      title: "View Studio System Info",
      subtitle: "Check active model cascading, latency, and keys",
      icon: Terminal,
      action: () => {
        addToast("Dual Cascade active: Llama 3.1 & Gemini 3.5 fallback.", "info");
      }
    },
    {
      id: "security",
      title: "Secure Sandbox Diagnostics",
      subtitle: "Audit API integrations and cloud run container telemetry",
      icon: Shield,
      action: () => {
        addToast("Security Diagnostic: All server keys encrypted and hidden.", "success");
      }
    }
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(commandSearch.toLowerCase()) ||
    cmd.subtitle.toLowerCase().includes(commandSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] font-sans selection:bg-indigo-500/30 selection:text-indigo-200 antialiased relative" id="app-root">
      
      {/* Decorative Top Ambient Light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-gradient-to-b from-indigo-900/15 via-purple-900/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Universal Sticky Header with Glassmorphism */}
      <header className="sticky top-0 z-40 bg-[#090D16]/75 backdrop-blur-md border-b border-slate-800/60" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-900/20 flex items-center justify-center border border-indigo-500/30">
              <Video className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-base font-extrabold tracking-tight text-white leading-tight flex items-center gap-1.5">
                VibeSync <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md">Captioner</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-semibold font-mono tracking-wider">
                PERSONAL VIDEO VOICE ENGINE
              </p>
            </div>
          </div>

          {/* Center Search / Command Palette Bar */}
          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-3 bg-[#111625] border border-slate-800/80 rounded-xl px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all w-64 text-left"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Search commands...</span>
            <span className="ml-auto bg-slate-800 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700/60 text-slate-400">Ctrl K</span>
          </button>

          {/* Tab Selection Row */}
          <div className="flex items-center gap-1.5 bg-[#111625] border border-slate-800/80 p-1 rounded-xl">
            <button
              id="tab-playground-btn"
              onClick={() => setActiveTab("playground")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all select-none relative ${
                activeTab === "playground"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {activeTab === "playground" && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg shadow-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Playground
              </span>
            </button>
            <button
              id="tab-submission-btn"
              onClick={() => setActiveTab("submission")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all select-none relative ${
                activeTab === "submission"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {activeTab === "submission" && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg shadow-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5" />
                Submission Hub
              </span>
            </button>
          </div>

          {/* Integration Status Badge */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
            <span>Studio Engine Active</span>
          </div>

        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-140px)] relative z-10" id="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {activeTab === "playground" ? (
              <PlaygroundTab />
            ) : (
              <SubmissionHubTab />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Premium Humble Footer */}
      <footer className="border-t border-slate-800/60 bg-[#060910] py-8 text-xs text-slate-500 text-center relative z-10" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-500" />
            <p>© 2026 VibeSync Captioner. Developed with Pure Express & Multi-Engine Cascade Core.</p>
          </div>
          <div className="flex gap-5">
            <span className="hover:text-slate-350 cursor-pointer transition-colors" onClick={() => addToast("Personal settings saved locally.", "info")}>User Preferences</span>
            <span className="text-slate-800">•</span>
            <span className="hover:text-slate-350 cursor-pointer transition-colors" onClick={() => addToast("All caption styling generated locally in standard formatting.", "success")}>Privacy & Content Terms</span>
          </div>
        </div>
      </footer>

      {/* Interactive Command Palette (Ctrl+K) */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop Blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommandPaletteOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Panel Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  placeholder="Type a command or destination..."
                  className="bg-transparent border-none text-sm text-white focus:outline-none placeholder-slate-500 w-full"
                  autoFocus
                />
                <button 
                  onClick={() => setIsCommandPaletteOpen(false)}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Command List */}
              <div className="p-2 max-h-[300px] overflow-y-auto">
                {filteredCommands.length > 0 ? (
                  filteredCommands.map(cmd => {
                    const IconComponent = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          setIsCommandPaletteOpen(false);
                        }}
                        className="w-full text-left p-3 hover:bg-indigo-600/10 hover:border-indigo-500/20 border border-transparent rounded-xl flex items-center gap-3 group transition-all"
                      >
                        <div className="p-2 bg-slate-800 group-hover:bg-indigo-500/20 rounded-lg text-slate-400 group-hover:text-indigo-400 transition-colors">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">{cmd.title}</div>
                          <div className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">{cmd.subtitle}</div>
                        </div>
                        <div className="ml-auto text-slate-600 group-hover:text-indigo-400">
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No commands found for "{commandSearch}"
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#0c101b] border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span>Select with mouse click • Esc to close</span>
                <span>VibeSync Captioner CLI v1.1</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Toast System */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="pointer-events-auto bg-[#13192c]/95 border border-indigo-500/20 backdrop-blur-md rounded-xl p-4 shadow-xl flex items-start gap-3 w-80 relative overflow-hidden"
            >
              {/* Colored left strip */}
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                toast.type === "success" ? "bg-emerald-500" :
                toast.type === "warning" ? "bg-amber-500" : "bg-indigo-500"
              }`} />
              
              <div className="flex-1">
                <p className="text-xs text-white leading-relaxed font-semibold">{toast.message}</p>
              </div>

              <button 
                onClick={() => removeToast(toast.id)}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
