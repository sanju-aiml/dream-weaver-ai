import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const VIDEO_URL =
  "https://res.cloudinary.com/eevqzeqe/video/upload/v1789198593/video_20260912_130349.mp4";

export function VisionOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setEnded(false);
      setError(false);
      void videoRef.current?.play().catch(() => {
        // Autoplay may be blocked; the video element is still visible.
      });
      return;
    }
    const t = setTimeout(() => setVisible(false), 500);
    videoRef.current?.pause();
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Fallback: if the video cannot load or play, still reveal the ending after
  // the intended 10-second cinematic beat so the experience never feels broken.
  useEffect(() => {
    if (!open || !error) return;
    const t = setTimeout(() => setEnded(true), 10000);
    return () => clearTimeout(t);
  }, [open, error]);

  if (!visible && !open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`}
      aria-modal="true"
      role="dialog"
    >
      <button
        type="button"
        onClick={onClose}
        className="pointer-events-auto absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-white/20"
        aria-label="Close vision"
      >
        <X className="h-5 w-5" />
      </button>

      {!error && (
        <video
          ref={videoRef}
          src={VIDEO_URL}
          autoPlay
          muted
          playsInline
          onEnded={() => setEnded(true)}
          onError={() => setError(true)}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ended ? "opacity-40" : "opacity-100"}`}
        />
      )}

      {error && !ended && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-white">
          <div className="pointer-events-auto">
            <p className="text-lg">The cinematic preview could not load in this browser.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 underline underline-offset-4"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div
        className={`pointer-events-none z-40 text-center text-white transition-all duration-1000 ${ended ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
      >
        <p className="font-display text-3xl uppercase tracking-widest sm:text-5xl">YOUR VISION.</p>
        <p className="mt-2 font-display text-3xl uppercase tracking-widest sm:text-5xl">
          BROUGHT TO LIFE.
        </p>
        <p className="mt-6 font-display text-sm uppercase tracking-[0.4em] opacity-80">
          DREAMFORGE AI
        </p>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto brut-sm mt-8 inline-block bg-white px-5 py-2 font-display text-xs uppercase text-black"
        >
          Enter DreamForge
        </button>
      </div>
    </div>
  );
}
