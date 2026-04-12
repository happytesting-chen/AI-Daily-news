import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, RefreshCcw, ShieldCheck, Shield, Siren, Home, Sparkles, Headphones, Play, Pause, Square, X, Rocket } from "lucide-react";

const NAV_TABS = [
  { id: "all", label: "Home", icon: Home },
  { id: "AI New Releases", label: "AI New Releases", icon: Rocket },
  { id: "AI System Security", label: "AI System Security", icon: ShieldCheck },
  { id: "AI for Defense", label: "AI for Defense", icon: Shield },
  { id: "AI-Powered Attacks", label: "AI-Powered Attacks", icon: Siren },
];

const CATEGORY_META = {
  "AI New Releases": {
    color: "bg-violet-500",
    textColor: "text-violet-600",
    borderColor: "border-violet-400",
    label: "AI New Releases",
  },
  "AI System Security": {
    color: "bg-amber-500",
    textColor: "text-amber-600",
    borderColor: "border-amber-400",
    label: "AI System Security",
  },
  "AI for Defense": {
    color: "bg-sky-500",
    textColor: "text-sky-600",
    borderColor: "border-sky-400",
    label: "AI for Defense",
  },
  "AI-Powered Attacks": {
    color: "bg-red-500",
    textColor: "text-red-600",
    borderColor: "border-red-400",
    label: "AI-Powered Attacks",
  },
};

// Fallback placeholder images per category
const FALLBACK_IMAGES = {
  "AI System Security": "https://placehold.co/400x220/f59e0b/ffffff?text=AI+Security",
  "AI for Defense": "https://placehold.co/400x220/0ea5e9/ffffff?text=AI+Defense",
  "AI-Powered Attacks": "https://placehold.co/400x220/ef4444/ffffff?text=AI+Attacks",
};

function formatRelativeTime(value) {
  if (!value) return "today";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return value;
  const now = new Date();
  const hrs = Math.floor((now - then) / 3600000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function filterStories(stories, tab) {
  if (tab === "all") return stories;
  return stories.filter((s) => s.category === tab);
}

function ArticleImage({ story }) {
  const fallback = FALLBACK_IMAGES[story.category] || FALLBACK_IMAGES["AI System Security"];
  const [src, setSrc] = useState(story.image_url || fallback);

  return (
    <img
      src={src}
      alt={story.title}
      onError={() => setSrc(fallback)}
      className="h-full w-full object-cover"
    />
  );
}

function ArticleCard({ story, onListen }) {
  const meta = CATEGORY_META[story.category] || CATEGORY_META["AI System Security"];

  return (
    <article className="group flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Image on top — fixed height, zoom-in on hover */}
      <div className="relative h-44 bg-gray-100 overflow-hidden flex-shrink-0">
        <div className="h-full w-full transform transition-transform duration-500 group-hover:scale-105">
          <ArticleImage story={story} />
        </div>
        {/* Category badge overlaid on image bottom-left */}
        <span className={`absolute bottom-2 left-2 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded text-white shadow ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      {/* Content below image — all text fully shown, no clamp */}
      <div className="flex flex-col justify-between p-4 flex-1">
        <div className="space-y-2">
          {/* Title */}
          <h2 className="text-base font-bold text-gray-900 leading-snug">
            {story.url ? (
              <a href={story.url} target="_blank" rel="noreferrer" className="hover:text-blue-700 transition-colors">
                {story.title}
              </a>
            ) : (
              story.title
            )}
          </h2>

          {/* TL;DR */}
          {story.tldr && (
            <p className="text-sm text-gray-600 leading-relaxed">{story.tldr}</p>
          )}

          {/* Why it matters */}
          {story.why_it_matters && (
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">Why it matters: </span>
              {story.why_it_matters}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
          <span className="font-medium text-gray-500">{story.source}</span>
          <span>•</span>
          <span>{formatRelativeTime(story.time_ago)}</span>
          {story.url && (
            <>
              <span>•</span>
              <a
                href={story.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800 transition-colors"
              >
                Read more <ArrowUpRight className="h-3 w-3" />
              </a>
            </>
          )}
          <span>•</span>
          <button
            onClick={() => onListen(story)}
            className="inline-flex items-center gap-1 text-indigo-500 font-medium hover:text-indigo-700 transition-colors"
          >
            <Headphones className="h-3 w-3" /> Listen
          </button>
        </div>
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="h-44 bg-gray-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
            <div className="h-5 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-4/5 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("all");
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);

  // Podcast state
  const [podcastOpen, setPodcastOpen] = useState(false);
  const [podcastTitle, setPodcastTitle] = useState("");
  const [podcastLoading, setPodcastLoading] = useState(false); // true while fetching script + audio
  const [podcastLines, setPodcastLines] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);

  // Pre-fetched audio blob URLs — filled during "Preparing…" phase before user hits Play
  const audioBlobsRef = useRef([]); // string[] of objectURLs, one per line
  const audioRef = useRef(null);    // current HTMLAudioElement
  const turnRef = useRef(0);
  const stopFlagRef = useRef(false);

  const TTS_VOICES = ["nova", "onyx"]; // nova = Alex (female), onyx = Jordan (male)

  // Preload browser voices as fallback
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  function getBrowserVoices() {
    const en = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
    const lname = (v) => v.name.toLowerCase();
    const femaleKw = ["aria","jenny","nova","michelle","zira","samantha","karen","victoria","moira","fiona","susan","emma","female"];
    const maleKw = ["onyx","guy","david","mark","james","daniel","thomas","reed","ryan","male"];
    const female = en.find((v) => femaleKw.some((k) => lname(v).includes(k)));
    const male   = en.find((v) => maleKw.some((k) => lname(v).includes(k)));
    if (female && male) return [female, male];
    const v1 = en[0];
    return [v1, en.find((v) => v.name !== v1?.name) || v1];
  }

  function parseDialogue(raw) {
    return (raw || "").split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      if (line.startsWith("<speaker1>")) return { speaker: 1, text: line.replace("<speaker1>", "").trim() };
      if (line.startsWith("<speaker2>")) return { speaker: 2, text: line.replace("<speaker2>", "").trim() };
      return null;
    }).filter(Boolean);
  }

  // Fetch one line of TTS audio → objectURL. Returns null on failure (triggers browser TTS fallback).
  async function fetchTtsBlob(text, voice) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    } catch {
      return null;
    }
  }

  // Play pre-fetched audio sequentially. All blobs are already in memory — no async during playback.
  function playFromTurn(startIndex) {
    stopFlagRef.current = false;

    function playNext(i) {
      if (stopFlagRef.current || i >= audioBlobsRef.current.length) {
        setSpeaking(false);
        setPaused(false);
        return;
      }
      turnRef.current = i;
      setTurnIndex(i);

      const blobUrl = audioBlobsRef.current[i];

      if (blobUrl) {
        // OpenAI TTS audio — play directly (blobs are pre-fetched, no async gap → autoplay policy safe)
        const audio = new Audio(blobUrl);
        audioRef.current = audio;
        audio.onended = () => setTimeout(() => playNext(i + 1), 300);
        audio.onerror = () => playNext(i + 1); // skip broken line
        audio.play().catch(() => playNext(i + 1));
      } else {
        // Browser TTS fallback for this line
        const { speaker, text } = podcastLines[i] || linesRef.current[i] || {};
        if (!text) { playNext(i + 1); return; }
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.pitch = 1.0;
        utter.lang = "en-US";
        const bv = getBrowserVoices();
        if (bv[speaker - 1]) utter.voice = bv[speaker - 1];
        utter.onend = () => setTimeout(() => playNext(i + 1), 300);
        utter.onerror = () => playNext(i + 1);
        window.speechSynthesis.speak(utter);
      }
    }

    playNext(startIndex);
  }

  const linesRef = useRef([]);

  function handlePlayPause() {
    if (speaking) {
      // Pause
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis.cancel();
      stopFlagRef.current = true;
      setSpeaking(false);
      setPaused(true);
    } else {
      // Play or Resume — audio is already pre-fetched, starts instantly
      setSpeaking(true);
      setPaused(false);
      playFromTurn(paused ? turnRef.current : 0);
    }
  }

  function handleStop() {
    stopFlagRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    turnRef.current = 0;
    setTurnIndex(0);
  }

  async function handleListenToStory(story) {
    handleStop();
    // Revoke any previous blob URLs to free memory
    audioBlobsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
    audioBlobsRef.current = [];
    setPodcastOpen(true);
    setPodcastTitle(story.title);
    setPodcastLines([]);
    linesRef.current = [];
    setPodcastLoading(true);

    try {
      // Step 1: generate dialogue script
      const res = await fetch("/api/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: story.title,
          tldr: story.tldr,
          why_it_matters: story.why_it_matters,
          category: story.category,
          source: story.source,
        }),
      });
      const data = await res.json();
      const lines = parseDialogue(data.dialogue || "");
      linesRef.current = lines;
      setPodcastLines(lines);

      // Step 2: pre-fetch ALL audio blobs before enabling Play
      // This happens during "Preparing…" state — when user clicks Play, everything is ready
      const blobs = await Promise.all(
        lines.map((line) => fetchTtsBlob(line.text, TTS_VOICES[line.speaker - 1]))
      );
      audioBlobsRef.current = blobs; // null entries = use browser TTS fallback for that line
    } catch {
      setPodcastTitle("Failed to load — please try again");
    } finally {
      setPodcastLoading(false);
    }
  }

  function handleClosePodcast() {
    handleStop();
    setPodcastOpen(false);
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setStories(data.stories || []);
      setLastRefresh(data.generatedAt ? new Date(data.generatedAt) : null);
    } catch {
      setError("Could not load the cached daily briefing.");
      setStories([]);
      setLastRefresh(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredStories = useMemo(() => filterStories(stories, activeTab), [stories, activeTab]);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const activeTabMeta = NAV_TABS.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-blue-800">
        {/* Top bar: logo + date + refresh */}
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-200" />
            <span className="text-white font-bold text-xl tracking-tight">AI Security Daily</span>
          </div>
          <div className="flex items-center gap-3 text-blue-200 text-xs">
            <span className="hidden sm:block">{dateStr}</span>
            {lastRefresh && (
              <span className="hidden sm:block">
                · Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* ── Navigation tabs ───────────────────────────────── */}
        <nav className="mx-auto max-w-6xl px-4 sm:px-6">
          <ul className="flex items-end gap-0 overflow-x-auto">
            {NAV_TABS.map((tab) => {
              const active = tab.id === activeTab;
              const count = filterStories(stories, tab.id).length;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                      active
                        ? "bg-white text-blue-800 border-white rounded-t"
                        : "text-blue-100 border-transparent hover:text-white hover:border-blue-300"
                    }`}
                  >
                    {tab.label}
                    {!active && count > 0 && (
                      <span className="ml-1.5 text-[11px] bg-blue-600 text-blue-100 rounded-full px-1.5 py-0.5">{count}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-800">{activeTabMeta?.label}</h1>
            {activeTab === "all" && (
              <p className="text-sm text-gray-500">AI and cybersecurity intelligence across all categories.</p>
            )}
          </div>
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</div>
          )}
        </div>

        {/* Article list */}
        {loading ? (
          <LoadingSkeleton />
        ) : filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStories.map((story, i) => (
              <ArticleCard key={`${story.title}-${i}`} story={story} onListen={handleListenToStory} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center bg-white border border-gray-200 rounded-lg">
            <Sparkles className="h-8 w-8 text-gray-300" />
            <p className="font-medium text-gray-700">No stories yet</p>
            <p className="text-sm text-gray-400">Today's briefing may not be ready. Try refreshing.</p>
          </div>
        )}
      </main>

      {/* ── Floating Podcast Player ───────────────────────── */}
      {podcastOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-gray-700 shadow-2xl">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
            {/* Left: icon + info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center">
                <Headphones className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wide">
                  {podcastLoading ? "Generating dialogue…" : speaking ? (turnIndex % 2 === 0 ? "🎙 Host" : "🎙 Expert") : "AI Podcast · Two Hosts"}
                </p>
                <p className="text-sm text-white font-medium truncate">{podcastTitle}</p>
              </div>
              {/* Turn progress dots */}
              {!podcastLoading && podcastLines.length > 0 && (
                <div className="hidden sm:flex items-center gap-0.5 ml-2">
                  {podcastLines.map((_, i) => (
                    <span
                      key={i}
                      className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                        i < turnIndex ? "bg-indigo-400" : i === turnIndex && speaking ? "bg-white" : "bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {podcastLoading ? (
                /* Preparing state — shimmer flow animation */
                <div className="relative overflow-hidden flex items-center gap-1.5 bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded-full select-none">
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  Preparing…
                  {/* Flowing shimmer line sweeping across the button */}
                  <span className="absolute inset-0 rounded-full" style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.4s infinite linear",
                  }} />
                </div>
              ) : (
                <button
                  onClick={handlePlayPause}
                  disabled={podcastLines.length === 0}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                >
                  {speaking && !paused
                    ? <><Pause className="h-3.5 w-3.5" /> Pause</>
                    : paused
                    ? <><Play className="h-3.5 w-3.5" /> Resume</>
                    : <><Play className="h-3.5 w-3.5" /> Play</>
                  }
                </button>
              )}
              {speaking && (
                <button onClick={handleStop} title="Stop" className="text-gray-400 hover:text-white p-2 transition-colors">
                  <Square className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={handleClosePodcast} title="Close" className="text-gray-500 hover:text-gray-300 p-2 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
