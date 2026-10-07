// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import GObject from 'gi://GObject'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js'
import { QuickSlider } from 'resource:///org/gnome/shell/ui/quickSettings.js'

import { BRIGHTNESS_VCP_CODE, MIN_BRIGHTNESS, VcpController } from './vcp-controller.js'


// Quick Settings has two columns, and its own sliders span both
const QUICK_SETTINGS_COLUMNS = 2

// The shell builds its own Quick Settings items a moment after it starts. A
// slider added before that would end up below all of them, so it waits for
// them, in steps, up to a limit.
const WAIT_STEP_MS = 100
const MAX_WAIT_STEPS = 50

/**
 * A Quick Settings slider like the one GNOME has for the built-in display,
 * bound to the brightness of one or more displays through a `VcpController`.
 * It stays hidden until the current brightness is read.
 */
const BrightnessSlider = GObject.registerClass(
class BrightnessSlider extends QuickSlider {
    _init(ddcutilService, displays, osdIcon, accessibleName) {
        super._init({ iconName: 'display-brightness-symbolic' })

        this._controller = new VcpController(ddcutilService, displays, BRIGHTNESS_VCP_CODE, osdIcon, MIN_BRIGHTNESS)

        this.slider.accessible_name = accessibleName

        this._sliderChangedId = this.slider.connect('notify::value', this._onSliderChanged.bind(this))

        this.connect('destroy', this._onDestroy.bind(this))

        this.visible = false
    }

    // The shell does not destroy the menu of a quick item along with it
    _onDestroy() {
        this._controller.destroy()
        this.slider.disconnect(this._sliderChangedId)
        this._sliderChangedId = 0

        this.menu.destroy()
    }

    /**
     * Reads the current brightness from every display. Returns false when none
     * of them support it, in which case the slider stays hidden. Rejects with
     * Gio.IOErrorEnum.CANCELLED when the slider is destroyed meanwhile.
     */
    async fetchValue() {
        const fraction = await this._controller.fetch()

        if (fraction === null) {
            this.hide()

            return false
        }

        this.slider.block_signal_handler(this._sliderChangedId)
        this.slider.value = fraction
        this.slider.unblock_signal_handler(this._sliderChangedId)
        this.show()

        return true
    }

    _onSliderChanged() {
        // Setting the value notifies again, and that call does the write
        if (this.slider.value < this._controller.minValue) {
            this.slider.value = this._controller.minValue

            return
        }

        this._controller.apply(this.slider.value)
    }
})

/**
 * Puts `sliders` in Quick Settings right below the brightness slider of GNOME,
 * or right above it when `above` is set. Without it, which is the case on a
 * desktop, they go below the volume sliders, and without those at the end.
 *
 * The shell has no call for inserting after an item, only before one, so below
 * an anchor means before the item that follows it. The anchors are the
 * indicators of the shell, which keep their own sliders even when those are
 * hidden, so a hidden brightness slider still marks the spot, and above or
 * below it makes no difference.
 */
function insertNextToNativeSliders(quickSettings, sliders, above) {
    let sibling = null

    const anchors = [
        [quickSettings._brightness, above],
        [quickSettings._volumeInput, false],
        [quickSettings._volumeOutput, false]
    ]

    for (const [indicator, isAbove] of anchors) {
        const anchor = indicator?.quickSettingsItems?.at(-1)

        if (anchor?.get_parent()) {
            sibling = isAbove ? anchor : anchor.get_next_sibling()

            break
        }
    }

    for (const slider of sliders) {
        quickSettings.menu.insertItemBefore(slider, sibling, QUICK_SETTINGS_COLUMNS)
    }
}

/**
 * The brightness sliders of the displays, one each or a single one for all of
 * them, placed among the sliders of GNOME instead of in a tile. A view in the
 * sense of extension.js, it has `setDisplays()` and `destroy()`.
 */
class InlineSliders {
    constructor(ddcutilService, settings) {
        this._ddcutilService = ddcutilService
        this._settings = settings
        this._displays = []
        this._sliders = []
        this._waitId = 0

        this._osdIcon = new Gio.ThemedIcon({ name: 'display-brightness-symbolic' })

        this._settings.connectObject(
            'changed::group-displays', () => this._rebuild(),
            'changed::inline-position', () => this._rebuild(),
            this)
    }

    setDisplays(displays) {
        this._displays = displays
        this._rebuild()
    }

    destroy() {
        this._settings.disconnectObject(this)
        this._clear()
    }

    _clear() {
        if (this._waitId) {
            GLib.Source.remove(this._waitId)
            this._waitId = 0
        }

        this._sliders.forEach(slider => slider.destroy())
        this._sliders = []
    }

    _rebuild() {
        this._clear()

        const grouped = this._settings.get_boolean('group-displays') && this._displays.length >= 2

        if (grouped) {
            this._sliders = [new BrightnessSlider(
                this._ddcutilService, this._displays, this._osdIcon, _('Brightness of all displays'))]
        } else {
            this._sliders = this._displays.map(display => new BrightnessSlider(
                this._ddcutilService, [display], this._osdIcon, _('Brightness of %s').format(display.name)))
        }

        this._place(this._sliders)

        this._sliders.forEach(slider => this._fetchValue(slider))
    }

    _place(sliders) {
        const quickSettings = Main.panel.statusArea.quickSettings
        const above = this._settings.get_string('inline-position') === 'above'

        // The shell creates all of its indicators in one go, so this one being there means the others are
        if (quickSettings._brightness) {
            insertNextToNativeSliders(quickSettings, sliders, above)

            return
        }

        let steps = 0

        this._waitId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, WAIT_STEP_MS, () => {
            steps++

            if (!quickSettings._brightness && steps < MAX_WAIT_STEPS) {
                return GLib.SOURCE_CONTINUE
            }

            this._waitId = 0
            insertNextToNativeSliders(quickSettings, sliders, above)

            return GLib.SOURCE_REMOVE
        })
    }

    /**
     * The slider is destroyed when the displays change or the view goes away,
     * which cancels the read.
     */
    async _fetchValue(slider) {
        try {
            await slider.fetchValue()
        } catch (error) {
            if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                logError(error, '[multi-display-adjustment] Could not read display values')
            }
        }
    }
}

export { InlineSliders }
