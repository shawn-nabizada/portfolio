"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getHobbyIcon } from "@/lib/hobby-icons";
import { cn } from "@/lib/utils";

const DEFAULT_SIZE = 44;
const DEFAULT_SPEED_PX_PER_SEC = 185;
const DEFAULT_ICON_OPACITY = 0.2;
const PHYSICS_STEP_SECONDS = 1 / 120;
const MAX_ACCUMULATED_SECONDS = 0.25;
const MAX_BOUNCING_ICONS = 12;
const BASE_TRAIL_SPAWN_INTERVAL_MS = 22;
const BASE_TRAIL_MAX_TILES = 900;
const BASE_TRAIL_MIN_TTL_MS = 200;
const BASE_TRAIL_MAX_TTL_MS = 430;
const DEFAULT_TRAIL_OPACITY = 1;
const DEFAULT_TRAIL_DENSITY = 1;
const DEFAULT_TRAIL_LENGTH = 1;
const INITIAL_PLACEMENT_ATTEMPTS = 160;
const COLLISION_PASSES_PER_FRAME = 2;
const COLLISION_EPSILON = 0.08;

type TrailTile = {
  x: number;
  y: number;
  size: number;
  bornAt: number;
  ttl: number;
  alphaSeed: number;
  color: string;
};

type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

function getPalette(): [string, string, string] {
  const styles = window.getComputedStyle(document.documentElement);
  const green = styles.getPropertyValue("--terminal-green").trim() || "oklch(0.78 0.2 145)";
  const cyan = styles.getPropertyValue("--terminal-cyan").trim() || "oklch(0.75 0.15 200)";
  const dim = styles.getPropertyValue("--terminal-dim").trim() || "oklch(0.7 0.09 145)";
  return [green, cyan, dim];
}

function randomSign(): number {
  return Math.random() < 0.5 ? -1 : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeVelocity(
  vx: number,
  vy: number,
  targetSpeed: number
): [number, number] {
  const magnitude = Math.hypot(vx, vy);
  if (magnitude <= 1e-6) {
    const ratio = 0.73;
    const base = Math.hypot(1, ratio);
    return [
      (targetSpeed * (1 / base)) * randomSign(),
      (targetSpeed * (ratio / base)) * randomSign(),
    ];
  }

  const scale = targetSpeed / magnitude;
  return [vx * scale, vy * scale];
}

function buildBouncingIconNames(
  iconNames: Array<string | null | undefined> | undefined
): string[] {
  const uniqueNames: string[] = [];
  const seen = new Set<string>();

  for (const value of iconNames ?? []) {
    const iconName = typeof value === "string" ? value.trim() : "";
    if (!iconName || seen.has(iconName)) continue;

    seen.add(iconName);
    uniqueNames.push(iconName);

    if (uniqueNames.length >= MAX_BOUNCING_ICONS) {
      break;
    }
  }

  if (uniqueNames.length === 0) {
    return ["volleyball"];
  }

  return uniqueNames;
}

export function DvdVolleyballBounce({
  iconNames,
  size = DEFAULT_SIZE,
  iconOpacity = DEFAULT_ICON_OPACITY,
  speedPxPerSec = DEFAULT_SPEED_PX_PER_SEC,
  trailEnabled = true,
  trailOpacity = DEFAULT_TRAIL_OPACITY,
  trailDensity = DEFAULT_TRAIL_DENSITY,
  trailLength = DEFAULT_TRAIL_LENGTH,
  className,
}: {
  iconNames?: Array<string | null | undefined>;
  size?: number;
  iconOpacity?: number;
  speedPxPerSec?: number;
  trailEnabled?: boolean;
  trailOpacity?: number;
  trailDensity?: number;
  trailLength?: number;
  className?: string;
}) {
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const clampedIconSize = useMemo(() => clamp(size, 20, 128), [size]);
  const clampedIconOpacity = useMemo(() => clamp(iconOpacity, 0.02, 0.95), [iconOpacity]);
  const clampedTrailOpacity = useMemo(() => clamp(trailOpacity, 0, 3), [trailOpacity]);
  const clampedTrailDensity = useMemo(() => clamp(trailDensity, 0.1, 3), [trailDensity]);
  const clampedTrailLength = useMemo(() => clamp(trailLength, 0.25, 3), [trailLength]);
  const bouncingIconNames = useMemo(
    () => buildBouncingIconNames(iconNames),
    [iconNames]
  );
  const bouncingIcons = useMemo(
    () =>
      bouncingIconNames.map((iconName, index) => ({
        key: `${iconName}-${index}`,
        Icon: getHobbyIcon(iconName),
      })),
    [bouncingIconNames]
  );

  useEffect(() => {
    const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateMotionPreference = () => {
      setMotionAllowed(!reducedMotionMedia.matches);
    };

    updateMotionPreference();
    reducedMotionMedia.addEventListener("change", updateMotionPreference);

    return () => {
      reducedMotionMedia.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!motionAllowed) return;
    if (bouncingIcons.length === 0) return;

    const iconElements = iconRefs.current.slice(0, bouncingIcons.length);
    if (
      iconElements.length !== bouncingIcons.length ||
      iconElements.some((element) => !element)
    ) {
      return;
    }

    const trailCanvas = trailCanvasRef.current;
    const trailContext = trailCanvas?.getContext("2d") || null;

    let palette = getPalette();
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let maxX = Math.max(0, viewportWidth - clampedIconSize);
    let maxY = Math.max(0, viewportHeight - clampedIconSize);
    const radius = clampedIconSize / 2;
    const bodies: Body[] = [];
    let lastFrameAt = 0;
    let accumulatorSeconds = 0;
    let lastTrailSpawnAt = 0;
    const trailTiles: TrailTile[] = [];
    let frameId: number | null = null;
    const trailSpawnIntervalMs = clamp(
      BASE_TRAIL_SPAWN_INTERVAL_MS / clampedTrailDensity,
      8,
      160
    );
    const trailMinTtlMs = clamp(
      BASE_TRAIL_MIN_TTL_MS * clampedTrailLength,
      80,
      2000
    );
    const trailMaxTtlMs = clamp(
      BASE_TRAIL_MAX_TTL_MS * clampedTrailLength,
      trailMinTtlMs + 20,
      3200
    );
    const trailMaxTiles = Math.round(
      BASE_TRAIL_MAX_TILES * clamp(0.7 + clampedTrailDensity * 0.65, 0.5, 2.8)
    );

    const setIconPositions = () => {
      for (let index = 0; index < bodies.length; index += 1) {
        const element = iconElements[index];
        const body = bodies[index];
        if (!element || !body) continue;
        element.style.transform = `translate3d(${body.x}px, ${body.y}px, 0)`;
      }
    };

    const syncTrailCanvas = () => {
      if (!trailCanvas || !trailContext) return;
      const devicePixelRatio = window.devicePixelRatio || 1;
      trailCanvas.width = Math.round(viewportWidth * devicePixelRatio);
      trailCanvas.height = Math.round(viewportHeight * devicePixelRatio);
      trailCanvas.style.width = `${viewportWidth}px`;
      trailCanvas.style.height = `${viewportHeight}px`;
      trailContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      trailContext.imageSmoothingEnabled = false;
      trailContext.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    const drawTrail = (now: number) => {
      if (!trailContext) return;

      trailContext.clearRect(0, 0, viewportWidth, viewportHeight);
      let writeIndex = 0;

      for (let index = 0; index < trailTiles.length; index += 1) {
        const tile = trailTiles[index];
        const age = now - tile.bornAt;
        if (age >= tile.ttl) continue;

        const life = 1 - age / tile.ttl;
        const alpha = tile.alphaSeed * life;
        if (alpha <= 0.01) continue;

        trailContext.globalAlpha = alpha;
        trailContext.fillStyle = tile.color;
        trailContext.fillRect(tile.x, tile.y, tile.size, tile.size);

        trailTiles[writeIndex] = tile;
        writeIndex += 1;
      }

      trailTiles.length = writeIndex;
      trailContext.globalAlpha = 1;
    };

    const placeBodyWithoutOverlap = (existingBodies: Body[]): { x: number; y: number } => {
      const preferredMinDistance = clampedIconSize * 1.02;
      const preferredMinDistanceSquared = preferredMinDistance * preferredMinDistance;

      for (let attempt = 0; attempt < INITIAL_PLACEMENT_ATTEMPTS; attempt += 1) {
        const candidateX = maxX > 0 ? Math.random() * maxX : 0;
        const candidateY = maxY > 0 ? Math.random() * maxY : 0;

        const collides = existingBodies.some((body) => {
          const dx = candidateX + radius - (body.x + body.radius);
          const dy = candidateY + radius - (body.y + body.radius);
          return dx * dx + dy * dy < preferredMinDistanceSquared;
        });

        if (!collides) {
          return { x: candidateX, y: candidateY };
        }
      }

      const columns = Math.max(
        1,
        Math.floor(viewportWidth / Math.max(clampedIconSize * 1.15, 1))
      );
      const index = existingBodies.length;
      const col = index % columns;
      const row = Math.floor(index / columns);

      return {
        x: Math.min(maxX, col * clampedIconSize * 1.08),
        y: Math.min(maxY, row * clampedIconSize * 1.08),
      };
    };

    const resolveBodyCollisions = () => {
      for (let pass = 0; pass < COLLISION_PASSES_PER_FRAME; pass += 1) {
        let hadCollision = false;

        for (let i = 0; i < bodies.length; i += 1) {
          for (let j = i + 1; j < bodies.length; j += 1) {
            const a = bodies[i];
            const b = bodies[j];
            if (!a || !b) continue;

            const ax = a.x + a.radius;
            const ay = a.y + a.radius;
            const bx = b.x + b.radius;
            const by = b.y + b.radius;

            let dx = bx - ax;
            let dy = by - ay;
            let distanceSquared = dx * dx + dy * dy;
            const minimumDistance = a.radius + b.radius;
            const minimumDistanceSquared = minimumDistance * minimumDistance;

            if (distanceSquared >= minimumDistanceSquared) {
              continue;
            }

            if (distanceSquared <= 1e-8) {
              dx = COLLISION_EPSILON;
              dy = 0;
              distanceSquared = dx * dx + dy * dy;
            }

            const distance = Math.sqrt(distanceSquared);
            const nx = dx / distance;
            const ny = dy / distance;
            const overlap = minimumDistance - distance + COLLISION_EPSILON;
            const correction = overlap * 0.5;

            a.x -= nx * correction;
            a.y -= ny * correction;
            b.x += nx * correction;
            b.y += ny * correction;

            const aNormal = a.vx * nx + a.vy * ny;
            const bNormal = b.vx * nx + b.vy * ny;

            if (aNormal > bNormal) {
              const aNormalDelta = bNormal - aNormal;
              const bNormalDelta = aNormal - bNormal;
              a.vx += aNormalDelta * nx;
              a.vy += aNormalDelta * ny;
              b.vx += bNormalDelta * nx;
              b.vy += bNormalDelta * ny;

              [a.vx, a.vy] = normalizeVelocity(a.vx, a.vy, speedPxPerSec);
              [b.vx, b.vy] = normalizeVelocity(b.vx, b.vy, speedPxPerSec);
            }

            hadCollision = true;
          }
        }

        if (!hadCollision) break;
      }
    };

    const spawnTrail = (now: number) => {
      if (!trailEnabled || !trailContext) return;
      if (now - lastTrailSpawnAt < trailSpawnIntervalMs) return;

      lastTrailSpawnAt = now;
      const [green, cyan, dim] = palette;
      const colors = [green, green, dim, cyan];
      const densityFloor = Math.floor(clampedTrailDensity);
      const densityRemainder = clampedTrailDensity - densityFloor;
      const tilesPerBody =
        clampedTrailDensity < 1
          ? Math.random() < clampedTrailDensity
            ? 1
            : 0
          : densityFloor + (Math.random() < densityRemainder ? 1 : 0);

      for (const body of bodies) {
        if (tilesPerBody === 0) continue;

        const centerX = body.x + body.radius;
        const centerY = body.y + body.radius;
        for (let tileIndex = 0; tileIndex < tilesPerBody; tileIndex += 1) {
          trailTiles.push({
            x: centerX + (Math.random() - 0.5) * (clampedIconSize * 0.42),
            y: centerY + (Math.random() - 0.5) * (clampedIconSize * 0.42),
            size: Math.random() < 0.2 ? 3 : 2,
            bornAt: now,
            ttl: trailMinTtlMs + Math.random() * (trailMaxTtlMs - trailMinTtlMs),
            alphaSeed: clamp((0.09 + Math.random() * 0.09) * clampedTrailOpacity, 0, 0.95),
            color: colors[Math.floor(Math.random() * colors.length)] || green,
          });
        }
      }

      if (trailTiles.length > trailMaxTiles) {
        trailTiles.splice(0, trailTiles.length - trailMaxTiles);
      }
    };

    const tick = (now: number) => {
      if (document.hidden) {
        lastFrameAt = now;
        accumulatorSeconds = 0;
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      if (lastFrameAt === 0) {
        lastFrameAt = now;
      }

      const deltaSeconds = (now - lastFrameAt) / 1000;
      lastFrameAt = now;

      accumulatorSeconds = Math.min(
        accumulatorSeconds + Math.max(0, deltaSeconds),
        MAX_ACCUMULATED_SECONDS
      );

      while (accumulatorSeconds >= PHYSICS_STEP_SECONDS) {
        for (const body of bodies) {
          body.x += body.vx * PHYSICS_STEP_SECONDS;
          body.y += body.vy * PHYSICS_STEP_SECONDS;

          if (body.x <= 0) {
            body.x = 0;
            body.vx = Math.abs(body.vx);
          } else if (body.x >= maxX) {
            body.x = maxX;
            body.vx = -Math.abs(body.vx);
          }

          if (body.y <= 0) {
            body.y = 0;
            body.vy = Math.abs(body.vy);
          } else if (body.y >= maxY) {
            body.y = maxY;
            body.vy = -Math.abs(body.vy);
          }
        }

        resolveBodyCollisions();

        for (const body of bodies) {
          if (body.x <= 0) {
            body.x = 0;
            body.vx = Math.abs(body.vx);
          } else if (body.x >= maxX) {
            body.x = maxX;
            body.vx = -Math.abs(body.vx);
          }

          if (body.y <= 0) {
            body.y = 0;
            body.vy = Math.abs(body.vy);
          } else if (body.y >= maxY) {
            body.y = maxY;
            body.vy = -Math.abs(body.vy);
          }
        }

        accumulatorSeconds -= PHYSICS_STEP_SECONDS;
      }

      setIconPositions();
      spawnTrail(now);
      drawTrail(now);

      frameId = window.requestAnimationFrame(tick);
    };

    const handleResize = () => {
      const previousMaxX = maxX;
      const previousMaxY = maxY;
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      maxX = Math.max(0, viewportWidth - clampedIconSize);
      maxY = Math.max(0, viewportHeight - clampedIconSize);

      for (const body of bodies) {
        const ratioX = previousMaxX > 0 ? body.x / previousMaxX : Math.random();
        const ratioY = previousMaxY > 0 ? body.y / previousMaxY : Math.random();
        body.x = Math.min(maxX, Math.max(0, maxX * ratioX));
        body.y = Math.min(maxY, Math.max(0, maxY * ratioY));
      }

      syncTrailCanvas();
      setIconPositions();
    };

    const rootClassObserver = new MutationObserver(() => {
      palette = getPalette();
    });
    rootClassObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    for (let index = 0; index < bouncingIcons.length; index += 1) {
      const position = placeBodyWithoutOverlap(bodies);

      // Use non-45-degree ratios to keep exact corner hits statistically rare.
      const baseRatio = 0.73 + Math.random() * 0.18;
      const magnitude = Math.hypot(1, baseRatio);
      let vx = (speedPxPerSec * (1 / magnitude)) * randomSign();
      let vy = (speedPxPerSec * (baseRatio / magnitude)) * randomSign();
      [vx, vy] = normalizeVelocity(vx, vy, speedPxPerSec);

      bodies.push({
        x: position.x,
        y: position.y,
        vx,
        vy,
        radius,
      });
    }

    syncTrailCanvas();
    setIconPositions();
    frameId = window.requestAnimationFrame(tick);

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", handleResize);
      rootClassObserver.disconnect();
      trailTiles.length = 0;

      if (trailContext) {
        trailContext.clearRect(0, 0, viewportWidth, viewportHeight);
      }
    };
  }, [
    motionAllowed,
    bouncingIcons,
    clampedIconSize,
    clampedTrailDensity,
    clampedTrailLength,
    clampedTrailOpacity,
    speedPxPerSec,
    trailEnabled,
  ]);

  if (!motionAllowed || bouncingIcons.length === 0) {
    return null;
  }

  return (
    <div className={cn("dvd-bounce-layer", className)} aria-hidden="true">
      {trailEnabled ? <canvas ref={trailCanvasRef} className="dvd-bounce-trail" /> : null}
      {bouncingIcons.map(({ key, Icon }, index) => (
        <div
          key={key}
          ref={(element) => {
            iconRefs.current[index] = element;
          }}
          className="dvd-bounce-icon"
          style={{ width: clampedIconSize, height: clampedIconSize, opacity: clampedIconOpacity }}
        >
          <Icon className="h-full w-full" strokeWidth={1.75} />
        </div>
      ))}
    </div>
  );
}
