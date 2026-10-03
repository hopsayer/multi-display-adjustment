#!/usr/bin/env bash

# Builds the extension package in the layout the GNOME Extensions website
# expects, using the tool that ships with GNOME Shell itself.
#
#   ./dist.sh            builds dist/multi-display-adjustment@cecilio.xyz.shell-extension.zip
#   ./dist.sh --install  builds it and installs it for the current user
#
# The same script runs in CI, so the published package is the one built here.

set -euo pipefail

UUID=multi-display-adjustment@cecilio.xyz

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SOURCE_DIR/dist"
PACKAGE="$OUT_DIR/$UUID.shell-extension.zip"
INSTALL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$UUID"

# metadata.json, extension.js, prefs.js and stylesheet.css are picked up
# automatically, and schemas/*.gschema.xml is compiled into the package.
# Everything else, including the license, has to be listed.
EXTRA_SOURCES=(
    COPYING
    code-convenience.js
    ddcutil-service.js
    display-config-service.js
    display-pairing.js
    displays-menu.js
    icons
    vcp-controller.js
)

extra_source_arguments=()

for source in "${EXTRA_SOURCES[@]}"; do
    extra_source_arguments+=(--extra-source="$source")
done

mkdir -p "$OUT_DIR"

gnome-extensions pack --force --out-dir="$OUT_DIR" "${extra_source_arguments[@]}" "$SOURCE_DIR"

echo "Packed $PACKAGE"

if [[ "${1:-}" == "--install" ]]; then
    # `gnome-extensions install --force` empties the extension directory before
    # unpacking, and it follows a symlink while doing so. With the development
    # symlink from dev.md in place, that empties the working tree instead.
    if [[ -L "$INSTALL_DIR" ]]; then
        echo "Refusing to install: $INSTALL_DIR is a symlink, most likely to a working tree." >&2
        echo "Installing over it would delete the contents of $(readlink -f "$INSTALL_DIR")." >&2
        echo "Remove the symlink first: rm '$INSTALL_DIR'" >&2

        exit 1
    fi

    gnome-extensions install --force "$PACKAGE"

    echo "Installed $UUID"
    echo "Log out and back in, then run: gnome-extensions enable $UUID"
fi
