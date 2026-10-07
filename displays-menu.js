// SPDX-FileCopyrightText: Maciej Wójcik and the display-adjustment contributors
// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

import Clutter from 'gi://Clutter'
import Gio from 'gi://Gio'
import GObject from 'gi://GObject'
import St from 'gi://St'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'

import { gettext as _, ngettext } from 'resource:///org/gnome/shell/extensions/extension.js'
import { QuickMenuToggle } from 'resource:///org/gnome/shell/ui/quickSettings.js'
import { Slider } from 'resource:///org/gnome/shell/ui/slider.js'

import { devLog } from './code-convenience.js'
import { BRIGHTNESS_VCP_CODE, CONTRAST_VCP_CODE, MIN_BRIGHTNESS, VcpController } from './vcp-controller.js'


/**
 * A menu item with a slider bound to one VCP feature on one or more displays,
 * which a `VcpController` reads and writes. Moving the slider shows the level
 * on those displays.
 *
 * `minValue` is the lowest fraction of the range the slider can be moved to.
 */
const VcpSliderItem = GObject.registerClass(
class VcpSliderItem extends PopupMenu.PopupBaseMenuItem {
    _init(ddcutilService, displays, vcpCode, gicon, accessibleName, minValue = 0) {
        super._init({ activate: false })

        this._controller = new VcpController(ddcutilService, displays, vcpCode, gicon, minValue)

        this.add_child(new St.Icon({
            gicon,
            style_class: 'popup-menu-icon'
        }))

        this._slider = new Slider(0)
        this._slider.x_expand = true
        this._slider.accessible_name = accessibleName

        this.add_child(this._slider)

        this._valueLabel = new St.Label({
            text: '0',
            style_class: 'mda-slider-value',
            y_align: Clutter.ActorAlign.CENTER
        })
        this.add_child(this._valueLabel)

        this._sliderChangedId = this._slider.connect('notify::value', this._onSliderChanged.bind(this))

        this.connect('destroy', this._onDestroy.bind(this))
    }

    _onDestroy() {
        this._controller.destroy()
        this._slider.disconnect(this._sliderChangedId)
        this._sliderChangedId = 0
    }

    /**
     * Reads the current value from every display. Returns false when none of
     * them support the feature, in which case the item stays hidden. Rejects
     * with Gio.IOErrorEnum.CANCELLED when the item is destroyed meanwhile.
     */
    async fetchValue() {
        const fraction = await this._controller.fetch()

        if (fraction === null) {
            this.hide()

            return false
        }

        this._slider.block_signal_handler(this._sliderChangedId)
        this._slider.value = fraction
        this._slider.unblock_signal_handler(this._sliderChangedId)
        this._updateLabel()
        this.show()

        return true
    }

    _updateLabel() {
        this._valueLabel.text = `${Math.round(this._slider.value * 100)}`
    }

    _onSliderChanged() {
        // Setting the value notifies again, and that call does the write
        if (this._slider.value < this._controller.minValue) {
            this._slider.value = this._controller.minValue

            return
        }

        this._updateLabel()

        this._controller.apply(this._slider.value)
    }

    // Menu items would otherwise take Left and Right for navigation
    vfunc_key_press_event(event) {
        const key = event.get_key_symbol()

        if (key === Clutter.KEY_Left || key === Clutter.KEY_Right) {
            return this._slider.vfunc_key_press_event(event)
        }

        return super.vfunc_key_press_event(event)
    }
})

/**
 * One Quick Settings tile with a menu that holds the sliders of every display,
 * each under the display's name.
 */
const DisplaysToggle = GObject.registerClass(
class DisplaysToggle extends QuickMenuToggle {
    /**
     * `iconsDirectory` holds a contrast icon, which Adwaita no longer has
     * since GNOME 47.
     */
    _init(ddcutilService, iconsDirectory, settings, openPreferences) {
        super._init({
            title: _('Displays'),
            iconName: 'display-brightness-symbolic'
        })

        // Only exists since GNOME 49, older shells fail on it in _init()
        if ('menuButtonAccessibleName' in this) {
            this.menuButtonAccessibleName = _('Open display adjustments menu')
        }

        this._ddcutilService = ddcutilService
        this._settings = settings
        this._displays = []

        this._brightnessIcon = new Gio.ThemedIcon({ name: 'display-brightness-symbolic' })
        this._contrastIcon = new Gio.FileIcon({
            file: iconsDirectory.get_child('contrast-symbolic.svg')
        })

        this.menu.setHeader('display-brightness-symbolic', _('Displays'))

        this._section = new PopupMenu.PopupMenuSection()
        this.menu.addMenuItem(this._section)

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
        this.menu.addAction(_('Display Adjustment Settings'), () => {
            Main.panel.closeQuickSettings()
            openPreferences()
        })

        this._settings.connectObject(
            'changed::group-displays', () => this._rebuild(),
            'changed::show-contrast', () => this._rebuild(),
            this)

        this.connect('clicked', () => this.menu.toggle())
        this.connect('destroy', this._onDestroy.bind(this))

        this.visible = false
    }

    // The shell does not destroy the menu of a quick toggle along with it
    _onDestroy() {
        this._section.destroy()
        this._section = null

        this.menu.destroy()
    }

    setDisplays(displays) {
        this._displays = displays
        this._rebuild()
    }

    _rebuild() {
        this._section.removeAll()

        const showContrast = this._settings.get_boolean('show-contrast')
        const grouped = this._settings.get_boolean('group-displays') && this._displays.length >= 2

        if (grouped) {
            this._addGroup(this._displays, showContrast)
        } else {
            for (const display of this._displays) {
                this._addDisplay(display, showContrast)
            }
        }

        this.visible = this._displays.length > 0

        if (this._displays.length === 1) {
            this.subtitle = this._displays[0].name
        } else {
            this.subtitle = ngettext('%d display', '%d displays', this._displays.length).format(this._displays.length)
        }
    }

    _addDisplay(display, showContrast) {
        const heading = new PopupMenu.PopupSeparatorMenuItem(display.name)

        // Tells apart two displays of the same model, which share a name
        heading.add_child(new St.Label({
            text: display.connector,
            style_class: 'popup-menu-item-connector',
            y_align: Clutter.ActorAlign.CENTER,
            opacity: 150
        }))

        this._section.addMenuItem(heading)

        const brightness = new VcpSliderItem(
            this._ddcutilService, [display], BRIGHTNESS_VCP_CODE,
            this._brightnessIcon, _('Brightness of %s').format(display.name),
            MIN_BRIGHTNESS
        )
        this._section.addMenuItem(brightness)

        let contrast = null

        if (showContrast) {
            contrast = new VcpSliderItem(
                this._ddcutilService, [display], CONTRAST_VCP_CODE,
                this._contrastIcon, _('Contrast of %s').format(display.name)
            )
            this._section.addMenuItem(contrast)
        }

        this._fetchValues(display.name, heading, brightness, contrast)
    }

    _addGroup(displays, showContrast) {
        const heading = new PopupMenu.PopupSeparatorMenuItem(_('All displays'))
        this._section.addMenuItem(heading)

        const brightness = new VcpSliderItem(
            this._ddcutilService, displays, BRIGHTNESS_VCP_CODE,
            this._brightnessIcon, _('Brightness of all displays'),
            MIN_BRIGHTNESS
        )
        this._section.addMenuItem(brightness)

        let contrast = null

        if (showContrast) {
            contrast = new VcpSliderItem(
                this._ddcutilService, displays, CONTRAST_VCP_CODE,
                this._contrastIcon, _('Contrast of all displays')
            )
            this._section.addMenuItem(contrast)
        }

        this._fetchValues(_('All displays'), heading, brightness, contrast)
    }

    /**
     * The heading and its sliders are destroyed together, when the menu is
     * rebuilt or the tile goes away, which cancels the reads.
     */
    async _fetchValues(label, heading, brightness, contrast) {
        let hasBrightness, hasContrast

        try {
            hasBrightness = await brightness.fetchValue()
            hasContrast = contrast ? await contrast.fetchValue() : false
        } catch (error) {
            if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                logError(error, '[multi-display-adjustment] Could not read display values')
            }

            return
        }

        if (!hasBrightness && !hasContrast) {
            devLog('[multi-display-adjustment] No adjustable features on display', label)

            heading.hide()
        }
    }
})

export { DisplaysToggle }
