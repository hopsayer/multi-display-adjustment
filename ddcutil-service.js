// SPDX-FileCopyrightText: Maciej Wójcik and the display-adjustment contributors
// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js'

import { devLog } from './code-convenience.js'

class DdcutilService {
    /**
     * The methods this extension uses, from
     * https://github.com/digitaltrails/ddcutil-service/blob/main/ddcutil-service.c
     */
    _ddcutilInterface = `
        <!DOCTYPE node PUBLIC
        '-//freedesktop//DTD D-BUS Object Introspection 1.0//EN'
        'http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd'>
        <node>
            <interface name='com.ddcutil.DdcutilInterface'>
                <method name='Detect'>
                    <arg name='flags' type='u' direction='in'/>
                    <arg name='number_of_displays' type='i' direction='out'/>
                    <arg name='detected_displays' type='a(iiisssqsu)' direction='out'/>
                    <arg name='error_status' type='i' direction='out'/>
                    <arg name='error_message' type='s' direction='out'/>
                </method>

                <method name='GetVcp'>
                    <arg name='display_number' type='i' direction='in'/>
                    <arg name='edid_txt' type='s' direction='in'/>
                    <arg name='vcp_code' type='y' direction='in'/>
                    <arg name='flags' type='u' direction='in'/>
                    <arg name='vcp_current_value' type='q' direction='out'/>
                    <arg name='vcp_max_value' type='q' direction='out'/>
                    <arg name='vcp_formatted_value' type='s' direction='out'/>
                    <arg name='error_status' type='i' direction='out'/>
                    <arg name='error_message' type='s' direction='out'/>
                </method>

                <method name='SetVcp'>
                    <arg name='display_number' type='i' direction='in'/>
                    <arg name='edid_txt' type='s' direction='in'/>
                    <arg name='vcp_code' type='y' direction='in'/>
                    <arg name='vcp_new_value' type='q' direction='in'/>
                    <arg name='flags' type='u' direction='in'/>
                    <arg name='error_status' type='i' direction='out'/>
                    <arg name='error_message' type='s' direction='out'/>
                </method>
            </interface>
        </node>`

    async init() {
        const DdcutilProxy = Gio.DBusProxy.makeProxyWrapper(this._ddcutilInterface)

        this._proxy = await new Promise((resolve, reject) => {
            DdcutilProxy(
                Gio.DBus.session, 'com.ddcutil.DdcutilService', '/com/ddcutil/DdcutilObject',
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

    _notifyUnavailable() {
        // Displays change often, the user only needs to be told once
        if (this._notifiedUnavailable) {
            return
        }

        this._notifiedUnavailable = true

        Main.notify(
            _('Multi Display Adjustment'),
            _('ddcutil-service is not available or failed to start. Install ddcutil-service and log in again to get the brightness and contrast sliders, or disable the Multi Display Adjustment extension.')
        )
    }

    /**
     * Displays found over DDC/CI, keyed by model and serial. Every key holds a
     * list, since identical displays can share it. Empty when ddcutil-service
     * is not installed.
     */
    async getDisplays() {
        let reply

        try {
            reply = await this._proxy.DetectAsync(0)
        } catch (exception) {
            if (!exception.message.includes('org.freedesktop.DBus.Error.ServiceUnknown')) {
                throw exception
            }

            this._notifyUnavailable()

            return new Map()
        }

        const ddcDisplays = new Map()

        for (const display of reply[1]) {
            const displayId = display[0]
            const model = display[4]
            const binarySerial = display[8]

            // The same fallback Mutter uses for displays without a serial string
            const serial = display[5] === '' ? `0x${binarySerial.toString(16).padStart(8, '0')}` : display[5]

            const key = `${model}#${serial}`

            if (!ddcDisplays.has(key)) {
                ddcDisplays.set(key, [])
            }

            ddcDisplays.get(key).push({ displayId, model, serial })
        }

        devLog('[multi-display-adjustment] Retrieved displays from ddcutil-service', Array.from(ddcDisplays.values()).flat())

        return ddcDisplays
    }

    /**
     * Returns null when the display does not support the feature or when the
     * service cannot be reached, so that the control can be left out. Rejects
     * when `cancellable` is cancelled.
     */
    async getVcp(displayId, vcpCode, cancellable) {
        let result

        try {
            result = await this._proxy.GetVcpAsync(displayId, '', vcpCode, 0, cancellable)
        } catch (exception) {
            if (exception.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                throw exception
            }

            devLog(`[multi-display-adjustment] Reading VCP ${vcpCode} of display ${displayId} failed`, exception.message)

            return null
        }

        const [current, max, , errorStatus, errorMessage] = result

        if (errorStatus !== 0) {
            devLog(`[multi-display-adjustment] Display ${displayId} does not report VCP ${vcpCode}`, errorMessage)

            return null
        }

        return { current, max }
    }

    async setVcp(displayId, vcpCode, newValue) {
        try {
            await this._proxy.SetVcpAsync(displayId, '', vcpCode, newValue, 0)
        } catch (exception) {
            devLog(`[multi-display-adjustment] Writing VCP ${vcpCode} of display ${displayId} failed`, exception.message)
        }
    }
}

export { DdcutilService }
