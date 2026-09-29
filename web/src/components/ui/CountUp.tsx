"use client";

import { useEffect, useRef, useState } from "react";

type Format = "int" | "lakh" | "cr" | "pct" | "score";

function render(v: number, format: Format, digits: number): string {
  switch (format) {
    case "int":
      return Math.round(v).toLocaleString("en-IN");
    case "lakh":
      return `₹${(v / 1e5).toFixed(digits)} lakh crore`;
    case "cr":
      return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits })} Cr`;
    case "pct":
      return `${v.toFixed(digits)}%`;
    case "score":
      return v.toFixed(1);
  }
}

/**
 * Number that eases up to its value once, on first view. Server-renders the final
 * value (no flash of "0", correct without JavaScript) and respects reduced motion.
 */
export function CountUp({ value, format = "int", digits = 2, duration = 900 }: { value: number; format?: Format; digits?: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.visibilityState !== "visible") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(value * (0.6 + 0.4 * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        setShown(value * 0.6);
        requestAnimationFrame(tick);
        window.setTimeout(() => setShown(value), duration + 200); // guaranteed final value
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular">
      <span aria-hidden>{render(shown, format, digits)}</span>
      <span className="sr-only">{render(value, format, digits)}</span>
    </span>
  );
}
