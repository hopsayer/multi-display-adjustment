#!/usr/bin/env bash

# Builds the extension package in the layout the GNOME Extensions website
# expects, using the tool that ships with GNOME Shell itself.
#
#   ./dist.sh            builds dist/multi-display-adjustment@cecilio.xyz.shell-extension.zip
#   ./dist.sh --install  builds it and installs it for the current user
#
# With MOCK_DISPLAYS_NUMBER=N it builds a development package that has N mock
# displays instead of the real ones, as dist/$UUID-mock.shell-extension.zip, see
# "Mock displays" in dev.md. That one is never what is published.
#
# The same script runs in CI, so the published package is the one built here.

set -euo pipefail

UUID=multi-display-adjustment@cecilio.xyz

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$ROOT_DIR/dist"
MOCK_DISPLAYS_NUMBER="${MOCK_DISPLAYS_NUMBER:-}"
PACKAGE="$OUT_DIR/$UUID.shell-extension.zip"
INSTALL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$UUID"

# The extension is src/, and the license next to it in the root is added to the
# package from a copy, so that the tool sees everything in one directory.
STAGE_DIR="$(mktemp -d)"
MOCK_OUT_DIR=""
trap 'rm -rf "$STAGE_DIR" "$MOCK_OUT_DIR"' EXIT

cp -r "$ROOT_DIR/src/." "$STAGE_DIR/"
cp "$ROOT_DIR/LICENSE" "$STAGE_DIR/"
rm -f "$STAGE_DIR/schemas/gschemas.compiled"

# metadata.json, extension.js, prefs.js and stylesheet.css are picked up
# automatically, and schemas/*.gschema.xml is compiled into the package.
# Everything else, including the license, has to be listed.
EXTRA_SOURCES=(
    LICENSE
    code-convenience.js
    ddcutil-service.js
    display-config-service.js
    display-pairing.js
    displays-menu.js
    icons
    inline-sliders.js
    mock-loader.js
    vcp-controller.js
)

extra_source_arguments=()

for source in "${EXTRA_SOURCES[@]}"; do
    extra_source_arguments+=(--extra-source="$source")
done

mkdir -p "$OUT_DIR"

if [[ -z "$MOCK_DISPLAYS_NUMBER" ]]; then
    gnome-extensions pack --force --out-dir="$OUT_DIR" "${extra_source_arguments[@]}" "$STAGE_DIR"
else
    if [[ ! "$MOCK_DISPLAYS_NUMBER" =~ ^[1-9][0-9]*$ ]]; then
        echo "MOCK_DISPLAYS_NUMBER must be a whole number above 0, not '$MOCK_DISPLAYS_NUMBER'" >&2

        exit 1
    fi

    PACKAGE="$OUT_DIR/$UUID-mock.shell-extension.zip"
    MOCK_OUT_DIR="$(mktemp -d)"

    # The copy is the one place where the mock files are put, so the working
    # tree stays as it is and never has them in place of the real ones.
    cp "$ROOT_DIR/dev/mock-loader.js" "$STAGE_DIR/mock-loader.js"
    cp "$ROOT_DIR/dev/mock-services.js" "$STAGE_DIR/"
    printf '{ "displays": %s }\n' "$MOCK_DISPLAYS_NUMBER" > "$STAGE_DIR/mock.json"

    # So that it cannot be taken for the real one in the list of extensions
    sed -i -E 's/^([[:space:]]*"name"[[:space:]]*:[[:space:]]*"[^"]*)"/\1 (mock)"/' "$STAGE_DIR/metadata.json"
    grep -q '"name".*(mock)"' "$STAGE_DIR/metadata.json"

    gnome-extensions pack --force --out-dir="$MOCK_OUT_DIR" "${extra_source_arguments[@]}" \
        --extra-source=mock-services.js --extra-source=mock.json "$STAGE_DIR"

    mv "$MOCK_OUT_DIR/$UUID.shell-extension.zip" "$PACKAGE"
fi

echo "Packed $PACKAGE"

if [[ "${1:-}" == "--install" ]]; then
    # `gnome-extensions install --force` empties the extension directory before
    # unpacking, and it follows a symlink while doing so. With the development
    # symlink from dev.md in place, that empties the working tree instead.
    if [[ -L "$INSTALL_DIR" ]]; then
        echo "Refusing to install: $INSTALL_DIR is a symlink, most likely to src/ of a working tree." >&2
        echo "Installing over it would delete the contents of $(readlink -f "$INSTALL_DIR")." >&2
        echo "Remove the symlink first: rm '$INSTALL_DIR'" >&2

        exit 1
    fi

    gnome-extensions install --force "$PACKAGE"

    echo "Installed $UUID"
    echo "Log out and back in, then run: gnome-extensions enable $UUID"
fi
