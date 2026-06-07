/* global React */
const { useState: useS, useEffect: useE } = React;

const MOODS = [
  {
    id: "anthropic",
    label: "Anthropic",
    bg: "linear-gradient(135deg, #faf9f5 0%, #ece8df 100%)",
    accent: "#cc785c",
  },
  {
    id: "inkwell",
    label: "Inkwell",
    bg: "linear-gradient(135deg, #2a2826 0%, #1c1b18 100%)",
    accent: "#ebe9e0",
  },
  {
    id: "workshop",
    label: "Workshop",
    bg: "linear-gradient(135deg, #f3f4f5 0%, #d8dde0 100%)",
    accent: "#2c5872",
  },
  {
    id: "midnight-coral",
    label: "Midnight\u00a0Coral",
    bg: "linear-gradient(135deg, #322620 0%, #1f1814 100%)",
    accent: "#d97757",
  },
];
const VOICES = [
  {
    id: "anthropic",
    name: "Anthropic",
    sample: "Aa",
    sampleClass: "ct-voice__sample--editorial",
    hint: "Source\u00a0Serif",
    style: { fontFamily: "Source Serif 4, Georgia, serif" },
  },
  {
    id: "editorial",
    name: "Editorial",
    sample: "Aa",
    sampleClass: "ct-voice__sample--editorial",
    hint: "long-form",
    style: {
      fontFamily: "Source Serif 4, Georgia, serif",
      fontStyle: "italic",
    },
  },
  {
    id: "manuscript",
    name: "Manuscript",
    sample: "Aa",
    sampleClass: "ct-voice__sample--manuscript",
    hint: "raw draft",
    style: { fontFamily: "JetBrains Mono, monospace" },
  },
  {
    id: "studio",
    name: "Studio",
    sample: "Aa",
    sampleClass: "ct-voice__sample--studio",
    hint: "modernist",
    style: {
      fontFamily: "Styrene B, -apple-system, sans-serif",
      fontWeight: 600,
    },
  },
];
const TEXTURES = [
  { id: "none", label: "Clean" },
  { id: "paper", label: "Paper" },
  { id: "halftone", label: "Dots" },
  { id: "screen", label: "CRT" },
];

function CanvasTweaks() {
  const [mood, setMood] = useS("anthropic");
  const [voice, setVoice] = useS("anthropic");
  const [texture, setTexture] = useS("none");
  const [open, setOpen] = useS(false);
  const [available, setAvailable] = useS(false);

  // Apply to <body> as data-* attrs
  useE(() => {
    const b = document.body;
    b.setAttribute("data-mood", mood);
    if (voice === "anthropic") b.removeAttribute("data-voice");
    else b.setAttribute("data-voice", voice);
    if (texture === "none") b.removeAttribute("data-texture");
    else b.setAttribute("data-texture", texture);
  }, [mood, voice, texture]);

  // Host edit-mode protocol
  useE(() => {
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    setAvailable(true);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const close = () => {
    setOpen(false);
    window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*");
  };

  if (!open) {
    return (
      <button
        className="canvas-tweaks-toggle"
        onClick={() => setOpen(true)}
        aria-label="Open tweaks"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="canvas-tweaks">
      <div className="canvas-tweaks__header">
        <span>mdpad++ · feel</span>
        <button
          className="canvas-tweaks__close"
          onClick={close}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="canvas-tweaks__body">
        {/* MOOD */}
        <div>
          <div className="ct-section__label">Mood</div>
          <div className="ct-mood-grid">
            {MOODS.map((m) => (
              <button
                key={m.id}
                className={`ct-mood ${mood === m.id ? "ct-mood--active" : ""}`}
                onClick={() => setMood(m.id)}
                title={m.label}
              >
                <div
                  className="ct-mood__swatch"
                  style={{ background: m.bg, "--swatch-accent": m.accent }}
                />
                <div className="ct-mood__label">{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* VOICE */}
        <div>
          <div className="ct-section__label">Voice</div>
          <div className="ct-voice-stack">
            {VOICES.map((v) => (
              <button
                key={v.id}
                className={`ct-voice ${voice === v.id ? "ct-voice--active" : ""}`}
                onClick={() => setVoice(v.id)}
              >
                <span
                  className={`ct-voice__sample ${v.sampleClass}`}
                  style={v.style}
                >
                  {v.sample}
                </span>
                <span className="ct-voice__name">{v.name}</span>
                <span className="ct-voice__hint">{v.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TEXTURE */}
        <div>
          <div className="ct-section__label">Texture</div>
          <div className="ct-texture-row">
            {TEXTURES.map((t) => (
              <button
                key={t.id}
                className={`ct-texture ct-texture--${t.id} ${texture === t.id ? "ct-texture--active" : ""}`}
                onClick={() => setTexture(t.id)}
                aria-label={t.label}
              >
                <div className="ct-texture__viz" />
                <div className="ct-texture__name">{t.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.CanvasTweaks = CanvasTweaks;
