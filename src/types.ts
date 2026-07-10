export interface PresetVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  iconName: "code" | "cat" | "coffee" | "rocket" | "terminal";
  vibe: string;
}

export interface GeneratedCaptions {
  formal: string;
  sarcastic: string;
  humorousTech: string;
  humorousNonTech: string;
}

export interface SubmissionData {
  title: string;
  shortDescription: string;
  longDescription: string;
  tags: string;
  coverImageUrl: string;
  videoPresentationUrl: string;
  slidePresentationUrl: string;
  githubUrl: string;
  demoPlatform: string;
  appUrl: string;
  isContainerized: boolean;
  hasReadme: boolean;
  isRunnable: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
