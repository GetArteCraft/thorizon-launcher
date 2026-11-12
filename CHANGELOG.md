# Changelog

## 0.1.4

- Removed settings that had no effect in this build (parallel downloads, telemetry and
  crash-report switches, free-form launch arguments). Every visible setting now acts.
- Launch window options are written to the profile's `options.txt`; servers get
  `server.properties`, an interactive console and UPnP mapping with a manual fallback.
- Same test suite: 20 unit, 25 UI, 28 end-to-end logic checks.

## 0.1.3

- Reproducible build of the 0.1.2 feature set with package metadata and README screenshots.

## 0.1.2

- End-to-end logic tests with a mock `horizon-launcher`: install, profile, Play, native
  build, single mod, backup, library, editor export, server and startup settings.
- Backups before Play and server start, manual backup and rotation.
- Server console commands, `server.properties`, UPnP.
- Inter and Space Grotesk bundled (Cyrillic included).
- Fixed a Diagnostics crash in the sandboxed renderer.

## 0.1.1

- Second local preview: local index, profiles, catalog, editor and diagnostics polished.

## 0.1.0

- First Windows preview: catalog, packs, mods, shaders, resource packs, profiles,
  library, pack editor, servers, settings and diagnostics.
