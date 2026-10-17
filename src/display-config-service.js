// SPDX-FileCopyrightText: Maciej Wójcik and the display-adjustment contributors
// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio'

import { devLog, getPossibleBoolean, getPossibleString } from './code-convenience.js'


class DisplayConfigService {
    /**
     * A subset of org.gnome.Mutter.DisplayConfig.xml from Mutter 46.2. The
     * shell's loadInterfaceXML() cannot be used, because some distributions,
     * Ubuntu 24.04 among them, do not package that file.
     */
    _displayConfigInterface = `
        <!DOCTYPE node PUBLIC
        '-//freedesktop//DTD D-BUS Object Introspection 1.0//EN'
        'http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd'>
        <node>
            <interface name="org.gnome.Mutter.DisplayConfig">

            <signal name="MonitorsChanged" />

            <method name="GetCurrentState">
                <arg name="serial" direction="out" type="u" />
                <arg name="monitors" direction="out" type="a((ssss)a(siiddada{sv})a{sv})" />
                <arg name="logical_monitors" direction="out" type="a(iiduba(ssss)a{sv})" />
                <arg name="properties" direction="out" type="a{sv}" />
            </method>

            </interface>
        </node>`

    async init() {
        const DisplayConfigProxy = Gio.DBusProxy.makeProxyWrapper(this._displayConfigInterface)

        this._proxy = await new Promise((resolve, reject) => {
            DisplayConfigProxy(
                Gio.DBus.session, 'org.gnome.Mutter.DisplayConfig', '/org/gnome/Mutter/DisplayConfig',
                (proxy, error) => {
                    if (error === null) {
                        resolve(proxy)
                    } else {
                        reject(error)
                    }
                },
                null, Gio.DBusProxyFlags.NONE
            )
        })
    }

    connectMonitorsChanged(callback) {
        this._monitorsChangedId = this._proxy.connectSignal('MonitorsChanged', () => callback())
    }

    disconnectMonitorsChanged() {
        if (this._monitorsChangedId) {
            this._proxy.disconnectSignal(this._monitorsChangedId)
            this._monitorsChangedId = null
        }
    }

    /**
     * Displays sharing a column are ordered top to bottom.
     */
    _orderLeftToRight(displays) {
        return [...displays].sort((a, b) => a.x - b.x || a.y - b.y)
    }

    _findMode(modes, property) {
        return modes.find(mode => getPossibleBoolean(mode[6], property))
    }

    async _getLayoutFromMutter() {
        const currentState = await this._proxy.GetCurrentStateAsync()

        const layout = {}

        for (const [monitorSpec, modes, monitorProperties] of currentState[1]) {
            const [connector, vendor, model, serial] = monitorSpec

            if (connector.startsWith('None')) {
                continue
            }

            // The same localized name that Settings shows, e.g. `LG Electronics 27"`
            const name = getPossibleString(monitorProperties, 'display-name') || `${vendor} ${model}`.trim() || connector

            const currentMode = this._findMode(modes, 'is-current')
            const mode = currentMode ?? this._findMode(modes, 'is-preferred')

            if (mode === undefined) {
                continue
            }

            layout[connector] = {
                connector,
                vendor,
                model,
                serial,
                name,
                width: mode[1],
                height: mode[2],
                enabled: currentMode !== undefined
            }
        }

        for (const logicalMonitor of currentState[2]) {
            const [x, y] = logicalMonitor

            for (const [connector] of logicalMonitor[5]) {
                if (connector in layout) {
                    layout[connector].x = x
                    layout[connector].y = y
                }
            }
        }

        devLog('[multi-display-adjustment] Retrieved displays layout from Mutter', Object.values(layout))

        return Object.values(layout)
    }

    /**
     * Enabled displays, ordered by position. `key` is what ddcutil-service
     * displays are matched against, and two identical displays can share it.
     */
    async getDisplays() {
        const layout = await this._getLayoutFromMutter()

        const enabledDisplays = layout
            .filter(display => display.enabled)
            .map(display => ({ ...display, key: `${display.model}#${display.serial}` }))

        return this._orderLeftToRight(enabledDisplays)
    }
}

export { DisplayConfigService }
