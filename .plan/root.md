---
root_node: root-7f3a
created: 2026-04-27
---

# Fic Downloader — Firefox Plugin Suite

Two Firefox plugins for downloading fan fiction from sites like AO3, FFN, RoyalRoads, and Tapas.

**fanfic-downloader**: A standard plugin for manually downloading fics in a configurable format (ePub, PDF, etc.).

**fanfic-downloader-expanded**: An extended plugin with automation features — auto-download on bookmark, kudos, or view (history-saver mode); saves to custom folders per function; supported by a Rust native host client to bypass Firefox's file-system security restrictions.

Shared functionality lives in a `shared/` folder where practical; sharing is opportunistic, not a design constraint.
