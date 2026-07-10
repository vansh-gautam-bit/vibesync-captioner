import { PresetVideo } from "./types";

export const PRESET_VIDEOS: PresetVideo[] = [
  {
    id: "spaghetti-code",
    title: "The Spaghetti Code Panic",
    description: "A developer looks highly confident while coding. Suddenly, their eyes widen in panic as the screen fills with thousands of red compiler errors. They freeze, stare blankly into their empty coffee mug, take a slow imaginary sip, and then slowly lower their forehead to rest on the desk.",
    duration: "0:45",
    iconName: "code",
    vibe: "Coder Despair"
  },
  {
    id: "feline-programmer",
    title: "Kitten Debugging Session",
    description: "An incredibly hyperactive, fluffy ginger kitten sits squarely on top of a mechanical keyboard. It bats frantically at the glowing RGB keys at lighting speed while staring intently at a screen filled with active VS Code terminals as if reviewing a major production pull request.",
    duration: "0:30",
    iconName: "cat",
    vibe: "Chaotic QA"
  },
  {
    id: "coffee-disaster",
    title: "Slow-Mo Coffee Spill",
    description: "A cinematic, ultra slow-motion shot of a cup of dark coffee tipping over on a pristine workspace. The dark liquid splashes majestically over a custom mechanical keyboard, creating mini-waves that submerge the custom keycaps as dramatic classical music swells in the background.",
    duration: "1:15",
    iconName: "coffee",
    vibe: "Slow-Mo Tragedy"
  },
  {
    id: "drone-fiasco",
    title: "The DIY Drone Wobble",
    description: "A proud builder tries to launch a custom-made, heavily soldered quadcopter in their backyard. The drone powers up with a deafening whine, wobbles violently, hovers exactly four inches above the grass, and then suddenly turns sideways, flying directly and gently into a bush.",
    duration: "1:40",
    iconName: "rocket",
    vibe: "Hardware Engineering"
  }
];

export const TTS_VOICES = [
  { id: "Kore", name: "Kore (Warm & Clear)", gender: "Female", description: "Narrator with a friendly, positive, and clear tone." },
  { id: "Zephyr", name: "Zephyr (Deep & Narrative)", gender: "Male", description: "A deep, professional voice for dramatic or formal statements." }
];

export const COPILOT_PROMPTS = [
  {
    title: "Refine Descriptions",
    label: "Refine Project Details",
    prompt: "Can you refine my current draft project title, short description, and long description to make them sound exceptionally compelling for a lablab.ai hackathon submission?"
  },
  {
    title: "Generate README.md",
    label: "Generate Submit README",
    prompt: "I need you to generate a comprehensive, visually stunning README.md file that clearly documents my video captioning pipeline, installation instructions, and how to configure environment variables."
  },
  {
    title: "Dockerize App",
    label: "Create Docker Configuration",
    prompt: "Can you draft a Dockerfile and docker-compose.yml configuration for containerizing my Express + Vite application so I can satisfy the submission requirements?"
  },
  {
    title: "Suggest Tech Tags",
    label: "Suggest Technology Tags",
    prompt: "What are some highly relevant, professional technology and category tags I can include in my basic info panel to showcase modern AI engineering?"
  }
];
