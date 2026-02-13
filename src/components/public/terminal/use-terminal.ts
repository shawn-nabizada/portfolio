"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import type { PortfolioData } from "@/lib/portfolio-data";
import { fetchMutation } from "@/lib/http/mutation";
import { TESTIMONIAL_MAX_CHARS } from "@/lib/constants/testimonials";
import { createClient } from "@/lib/supabase/client";
import { getBootLines, BOOT_STAGGER_MS } from "./boot-sequence";
import {
  executeCommand,
  getCommandArgumentSuggestions,
  getDiscoverableCommands,
  getShellPrompt,
  type OutputLine as OutputLineDraft,
  type PromptType,
  type SectionKey,
} from "./commands";
import { isValidEmail, normalize } from "./formatters";
import {
  applyLabyrinthMove,
  createLabyrinthState,
  labyrinthHelpLines,
  parseLabyrinthMoveInput,
  renderLabyrinthBoard,
  type LabyrinthState,
} from "./games/labyrinth";

interface PromptField {
  key: string;
  label: string;
  required: boolean;
  mask?: boolean;
  validate?: (value: string) => boolean;
  invalidMessage: string;
}

interface PromptState {
  type: PromptType;
  step: number;
  fields: PromptField[];
  values: Record<string, string>;
}

type LabyrinthCommand = "help" | "quit" | "start" | "none";

export interface TerminalLine extends OutputLineDraft {
  id: string;
}

interface ActiveGameView {
  game: "labyrinth";
  statusLine: string;
  metaLine: string;
  boardLines: string[];
  noticeLine?: {
    text: string;
    tone?: OutputLineDraft["tone"];
  };
}

interface TerminalSuggestion {
  id: string;
  kind: "command" | "argument";
  baseCommand: string;
  command: string;
  usage: string;
  description: string;
  insertValue: string;
  replaceMode: "full" | "argument";
}

function buildInputFromSuggestion(
  currentInput: string,
  suggestion: TerminalSuggestion
): string {
  if (suggestion.replaceMode === "argument") {
    const leadingWhitespace = currentInput.match(/^\s*/)?.[0] ?? "";
    const commandValue =
      currentInput.trimStart().split(/\s+/)[0] || suggestion.baseCommand;
    return `${leadingWhitespace}${commandValue} ${suggestion.insertValue}`;
  }

  const leadingWhitespace = currentInput.match(/^\s*/)?.[0] ?? "";
  const tokens = currentInput.trimStart().split(/\s+/).filter(Boolean);
  const args = tokens.length > 1 ? tokens.slice(1).join(" ") : "";
  const insertValue = suggestion.insertValue;

  if (!args) {
    return `${leadingWhitespace}${insertValue}`;
  }

  return `${leadingWhitespace}${insertValue}${insertValue.endsWith(" ") ? "" : " "}${args}`;
}

function normalizeSuggestionComparableInput(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function useTerminal({
  locale,
  data,
  adminLoginCommand,
  onRequestClose,
}: {
  locale: Locale;
  data: PortfolioData;
  adminLoginCommand: string;
  onRequestClose: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const lineIdRef = useRef(0);
  const historyIndexRef = useRef(-1);

  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [cwd, setCwd] = useState<SectionKey | null>(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [labyrinthState, setLabyrinthState] = useState<LabyrinthState | null>(null);
  const [activeGameView, setActiveGameView] = useState<ActiveGameView | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isCompactDisplay, setIsCompactDisplay] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState<number | null>(null);

  const discoverableCommands = useMemo(
    () => getDiscoverableCommands(locale, adminLoginCommand),
    [locale, adminLoginCommand]
  );

  const appendLines = useCallback((drafts: OutputLineDraft[]) => {
    if (drafts.length === 0) return;

    setLines((previous) => [
      ...previous,
      ...drafts.map((draft) => ({
        id: `terminal-line-${lineIdRef.current++}`,
        ...draft,
      })),
    ]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const update = () => setIsCompactDisplay(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLines([]);
    setCwd(null);
    setInput("");
    setHistory([]);
    historyIndexRef.current = -1;
    setPromptState(null);
    setLabyrinthState(null);
    setActiveGameView(null);
    setIsBooting(true);
    setIsSubmittingPrompt(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(null);

    const runBoot = async () => {
      const bootLines = getBootLines(locale);

      if (prefersReducedMotion) {
        if (!cancelled) {
          appendLines(
            bootLines.map((entry) => ({
              text: entry,
              tone: entry.startsWith("[OK]") ? "success" : "system",
            }))
          );
          setIsBooting(false);
        }
        return;
      }

      for (const entry of bootLines) {
        if (cancelled) return;
        await sleep(BOOT_STAGGER_MS);
        if (cancelled) return;
        appendLines([
          {
            text: entry,
            tone: entry.startsWith("[OK]") ? "success" : "system",
          },
        ]);
      }

      if (!cancelled) {
        setIsBooting(false);
      }
    };

    void runBoot();

    return () => {
      cancelled = true;
    };
  }, [appendLines, locale, prefersReducedMotion]);

  const trimmedInput = input.trimStart();
  const commandTokenRaw = trimmedInput.split(/\s+/)[0] ?? "";
  const commandToken = normalize(commandTokenRaw);
  const hasArgumentContext = /\s/.test(trimmedInput);
  const argumentInput = hasArgumentContext ? trimmedInput.replace(/^\S+\s*/, "") : "";
  const shouldShowSuggestions =
    !isBooting &&
    !isSubmittingPrompt &&
    !promptState &&
    !labyrinthState &&
    commandToken.length > 0;

  const suggestions = useMemo<TerminalSuggestion[]>(() => {
    if (!shouldShowSuggestions) return [];
    const currentInputComparable = normalizeSuggestionComparableInput(input);

    const mapCommandSuggestions = (commands: typeof discoverableCommands) =>
      commands.map((command) => ({
        id: `command:${command.command}`,
        kind: "command" as const,
        baseCommand: command.command,
        command: command.command,
        usage: command.usage,
        description: command.description,
        insertValue: command.insertValue,
        replaceMode: "full" as const,
      }));

    const matchedCommand = discoverableCommands.find(
      (command) => command.command === commandToken
    );

    if (matchedCommand && hasArgumentContext) {
      const argumentSuggestions = getCommandArgumentSuggestions({
        command: commandToken,
        cwd,
        data,
        locale,
        partialArg: argumentInput,
      });

      if (argumentSuggestions.length > 0) {
        const mappedArgumentSuggestions = argumentSuggestions.map((suggestion) => ({
          ...suggestion,
          kind: "argument" as const,
          baseCommand: suggestion.command,
          replaceMode: "argument" as const,
        }));

        const normalizedArgumentInput = normalize(argumentInput);
        const hasExactArgumentMatch =
          normalizedArgumentInput.length > 0 &&
          mappedArgumentSuggestions.some(
            (suggestion) => normalize(suggestion.insertValue) === normalizedArgumentInput
          );

        if (hasExactArgumentMatch) {
          return [];
        }

        const filteredArgumentSuggestions = mappedArgumentSuggestions.filter((suggestion) => {
          const nextInputComparable = normalizeSuggestionComparableInput(
            buildInputFromSuggestion(input, suggestion)
          );
          return nextInputComparable !== currentInputComparable;
        });

        return filteredArgumentSuggestions;
      }
    }

    const startsWith = discoverableCommands.filter((command) =>
      command.command.startsWith(commandToken)
    );
    const includes = discoverableCommands.filter(
      (command) =>
        !command.command.startsWith(commandToken) &&
        command.command.includes(commandToken)
    );

    const mappedCommandSuggestions = mapCommandSuggestions([...startsWith, ...includes]);
    return mappedCommandSuggestions.filter((suggestion) => {
      const nextInputComparable = normalizeSuggestionComparableInput(
        buildInputFromSuggestion(input, suggestion)
      );
      return nextInputComparable !== currentInputComparable;
    });
  }, [
    argumentInput,
    commandToken,
    cwd,
    data,
    discoverableCommands,
    hasArgumentContext,
    input,
    locale,
    shouldShowSuggestions,
  ]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setActiveSuggestionIndex(-1);
      setHoveredSuggestionIndex(null);
      return;
    }

    setActiveSuggestionIndex((previous) =>
      previous >= 0 && previous < suggestions.length ? previous : 0
    );
    setHoveredSuggestionIndex((previous) =>
      previous !== null && previous < suggestions.length ? previous : null
    );
  }, [suggestions]);

  const submitPrompt = useCallback(
    async (type: PromptType, values: Record<string, string>) => {
      setIsSubmittingPrompt(true);
      try {
        if (type === "msg") {
          appendLines([
            {
              text: locale === "fr" ? "Envoi du message..." : "Sending message...",
              tone: "system",
            },
          ]);

          await fetchMutation("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: values.name,
              email: values.email,
              subject: values.subject,
              message: values.message,
            }),
          });

          appendLines([
            {
              text:
                locale === "fr"
                  ? "Message envoyé avec succès."
                  : "Message sent successfully.",
              tone: "success",
            },
          ]);
          return;
        }

        if (type === "testimonial") {
          appendLines([
            {
              text:
                locale === "fr"
                  ? "Soumission du témoignage..."
                  : "Submitting testimonial...",
              tone: "system",
            },
          ]);

          await fetchMutation("/api/testimonials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              author_name: values.author_name,
              author_title: values.author_title,
              author_company: values.author_company,
              content: values.content,
            }),
          });

          appendLines([
            {
              text:
                locale === "fr"
                  ? "Merci, votre témoignage est en attente de validation."
                  : "Thanks, your testimonial is pending review.",
              tone: "success",
            },
          ]);
          return;
        }

        appendLines([
          {
            text: locale === "fr" ? "Connexion en cours..." : "Signing in...",
            tone: "system",
          },
        ]);

        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) {
          appendLines([
            {
              text:
                locale === "fr"
                  ? `Connexion échouée: ${localizeAuthFailure(error, locale)}`
                  : `Login failed: ${localizeAuthFailure(error, locale)}`,
              tone: "error",
            },
          ]);
          return;
        }

        appendLines([
          {
            text:
              locale === "fr"
                ? "Connexion réussie. Redirection vers le panneau admin..."
                : "Login successful. Redirecting to admin dashboard...",
            tone: "success",
          },
        ]);

        onRequestClose();
        router.push(`/${locale}/admin/dashboard`);
      } catch (error) {
        appendLines([
          {
            text:
              error instanceof Error
                ? locale === "fr"
                  ? `Erreur: ${error.message}`
                  : `Error: ${error.message}`
                : locale === "fr"
                  ? "Une erreur est survenue."
                  : "An error occurred.",
            tone: "error",
          },
        ]);
      } finally {
        setIsSubmittingPrompt(false);
      }
    },
    [appendLines, locale, onRequestClose, router, supabase.auth]
  );

  const startPrompt = useCallback(
    (type: PromptType) => {
      const fields = getPromptFields(type, locale);
      setPromptState({
        type,
        step: 0,
        fields,
        values: {},
      });
      appendLines([
        {
          text: getPromptIntro(type, locale),
          tone: "system",
        },
      ]);
    },
    [appendLines, locale]
  );

  const startLoginFlow = useCallback(async () => {
    try {
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) {
        appendLines([
          {
            text:
              locale === "fr"
                ? "Impossible de vérifier la session admin."
                : "Unable to verify admin session.",
            tone: "error",
          },
        ]);
        return;
      }

      if (sessionData.session) {
        appendLines([
          {
            text:
              locale === "fr"
                ? "Session admin déjà active. Redirection vers le panneau admin..."
                : "Admin session already active. Redirecting to admin dashboard...",
            tone: "success",
          },
        ]);
        onRequestClose();
        router.push(`/${locale}/admin/dashboard`);
        return;
      }
    } catch {
      appendLines([
        {
          text:
            locale === "fr"
              ? "Impossible de vérifier la session admin."
              : "Unable to verify admin session.",
          tone: "error",
        },
      ]);
      return;
    }

    startPrompt("login");
  }, [appendLines, locale, onRequestClose, router, startPrompt, supabase.auth]);

  const processPromptInput = useCallback(
    async (rawValue: string) => {
      if (!promptState) return;

      const currentField = promptState.fields[promptState.step];
      const trimmedValue = rawValue.trim();

      if (currentField.required && !trimmedValue) {
        appendLines([
          {
            text:
              locale === "fr"
                ? `erreur: ${currentField.label.toLowerCase()} est requis`
                : `error: ${currentField.label.toLowerCase()} is required`,
            tone: "error",
          },
        ]);
        return;
      }

      if (currentField.validate && trimmedValue && !currentField.validate(trimmedValue)) {
        appendLines([
          { text: currentField.invalidMessage, tone: "error" },
        ]);
        return;
      }

      const maskedValue = currentField.mask ? "*".repeat(trimmedValue.length) : trimmedValue;
      const renderedValue =
        trimmedValue.length > 0
          ? maskedValue
          : locale === "fr"
            ? "[ignoré]"
            : "[skipped]";
      appendLines([
        {
          text: `> ${formatPromptFieldLabel(currentField, locale)}: ${renderedValue}`,
          tone: "prompt",
        },
      ]);

      const nextValues = {
        ...promptState.values,
        [currentField.key]: trimmedValue,
      };

      const isLastField = promptState.step >= promptState.fields.length - 1;
      if (isLastField) {
        setPromptState(null);
        await submitPrompt(promptState.type, nextValues);
        return;
      }

      const nextStep = promptState.step + 1;
      setPromptState({
        ...promptState,
        step: nextStep,
        values: nextValues,
      });
    },
    [appendLines, locale, promptState, submitPrompt]
  );

  const resolveLabyrinthCommand = useCallback((inputValue: string): LabyrinthCommand => {
    const normalizedInput = normalize(inputValue);
    if (!normalizedInput) return "none";

    if (
      normalizedInput === "labyrinth help" ||
      normalizedInput === "lab help" ||
      normalizedInput === "labyrinth" ||
      normalizedInput === "lab" ||
      normalizedInput === "help"
    ) {
      return "help";
    }

    if (
      normalizedInput === "labyrinth quit" ||
      normalizedInput === "lab quit" ||
      normalizedInput === "labyrinth exit" ||
      normalizedInput === "lab exit"
    ) {
      return "quit";
    }

    if (
      normalizedInput === "labyrinth start" ||
      normalizedInput === "lab start" ||
      normalizedInput === "restart"
    ) {
      return "start";
    }

    return "none";
  }, []);

  const buildLabyrinthGameView = useCallback(
    (
      state: LabyrinthState,
      noticeLine?: {
        text: string;
        tone?: OutputLineDraft["tone"];
      }
    ): ActiveGameView => ({
      game: "labyrinth",
      statusLine:
        locale === "fr"
          ? "Labyrinthe actif. Utilisez w/a/s/d pour vous déplacer."
          : "Labyrinth active. Use w/a/s/d to move.",
      metaLine:
        locale === "fr"
          ? `Pas: ${state.steps} | Objectif: atteindre X`
          : `Steps: ${state.steps} | Goal: reach X`,
      boardLines: renderLabyrinthBoard(state),
      noticeLine,
    }),
    [locale]
  );

  const syncSectionNavigation = useCallback((sectionToFocus: SectionKey | null | undefined) => {
    if (typeof window === "undefined" || sectionToFocus === undefined) return;

    if (sectionToFocus === null) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(window.history.state, "", cleanUrl);
      return;
    }

    const sectionElement = document.getElementById(sectionToFocus);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const nextUrl = `${window.location.pathname}${window.location.search}#${sectionToFocus}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, []);

  const triggerResumeDownload = useCallback(
    async (language: "en" | "fr") => {
      const resume = data.resumes.find((entry) => entry.language === language);
      if (!resume) {
        appendLines([
          {
            text:
              locale === "fr"
                ? `Aucun CV ${language} disponible.`
                : `No ${language} resume available.`,
            tone: "error",
          },
        ]);
        return;
      }

      const path =
        typeof window === "undefined" ? `/${locale}` : window.location.pathname;

      void fetchMutation("/api/analytics/resume-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          path,
          language,
        }),
      }).catch(() => {
        // Ignore analytics failures for terminal resume downloads.
      });

      if (typeof window !== "undefined") {
        const link = document.createElement("a");
        link.href = resume.file_url;
        link.download = resume.file_name;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.click();
      }

      appendLines([
        {
          text:
            locale === "fr"
              ? `CV ${language} téléchargé: ${resume.file_name}`
              : `${language.toUpperCase()} resume downloaded: ${resume.file_name}`,
          tone: "success",
        },
      ]);
    },
    [appendLines, data.resumes, locale]
  );

  const applySuggestion = useCallback(
    (index?: number): TerminalSuggestion | null => {
      if (suggestions.length === 0) return null;

      const fallbackIndex = hoveredSuggestionIndex ?? activeSuggestionIndex;
      const suggestionIndex = index ?? fallbackIndex;
      if (
        suggestionIndex === null ||
        suggestionIndex === undefined ||
        suggestionIndex < 0 ||
        suggestionIndex >= suggestions.length
      ) {
        return null;
      }

      const suggestion = suggestions[suggestionIndex];
      setInput((currentInput) => buildInputFromSuggestion(currentInput, suggestion));
      historyIndexRef.current = -1;
      setActiveSuggestionIndex(suggestionIndex);
      return suggestion;
    },
    [activeSuggestionIndex, hoveredSuggestionIndex, suggestions]
  );

  const submitInput = useCallback(async (rawInputOverride?: string) => {
    if (isBooting || isSubmittingPrompt) return;

    const rawInput = rawInputOverride ?? input;
    setInput("");
    historyIndexRef.current = -1;

    if (promptState) {
      await processPromptInput(rawInput);
      return;
    }

    const trimmed = rawInput.trim();
    if (!trimmed) return;

    if (labyrinthState) {
      const normalizedInput = normalize(trimmed);
      const shouldPassToGlobalCommand =
        normalizedInput === "quit" || normalizedInput === "clear";

      if (!shouldPassToGlobalCommand) {
        const labyrinthCommand = resolveLabyrinthCommand(trimmed);
        if (labyrinthCommand === "help") {
          appendLines(labyrinthHelpLines(locale).map((text, index) => ({
            text,
            tone: index === 0 ? "system" : "muted",
          })));
          return;
        }

        if (labyrinthCommand === "start") {
          const newState = createLabyrinthState();
          setLabyrinthState(newState);
          setActiveGameView(
            buildLabyrinthGameView(newState, {
              text: locale === "fr" ? "Nouvelle partie démarrée." : "New game started.",
              tone: "system",
            })
          );
          return;
        }

        if (labyrinthCommand === "quit") {
          setLabyrinthState(null);
          setActiveGameView(null);
          appendLines([
            {
              text:
                locale === "fr"
                  ? "Partie de labyrinthe fermée."
                  : "Labyrinth game closed.",
              tone: "muted",
            },
          ]);
          return;
        }

        const move = parseLabyrinthMoveInput(trimmed);
        if (!move) {
          setActiveGameView(
            buildLabyrinthGameView(labyrinthState, {
              text:
                locale === "fr"
                  ? "Commande invalide. Utilisez w/a/s/d, lab help ou lab quit."
                  : "Invalid command. Use w/a/s/d, lab help, or lab quit.",
              tone: "error",
            })
          );
          return;
        }

        const moveResult = applyLabyrinthMove(labyrinthState, move);
        if (moveResult.hitWall) {
          setActiveGameView(
            buildLabyrinthGameView(labyrinthState, {
              text: locale === "fr" ? "Mur détecté." : "Wall hit.",
              tone: "muted",
            })
          );
          return;
        }

        if (moveResult.won) {
          const elapsedSeconds = Math.max(
            1,
            Math.round((moveResult.elapsedMs ?? 0) / 1000)
          );
          setLabyrinthState(null);
          setActiveGameView(null);
          appendLines([
            {
              text:
                locale === "fr"
                  ? `Victoire! Sortie atteinte en ${moveResult.state.steps} pas (${elapsedSeconds}s).`
                  : `Victory! Exit reached in ${moveResult.state.steps} steps (${elapsedSeconds}s).`,
              tone: "success",
            },
          ]);
          return;
        }

        setLabyrinthState(moveResult.state);
        setActiveGameView(buildLabyrinthGameView(moveResult.state));
        return;
      }
    }

    appendLines([{ text: `${getShellPrompt(cwd)} ${trimmed}`, tone: "prompt" }]);
    setHistory((previous) => [...previous, trimmed]);

    const result = executeCommand(trimmed, {
      cwd,
      data,
      locale,
      isCompact: isCompactDisplay,
      adminLoginCommand,
    });

    if (result.clear) {
      setLines([]);
      return;
    }

    if (result.cwd !== undefined) {
      setCwd(result.cwd);
    }
    if (result.sectionToFocus !== undefined) {
      syncSectionNavigation(result.sectionToFocus);
    }

    appendLines(result.lines);

    if (result.prefillInput !== undefined) {
      setInput(result.prefillInput);
    }

    if (result.downloadResume) {
      await triggerResumeDownload(result.downloadResume.language);
    }

    if (result.startPrompt === "login") {
      await startLoginFlow();
      return;
    }

    if (result.gameAction?.game === "labyrinth") {
      if (result.gameAction.action === "start") {
        const newState = createLabyrinthState();
        setLabyrinthState(newState);
        setActiveGameView(buildLabyrinthGameView(newState));
        return;
      }

      if (result.gameAction.action === "quit") {
        setLabyrinthState(null);
        setActiveGameView(null);
      }
    }

    if (result.startPrompt) {
      startPrompt(result.startPrompt);
    }

    if (result.close) {
      onRequestClose();
    }
  }, [
    appendLines,
    cwd,
    data,
    input,
    isBooting,
    isSubmittingPrompt,
    locale,
    isCompactDisplay,
    adminLoginCommand,
    onRequestClose,
    processPromptInput,
    promptState,
    labyrinthState,
    buildLabyrinthGameView,
    resolveLabyrinthCommand,
    triggerResumeDownload,
    syncSectionNavigation,
    startLoginFlow,
    startPrompt,
  ]);

  const historyUp = useCallback(() => {
    if (promptState) return;

    if (suggestions.length > 0) {
      setHoveredSuggestionIndex(null);
      setActiveSuggestionIndex((previous) =>
        previous <= 0 ? 0 : previous - 1
      );
      return;
    }

    if (history.length === 0) return;

    const next =
      historyIndexRef.current === -1
        ? history.length - 1
        : Math.max(0, historyIndexRef.current - 1);
    historyIndexRef.current = next;
    setInput(history[next]);
  }, [history, promptState, suggestions.length]);

  const historyDown = useCallback(() => {
    if (promptState) return;

    if (suggestions.length > 0) {
      setHoveredSuggestionIndex(null);
      setActiveSuggestionIndex((previous) => {
        if (previous === -1) return 0;
        return previous >= suggestions.length - 1 ? suggestions.length - 1 : previous + 1;
      });
      return;
    }

    if (history.length === 0) return;

    if (historyIndexRef.current === -1) return;

    const next = historyIndexRef.current + 1;
    if (next >= history.length) {
      historyIndexRef.current = -1;
      setInput("");
      return;
    }

    historyIndexRef.current = next;
    setInput(history[next]);
  }, [history, promptState, suggestions.length]);

  const setInputValue = useCallback((value: string) => {
    setInput(value);
    historyIndexRef.current = -1;
  }, []);

  const currentPromptField = promptState?.fields[promptState.step];
  const prompt = promptState
    ? currentPromptField
      ? `> ${formatPromptFieldLabel(currentPromptField, locale, true)}:`
      : ">"
    : labyrinthState
      ? "labyrinth@portfolio:~$"
      : getShellPrompt(cwd);
  const currentInputType =
    currentPromptField?.key === "email"
      ? ("email" as const)
      : currentPromptField?.mask
        ? ("password" as const)
        : ("text" as const);
  const currentEnterKeyHint =
    isBooting || isSubmittingPrompt
      ? ("done" as const)
      : promptState
        ? promptState.step >= promptState.fields.length - 1
          ? ("send" as const)
          : ("next" as const)
        : ("go" as const);

  return {
    lines,
    activeGameView,
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
    isPrompting: Boolean(promptState || labyrinthState),
    isInputDisabled: isBooting || isSubmittingPrompt,
    isBooting,
  };
}

function getPromptIntro(type: PromptType, locale: Locale): string {
  switch (type) {
    case "msg":
      return locale === "fr"
        ? "Assistant de message démarré."
        : "Message prompt started.";
    case "testimonial":
      return locale === "fr"
        ? "Assistant de témoignage démarré."
        : "Testimonial prompt started.";
    case "login":
      return locale === "fr"
        ? "Assistant de connexion admin démarré."
        : "Admin login prompt started.";
    default:
      return "";
  }
}

function getPromptFields(type: PromptType, locale: Locale): PromptField[] {
  if (type === "msg") {
    return [
      {
        key: "name",
        label: locale === "fr" ? "Nom" : "Name",
        required: true,
        invalidMessage: locale === "fr" ? "erreur: nom invalide" : "error: invalid name",
      },
      {
        key: "email",
        label: "Email",
        required: true,
        validate: isValidEmail,
        invalidMessage:
          locale === "fr" ? "erreur: format de courriel invalide" : "error: invalid email format",
      },
      {
        key: "subject",
        label: locale === "fr" ? "Sujet" : "Subject",
        required: false,
        invalidMessage: locale === "fr" ? "erreur: sujet invalide" : "error: invalid subject",
      },
      {
        key: "message",
        label: locale === "fr" ? "Message" : "Message",
        required: true,
        invalidMessage: locale === "fr" ? "erreur: message invalide" : "error: invalid message",
      },
    ];
  }

  if (type === "testimonial") {
    return [
      {
        key: "author_name",
        label: locale === "fr" ? "Nom" : "Name",
        required: true,
        invalidMessage: locale === "fr" ? "erreur: nom invalide" : "error: invalid name",
      },
      {
        key: "author_title",
        label: locale === "fr" ? "Titre" : "Title",
        required: false,
        invalidMessage: locale === "fr" ? "erreur: titre invalide" : "error: invalid title",
      },
      {
        key: "author_company",
        label: locale === "fr" ? "Entreprise" : "Company",
        required: false,
        invalidMessage: locale === "fr" ? "erreur: entreprise invalide" : "error: invalid company",
      },
      {
        key: "content",
        label: locale === "fr" ? "Contenu" : "Content",
        required: true,
        validate: (value) => value.length <= TESTIMONIAL_MAX_CHARS,
        invalidMessage:
          locale === "fr"
            ? `erreur: le contenu doit contenir ${TESTIMONIAL_MAX_CHARS} caractères maximum`
            : `error: content must be ${TESTIMONIAL_MAX_CHARS} characters or fewer`,
      },
    ];
  }

  return [
    {
      key: "email",
      label: "Email",
      required: true,
      validate: isValidEmail,
      invalidMessage:
        locale === "fr" ? "erreur: format de courriel invalide" : "error: invalid email format",
    },
    {
      key: "password",
      label: locale === "fr" ? "Mot de passe" : "Password",
      required: true,
      mask: true,
      invalidMessage:
        locale === "fr" ? "erreur: mot de passe requis" : "error: password is required",
    },
  ];
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatPromptFieldLabel(
  field: PromptField,
  locale: Locale,
  includeSkipHint = false
): string {
  if (field.required) {
    return field.label;
  }

  const optionalSuffix = locale === "fr" ? " (optionnel)" : " (optional)";
  if (!includeSkipHint) {
    return `${field.label}${optionalSuffix}`;
  }

  const skipHint = locale === "fr" ? "Entrée pour ignorer" : "press Enter to skip";
  return `${field.label}${optionalSuffix}, ${skipHint}`;
}

function localizeAuthFailure(error: { message?: string; code?: string | null }, locale: Locale): string {
  const message = (error.message || "").toLowerCase();
  const code = (error.code || "").toLowerCase();
  const isInvalidCredentials =
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials") ||
    message.includes("email not confirmed") ||
    message.includes("email or password");

  if (isInvalidCredentials) {
    return locale === "fr" ? "courriel ou mot de passe invalide" : "invalid email or password";
  }

  if (!error.message) {
    return locale === "fr" ? "erreur inconnue" : "unknown error";
  }

  return error.message;
}
