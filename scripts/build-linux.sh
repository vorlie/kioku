#!/usr/bin/env bash
#
# Build the Tauri application on Linux.
#
# This wraps `tauri build` with the settings required on Arch Linux (and
# derivatives such as Manjaro, EndeavourOS and CachyOS), where the default
# bundling step fails:
#
#   * linuxdeploy ships its own `strip`, which predates the `.relr.dyn` ELF
#     sections that current Arch binutils emits for every library. Stripping
#     then aborts with "Strip call failed" / "failed to run linuxdeploy",
#     killing the AppImage bundle. NO_STRIP disables that step.
#   * linuxdeploy and appimagetool are AppImages and need libfuse2, which is
#     not installed by default on Arch. APPIMAGE_EXTRACT_AND_RUN runs them
#     without FUSE, and also works for builds inside containers.
#
# Both settings can be overridden from the environment, and any extra
# arguments are passed through to the Tauri CLI, e.g.
#
#   npm run build:linux -- --bundles deb,rpm
#
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

export NO_STRIP="${NO_STRIP:-1}"
export APPIMAGE_EXTRACT_AND_RUN="${APPIMAGE_EXTRACT_AND_RUN:-1}"

exec npx tauri build "$@"
