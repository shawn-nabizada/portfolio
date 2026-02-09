"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import type { PortfolioData } from "@/lib/portfolio-data";
import { useTerminal } from "./use-terminal";

export function TerminalBody({
  locale,
  data,
  onRequestClose,
}: {
  locale: Locale;
  data: PortfolioData;
  onRequestClose: () => void;
}) {
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement | null>(null);
  const suggestionItemRefs = useRef<Array<HTMLLIElement | null>>([]);

  const {
    lines,
    input,
    setInputValue,
    submitInput,
    suggestions,
    activeSuggestionIndex,
    hoveredSuggestionIndex,
    setHoveredSuggestionIndex,
    applySuggestion,
    historyUp,
    historyDown,
    prompt,
    currentInputType,
    currentEnterKeyHint,
    isInputDisabled,
    isBooting,
  } = useTerminal({
    locale,
    data,
    onRequestClose,
  });
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!outputRef.current) return;
    outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (isInputDisabled) return;
    inputRef.current?.focus();
  }, [isInputDisabled]);

  useEffect(() => {
    const selectedIndex = activeSuggestionIndex;
    if (selectedIndex < 0) return;
    if (selectedIndex >= suggestions.length) return;

    const container = suggestionsContainerRef.current;
    const selectedItem = suggestionItemRefs.current[selectedIndex];
    if (!container || !selectedItem) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = selectedItem.getBoundingClientRect();
    const relativeTop = itemRect.top - containerRect.top + container.scrollTop;
    const targetTop =
      relativeTop -
      container.clientHeight / 2 +
      itemRect.height / 2;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const clampedTop = Math.max(0, Math.min(targetTop, maxScrollTop));

    container.scrollTop = clampedTop;
  }, [activeSuggestionIndex, suggestions.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-b-xl bg-card/95 p-4">
      <div
        ref={outputRef}
        className="min-h-0 flex-1 overflow-y-auto rounded-md border border-terminal-border/60 bg-background/80 p-3 font-mono text-sm"
      >
        {lines.map((line) => (
          <p
            key={line.id}
            className={cn(
              "leading-relaxed",
              line.preserveWhitespace
                ? "whitespace-pre"
                : "whitespace-pre-wrap break-words",
              toneClassName(line.tone)
            )}
          >
            {line.text || " "}
          </p>
        ))}
      </div>

      <form
        className="mt-3 flex items-center gap-2 border-t border-terminal-border/60 pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (isComposing) return;
          if (suggestions.length > 0) {
            applySuggestion();
            return;
          }
          void submitInput();
        }}
      >
        <span className="font-mono text-xs text-terminal-cyan">{prompt}</span>
        <input
          ref={inputRef}
          type={currentInputType}
          value={input}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.altKey && suggestions.length > 0) {
              event.preventDefault();
              event.stopPropagation();
              applySuggestion();
              return;
            }
            if (event.key === "Enter" && suggestions.length > 0) {
              event.preventDefault();
              event.stopPropagation();
              applySuggestion();
              return;
            }
            if (event.key === "Enter" && (isComposing || event.nativeEvent.isComposing)) {
              event.preventDefault();
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              historyUp();
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              historyDown();
            }
          }}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          disabled={isInputDisabled}
          className="h-8 flex-1 border-none bg-transparent font-mono text-sm text-foreground outline-none disabled:opacity-50"
          autoComplete={currentInputType === "password" ? "current-password" : "off"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={currentEnterKeyHint}
          aria-label={locale === "fr" ? "Entrée terminal" : "Terminal input"}
          placeholder={
            isBooting
              ? locale === "fr"
                ? "Initialisation..."
                : "Booting..."
              : ""
          }
        />
      </form>

      {suggestions.length > 0 && (
        <div
          ref={suggestionsContainerRef}
          onMouseLeave={() => setHoveredSuggestionIndex(null)}
          className="mt-2 max-h-40 overflow-y-auto rounded-md border border-terminal-border/60 bg-background/90"
        >
          <ul role="listbox" aria-label={locale === "fr" ? "Suggestions de commande" : "Command suggestions"}>
            {suggestions.map((suggestion, index) => {
              const isHovered = hoveredSuggestionIndex === index;
              const isActive = activeSuggestionIndex === index;
              const isSelected = isActive;

              return (
                <li
                  key={suggestion.id}
                  ref={(element) => {
                    suggestionItemRefs.current[index] = element;
                  }}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setHoveredSuggestionIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    applySuggestion(index);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "cursor-pointer px-3 py-2 transition-colors",
                    isSelected
                      ? "bg-terminal-green/12"
                      : isHovered
                        ? "bg-terminal-green/8"
                        : "hover:bg-terminal-green/8"
                  )}
                >
                  <p className="font-mono text-xs text-terminal-cyan">{suggestion.usage}</p>
                  <p className="text-xs text-terminal-dim">{suggestion.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function toneClassName(tone?: string): string {
  switch (tone) {
    case "success":
      return "text-terminal-green";
    case "error":
      return "text-destructive";
    case "muted":
      return "text-terminal-dim";
    case "prompt":
      return "text-terminal-cyan";
    case "system":
      return "text-terminal-green/90";
    default:
      return "text-foreground";
  }
}
