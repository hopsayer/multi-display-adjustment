// SPDX-FileCopyrightText: Maciej Wójcik and the display-adjustment contributors
// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later
//
// A fork of Display Adjustment by Maciej Wójcik,
// https://gitlab.com/w8jcik/display-adjustment

import GObject from 'gi://GObject'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import { SystemIndicator } from 'resource:///org/gnome/shell/ui/quickSettings.js'

import { areArraysEqual, devLog } from './code-convenience.js'
import { DisplaysToggle } from './displays-menu.js'
import { DisplayConfigService } from './display-config-service.js'
import { DdcutilService } from './ddcutil-service.js'
import { pairDisplays } from './display-pairing.js'


const DisplaysAdjustmentsIndicator = GObject.registerClass(
class DisplaysAdjustmentsIndicator extends SystemIndicator {

})

/**
 * The sliders in a Quick Settings tile with a menu. A view has `setDisplays()`
 * to show the given displays and `destroy()` to take itself out of the shell.
 */
class TileView {
    constructor(ddcutilService, iconsDirectory, settings, openPreferences) {
        this._indicator = new DisplaysAdjustmentsIndicator()
        this._toggle = new DisplaysToggle(ddcutilService, iconsDirectory, settings, openPreferences)

        this._indicator.quickSettingsItems.push(this._toggle)

        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator)
    }

    setDisplays(displays) {
        this._toggle.setDisplays(displays)
    }

    destroy() {
        this._indicator.quickSettingsItems.forEach(item => item.destroy())
        this._indicator.quickSettingsItems = []
        this._toggle = null

        this._indicator.destroy()
        this._indicator = null
    }
}

export default class DisplaysAdjustmentsExtension extends Extension {
    enable() {
        this._previousSignature = null

        this._displayConfigService = new DisplayConfigService()
        this._ddcutilService = new DdcutilService()

        this._view = new TileView(
            this._ddcutilService, this.dir.get_child('icons'),
            this.getSettings(), () => this.openPreferences())

        this._connectServices().catch(error => logError(error, '[multi-display-adjustment] Could not start'))
    }

    /**
     * disable() can run while this is waiting, for example when the screen
     * locks right after login, so every step after an await checks that the
     * services it holds are still the current ones.
     */
    async _connectServices() {
        const displayConfigService = this._displayConfigService
        const ddcutilService = this._ddcutilService

        await displayConfigService.init()
        await ddcutilService.init()

        if (this._displayConfigService !== displayConfigService) {
            return
        }

        displayConfigService.connectMonitorsChanged(() => {
            this._syncDisplays().catch(error => logError(error, '[multi-display-adjustment] Could not list displays'))
        })

        await this._syncDisplays()
    }

    async _syncDisplays() {
        const displayConfigService = this._displayConfigService
        const ddcutilService = this._ddcutilService

        const mutterDisplays = await displayConfigService.getDisplays()
        const ddcDisplays = await ddcutilService.getDisplays()

        if (this._displayConfigService !== displayConfigService) {
            return
        }

        const displays = pairDisplays(mutterDisplays, ddcDisplays)

        const signature = displays.map(display => `${display.key}#${display.displayId}#${display.name}#${display.connector}`)

        devLog('[multi-display-adjustment] previous displays', this._previousSignature, 'displays', signature)

        if (areArraysEqual(signature, this._previousSignature)) {
            return
        }

        this._previousSignature = signature

        this._view.setDisplays(displays)
    }

    disable() {
        this._displayConfigService.disconnectMonitorsChanged()

        this._view.destroy()
        this._view = null

        this._displayConfigService = null
        this._ddcutilService = null

        this._previousSignature = null
    }
}
