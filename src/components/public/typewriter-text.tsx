"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function TypewriterText({
  text,
  speed = 120,
  delay = 0,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onDone?: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(prefersReducedMotion ? text : "");
  const [started, setStarted] = useState(!!prefersReducedMotion);
  const onDoneRef = useRef(onDone);
  const calledDone = useRef(false);

  const done = started && displayed === text;

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const resetTimeout = setTimeout(() => {
      setDisplayed("");
      setStarted(false);
    }, 0);

    const startTimeout = setTimeout(() => setStarted(true), delay);

    return () => {
      clearTimeout(resetTimeout);
      clearTimeout(startTimeout);
    };
  }, [delay, text, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!started || displayed === text) return;
    const timeout = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timeout);
  }, [started, displayed, text, speed, prefersReducedMotion]);

  useEffect(() => {
    if (done && !calledDone.current) {
      calledDone.current = true;
      onDoneRef.current?.();
    }
  }, [done]);

  return (
    <span className={className}>
      {displayed}
      <span
        aria-hidden="true"
        className="ml-0.5 inline-block h-[1em] w-0 border-l-2 align-middle"
        style={{
          borderLeftColor: "var(--terminal-green)",
          animation: done ? "blink 1s step-end infinite" : "none",
          opacity: started ? 1 : 0,
        }}
      />
    </span>
  );
}
