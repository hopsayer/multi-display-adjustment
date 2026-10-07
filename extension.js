// SPDX-FileCopyrightText: Maciej Wójcik and the display-adjustment contributors
// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later
//
// A fork of Display Adjustment by Maciej Wójcik,
// https://gitlab.com/w8jcik/display-adjustment

import GObject from 'gi://GObject'

import * as Config from 'resource:///org/gnome/shell/misc/config.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import { SystemIndicator } from 'resource:///org/gnome/shell/ui/quickSettings.js'

import { areArraysEqual, devLog } from './code-convenience.js'
import { DisplaysToggle } from './displays-menu.js'
import { DisplayConfigService } from './display-config-service.js'
import { DdcutilService } from './ddcutil-service.js'
import { pairDisplays } from './display-pairing.js'
import { InlineSliders } from './inline-sliders.js'
import { supportsInline } from './inline-support.js'


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
        this._displays = []
        this._inline = null

        this._displayConfigService = new DisplayConfigService()
        this._ddcutilService = new DdcutilService()

        this._settings = this.getSettings()
        this._settings.connectObject('changed::slider-placement', () => this._applyPlacement(), this)

        this._applyPlacement()

        this._connectServices().catch(error => logError(error, '[multi-display-adjustment] Could not start'))
    }

    /**
     * Shows the sliders where the setting says. The inline ones are only used
     * on the shell versions they were checked on, whatever the setting is.
     */
    _applyPlacement() {
        const inline = supportsInline(Config.PACKAGE_VERSION) && this._settings.get_string('slider-placement') === 'inline'

        if (this._view && inline === this._inline) {
            return
        }

        this._view?.destroy()
        this._inline = inline

        if (inline) {
            this._view = new InlineSliders(this._ddcutilService, this._settings)
        } else {
            this._view = new TileView(
                this._ddcutilService, this.dir.get_child('icons'),
                this._settings, () => this.openPreferences())
        }

        if (this._displays.length > 0) {
            this._view.setDisplays(this._displays)
        }
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

        this._displays = displays
        this._view.setDisplays(displays)

        // For the preferences window, which runs in its own process
        this._settings.set_int('external-display-count', displays.length)
    }

    disable() {
        this._displayConfigService.disconnectMonitorsChanged()

        this._settings.disconnectObject(this)
        this._settings = null

        this._view.destroy()
        this._view = null
        this._inline = null

        this._displayConfigService = null
        this._ddcutilService = null

        this._displays = []
        this._previousSignature = null
    }
}
