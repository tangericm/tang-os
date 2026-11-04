# Stockfish.js 19.0.1

This directory distributes the unmodified lite, single-threaded WebAssembly
engine from the `stockfish` npm package, version **19.0.1**, by Nathan Rugg,
Chess.com, and the Stockfish contributors. Stockfish is licensed under GPLv3;
the complete license is available in [Copying.txt](./Copying.txt).

The exact corresponding source, build scripts, and instructions are available
without charge from the versioned upstream release:

- Source archive: https://github.com/nmrugg/stockfish.js/archive/refs/tags/v19.0.1.tar.gz
- Source and build instructions: https://github.com/nmrugg/stockfish.js/tree/v19.0.1
- Original distribution: https://registry.npmjs.org/stockfish/-/stockfish-19.0.1.tgz

Files copied verbatim from that distribution:

- `package/bin/stockfish-19-lite-single.js`
- `package/bin/stockfish-19-lite-single.wasm`
- `package/Copying.txt`

To reproduce, run `npm pack stockfish@19.0.1` in a temporary directory, extract
these three files, and copy them here. No custom engine build or patch is used.
The app communicates with the engine using UCI messages in a dedicated worker.

The app's rules library is chess.js 1.4.0 by Jeff Hlywa and contributors,
distributed under BSD-2-Clause. Its notice is in [chess-js-LICENSE.txt](./chess-js-LICENSE.txt).

SHA-256 of the unmodified engine assets:

```text
ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a  stockfish-19-lite-single.js
ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de  stockfish-19-lite-single.wasm
```

The displayed Elo presets are approximate. Stockfish's native Elo control is
used from 1400 upward; Beginner and Novice combine low skill, short search, and
occasional random legal moves. These presets have not been calibrated against
a human rating pool, and strength varies with device and search budget.
