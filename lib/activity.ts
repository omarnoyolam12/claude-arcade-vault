// Datos mock de "Actividad en vivo" para la home. Solo alimentan la UI:
// no hay feed real, persistencia ni cálculo. Las puntuaciones ya vienen
// formateadas como string y el orden del array es el orden de presentación.

export interface RecentScore {
  player: string; // "NEONFOX"
  game: string; // "Caída" — nombre visible, no slug
  points: string; // "+154.220" — ya formateado, con signo
}

export interface TopPlayerToday {
  rank: number; // 1..n
  player: string; // "NEONFOX"
  score: string; // "312.840" — ya formateado
}

export const recentScores: RecentScore[] = [
  { player: "NEONFOX", game: "Caída", points: "+154.220" },
  { player: "PK_KAI", game: "Glotón", points: "+96.400" },
  { player: "Z3ROCOOL", game: "Invasores", points: "+54.190" },
  { player: "VAULT_07", game: "Rocas", points: "+41.200" },
  { player: "GLITCHA", game: "Bloque Buster", points: "+28.450" },
];

export const topPlayersToday: TopPlayerToday[] = [
  { rank: 1, player: "NEONFOX", score: "312.840" },
  { rank: 2, player: "PK_KAI", score: "248.110" },
  { rank: 3, player: "MOONRYU", score: "196.720" },
  { rank: 4, player: "VAULT_07", score: "154.300" },
];
