// SPDX-FileCopyrightText: Maciej Wójcik and the display-adjustment contributors
// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'


/**
 * Shows `level` in the on-screen display of the monitors behind `connectors`,
 * like GNOME does for the built-in display. GNOME 49 shows it on any set of
 * monitors, before that it is either one monitor or all of them.
 */
function showOsd(connectors, icon, level) {
    const monitorManager = global.backend.get_monitor_manager()
    const monitorIndexes = connectors
        .map(connector => monitorManager.get_monitor_for_connector(connector))
        .filter(monitorIndex => monitorIndex !== -1)

    if (monitorIndexes.length === 0) {
        return
    }

    if ('showOne' in Main.osdWindowManager) {
        const levels = {}

        for (const monitorIndex of monitorIndexes) {
            levels[monitorIndex] = { level, maxLevel: 1 }
        }

        Main.osdWindowManager.show(icon, null, levels)
    } else {
        const monitorIndex = monitorIndexes.length === 1 ? monitorIndexes[0] : -1

        Main.osdWindowManager.show(monitorIndex, icon, null, level, 1)
    }
}

/**
 * Reads and writes one VCP feature on one or more displays, whatever widget
 * shows it. Applying a level shows it on those displays.
 *
 * DDC/CI writes are slow. One write is kept in flight per display; later values
 * from a drag replace the pending one so the last position always arrives.
 *
 * `minValue` is the lowest fraction of the range a level can be set to. It is
 * up to the widget to keep itself above it, `apply()` does not clamp.
 */
class VcpController {
    constructor(ddcutilService, displays, vcpCode, osdIcon, minValue = 0) {
        this._ddcutilService = ddcutilService
        this._displays = displays
        this._vcpCode = vcpCode
        this._osdIcon = osdIcon
        this._minValue = minValue
        this._targets = []

        // Cancels the reads still in flight when the controller is destroyed
        this._cancellable = new Gio.Cancellable()
    }

    get minValue() {
        return this._minValue
    }

    destroy() {
        this._cancellable.cancel()
    }

    /**
     * Reads the current value from every display. Resolves to the mean of
     * them as a fraction of the range, or to null when none of the displays
     * support the feature. Rejects with Gio.IOErrorEnum.CANCELLED when the
     * controller is destroyed meanwhile.
     */
    async fetch() {
        const values = await Promise.all(
            this._displays.map(display => this._ddcutilService.getVcp(display.displayId, this._vcpCode, this._cancellable)))

        this._targets = []
        const fractions = []

        values.forEach((value, i) => {
            if (value !== null && value.max) {
                this._targets.push({
                    displayId: this._displays[i].displayId,
                    connector: this._displays[i].connector,
                    max: value.max,
                    lastWritten: value.current,
                    pending: null,
                    writing: false
                })
                fractions.push(value.current / value.max)
            }
        })

        if (this._targets.length === 0) {
            return null
        }

        return fractions.reduce((sum, fraction) => sum + fraction, 0) / fractions.length
    }

    /**
     * Sets the displays to `fraction` of their range and shows it on them.
     */
    apply(fraction) {
        showOsd(this._targets.map(target => target.connector), this._osdIcon, fraction)

        // On a short range the minimum fraction can round down to 0
        const minimum = this._minValue > 0 ? 1 : 0

        for (const target of this._targets) {
            this._queueWrite(target, Math.max(Math.round(fraction * target.max), minimum))
        }
    }

    _queueWrite(target, value) {
        if (value === target.lastWritten && target.pending === null) {
            return
        }

        target.pending = value

        if (!target.writing) {
            this._drain(target)
        }
    }

    async _drain(target) {
        target.writing = true

        while (target.pending !== null) {
            const value = target.pending
            target.pending = null
            target.lastWritten = value
            await this._ddcutilService.setVcp(target.displayId, this._vcpCode, value)
        }

        target.writing = false
    }
}

export { VcpController }
