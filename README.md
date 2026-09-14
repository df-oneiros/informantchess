# Informant Chess (Pawn7)

A fork of [lila](https://github.com/lichess-org/lila), the server that powers lichess.org, adapted to
play **Chess Informant Chess** — a variant in which a pawn may promote early on the 7th rank, to
anything except a queen.

---

## Chess Informant

Founded in Belgrade in 1966 by Grandmaster Aleksandar Matanović and his associates, Chess Informant
(*Šahovski Informator*) revolutionized how chess players studied and shared theoretical knowledge
globally. Before computer databases existed, it served as the international standard for grandmaster
game analysis and opening theory.

### Origins and purpose

- **Founded:** 1966 in Belgrade, Yugoslavia.
- **Goal:** Democratize access to top-level opening novelties and grandmaster game analysis, ending
  the informational advantage long enjoyed by state-supported Soviet players.
- **Impact:** World Champions like Garry Kasparov ("We are all children of Informant"), Anatoly
  Karpov, and Viswanathan Anand cited it as the backbone of their pre-computer tournament preparation.

### Key innovations

- **Universal symbol language** — an international system of non-verbal chess annotation symbols
  (`±` for clear advantage, `N` for theoretical novelties, and so on) that eliminated language
  barriers in international chess literature.
- **The ECO system** — the Encyclopaedia of Chess Openings classification (A00–E99), still the global
  standard used by FIDE and by modern digital engines to categorize openings.
- **Endgame studies** — the Encyclopaedia of Chess Endings (ECE), which standardized theoretical
  endgame analysis.

### Publication history

| Era | Publication schedule | Core features |
| --- | --- | --- |
| 1966–1990 | 2 volumes / year | Annotated master games, selected and analyzed directly by the players themselves. |
| 1991–2011 | 3 volumes / year | Added combination puzzles, tactics, and specialized endgame sections. |
| 2012–present | 4 volumes / year | Integrated GM columns written in English, theoretical surveys, and digital database formats. |

---

## Chess Informant Chess (Pawn7)

**Creator.** Formulated by International Master Milan Bjelajac, with contributions from members of the
Chess Informant editorial board.

**The promotion rule.** When a White pawn reaches the 7th rank (or a Black pawn reaches the 2nd rank),
it can immediately be promoted to a rook, bishop, or knight — anything except a queen. The player can
also choose to leave it as a pawn, allowing it to advance to the 8th rank for a standard queen
promotion.

**Strategic objective.** Conceived to combat grandmaster draws and revitalize endgame play. Because
premature minor-piece or rook promotions increase pawn power on the penultimate rank, standard drawn
endgames — such as basic King + Pawn vs. King with opposition — become decisive wins.

**Digital legacy.** Adopted on web platforms like FlyOrDie (often titled *Informant Chess* or
*Pawn7*), it represents an effort by the Informant editors to experiment with the natural evolution of
chess mechanics.

---

## How this repository is organized

Chess logic is not implemented here. This repository is the **platform** — accounts, clocks, lobbies,
tournaments, storage, and the web client — and it consumes the rules as a library.

| Repository | Role |
| --- | --- |
| [`informantchess`](https://github.com/df-oneiros/informantchess) | This repo. A fork of `lichess-org/lila`: the server and web client. |
| [`pawn7`](https://github.com/df-oneiros/pawn7) | A fork of `lichess-org/scalachess`: move generation, legality, and the promotion rule itself. |

The variant is defined in `pawn7` as `chess.variant.InformantChess` and consumed here through the
`scalachess` dependency declared in `project/Dependencies.scala`.

---

*Everything below is the upstream lila README, retained for build and architecture reference.*

# [lichess.org](https://lichess.org)

[![Crowdin](https://d322cqt584bo4o.cloudfront.net/lichess/localized.svg)](https://crowdin.com/project/lichess)
[![Mastodon](https://img.shields.io/mastodon/follow/109298525492334687?domain=mastodon.online)](https://mastodon.online/@lichess)
[![Bluesky](https://img.shields.io/badge/Bluesky-0285FF?logo=bluesky&logoColor=fff)](https://bsky.app/profile/lichess.org)
[![Discord](https://img.shields.io/discord/280713822073913354?label=Discord&logo=discord&style=flat)](https://discord.gg/lichess)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/lichess-org/lila)

<img src="https://raw.githubusercontent.com/lichess-org/lila/master/public/images/home-bicolor.png" alt="Lichess homepage" title="Lichess comes with light and dark theme, this screenshot shows both." />

Lila (li[chess in sca]la) is a free online chess game server focused on [realtime](https://lichess.org/games) gameplay and ease of use.

It features a [search engine](https://lichess.org/games/search),
[computer analysis](https://lichess.org/ief49lif) distributed with [fishnet](https://github.com/lichess-org/fishnet),
[tournaments](https://lichess.org/tournament),
[simuls](https://lichess.org/simul),
[forums](https://lichess.org/forum),
[teams](https://lichess.org/team),
[tactic trainer](https://lichess.org/training),
a [mobile app](https://lichess.org/app),
and a [shared analysis board](https://lichess.org/study).
The UI is available in more than [140 languages](https://crowdin.com/project/lichess) thanks to the community.

Lichess is written in [Scala 3](https://www.scala-lang.org/),
and relies on a modified [Play 2.8](https://www.playframework.com/) framework.
[scalatags](https://com-lihaoyi.github.io/scalatags/) is used for templating.
Pure chess logic is contained in the [scalachess](https://github.com/lichess-org/scalachess) submodule.
The server is fully asynchronous, making heavy use of Scala Futures and [Pekko streams](https://pekko.apache.org).
WebSocket connections are handled by a [separate server](https://github.com/lichess-org/lila-ws) that communicates using [redis](https://redis.io/).
Lichess talks to [Stockfish](https://stockfishchess.org/) deployed in an [AI cluster](https://github.com/lichess-org/fishnet) of donated servers.
It uses [MongoDB](https://www.mongodb.com) to store more than 12 billion games, which are indexed by [elasticsearch](https://github.com/elastic/elasticsearch).
HTTP requests and WebSocket connections can be proxied by [nginx](https://nginx.org).
The web client is written in [TypeScript](https://www.typescriptlang.org/) and [snabbdom](https://github.com/snabbdom/snabbdom), using [Sass](https://sass-lang.com/) to generate CSS.
All rated games are published in a [free PGN database](https://database.lichess.org).
Browser testing done with [Browserstack](https://www.browserstack.com).
Proxy detection done with [IP2Proxy database](https://www.ip2location.com/database/ip2proxy).
Software builds and CI/CD done with [Depot](https://depot.dev/).
Please help us [translate Lichess with Crowdin](https://crowdin.com/project/lichess).

See [lichess.org/source](https://lichess.org/source) for a list of repositories.

[Join us on Discord](https://discord.gg/lichess) for more info.
Use [GitHub issues](https://github.com/lichess-org/lila/issues) for bug reports and feature requests.

## Installation

```
./lila.sh # thin wrapper around sbt
run
```

The Wiki describes [how to setup a development environment](https://github.com/lichess-org/lila/wiki/Lichess-Development-Onboarding).

## HTTP API

Feel free to use the [Lichess API](https://lichess.org/api) in your applications and websites.

## Supported browsers

| Name              | Version | Notes                      |
| ----------------- | ------- | -------------------------- |
| Firefox           | 115+    | Full support (recommended) |
| Chromium / Chrome | 112+    | Full support               |
| Edge              | 111+    | Full support               |
| Opera             | 97+     | Reasonable support         |
| Safari            | 16.2+   | Reasonable support         |

Older browsers will not work.
For your own sake, please upgrade. Security and performance, think about it!

## License

Lila is licensed under the GNU Affero General Public License 3 or any later
version at your choice. See [copying](https://github.com/lichess-org/lila/blob/master/COPYING.md) for
details.

## Production architecture (as of July 2022)

![Lichess production server architecture diagram](https://raw.githubusercontent.com/lichess-org/lila/master/public/images/architecture.png)

## Credits

See [lichess.org/thanks](https://lichess.org/thanks) and the contributors here:

[![GitHub contributors](https://contrib.rocks/image?repo=lichess-org/lila)](https://github.com/lichess-org/lila/graphs/contributors)

## Competence development program

Lichess would like to support its contributors in their competence development by covering costs of relevant training materials and activities. This is a small way to further empower contributors who have given their time to Lichess and to enable or improve additional contributions to Lichess in the future. For more information, including how to apply, check [Competence Development for Lichess contributors](https://lichess.org/page/competence-development).
