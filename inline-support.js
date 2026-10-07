// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

// The inline sliders find their place through parts of Quick Settings that are
// private to the shell and can change between releases, so they are only turned
// on for the versions whose sources were checked. Those parts are the same from
// GNOME 46 to 50. Check them again before adding a version to metadata.json.
const INLINE_SHELL_VERSIONS = [46, 47, 48, 49, 50]

/**
 * Whether the inline sliders can be used on a shell whose version is
 * `packageVersion`, such as '50.2' or '51.alpha'. Takes the version as an
 * argument because the shell and the preferences window import it from
 * different places.
 */
function supportsInline(packageVersion) {
    return INLINE_SHELL_VERSIONS.includes(parseInt(packageVersion.split('.')[0], 10))
}

export { supportsInline }
