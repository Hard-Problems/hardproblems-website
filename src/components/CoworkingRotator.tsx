'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  coworkingTeams,
  type CoworkingTeam
} from '../lib/coworkingTeams';
import styles from '../app/articles/page.module.scss';

const VISIBLE_COUNT = 12;
const ROW_SIZE = 3;
const ROW_COUNT = VISIBLE_COUNT / ROW_SIZE;
const SWAP_INTERVAL_MS = 5000;
const STAGGER_MS = 120;
const FADE_MS = 500;

type Tile = {
  team: CoworkingTeam;
  visible: boolean;
};

// 3x4 grid that initially shows the first 12 teams, then every few
// seconds swaps an entire row (3 tiles) with a left-to-right
// stagger — each tile fades down, swaps its team, and fades back in
// ~120ms after the one to its left started.
export default function CoworkingRotator() {
  const [tiles, setTiles] = useState<Tile[]>(() =>
    coworkingTeams.slice(0, VISIBLE_COUNT).map((team) => ({
      team,
      visible: true
    }))
  );

  const tilesRef = useRef(tiles);
  useEffect(() => {
    tilesRef.current = tiles;
  });

  useEffect(() => {
    // Off-screen queue — refilled from the not-currently-visible set
    // whenever it dips below a row's worth.
    const queue: CoworkingTeam[] = coworkingTeams.slice(VISIBLE_COUNT);
    let lastRow = -1;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const refillIfNeeded = () => {
      if (queue.length >= ROW_SIZE) return;
      const visibleHrefs = new Set(
        tilesRef.current.map((t) => t.team.href)
      );
      const pending = new Set(queue.map((t) => t.href));
      const candidates = coworkingTeams.filter(
        (t) => !visibleHrefs.has(t.href) && !pending.has(t.href)
      );
      queue.push(...candidates);
    };

    const cycle = () => {
      refillIfNeeded();
      if (queue.length < ROW_SIZE) return;

      // Pick a row, avoiding the row we swapped last time.
      let row = Math.floor(Math.random() * ROW_COUNT);
      if (row === lastRow && ROW_COUNT > 1) {
        row = (row + 1) % ROW_COUNT;
      }
      lastRow = row;

      const startIdx = row * ROW_SIZE;
      const tileIndices = Array.from(
        { length: ROW_SIZE },
        (_, k) => startIdx + k
      );
      const newTeams = queue.splice(0, ROW_SIZE);

      tileIndices.forEach((idx, i) => {
        const delay = i * STAGGER_MS;

        // Fade the tile out.
        timeouts.push(
          setTimeout(() => {
            setTiles((prev) =>
              prev.map((t, ti) =>
                ti === idx ? { ...t, visible: false } : t
              )
            );
          }, delay)
        );

        // After it's invisible, swap the team and fade back in.
        timeouts.push(
          setTimeout(() => {
            setTiles((prev) =>
              prev.map((t, ti) =>
                ti === idx ? { team: newTeams[i], visible: true } : t
              )
            );
          }, delay + FADE_MS)
        );
      });
    };

    const interval = setInterval(cycle, SWAP_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <ul className={styles.coworkingAsideList}>
      {tiles.map((tile, i) => (
        <li key={i}>
          <Link
            href={tile.team.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Visit ${tile.team.name}`}
            className={`${styles.coworkingAsideLink} hover-saturate`}
            style={{
              opacity: tile.visible ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease`
            }}
          >
            {tile.team.image && (
              <Image
                src={tile.team.image}
                width={160}
                height={160}
                alt=""
                className={styles.coworkingAsideThumb}
              />
            )}
            <span className={styles.coworkingAsideTooltip} role="tooltip">
              <strong className={styles.coworkingAsideTooltipName}>
                {tile.team.name}
              </strong>
              <br />
              {tile.team.description}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
