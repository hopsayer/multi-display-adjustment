// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later
//
// Development only: takes the place of mock-loader.js in a package built with
// MOCK_DISPLAYS_NUMBER, together with mock-services.js and mock.json.
// See "Mock displays" in dev.md.

import Gio from 'gi://Gio'

import { installMockServices as installMocks } from './mock-services.js'

/**
 * The number of mock displays in mock.json, next to this file, which is read
 * every time the extension is enabled, so that it can be changed with
 * `gnome-extensions disable` and `enable`, without a new login.
 */
function readCount() {
    const file = Gio.File.new_for_uri(import.meta.url).get_parent().get_child('mock.json')

    try {
        const [, contents] = file.load_contents(null)
        const count = JSON.parse(new TextDecoder().decode(contents)).displays

        return Number.isInteger(count) && count > 0 ? count : null
    } catch (error) {
        return null
    }
}

function installMockServices(displayConfigService, ddcutilService) {
    const count = readCount()

    if (count === null) {
        log('[multi-display-adjustment] mock.json is missing or has no valid "displays", so the real displays are used')

        return
    }

    installMocks(displayConfigService, ddcutilService, count)
}

export { installMockServices }
