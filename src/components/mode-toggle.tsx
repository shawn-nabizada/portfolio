"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useRef } from "react";

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const lastClickPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    lastClickPos.current = { x: e.clientX, y: e.clientY };
  };

  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";

    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    const x = lastClickPos.current?.x ?? window.innerWidth / 2;
    const y = lastClickPos.current?.y ?? window.innerHeight / 2;

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    document.documentElement.style.setProperty("--x", x + "px");
    document.documentElement.style.setProperty("--y", y + "px");
    document.documentElement.style.setProperty("--r", endRadius + "px");

    document.startViewTransition(() => {
      setTheme(newTheme);
    });
  };

  return (
    <button
      onClick={toggleTheme}
      onPointerDown={handlePointerDown}
      className="relative flex items-center justify-center w-9 h-9 rounded-md border border-terminal-border text-muted-foreground hover:text-terminal-green hover:border-terminal-green transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Toggle color mode"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
    </button>
  );
}
