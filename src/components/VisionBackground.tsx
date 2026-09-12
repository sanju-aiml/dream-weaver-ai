import { useEffect, useRef, useState } from "react";

const VIDEO_URL =
  "https://res.cloudinary.com/eevqzeqe/video/upload/v1789198593/video_20260912_130349.mp4";

/**
 * Cinematic hero backdrop. The Cloudinary clip (earth -> atmosphere -> mountains
 * -> forest -> river -> waterfall -> ecosystem) is scrubbed by scroll position
 * instead of playing on its own, so the journey unfolds as the visitor reads.
 */
export function VisionBackground({ children }: { children: React.ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    let target = 0;

    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height + window.innerHeight;
      const raw = (window.innerHeight - rect.top) / total;
      target = Math.min(1, Math.max(0, raw));
      setProgress(target);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const video = videoRef.current;
        if (!video || !video.duration || Number.isNaN(video.duration)) return;
        const next = target * video.duration;
        if (Math.abs(video.currentTime - next) > 0.02) {
          try {
            video.currentTime = next;
          } catch {
            // seeking not ready yet
          }
        }
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const stage =
    progress < 0.15
      ? "Earth from space"
      : progress < 0.3
        ? "Entering the atmosphere"
        : progress < 0.45
          ? "Mountains"
          : progress < 0.6
            ? "Forest"
            : progress < 0.75
              ? "Trees"
              : progress < 0.9
                ? "River"
                : "Complete ecosystem";

  return (
    <div ref={sectionRef} className="relative isolate overflow-hidden bg-primary">
      {!failed && (
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
          onLoadedData={() => {
            setReady(true);
            videoRef.current?.pause();
          }}
          onError={() => setFailed(true)}
          className={`pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {/* Fallback / legibility layer — keeps the cream + charcoal identity readable. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_10%_0%,rgba(20,24,22,0.35),rgba(20,24,22,0.9))]"
      />

      <div className="relative">{children}</div>

      <div className="pointer-events-none absolute right-4 bottom-4 hidden items-center gap-3 font-display text-[0.6rem] tracking-[0.3em] text-white/70 uppercase sm:flex">
        <span>{stage}</span>
        <span className="h-[2px] w-24 bg-white/20">
          <span className="block h-full bg-white/80" style={{ width: `${progress * 100}%` }} />
        </span>
      </div>
    </div>
  );
}
