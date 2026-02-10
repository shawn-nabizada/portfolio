"use client";

import { useEffect, useRef, useState } from "react";

const GRID_SIZE = 10;
const MIN_SPAWN_INTERVAL_MS = 12;
const MIN_TILE_TTL_MS = 360;
const MAX_TILE_TTL_MS = 520;
const MAX_ACTIVE_TILES = 420;
const MAX_SPAWN_PER_MOVE = 4;
const RECENT_CELL_WINDOW_MS = 18;
const DENSITY_MULTIPLIER = 1.5;
const MIN_DIRECTION_MAGNITUDE = 0.5;

type ColorKind = "bg" | "fg" | "muted" | "border";

type Tile = {
  x: number;
  y: number;
  size: number;
  bornAt: number;
  ttl: number;
  alphaSeed: number;
  colorKind: ColorKind;
};

type Palette = Record<ColorKind, string>;

const DEFAULT_PALETTE: Palette = {
  bg: "oklch(0.10 0.01 145)",
  fg: "oklch(0.88 0.04 145)",
  muted: "oklch(0.60 0.06 145)",
  border: "oklch(0.78 0.2 145 / 20%)",
};

function readPalette(): Palette {
  const styles = window.getComputedStyle(document.documentElement);
  return {
    bg: styles.getPropertyValue("--glitch-op-bg").trim() || DEFAULT_PALETTE.bg,
    fg: styles.getPropertyValue("--glitch-op-fg").trim() || DEFAULT_PALETTE.fg,
    muted: styles.getPropertyValue("--glitch-op-muted").trim() || DEFAULT_PALETTE.muted,
    border: styles.getPropertyValue("--glitch-op-border").trim() || DEFAULT_PALETTE.border,
  };
}

function pickColorKind(): ColorKind {
  const roll = Math.random();

  if (roll < 0.72) return "bg";
  if (roll < 0.87) return "border";
  if (roll < 0.96) return "muted";
  return "fg";
}

export function CursorGlitchTrail({ paused = false }: { paused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCapable, setIsCapable] = useState(false);

  useEffect(() => {
    const finePointerMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateCapability = () => {
      setIsCapable(finePointerMedia.matches && !reducedMotionMedia.matches);
    };

    updateCapability();
    finePointerMedia.addEventListener("change", updateCapability);
    reducedMotionMedia.addEventListener("change", updateCapability);

    return () => {
      finePointerMedia.removeEventListener("change", updateCapability);
      reducedMotionMedia.removeEventListener("change", updateCapability);
    };
  }, []);

  useEffect(() => {
    if (!isCapable) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let palette = readPalette();
    const tiles: Tile[] = [];
    const recentCells = new Map<string, number>();

    let animationFrameId: number | null = null;
    let lastSpawnAt = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let hasLastPointer = false;
    let lastDirectionX = 0;
    let lastDirectionY = 0;
    let hasDirection = false;

    const isPaused = () =>
      paused ||
      document.hidden ||
      document.body.dataset.terminalOpen === "true";

    const stopAnimation = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const clearCanvas = () => {
      context.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    const clearTrail = () => {
      tiles.length = 0;
      recentCells.clear();
      hasLastPointer = false;
      hasDirection = false;
      lastDirectionX = 0;
      lastDirectionY = 0;
      clearCanvas();
      stopAnimation();
    };

    const syncCanvasSize = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;

      canvas.width = Math.round(viewportWidth * devicePixelRatio);
      canvas.height = Math.round(viewportHeight * devicePixelRatio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.imageSmoothingEnabled = false;
      clearCanvas();
    };

    const pruneRecentCells = (now: number) => {
      if (recentCells.size <= 128) return;

      for (const [cellKey, seenAt] of recentCells) {
        if (now - seenAt > RECENT_CELL_WINDOW_MS) {
          recentCells.delete(cellKey);
        }
      }
    };

    const pushTile = (pointX: number, pointY: number, now: number) => {
      const cellX = Math.floor(pointX / GRID_SIZE) * GRID_SIZE;
      const cellY = Math.floor(pointY / GRID_SIZE) * GRID_SIZE;
      const cellKey = `${cellX}:${cellY}`;

      const lastSeenAt = recentCells.get(cellKey);
      if (lastSeenAt !== undefined && now - lastSeenAt < RECENT_CELL_WINDOW_MS) {
        return;
      }

      recentCells.set(cellKey, now);
      tiles.push({
        x: cellX,
        y: cellY,
        size: GRID_SIZE + (Math.random() < 0.18 ? 2 : 0),
        bornAt: now,
        ttl: MIN_TILE_TTL_MS + Math.random() * (MAX_TILE_TTL_MS - MIN_TILE_TTL_MS),
        alphaSeed: 0.55 + Math.random() * 0.35,
        colorKind: pickColorKind(),
      });

      if (tiles.length > MAX_ACTIVE_TILES) {
        tiles.splice(0, tiles.length - MAX_ACTIVE_TILES);
      }
    };

    const drawFrame = (now: number) => {
      animationFrameId = null;

      if (isPaused()) {
        clearTrail();
        return;
      }

      clearCanvas();
      let writeIndex = 0;

      for (let index = 0; index < tiles.length; index += 1) {
        const tile = tiles[index];
        const age = now - tile.bornAt;
        if (age >= tile.ttl) continue;

        const remainingLife = 1 - age / tile.ttl;
        const alpha = tile.alphaSeed * remainingLife;
        if (alpha <= 0.01) continue;

        context.globalAlpha = alpha;
        context.fillStyle = palette[tile.colorKind];
        context.fillRect(tile.x, tile.y, tile.size, tile.size);

        tiles[writeIndex] = tile;
        writeIndex += 1;
      }

      tiles.length = writeIndex;
      context.globalAlpha = 1;

      if (tiles.length > 0) {
        animationFrameId = window.requestAnimationFrame(drawFrame);
      }
    };

    const ensureAnimation = () => {
      if (animationFrameId !== null || tiles.length === 0 || isPaused()) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(drawFrame);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || isPaused()) return;

      const now = performance.now();
      if (now - lastSpawnAt < MIN_SPAWN_INTERVAL_MS) return;

      pruneRecentCells(now);

      const pointerX = event.clientX;
      const pointerY = event.clientY;
      let velocity = 0;
      let directionX = 0;
      let directionY = 0;

      if (hasLastPointer) {
        const deltaX = pointerX - lastPointerX;
        const deltaY = pointerY - lastPointerY;
        velocity = Math.hypot(deltaX, deltaY);

        if (velocity >= MIN_DIRECTION_MAGNITUDE) {
          directionX = deltaX / velocity;
          directionY = deltaY / velocity;
          lastDirectionX = directionX;
          lastDirectionY = directionY;
          hasDirection = true;
        }
      }

      if ((directionX === 0 && directionY === 0) && hasDirection) {
        directionX = lastDirectionX;
        directionY = lastDirectionY;
      }

      lastPointerX = pointerX;
      lastPointerY = pointerY;
      hasLastPointer = true;
      lastSpawnAt = now;

      const baseSpawnCount = 1 + Math.floor(velocity / 18);
      const boostedSpawnCount = Math.ceil(baseSpawnCount * DENSITY_MULTIPLIER);
      const spawnCount = Math.min(MAX_SPAWN_PER_MOVE, boostedSpawnCount);

      pushTile(pointerX, pointerY, now);

      for (let index = 1; index < spawnCount; index += 1) {
        if (directionX !== 0 || directionY !== 0) {
          const trailX = -directionX;
          const trailY = -directionY;
          const perpendicularX = -directionY;
          const perpendicularY = directionX;
          const backwardDistance = GRID_SIZE * (0.6 + Math.random() * 1.8);
          const sideJitter = GRID_SIZE * ((Math.random() - 0.5) * 0.9);

          pushTile(
            pointerX + trailX * backwardDistance + perpendicularX * sideJitter,
            pointerY + trailY * backwardDistance + perpendicularY * sideJitter,
            now
          );
          continue;
        }

        const angle = Math.random() * Math.PI * 2;
        const distance = GRID_SIZE * (0.35 + Math.random() * 0.65);
        pushTile(
          pointerX + Math.cos(angle) * distance,
          pointerY + Math.sin(angle) * distance,
          now
        );
      }

      ensureAnimation();
    };

    const handlePointerReset = () => {
      hasLastPointer = false;
    };

    const handlePauseStateChange = () => {
      if (paused || document.body.dataset.terminalOpen === "true") {
        clearTrail();
      }
    };

    const handleThemeChange = () => {
      palette = readPalette();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTrail();
      }
    };

    syncCanvasSize();
    if (isPaused()) {
      clearTrail();
    }

    const terminalStateObserver = new MutationObserver(handlePauseStateChange);
    terminalStateObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-terminal-open"],
    });

    const themeObserver = new MutationObserver(handleThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    window.addEventListener("resize", syncCanvasSize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointercancel", handlePointerReset);
    window.addEventListener("blur", handlePointerReset);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAnimation();
      clearCanvas();
      terminalStateObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", syncCanvasSize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointercancel", handlePointerReset);
      window.removeEventListener("blur", handlePointerReset);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isCapable, paused]);

  if (!isCapable) {
    return null;
  }

  return (
    <div className="cursor-glitch-layer" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
