import type { Locale } from "@/lib/i18n";

export type LabyrinthMove = "up" | "down" | "left" | "right";

type MazeCell = 0 | 1;

interface Position {
  x: number;
  y: number;
}

export interface LabyrinthState {
  width: number;
  height: number;
  maze: MazeCell[][];
  discovered: boolean[][];
  player: Position;
  exit: Position;
  steps: number;
  startedAt: number;
  fogRadius: number;
}

export interface LabyrinthMoveResult {
  state: LabyrinthState;
  moved: boolean;
  hitWall: boolean;
  won: boolean;
  elapsedMs?: number;
}

const DEFAULT_WIDTH = 37;
const DEFAULT_HEIGHT = 19;
const DEFAULT_FOG_RADIUS = 1;
const LOOP_CARVE_RATIO = 0.12;

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex] as T;
    next[swapIndex] = current as T;
  }
  return next;
}

function revealAround(
  discovered: boolean[][],
  centerX: number,
  centerY: number,
  radius: number
) {
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    if (y < 0 || y >= discovered.length) continue;
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (x < 0 || x >= (discovered[y]?.length ?? 0)) continue;
      if (discovered[y]) {
        discovered[y][x] = true;
      }
    }
  }
}

function cloneDiscovered(discovered: boolean[][]): boolean[][] {
  return discovered.map((row) => [...row]);
}

function createMaze(width: number, height: number): MazeCell[][] {
  const maze: MazeCell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 1 as MazeCell)
  );

  const stack: Position[] = [{ x: 1, y: 1 }];
  if (maze[1]) {
    maze[1][1] = 0;
  }

  const directions: Position[] = [
    { x: 0, y: -2 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
    { x: -2, y: 0 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    if (!current) break;

    const candidates = shuffle(directions).filter((direction) => {
      const nextX = current.x + direction.x;
      const nextY = current.y + direction.y;
      if (nextX <= 0 || nextX >= width - 1 || nextY <= 0 || nextY >= height - 1) {
        return false;
      }
      return maze[nextY]?.[nextX] === 1;
    });

    const nextDirection = candidates[0];
    if (!nextDirection) {
      stack.pop();
      continue;
    }

    const betweenX = current.x + nextDirection.x / 2;
    const betweenY = current.y + nextDirection.y / 2;
    const nextX = current.x + nextDirection.x;
    const nextY = current.y + nextDirection.y;

    if (maze[betweenY]) {
      maze[betweenY][betweenX] = 0;
    }
    if (maze[nextY]) {
      maze[nextY][nextX] = 0;
    }

    stack.push({ x: nextX, y: nextY });
  }

  const exitX = width - 2;
  const exitY = height - 2;
  if (maze[exitY]) {
    maze[exitY][exitX] = 0;
  }
  if (maze[exitY]?.[exitX - 1] === 1 && maze[exitY - 1]) {
    maze[exitY - 1][exitX] = 0;
  }

  carveLoopPassages(maze, width, height, LOOP_CARVE_RATIO);
  return maze;
}

function carveLoopPassages(
  maze: MazeCell[][],
  width: number,
  height: number,
  ratio: number
) {
  const candidates: Position[] = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (maze[y]?.[x] !== 1) continue;

      const horizontalConnection =
        maze[y]?.[x - 1] === 0 && maze[y]?.[x + 1] === 0;
      const verticalConnection =
        maze[y - 1]?.[x] === 0 && maze[y + 1]?.[x] === 0;

      if (horizontalConnection || verticalConnection) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) return;

  const openingsToCarve = Math.max(
    1,
    Math.min(candidates.length, Math.round(candidates.length * ratio))
  );
  const shuffledCandidates = shuffle(candidates);

  for (let index = 0; index < openingsToCarve; index += 1) {
    const candidate = shuffledCandidates[index];
    if (!candidate) continue;
    if (maze[candidate.y]) {
      maze[candidate.y][candidate.x] = 0;
    }
  }
}

function normalizeDimension(value: number): number {
  const bounded = Math.max(9, Math.min(41, Math.floor(value)));
  return bounded % 2 === 0 ? bounded + 1 : bounded;
}

export function createLabyrinthState(
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  fogRadius = DEFAULT_FOG_RADIUS
): LabyrinthState {
  const normalizedWidth = normalizeDimension(width);
  const normalizedHeight = normalizeDimension(height);
  const maze = createMaze(normalizedWidth, normalizedHeight);
  const discovered = Array.from({ length: normalizedHeight }, () =>
    Array.from({ length: normalizedWidth }, () => false)
  );

  const player = { x: 1, y: 1 };
  const exit = { x: normalizedWidth - 2, y: normalizedHeight - 2 };
  revealAround(discovered, player.x, player.y, Math.max(1, Math.floor(fogRadius)));

  return {
    width: normalizedWidth,
    height: normalizedHeight,
    maze,
    discovered,
    player,
    exit,
    steps: 0,
    startedAt: Date.now(),
    fogRadius: Math.max(1, Math.floor(fogRadius)),
  };
}

function getMoveDelta(move: LabyrinthMove): Position {
  switch (move) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

export function applyLabyrinthMove(
  state: LabyrinthState,
  move: LabyrinthMove
): LabyrinthMoveResult {
  const delta = getMoveDelta(move);
  const targetX = state.player.x + delta.x;
  const targetY = state.player.y + delta.y;

  const outOfBounds =
    targetX < 0 ||
    targetX >= state.width ||
    targetY < 0 ||
    targetY >= state.height;

  if (outOfBounds || state.maze[targetY]?.[targetX] === 1) {
    return {
      state,
      moved: false,
      hitWall: true,
      won: false,
    };
  }

  const nextDiscovered = cloneDiscovered(state.discovered);
  revealAround(nextDiscovered, targetX, targetY, state.fogRadius);

  const nextState: LabyrinthState = {
    ...state,
    player: { x: targetX, y: targetY },
    discovered: nextDiscovered,
    steps: state.steps + 1,
  };

  const won = targetX === state.exit.x && targetY === state.exit.y;
  return {
    state: nextState,
    moved: true,
    hitWall: false,
    won,
    elapsedMs: won ? Date.now() - state.startedAt : undefined,
  };
}

export function parseLabyrinthMoveInput(input: string): LabyrinthMove | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === "w") return "up";
  if (normalized === "a") return "left";
  if (normalized === "s") return "down";
  if (normalized === "d") return "right";
  return null;
}

export function renderLabyrinthBoard(state: LabyrinthState): string[] {
  const rows: string[] = [];

  for (let y = 0; y < state.height; y += 1) {
    let row = "";

    for (let x = 0; x < state.width; x += 1) {
      const isPlayer = x === state.player.x && y === state.player.y;
      if (isPlayer) {
        row += "@";
        continue;
      }

      const isVisible = state.discovered[y]?.[x] === true;
      if (!isVisible) {
        row += "·";
        continue;
      }

      const isExit = x === state.exit.x && y === state.exit.y;
      if (isExit) {
        row += "X";
        continue;
      }

      row += state.maze[y]?.[x] === 1 ? "#" : ".";
    }

    rows.push(row);
  }

  return rows;
}

export function labyrinthHelpLines(locale: Locale): string[] {
  if (locale === "fr") {
    return [
      "Labyrinthe:",
      "  w/a/s/d  - se déplacer",
      "  lab quit - quitter la partie",
      "  lab help - afficher cette aide",
      "Objectif: atteindre X avec le moins de pas possible.",
    ];
  }

  return [
    "Labyrinth:",
    "  w/a/s/d  - move",
    "  lab quit - quit game",
    "  lab help - show this help",
    "Goal: reach X in as few steps as possible.",
  ];
}
