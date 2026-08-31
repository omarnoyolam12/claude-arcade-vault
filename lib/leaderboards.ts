// Tablas de puntuaciones mock, una por slug de juego. Solo alimentan la UI.
// Las puntuaciones ya vienen formateadas como string; no se calculan ni se ordenan
// en tiempo de ejecución: el orden del array es el orden de presentación.

export interface ScoreEntry {
  rank: number; // 1..n
  player: string; // "NEON_KNIGHT"
  score: string; // "3,333,360" — ya formateado
  date: string; // "1984-10-26" | "HOY"
  isCurrentUser?: boolean; // true → fila resaltada "Tu mejor marca"
}

export const leaderboards: Record<string, ScoreEntry[]> = {
  "pac-man": [
    { rank: 1, player: "NEON_KNIGHT", score: "3,333,360", date: "1984-10-26" },
    { rank: 2, player: "CYBER_GHOST", score: "3,124,500", date: "1985-03-12" },
    { rank: 3, player: "RETRO_KING", score: "2,890,120", date: "1988-11-05" },
    {
      rank: 42,
      player: "TU MEJOR MARCA",
      score: "1,204,500",
      date: "HOY",
      isCurrentUser: true,
    },
    { rank: 4, player: "PLAYER_ONE", score: "2,500,000", date: "1990-01-14" },
    { rank: 5, player: "WINKY", score: "1,980,450", date: "1991-07-22" },
  ],
  arkanoid: [
    { rank: 1, player: "VAUS_PRIME", score: "1,204,880", date: "1987-02-09" },
    { rank: 2, player: "DOH_SLAYER", score: "998,540", date: "1988-06-30" },
    { rank: 3, player: "BRICK_LORD", score: "874,220", date: "1989-04-18" },
    { rank: 4, player: "PADDLE_X", score: "612,000", date: "1991-09-03" },
    { rank: 5, player: "RICOCHET", score: "540,150", date: "1993-12-25" },
  ],
  tetris: [
    { rank: 1, player: "BLOCK_TSAR", score: "8,540,200", date: "1985-03-12" },
    { rank: 2, player: "LINE_CLEAR", score: "7,120,550", date: "1986-08-01" },
    { rank: 3, player: "TETRA_NEO", score: "6,800,100", date: "1988-11-05" },
    { rank: 4, player: "SOFT_DROP", score: "5,410,900", date: "1990-01-14" },
    { rank: 5, player: "T_SPIN", score: "4,900,300", date: "1992-07-19" },
  ],
  snake: [
    { rank: 1, player: "LONG_TAIL", score: "009,990", date: "1998-05-21" },
    { rank: 2, player: "PIXEL_BITE", score: "008,420", date: "1999-01-07" },
    { rank: 3, player: "GRID_RUNNER", score: "007,150", date: "2000-10-02" },
    { rank: 4, player: "APPLE_HUNT", score: "005,600", date: "2001-03-30" },
    { rank: 5, player: "COIL", score: "004,010", date: "2002-12-11" },
  ],
  "space-invaders": [
    { rank: 1, player: "EARTH_GUARD", score: "092,310", date: "1979-06-14" },
    { rank: 2, player: "BUNKER_ACE", score: "081,760", date: "1980-02-28" },
    { rank: 3, player: "LASER_MK2", score: "074,900", date: "1981-11-19" },
    { rank: 4, player: "SHIELD_9", score: "060,050", date: "1983-05-06" },
    { rank: 5, player: "UFO_BONUS", score: "051,400", date: "1985-08-22" },
  ],
  asteroids: [
    { rank: 1, player: "THRUST_VEC", score: "412,880", date: "1980-04-11" },
    { rank: 2, player: "HYPERSPACE", score: "356,540", date: "1981-07-03" },
    { rank: 3, player: "ROCK_SPLIT", score: "298,120", date: "1982-09-27" },
    { rank: 4, player: "SAUCER_DWN", score: "204,000", date: "1984-01-15" },
    { rank: 5, player: "DRIFT", score: "163,750", date: "1986-06-08" },
  ],
};

export function getLeaderboard(slug: string): ScoreEntry[] {
  return leaderboards[slug] ?? [];
}
