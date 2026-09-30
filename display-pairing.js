// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Matches the displays Mutter reports against the ones ddcutil-service found.
 *
 * Both sides identify a display by model and serial. Identical displays share
 * that identity, so displays of the same key are paired in order.
 *
 * The result keeps the order of `mutterDisplays`.
 */
function pairDisplays(mutterDisplays, ddcDisplays) {
    const pairedCountPerKey = new Map()
    const pairedDisplays = []

    for (const mutterDisplay of mutterDisplays) {
        const candidates = ddcDisplays.get(mutterDisplay.key)

        if (candidates === undefined) {
            continue
        }

        const alreadyPaired = pairedCountPerKey.get(mutterDisplay.key) ?? 0

        if (alreadyPaired >= candidates.length) {
            continue
        }

        pairedCountPerKey.set(mutterDisplay.key, alreadyPaired + 1)

        pairedDisplays.push({ ...mutterDisplay, displayId: candidates[alreadyPaired].displayId })
    }

    return pairedDisplays
}

export { pairDisplays }
