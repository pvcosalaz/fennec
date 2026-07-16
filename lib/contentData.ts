// Content module types and defaults

export const CONTENT_LINES_KEY   = "fennec-content-lines-v4";
export const CONTENT_FORMATS_KEY = "fennec-content-formats-v4";
export const IDEAS_BANK_KEY      = "fennec-ideas-bank-v1";
export const POSTS_KEY           = "fennec-posts-v1";
export const BRIEFS_KEY          = "fennec-briefs-v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentLine = {
  id: string;
  name: string;
  isDefault?: boolean;
};

export type ContentFormat = {
  id: string;
  name: string;
  color: string;       // color-coded, like Trello
  description?: string;
  isDefault?: boolean;
};

export type IdeaCategory = "music-ideas" | "meme" | "frase" | "tutoriales" | "referencia";

export type Idea = {
  id: string;
  category: IdeaCategory;
  title: string;
  notes?: string;
  url?: string;
  createdAt: number;
};

export type Brief = {
  id: string;
  formatId: string;
  formatName: string;
  formatColor: string;
  lineId: string;
  lineName: string;
  title: string;
  script: string;
  /** Reference link the script was written from (a Quick Idea's URL, an
   *  Inspire video, etc.) — shown in the detail view. Optional: older
   *  briefs in localStorage don't have it. */
  refUrl?: string;
  createdAt: number;
};

export type PostStatus = "pending" | "produced" | "published";

export type Post = {
  id: string;
  lineId: string;
  lineName: string;
  formatId: string;
  formatName: string;
  formatColor: string;  // comes from format, used for calendar dots
  title: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  status: PostStatus;
  createdAt: number;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

// Formats: how you present the content (color-coded like Trello)
export const DEFAULT_FORMATS: ContentFormat[] = [
  { id: "broll-frase",      name: "B-roll with text overlay",        color: "#9b59b6", isDefault: true,
    description: "Background footage with a phrase or hook displayed as text on screen. No voice needed." },
  { id: "broll-desc",       name: "B-roll + info in description",    color: "#8b3a3a", isDefault: true,
    description: "Visual footage while the real value lives in the caption — tips, links, credits, context." },
  { id: "broll-voiceover",  name: "B-roll with voiceover",           color: "#1abc9c", isDefault: true,
    description: "You narrate over footage without showing your face. Great for tutorials and storytelling." },
  { id: "carrusel",         name: "Carousel with information",       color: "#b8a300", isDefault: true,
    description: "Swipeable slides that teach, list, or break down a concept. High save rate." },
  { id: "ejecucion",        name: "Execution / Performance",         color: "#c0692a", isDefault: true,
    description: "You performing, composing, or producing in real time. Showcases your actual craft." },
  { id: "hablando-camara",  name: "Talking to camera",               color: "#c9718a", isDefault: true,
    description: "Direct to camera. Opinion, advice, story, or reaction. Builds personal connection fast." },
  { id: "sketches",         name: "Sketches",                        color: "#27ae60", isDefault: true,
    description: "Short scripted scenes or comedy bits with music context. High entertainment value." },
];

// Lines: what you talk about / the hook (plain text, no color)
export const DEFAULT_LINES: ContentLine[] = [
  { id: "como-sonaria",     name: "How X would sound if it were X",              isDefault: true },
  { id: "inst-virtuales",   name: "Virtual instruments to sound like X",         isDefault: true },
  { id: "tip-composicion",  name: "Composition tip to sound like X",             isDefault: true },
  { id: "tip-produccion",   name: "Production tip to sound like X",              isDefault: true },
  { id: "truco-daw",        name: "X DAW trick to achieve X",                    isDefault: true },
  { id: "showcase-daw",     name: "DAW showcase to create X",                    isDefault: true },
  { id: "prog-acordes",     name: "Chord progression to sound like X",           isDefault: true },
  { id: "reaccionando",     name: "Reacting to X's music",                       isDefault: true },
];

// ─── Default briefs (examples showing format + line combinations) ─────────────

export const DEFAULT_BRIEFS: Brief[] = [
  {
    id: "db1",
    formatId: "broll-voiceover", formatName: "B-roll with voiceover", formatColor: "#1abc9c",
    lineId: "prog-acordes", lineName: "Chord progression to sound like X",
    title: "Chord progressions to sound like Hans Zimmer",
    script: "Hook: 'This 4-chord progression is what Hans Zimmer uses in almost every film.'\n\nB-roll of the DAW showing the chords in the piano roll. Voiceover explaining the harmonic function of each one. Close with the final result playing.",
    createdAt: 0,
  },
  {
    id: "db2",
    formatId: "carrusel", formatName: "Carousel with information", formatColor: "#b8a300",
    lineId: "tip-produccion", lineName: "Production tip to sound like X",
    title: "5 tips to make your mix sound cinematic",
    script: "Slide 1: strong hook — 'Why doesn't your music sound like a film score?'\nSlides 2–6: one tip per slide with visual and short explanation.\nSlide 7: how to combine two of them.\nSlide 8: 'Save this for your next session.'",
    createdAt: 0,
  },
  {
    id: "db3",
    formatId: "broll-frase", formatName: "B-roll with text overlay", formatColor: "#9b59b6",
    lineId: "como-sonaria", lineName: "How X would sound if it were X",
    title: "What if Bad Bunny scored a Christopher Nolan film?",
    script: "Aesthetic b-roll of the studio or instrument.\n\nText overlay framing the concept. Caption: break down the genre blend, tempo, mood, key instruments.\n\nEnd with a question to drive comments.",
    createdAt: 0,
  },
  {
    id: "db4",
    formatId: "ejecucion", formatName: "Execution / Performance", formatColor: "#c0692a",
    lineId: "truco-daw", lineName: "X DAW trick to achieve X",
    title: "The Logic Pro trick that makes your piano sound live",
    script: "Hands on the keyboard in real time. No voiceover.\n\nShow the full process: instrument setup, MIDI humanization, final result.\n\nText overlay at the end listing everything used.",
    createdAt: 0,
  },
  {
    id: "db5",
    formatId: "sketches", formatName: "Sketches", formatColor: "#27ae60",
    lineId: "inst-virtuales", lineName: "Virtual instruments to sound like X",
    title: "The free plugin that sounds like a $10k orchestra",
    script: "Split screen: the free plugin vs. the expensive production reference.\n\nText overlays showing each setting. No voice — just the transformation.\n\nEnd card: 'Plugin name is in the description.'",
    createdAt: 0,
  },
];

// ─── Trending mock ideas (Pro feature) ────────────────────────────────────────

export type TrendingIdea = {
  id: string;
  topic: string;
  hook: string;
  tag: "Industry" | "Tips" | "Creative" | "Gear" | "Sync";
  tagColor: string;
};

export const TRENDING_IDEAS: TrendingIdea[] = [
  {
    id: "t1",
    topic: "AI stem licensing is changing sync forever",
    hook: "Labels are now licensing individual stems — here's how to price yours",
    tag: "Sync",
    tagColor: "bg-emerald-400/10 text-emerald-400",
  },
  {
    id: "t2",
    topic: "The 808 layering trick behind this month's biggest hits",
    hook: "3 layers, 2 filters, 1 side-chain — show your process",
    tag: "Tips",
    tagColor: "bg-purple-400/10 text-purple-400",
  },
  {
    id: "t3",
    topic: "Why more producers are self-releasing in 2026",
    hook: "Distribution deals vs. keeping your masters — a real breakdown",
    tag: "Industry",
    tagColor: "bg-blue-400/10 text-blue-400",
  },
  {
    id: "t4",
    topic: "Reverb vs. delay in film scoring: when to use what",
    hook: "The rule composers use for emotional depth in any scene",
    tag: "Tips",
    tagColor: "bg-purple-400/10 text-purple-400",
  },
  {
    id: "t5",
    topic: "The plugin that replaced 3 others in my chain",
    hook: "Honest review after 2 months of daily use",
    tag: "Gear",
    tagColor: "bg-amber-400/10 text-amber-400",
  },
  {
    id: "t6",
    topic: "Behind my latest sync placement process",
    hook: "From brief to delivery in 4 days — full walkthrough",
    tag: "Creative",
    tagColor: "bg-pink-400/10 text-pink-400",
  },
];
