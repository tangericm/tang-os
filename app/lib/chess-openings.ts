import { Chess } from "chess.js";

/** Well-known opening lines in SAN. Every position reached along a line counts as book;
 * the final position carries the line's name. Positions are keyed without move clocks,
 * so transpositions into a known position are recognised too. */
const LINES: readonly (readonly [name: string, moves: string])[] = [
  ["King’s Pawn Opening", "e4"],
  ["Queen’s Pawn Opening", "d4"],
  ["English Opening", "c4"],
  ["Réti Opening", "Nf3"],
  ["King’s Fianchetto Opening", "g3"],
  ["Bird’s Opening", "f4"],
  ["Open Game", "e4 e5"],
  ["King’s Knight Opening", "e4 e5 Nf3"],
  ["King’s Knight Opening: Normal Variation", "e4 e5 Nf3 Nc6"],
  ["Italian Game", "e4 e5 Nf3 Nc6 Bc4"],
  ["Italian Game: Giuoco Piano", "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O"],
  ["Italian Game: Giuoco Pianissimo", "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3"],
  ["Italian Game: Evans Gambit", "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5"],
  ["Italian Game: Two Knights Defense", "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O"],
  ["Italian Game: Two Knights Defense", "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6"],
  ["Two Knights Defense: Polerio Defense", "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6"],
  ["Ruy Lopez", "e4 e5 Nf3 Nc6 Bb5"],
  ["Ruy Lopez: Morphy Defense", "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3"],
  ["Ruy Lopez: Exchange Variation", "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6"],
  ["Ruy Lopez: Berlin Defense", "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8"],
  ["Ruy Lopez: Steinitz Defense", "e4 e5 Nf3 Nc6 Bb5 d6"],
  ["Scotch Game", "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5"],
  ["Scotch Game: Classical Variation", "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3"],
  ["Four Knights Game", "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O"],
  ["Four Knights Game: Scotch Variation", "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4"],
  ["Petrov’s Defense", "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3"],
  ["Philidor Defense", "e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7"],
  ["King’s Gambit Accepted", "e4 e5 f4 exf4 Nf3 g5"],
  ["King’s Gambit Declined", "e4 e5 f4 Bc5"],
  ["Vienna Game", "e4 e5 Nc3 Nf6 f4 d5"],
  ["Vienna Game", "e4 e5 Nc3 Nc6 Bc4 Nf6"],
  ["Center Game", "e4 e5 d4 exd4 Qxd4 Nc6 Qe3"],
  ["Bishop’s Opening", "e4 e5 Bc4 Nf6 d3"],
  ["Sicilian Defense", "e4 c5"],
  ["Sicilian Defense", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3"],
  ["Sicilian Defense: Najdorf Variation", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6"],
  ["Sicilian Defense: Najdorf Variation", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4"],
  ["Sicilian Defense: Dragon Variation", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6"],
  ["Sicilian Defense: Classical Variation", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5 e6"],
  ["Sicilian Defense: Scheveningen Variation", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 Be2 Be7"],
  ["Sicilian Defense: Sveshnikov Variation", "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5"],
  ["Sicilian Defense: Accelerated Dragon", "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6"],
  ["Sicilian Defense: Taimanov Variation", "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6"],
  ["Sicilian Defense: Kan Variation", "e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Nf6 O-O"],
  ["Sicilian Defense: Rossolimo Variation", "e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1"],
  ["Sicilian Defense: Moscow Variation", "e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7"],
  ["Sicilian Defense: Alapin Variation", "e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3"],
  ["Sicilian Defense: Alapin Variation", "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3"],
  ["Sicilian Defense: Closed", "e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6"],
  ["Sicilian Defense: Smith-Morra Gambit", "e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3"],
  ["French Defense", "e4 e6 d4 d5"],
  ["French Defense: Advance Variation", "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6"],
  ["French Defense: Winawer Variation", "e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7"],
  ["French Defense: Classical Variation", "e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7"],
  ["French Defense: Rubinstein Variation", "e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6"],
  ["French Defense: Tarrasch Variation", "e4 e6 d4 d5 Nd2 c5 exd5 exd5"],
  ["French Defense: Tarrasch Variation", "e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7"],
  ["French Defense: Exchange Variation", "e4 e6 d4 d5 exd5 exd5 Nf3 Nf6"],
  ["Caro-Kann Defense", "e4 c6 d4 d5"],
  ["Caro-Kann Defense: Advance Variation", "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2"],
  ["Caro-Kann Defense: Classical Variation", "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7"],
  ["Caro-Kann Defense: Exchange Variation", "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3"],
  ["Caro-Kann Defense: Two Knights Attack", "e4 c6 Nc3 d5 Nf3 Bg4"],
  ["Pirc Defense", "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O"],
  ["Modern Defense", "e4 g6 d4 Bg7 Nc3 d6"],
  ["Alekhine’s Defense", "e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4"],
  ["Scandinavian Defense", "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3"],
  ["Scandinavian Defense", "e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3"],
  ["Scandinavian Defense: Modern Variation", "e4 d5 exd5 Nf6 d4 Nxd5"],
  ["Owen’s Defense", "e4 b6"],
  ["Nimzowitsch Defense", "e4 Nc6"],
  ["Queen’s Pawn Game", "d4 d5"],
  ["Queen’s Pawn Game", "d4 Nf6"],
  ["Queen’s Gambit", "d4 d5 c4"],
  ["Queen’s Gambit Declined", "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6"],
  ["Queen’s Gambit Declined: Exchange Variation", "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5"],
  ["Queen’s Gambit Accepted", "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6"],
  ["Slav Defense", "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4"],
  ["Semi-Slav Defense", "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5"],
  ["Queen’s Gambit Declined: Albin Countergambit", "d4 d5 c4 e5"],
  ["London System", "d4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3"],
  ["London System", "d4 Nf6 Bf4 e6 e3 c5 c3"],
  ["London System", "d4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3"],
  ["Colle System", "d4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3"],
  ["Trompowsky Attack", "d4 Nf6 Bg5 Ne4"],
  ["Trompowsky Attack", "d4 Nf6 Bg5 e6 e4"],
  ["Indian Defense", "d4 Nf6 c4"],
  ["King’s Indian Defense", "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7"],
  ["King’s Indian Defense: Sämisch Variation", "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3"],
  ["Grünfeld Defense", "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2"],
  ["Nimzo-Indian Defense", "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O"],
  ["Nimzo-Indian Defense: Classical Variation", "d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3"],
  ["Queen’s Indian Defense", "d4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3"],
  ["Bogo-Indian Defense", "d4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Qe7"],
  ["Catalan Opening", "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4"],
  ["Benoni Defense: Modern Variation", "d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7"],
  ["Benko Gambit", "d4 Nf6 c4 c5 d5 b5 cxb5 a6"],
  ["Dutch Defense", "d4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4"],
  ["Dutch Defense", "d4 f5 c4 Nf6 g3 g6 Bg2 Bg7"],
  ["English Opening: King’s English Variation", "c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2"],
  ["English Opening: Reversed Sicilian", "c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7"],
  ["English Opening: Anglo-Indian Defense", "c4 Nf6 Nc3 e6 Nf3 d5 d4"],
  ["English Opening: Symmetrical Variation", "c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7"],
  ["Réti Opening", "Nf3 d5 c4 e6 g3 Nf6 Bg2"],
  ["Réti Opening", "Nf3 Nf6 c4 g6 Nc3 Bg7"],
  ["King’s Indian Attack", "Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4"],
  ["Zukertort Opening", "Nf3 d5 d4 Nf6"],
];

function key(fen: string) {
  return fen.split(" ").slice(0, 4).join(" ");
}

let book: Map<string, string | null> | undefined;
function positions() {
  if (book) return book;
  book = new Map();
  for (const [name, line] of LINES) {
    const game = new Chess();
    const sans = line.split(" ");
    sans.forEach((san, i) => {
      game.move(san);
      const position = key(game.fen());
      if (i === sans.length - 1) book!.set(position, name);
      else if (!book!.has(position)) book!.set(position, null);
    });
  }
  return book;
}

/** True when this position appears along a known opening line. */
export function isBookPosition(fen: string): boolean {
  return positions().has(key(fen));
}

/** The name of the deepest named book position reached in a game, if any. */
export function openingName(fens: readonly string[]): string | undefined {
  let name: string | undefined;
  for (const fen of fens) {
    const entry = positions().get(key(fen));
    if (entry === undefined) break;
    if (entry) name = entry;
  }
  return name;
}

/** The name attached to exactly this position. */
export function openingAt(fen: string): string | undefined {
  return positions().get(key(fen)) ?? undefined;
}
