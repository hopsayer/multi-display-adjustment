// SPDX-FileCopyrightText: Maciej Wójcik and the display-adjustment contributors
// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

function getPossibleBoolean(variant, property) {
    if (property in variant) {
        return variant[property].get_boolean()
    }

    return false
}

function getPossibleString(variant, property) {
    if (property in variant) {
        return variant[property].get_string()[0]
    }

    return null
}

function devLog(...args) {
    // Enable during development to see the logs in journalctl -xef
    // log(...args)
}

function areArraysEqual(array, otherArray) {
    return JSON.stringify(array) === JSON.stringify(otherArray)
}

export { areArraysEqual, devLog, getPossibleBoolean, getPossibleString }
