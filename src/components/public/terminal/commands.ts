import type { Locale } from "@/lib/i18n";
import type { PortfolioData } from "@/lib/portfolio-data";
import type { Hobby, Testimonial } from "@/lib/types/database";
import {
  formatColumns,
  formatYearRange,
  normalize,
  slugify,
  truncate,
} from "./formatters";

export type SectionKey =
  | "about"
  | "skills"
  | "projects"
  | "experience"
  | "education"
  | "hobbies"
  | "testimonials"
  | "contact";

export type PromptType = "msg" | "testimonial" | "login";

export type OutputTone =
  | "default"
  | "success"
  | "error"
  | "muted"
  | "prompt"
  | "system";

export interface OutputLine {
  text: string;
  tone?: OutputTone;
  preserveWhitespace?: boolean;
}

interface CommandContext {
  cwd: SectionKey | null;
  data: PortfolioData;
  locale: Locale;
  isCompact: boolean;
}

interface SectionItem {
  key: string;
  label: string;
  aliases: string[];
  brief: string;
  detail: string[];
}

export interface CommandResult {
  lines: OutputLine[];
  cwd?: SectionKey | null;
  sectionToFocus?: SectionKey | null;
  clear?: boolean;
  close?: boolean;
  startPrompt?: PromptType;
  gameAction?: {
    game: "labyrinth";
    action: "start" | "quit";
  };
  prefillInput?: string;
  downloadResume?: {
    language: "en" | "fr";
  };
}

export const SECTION_KEYS: SectionKey[] = [
  "about",
  "skills",
  "projects",
  "experience",
  "education",
  "hobbies",
  "testimonials",
  "contact",
];

const SECTION_SUGGESTION_METADATA: Record<
  SectionKey,
  {
    frLabel: string;
    aliases: string[];
  }
> = {
  about: {
    frLabel: "à-propos",
    aliases: ["apropos", "a-propos", "profile", "profil"],
  },
  skills: {
    frLabel: "compétences",
    aliases: ["competences", "skills", "skill"],
  },
  projects: {
    frLabel: "projets",
    aliases: ["project", "projet"],
  },
  experience: {
    frLabel: "expérience",
    aliases: ["experience", "work"],
  },
  education: {
    frLabel: "éducation",
    aliases: ["education", "formation", "school"],
  },
  hobbies: {
    frLabel: "loisirs",
    aliases: ["hobby", "hobbies", "loisir"],
  },
  testimonials: {
    frLabel: "témoignages",
    aliases: ["testimonial", "testimonials", "temoignages", "review", "reviews"],
  },
  contact: {
    frLabel: "contact",
    aliases: ["message", "messages"],
  },
};

interface TerminalCommandDescriptor {
  command: string;
  usage: string;
  insertValue?: string;
  hidden?: boolean;
  description: {
    en: string;
    fr: string;
  };
}

interface HelpEntry {
  command: string;
  commandFr?: string;
  en: string;
  fr: string;
}

export interface DiscoverableCommand {
  command: string;
  usage: string;
  insertValue: string;
  description: string;
}

export interface CommandArgumentSuggestion {
  id: string;
  command: string;
  usage: string;
  insertValue: string;
  description: string;
}

const TERMINAL_COMMANDS: TerminalCommandDescriptor[] = [
  {
    command: "help",
    usage: "help",
    description: {
      en: "Show this help",
      fr: "Afficher cette aide",
    },
  },
  {
    command: "ls",
    usage: "ls",
    description: {
      en: "List items in the current directory",
      fr: "Lister les éléments du répertoire courant",
    },
  },
  {
    command: "cd",
    usage: "cd <section>",
    insertValue: "cd ",
    description: {
      en: "Enter a section",
      fr: "Entrer dans une section",
    },
  },
  {
    command: "cat",
    usage: "cat <item>",
    insertValue: "cat ",
    description: {
      en: "Show a single item in detail",
      fr: "Afficher un élément en détail",
    },
  },
  {
    command: "msg",
    usage: "msg",
    description: {
      en: "Send a message",
      fr: "Envoyer un message",
    },
  },
  {
    command: "testimonial",
    usage: "testimonial",
    description: {
      en: "Submit a testimonial",
      fr: "Soumettre un témoignage",
    },
  },
  {
    command: "download-resume",
    usage: "download-resume <en|fr>",
    insertValue: "download-resume ",
    description: {
      en: "Download a resume (English or French)",
      fr: "Télécharger un CV (anglais ou français)",
    },
  },
  {
    command: "labyrinth",
    usage: "labyrinth <start|help|quit>",
    insertValue: "labyrinth ",
    description: {
      en: "Play fog-of-war labyrinth",
      fr: "Jouer au labyrinthe avec brouillard",
    },
  },
  {
    command: "clear",
    usage: "clear",
    description: {
      en: "Clear terminal output",
      fr: "Effacer la sortie",
    },
  },
  {
    command: "quit",
    usage: "quit",
    description: {
      en: "Close terminal",
      fr: "Fermer le terminal",
    },
  },
  {
    command: "login",
    usage: "login",
    hidden: true,
    description: {
      en: "Start admin login",
      fr: "Démarrer la connexion admin",
    },
  },
];

const HELP_COMMAND_ENTRIES: HelpEntry[] = [
  { command: "help", en: "Show this help", fr: "Afficher cette aide" },
  { command: "ls", en: "List items in the current directory", fr: "Lister les éléments du répertoire courant" },
  { command: "cd <section>", en: "Enter a section", fr: "Entrer dans une section" },
  { command: "cd ..", en: "Return to root", fr: "Revenir à la racine" },
  { command: "cat <item>", en: "Show a single item in detail", fr: "Afficher un élément en détail" },
  { command: "msg", en: "Send a message", fr: "Envoyer un message" },
  { command: "testimonial", en: "Submit a testimonial", fr: "Soumettre un témoignage" },
  { command: "download-resume <en|fr>", en: "Download a resume", fr: "Télécharger un CV" },
  { command: "labyrinth <start|help|quit>", en: "Play terminal labyrinth", fr: "Jouer au labyrinthe terminal" },
  { command: "clear", en: "Clear terminal output", fr: "Effacer la sortie" },
  { command: "quit", en: "Close terminal", fr: "Fermer le terminal" },
];

const HELP_SHORTCUT_ENTRIES: HelpEntry[] = [
  { command: "Alt+Enter", commandFr: "Alt+Entrée", en: "Apply active/hovered suggestion", fr: "Appliquer la suggestion active/survolée" },
  { command: "↑ / ↓", en: "Navigate suggestions and history", fr: "Naviguer dans les suggestions et l'historique" },
  { command: "Enter", commandFr: "Entrée", en: "Apply a suggestion or run command", fr: "Appliquer une suggestion ou exécuter la commande" },
  { command: "Esc", commandFr: "Échap", en: "Close terminal", fr: "Fermer le terminal" },
];

const divider = "─────────────────────────────────";

export function getShellPrompt(cwd: SectionKey | null): string {
  return cwd ? `visitor@portfolio:~/${cwd}$` : "visitor@portfolio:~$";
}

export function getDiscoverableCommands(locale: Locale): DiscoverableCommand[] {
  return TERMINAL_COMMANDS.filter((command) => !command.hidden).map((command) => ({
    command: command.command,
    usage: command.usage,
    insertValue: command.insertValue ?? command.command,
    description: locale === "fr" ? command.description.fr : command.description.en,
  }));
}

export function getCommandArgumentSuggestions({
  command,
  cwd,
  data,
  locale,
  partialArg,
}: {
  command: string;
  cwd: SectionKey | null;
  data: PortfolioData;
  locale: Locale;
  partialArg: string;
}): CommandArgumentSuggestion[] {
  const normalizedCommand = normalize(command);
  const query = normalize(partialArg);

  if (normalizedCommand === "cd") {
    const rawSuggestions: Array<CommandArgumentSuggestion & { searchTerms: string[] }> = [
      {
        id: "cd:..",
        command: "cd",
        usage: "cd ..",
        insertValue: "..",
        description: locale === "fr" ? "Revenir à la racine" : "Return to root",
        searchTerms: ["..", "root", "racine"],
      },
      ...SECTION_KEYS.map((section) => {
        const metadata = SECTION_SUGGESTION_METADATA[section];
        const localizedLabel = locale === "fr" ? metadata.frLabel : section;

        return {
          id: `cd:${section}`,
          command: "cd",
          usage: `cd ${section}`,
          insertValue: section,
          description:
            locale === "fr"
              ? `Aller à ${localizedLabel} (${section}/)`
              : `Go to ${section}/`,
          searchTerms: [section, localizedLabel, ...metadata.aliases],
        };
      }),
    ];

    return rankAndFilterArgumentSuggestions(rawSuggestions, query);
  }

  if (normalizedCommand === "cat") {
    if (!cwd) return [];

    const items = buildSectionItems(cwd, data, locale);
    if (items.length === 0) return [];

    const uniqueByInsertValue = new Map<string, CommandArgumentSuggestion & { searchTerms: string[] }>();

    items.forEach((item, index) => {
      const insertValue = item.key;
      if (uniqueByInsertValue.has(insertValue)) return;

      uniqueByInsertValue.set(insertValue, {
        id: `cat:${cwd}:${insertValue}:${index}`,
        command: "cat",
        usage: `cat ${insertValue}`,
        insertValue,
        description: truncate(item.brief, 72),
        searchTerms: [insertValue, item.label, item.brief, ...item.aliases],
      });
    });

    return rankAndFilterArgumentSuggestions(
      Array.from(uniqueByInsertValue.values()),
      query
    );
  }

  if (normalizedCommand === "download-resume") {
    const availableLanguages = new Set(data.resumes.map((resume) => resume.language));
    const unavailableLabel =
      locale === "fr" ? " (indisponible)" : " (not available)";

    const rawSuggestions: Array<CommandArgumentSuggestion & { searchTerms: string[] }> = [
      {
        id: "download-resume:en",
        command: "download-resume",
        usage: "download-resume en",
        insertValue: "en",
        description: `${locale === "fr" ? "CV anglais" : "English resume"}${
          availableLanguages.has("en") ? "" : unavailableLabel
        }`,
        searchTerms: ["en", "english", "anglais", "resume", "cv"],
      },
      {
        id: "download-resume:fr",
        command: "download-resume",
        usage: "download-resume fr",
        insertValue: "fr",
        description: `${locale === "fr" ? "CV français" : "French resume"}${
          availableLanguages.has("fr") ? "" : unavailableLabel
        }`,
        searchTerms: ["fr", "french", "francais", "français", "resume", "cv"],
      },
    ];

    return rankAndFilterArgumentSuggestions(rawSuggestions, query);
  }

  if (normalizedCommand === "labyrinth" || normalizedCommand === "lab") {
    const rawSuggestions: Array<CommandArgumentSuggestion & { searchTerms: string[] }> = [
      {
        id: "labyrinth:start",
        command: "labyrinth",
        usage: "labyrinth start",
        insertValue: "start",
        description: locale === "fr" ? "Démarrer une partie" : "Start a game",
        searchTerms: ["start", "new", "begin", "demarrer", "démarrer", "play"],
      },
      {
        id: "labyrinth:help",
        command: "labyrinth",
        usage: "labyrinth help",
        insertValue: "help",
        description: locale === "fr" ? "Afficher l'aide du jeu" : "Show game help",
        searchTerms: ["help", "aide", "instructions", "controls", "commandes"],
      },
      {
        id: "labyrinth:quit",
        command: "labyrinth",
        usage: "labyrinth quit",
        insertValue: "quit",
        description: locale === "fr" ? "Quitter la partie active" : "Quit active game",
        searchTerms: ["quit", "exit", "leave", "sortir", "quitter"],
      },
    ];

    return rankAndFilterArgumentSuggestions(rawSuggestions, query);
  }

  return [];
}

export function executeCommand(input: string, context: CommandContext): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { lines: [] };
  }

  const [command, ...args] = trimmed.split(/\s+/);
  const lowerCommand = normalize(command);

  switch (lowerCommand) {
    case "help":
      return { lines: helpLines(context.locale, context.isCompact) };
    case "ls":
      return { lines: lsLines(context.cwd, context.data, context.locale, context.isCompact) };
    case "cd":
      return cdResult(context.cwd, args, context.locale);
    case "cat":
      return catResult(context.cwd, args, context.data, context.locale);
    case "msg":
      return {
        lines: [
          line(
            context.locale === "fr"
              ? "Démarrage de l'assistant de message..."
              : "Starting message prompt...",
            "system"
          ),
        ],
        startPrompt: "msg",
      };
    case "testimonial":
      return {
        lines: [
          line(
            context.locale === "fr"
              ? "Démarrage de la soumission de témoignage..."
              : "Starting testimonial prompt...",
            "system"
          ),
        ],
        startPrompt: "testimonial",
      };
    case "download-resume":
      return downloadResumeResult(args, context.data, context.locale);
    case "labyrinth":
    case "lab":
      return labyrinthResult(args, context.locale);
    case "login":
      return {
        lines: [
          line(
            context.locale === "fr"
              ? "Authentification administrateur..."
              : "Starting admin login...",
            "system"
          ),
        ],
        startPrompt: "login",
      };
    case "clear":
      return { lines: [], clear: true };
    case "quit":
      return {
        lines: [
          line(context.locale === "fr" ? "Fermeture du terminal..." : "Closing terminal...", "muted"),
        ],
        close: true,
      };
    default:
      return {
        lines: [
          line(
            context.locale === "fr"
              ? `commande introuvable: ${command}. Tapez 'help' pour les commandes disponibles.`
              : `command not found: ${command}. Type 'help' for available commands.`,
            "error"
          ),
        ],
      };
  }
}

function helpLines(locale: Locale, isCompact: boolean): OutputLine[] {
  return [
    line(locale === "fr" ? "Commandes disponibles:" : "Available commands:", "system"),
    ...formatHelpEntries(HELP_COMMAND_ENTRIES, locale, isCompact, "default"),
    line(""),
    line(locale === "fr" ? "Raccourcis:" : "Shortcuts:", "system"),
    ...formatHelpEntries(HELP_SHORTCUT_ENTRIES, locale, isCompact, "success"),
  ];
}

function lsLines(
  cwd: SectionKey | null,
  data: PortfolioData,
  locale: Locale,
  isCompact: boolean
): OutputLine[] {
  if (!cwd) {
    const columns = isCompact ? 2 : 3;
    const padWidth = isCompact ? 12 : 16;
    return formatColumns(
      SECTION_KEYS.map((section) => `${section}/`),
      columns,
      padWidth
    ).map((entry) => line(entry, "muted", true));
  }

  const items = buildSectionItems(cwd, data, locale);
  if (items.length === 0) {
    return [line(locale === "fr" ? "Aucune entrée." : "No entries.", "muted")];
  }

  return items.map((item) => line(item.brief, "default"));
}

function formatHelpEntries(
  entries: HelpEntry[],
  locale: Locale,
  isCompact: boolean,
  tone: OutputTone
): OutputLine[] {
  const displayCommand = (entry: HelpEntry) =>
    locale === "fr" && entry.commandFr ? entry.commandFr : entry.command;

  if (isCompact) {
    return entries.flatMap((entry) => {
      const description = locale === "fr" ? entry.fr : entry.en;
      return [line(displayCommand(entry), tone), line(`  ${description}`, tone)];
    });
  }

  const commandWidth = Math.max(...entries.map((entry) => displayCommand(entry).length)) + 2;
  return entries.map((entry) => {
    const description = locale === "fr" ? entry.fr : entry.en;
    return line(`${displayCommand(entry).padEnd(commandWidth)}- ${description}`, tone, true);
  });
}

function cdResult(cwd: SectionKey | null, args: string[], locale: Locale): CommandResult {
  const target = normalize(args[0] ?? "");
  if (!target) {
    return {
      lines: [line(locale === "fr" ? "usage: cd <section>" : "usage: cd <section>", "error")],
    };
  }

  if (target === "..") {
    if (!cwd) {
      return {
        lines: [line(locale === "fr" ? "Déjà à la racine." : "Already at root.", "muted")],
      };
    }
    return {
      cwd: null,
      sectionToFocus: null,
      lines: [line(locale === "fr" ? "Retour à ~/portfolio" : "Moved to ~/portfolio", "success")],
    };
  }

  const section = SECTION_KEYS.find((entry) => entry === target);
  if (!section) {
    return {
      lines: [
        line(
          locale === "fr"
            ? `section invalide: ${target}`
            : `invalid section: ${target}`,
          "error"
        ),
      ],
    };
  }

  return {
    cwd: section,
    sectionToFocus: section,
    lines: [line(locale === "fr" ? `Entré dans ${section}/` : `Entered ${section}/`, "success")],
  };
}

function catResult(
  cwd: SectionKey | null,
  args: string[],
  data: PortfolioData,
  locale: Locale
): CommandResult {
  if (!cwd) {
    return {
      lines: [
        line(
          locale === "fr"
            ? "cat fonctionne à l'intérieur d'une section. Utilisez 'cd <section>' d'abord."
            : "cat works inside a section. Use 'cd <section>' first.",
          "error"
        ),
      ],
    };
  }

  const items = buildSectionItems(cwd, data, locale);
  if (items.length === 0) {
    return {
      lines: [line(locale === "fr" ? "Aucun élément à afficher." : "No item to display.", "muted")],
    };
  }

  const query = normalize(args.join(" "));
  if (!query) {
    if (items.length === 1) {
      return {
        lines: items[0].detail.map((entry) => line(entry, "default")),
      };
    }
    return {
      lines: [
        line(locale === "fr" ? "usage: cat <item>" : "usage: cat <item>", "error"),
        line(locale === "fr" ? "indice: utilisez 'ls' pour voir les éléments." : "hint: use 'ls' to list items.", "muted"),
      ],
    };
  }

  const matches = items.filter((item) =>
    item.aliases.some((alias) => normalize(alias).includes(query))
  );

  if (matches.length === 0) {
    return {
      lines: [
        line(
          locale === "fr"
            ? `aucun élément correspondant: ${query}`
            : `no matching item: ${query}`,
          "error"
        ),
      ],
    };
  }

  if (matches.length > 1) {
    return {
      lines: [
        line(
          locale === "fr" ? "Correspondances multiples, soyez plus précis :" : "Multiple matches, be more specific:",
          "error"
        ),
        ...matches.map((match) => line(`- ${match.label}`, "muted")),
      ],
    };
  }

  return {
    lines: matches[0].detail.map((entry) => line(entry, "default")),
  };
}

function buildSectionItems(
  section: SectionKey,
  data: PortfolioData,
  locale: Locale
): SectionItem[] {
  switch (section) {
    case "about":
      return [buildAboutItem(data, locale)];
    case "skills":
      return buildSkillItems(data, locale);
    case "projects":
      return buildProjectItems(data, locale);
    case "experience":
      return buildExperienceItems(data, locale);
    case "education":
      return buildEducationItems(data, locale);
    case "hobbies":
      return buildHobbyItems(data, locale);
    case "testimonials":
      return buildTestimonialItems(data, locale);
    case "contact":
      return [buildContactItem(locale)];
    default:
      return [];
  }
}

function downloadResumeResult(
  args: string[],
  data: PortfolioData,
  locale: Locale
): CommandResult {
  const selectedLanguage = normalize(args[0] ?? "");
  const hasExtraArgs = args.length > 1;

  if (!selectedLanguage && !hasExtraArgs) {
    return {
      lines: [
        line(
          locale === "fr"
            ? "Sélectionnez la langue du CV à télécharger."
            : "Select a resume language to download.",
          "system"
        ),
        line(
          locale === "fr"
            ? "Utilisez ↑/↓ puis Entrée pour choisir en ou fr."
            : "Use ↑/↓ then Enter to choose en or fr.",
          "muted"
        ),
      ],
      prefillInput: "download-resume ",
    };
  }

  if (hasExtraArgs || (selectedLanguage !== "en" && selectedLanguage !== "fr")) {
    return {
      lines: [
        line(locale === "fr" ? "usage: download-resume <en|fr>" : "usage: download-resume <en|fr>", "error"),
      ],
    };
  }

  const hasLanguageResume = data.resumes.some((resume) => resume.language === selectedLanguage);
  if (!hasLanguageResume) {
    return {
      lines: [
        line(
          locale === "fr"
            ? `Aucun CV ${selectedLanguage} disponible.`
            : `No ${selectedLanguage} resume available.`,
          "error"
        ),
      ],
    };
  }

  return {
    lines: [
      line(
        locale === "fr"
          ? `Téléchargement du CV ${selectedLanguage}...`
          : `Downloading ${selectedLanguage} resume...`,
        "system"
      ),
    ],
    downloadResume: {
      language: selectedLanguage,
    },
  };
}

function labyrinthResult(args: string[], locale: Locale): CommandResult {
  const action = normalize(args[0] ?? "");

  if (!action || action === "start") {
    return {
      lines: [
        line(
          locale === "fr"
            ? "Initialisation du labyrinthe..."
            : "Initializing labyrinth...",
          "system"
        ),
      ],
      gameAction: {
        game: "labyrinth",
        action: "start",
      },
    };
  }

  if (action === "help") {
    return {
      lines: [
        line(locale === "fr" ? "Labyrinthe:" : "Labyrinth:", "system"),
        line(locale === "fr" ? "  w/a/s/d  - se déplacer" : "  w/a/s/d  - move", "muted"),
        line(locale === "fr" ? "  lab quit - quitter la partie" : "  lab quit - quit game", "muted"),
        line(locale === "fr" ? "  lab help - afficher cette aide" : "  lab help - show this help", "muted"),
        line(
          locale === "fr"
            ? "Objectif: atteindre X avec le moins de pas possible."
            : "Goal: reach X in as few steps as possible.",
          "success"
        ),
      ],
    };
  }

  if (action === "quit") {
    return {
      lines: [
        line(
          locale === "fr"
            ? "Fin de la partie demandée."
            : "Requested to end current game.",
          "muted"
        ),
      ],
      gameAction: {
        game: "labyrinth",
        action: "quit",
      },
    };
  }

  return {
    lines: [
      line(
        locale === "fr"
          ? "usage: labyrinth <start|help|quit>"
          : "usage: labyrinth <start|help|quit>",
        "error"
      ),
    ],
  };
}

function buildAboutItem(data: PortfolioData, locale: Locale): SectionItem {
  const profile = data.profile;
  const name = profile?.full_name || (locale === "fr" ? "Profil non configuré" : "Profile not configured");
  const headline = locale === "fr" ? profile?.headline_fr || profile?.headline_en : profile?.headline_en || profile?.headline_fr;
  const bio = locale === "fr" ? profile?.bio_fr || profile?.bio_en : profile?.bio_en || profile?.bio_fr;
  const socialLinks = data.socialLinks.filter((item) => Boolean(item.url));

  const detail: string[] = [divider, name, divider];
  if (headline) detail.push(headline);
  if (bio) detail.push("", bio);
  if (profile?.location) detail.push("", `${locale === "fr" ? "Lieu" : "Location"}: ${profile.location}`);
  if (socialLinks.length > 0) {
    detail.push("", locale === "fr" ? "Liens sociaux :" : "Social links:");
    socialLinks.forEach((item) => {
      detail.push(`- ${item.platform}: ${item.url}`);
    });
  }

  return {
    key: "about",
    label: "about",
    aliases: ["about", "profile", slugify(name)],
    brief: locale === "fr" ? "profile — informations générales" : "profile — general information",
    detail,
  };
}

function buildSkillItems(data: PortfolioData, locale: Locale): SectionItem[] {
  return data.skillsByCategory.map((category) => ({
    key: slugify(category.name),
    label: category.name,
    aliases: [category.name, slugify(category.name)],
    brief: `~/${slugify(category.name) || "skills"}/          ${category.skills.length} ${locale === "fr" ? "compétences" : "skills"}`,
    detail: [
      divider,
      category.name,
      divider,
      ...category.skills.map((skill) => `- ${skill.name}`),
    ],
  }));
}

function buildProjectItems(data: PortfolioData, locale: Locale): SectionItem[] {
  return data.projects.map((project) => {
    const title = project.title;
    const description = project.description || (locale === "fr" ? "Aucune description." : "No description.");

    return {
      key: slugify(title),
      label: title,
      aliases: [title, slugify(title)],
      brief: `${truncate(title, 28).padEnd(30)} — ${truncate(description, 46)}`,
      detail: [
        divider,
        title,
        divider,
        description,
        "",
        `${locale === "fr" ? "Tech" : "Tech"}: ${
          project.skills.length > 0 ? project.skills.map((skill) => skill.name).join(", ") : locale === "fr" ? "N/A" : "N/A"
        }`,
        `${locale === "fr" ? "URL" : "URL"}: ${project.project_url || "N/A"}`,
        `${locale === "fr" ? "Git" : "Git"}: ${project.github_url || "N/A"}`,
      ],
    };
  });
}

function buildExperienceItems(data: PortfolioData, locale: Locale): SectionItem[] {
  return data.experience.map((item, index) => {
    const position = locale === "fr" ? item.position_fr : item.position_en;
    const description = locale === "fr" ? item.description_fr || item.description_en : item.description_en || item.description_fr;
    const range = formatYearRange(item.start_date, item.end_date, locale);
    const rowIndex = String(index).padStart(2, "0");

    return {
      key: rowIndex,
      label: `${position} @ ${item.company}`,
      aliases: [rowIndex, position, item.company, slugify(position), slugify(item.company)],
      brief: `[${rowIndex}] ${truncate(position, 22).padEnd(24)} @ ${truncate(item.company, 16).padEnd(18)} ${range}`,
      detail: [
        divider,
        position,
        divider,
        `${locale === "fr" ? "Entreprise" : "Company"}: ${item.company}`,
        `${locale === "fr" ? "Période" : "Period"}: ${range}`,
        item.location ? `${locale === "fr" ? "Lieu" : "Location"}: ${item.location}` : "",
        description ? `\n${description}` : "",
      ].filter(Boolean),
    };
  });
}

function buildEducationItems(data: PortfolioData, locale: Locale): SectionItem[] {
  return data.education.map((item, index) => {
    const degree = locale === "fr" ? item.degree_fr : item.degree_en;
    const field = locale === "fr" ? item.field_fr : item.field_en;
    const range = formatYearRange(item.start_date, item.end_date, locale);
    const rowIndex = String(index).padStart(2, "0");

    return {
      key: rowIndex,
      label: `${degree} @ ${item.institution}`,
      aliases: [rowIndex, degree, field, item.institution, slugify(degree), slugify(item.institution)],
      brief: `[${rowIndex}] ${truncate(degree, 22).padEnd(24)} @ ${truncate(item.institution, 16).padEnd(18)} ${range}`,
      detail: [
        divider,
        degree,
        divider,
        `${locale === "fr" ? "Établissement" : "Institution"}: ${item.institution}`,
        `${locale === "fr" ? "Domaine" : "Field"}: ${field}`,
        `${locale === "fr" ? "Période" : "Period"}: ${range}`,
        item.location ? `${locale === "fr" ? "Lieu" : "Location"}: ${item.location}` : "",
      ].filter(Boolean),
    };
  });
}

function buildHobbyItems(data: PortfolioData, locale: Locale): SectionItem[] {
  return data.hobbies.map((item: Hobby) => {
    const name = locale === "fr" ? item.name_fr : item.name_en;
    const description =
      locale === "fr"
        ? item.short_description_fr || item.short_description_en
        : item.short_description_en || item.short_description_fr;

    return {
      key: slugify(name),
      label: name,
      aliases: [name, slugify(name), item.icon || ""].filter(Boolean),
      brief: name,
      detail: [
        divider,
        name,
        divider,
        description || (locale === "fr" ? "Aucune description disponible." : "No description available."),
      ],
    };
  });
}

function buildTestimonialItems(data: PortfolioData, locale: Locale): SectionItem[] {
  return data.testimonials.map((item: Testimonial, index) => {
    const content = locale === "fr" ? item.content_fr || item.content_en : item.content_en;
    const rowIndex = String(index).padStart(2, "0");

    return {
      key: rowIndex,
      label: item.author_name,
      aliases: [rowIndex, item.author_name, item.author_company || "", slugify(item.author_name)].filter(Boolean),
      brief: `${truncate(item.author_name, 24).padEnd(26)} — ${truncate(content, 48)}`,
      detail: [
        divider,
        item.author_name,
        divider,
        item.author_title ? `${locale === "fr" ? "Titre" : "Title"}: ${item.author_title}` : "",
        item.author_company ? `${locale === "fr" ? "Société" : "Company"}: ${item.author_company}` : "",
        "",
        content,
      ].filter(Boolean),
    };
  });
}

function buildContactItem(locale: Locale): SectionItem {
  return {
    key: "message-form",
    label: "message-form",
    aliases: ["message", "message-form", "contact"],
    brief: locale === "fr" ? "message-form — utilisez 'msg' pour écrire" : "message-form — use 'msg' to write",
    detail: [
      divider,
      locale === "fr" ? "Contact" : "Contact",
      divider,
      locale === "fr" ? "Indice: utilisez 'msg' pour envoyer un message." : "Hint: use 'msg' to send a message.",
      locale === "fr" ? "Commande: msg" : "Command: msg",
    ],
  };
}

function line(text: string, tone: OutputTone = "default", preserveWhitespace = false): OutputLine {
  return { text, tone, preserveWhitespace };
}

function rankAndFilterArgumentSuggestions(
  suggestions: Array<CommandArgumentSuggestion & { searchTerms: string[] }>,
  query: string
): CommandArgumentSuggestion[] {
  if (!query) {
    return suggestions.map(stripSearchTerms);
  }

  const queryTokens = query.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) {
    return suggestions.map(stripSearchTerms);
  }

  const matchesQuery = (term: string) => {
    const normalizedTerm = normalize(term);
    return queryTokens.every((token) => normalizedTerm.includes(token));
  };

  const firstToken = queryTokens[0];
  const startsWithMatches = suggestions.filter((suggestion) =>
    suggestion.searchTerms.some((term) => {
      const normalizedTerm = normalize(term);
      return normalizedTerm.startsWith(firstToken) && matchesQuery(term);
    })
  );
  const includeMatches = suggestions.filter(
    (suggestion) =>
      !startsWithMatches.includes(suggestion) &&
      suggestion.searchTerms.some(matchesQuery)
  );

  return [...startsWithMatches, ...includeMatches].map(stripSearchTerms);
}

function stripSearchTerms(
  suggestion: CommandArgumentSuggestion & { searchTerms: string[] }
): CommandArgumentSuggestion {
  return {
    id: suggestion.id,
    command: suggestion.command,
    usage: suggestion.usage,
    insertValue: suggestion.insertValue,
    description: suggestion.description,
  };
}
