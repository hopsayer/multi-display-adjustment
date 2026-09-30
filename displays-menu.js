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


const BRIGHTNESS_VCP_CODE = 0x10
const CONTRAST_VCP_CODE = 0x12

/**
 * Some displays turn the backlight off at brightness 0, which leaves the screen
 * black with no way to see the slider that would bring it back.
 */
const MIN_BRIGHTNESS = 0.01

/**
 * A slider bound to one VCP feature on one or more displays, laid out as a menu
 * item so that several of them fit in one dropdown. The shell uses the same
 * shape for the keyboard backlight in `status/backlight.js`.
 *
 * DDC/CI writes are slow. One write is kept in flight per display; later values
 * from a drag replace the pending one so the last position always arrives.
 *
 * `minValue` is the lowest fraction of the range the slider can be moved to.
 * A display that already sits below it is shown as it is, and only written to
 * once the slider moves.
 */
const VcpSliderItem = GObject.registerClass(
class VcpSliderItem extends PopupMenu.PopupBaseMenuItem {
    _init(ddcutilService, displayIds, vcpCode, gicon, accessibleName, minValue = 0) {
        super._init({ activate: false })

        this._ddcutilService = ddcutilService
        this._displayIds = displayIds
        this._vcpCode = vcpCode
        this._minValue = minValue
        this._targets = []
        this._destroyed = false

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

        this.connect('destroy', () => {
            this._destroyed = true
            this._slider.disconnect(this._sliderChangedId)
            this._sliderChangedId = 0
        })
    }

    /**
     * Reads the current value from every display. Returns false when none of
     * them support the feature, in which case the item stays hidden.
     */
    async fetchValue() {
        const values = await Promise.all(
            this._displayIds.map(id => this._ddcutilService.getVcp(id, this._vcpCode)))

        if (this._destroyed) {
            return false
        }

        this._targets = []
        const fractions = []

        values.forEach((value, i) => {
            if (value !== null && value.max) {
                this._targets.push({
                    displayId: this._displayIds[i],
                    max: value.max,
                    lastWritten: value.current,
                    pending: null,
                    writing: false
                })
                fractions.push(value.current / value.max)
            }
        })

        if (this._targets.length === 0) {
            this.hide()

            return false
        }

        const mean = fractions.reduce((sum, fraction) => sum + fraction, 0) / fractions.length

        this._slider.block_signal_handler(this._sliderChangedId)
        this._slider.value = mean
        this._slider.unblock_signal_handler(this._sliderChangedId)
        this._updateLabel()
        this.show()

        return true
    }

    _updateLabel() {
        this._valueLabel.text = `${Math.round(this._slider.value * 100)}`
    }

    _onSliderChanged() {
        /**
         * Setting the value notifies again, and that second call does the
         * write.
         */
        if (this._slider.value < this._minValue) {
            this._slider.value = this._minValue

            return
        }

        this._updateLabel()

        /**
         * On a display with a short range the minimum fraction can round down
         * to 0, which is what it is there to avoid.
         */
        const minimum = this._minValue > 0 ? 1 : 0

        for (const target of this._targets) {
            this._queueWrite(target, Math.max(Math.round(this._slider.value * target.max), minimum))
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

    /**
     * Menu items consume left and right arrows for navigation, which are the
     * keys expected to move a slider.
     */
    vfunc_key_press_event(event) {
        const key = event.get_key_symbol()

        if (key === Clutter.KEY_Left || key === Clutter.KEY_Right) {
            return this._slider.vfunc_key_press_event(event)
        }

        return super.vfunc_key_press_event(event)
    }
})

/**
 * One Quick Settings tile holding every display, instead of a pair of unlabelled
 * sliders per display. Sliders in the grid have no room for a title, so with more
 * than one display there is no way to tell which slider belongs to which screen.
 */
const DisplaysToggle = GObject.registerClass(
class DisplaysToggle extends QuickMenuToggle {
    /**
     * `iconsDirectory` is the extension's own `icons`. Adwaita has no contrast
     * icon since GNOME 47 trimmed its legacy set, so the extension ships one.
     * The `-symbolic.svg` suffix is what makes the shell recolour it.
     */
    _init(ddcutilService, iconsDirectory, settings, openPreferences) {
        super._init({
            title: _('Displays'),
            iconName: 'display-brightness-symbolic'
        })

        /**
         * The property only exists since GNOME 49, and passing an unknown
         * property to _init fails construction on older shells. Those fall
         * back to the shell's built-in "Open menu" label.
         */
        if ('menuButtonAccessibleName' in this) {
            this.menuButtonAccessibleName = _('Open display adjustments menu')
        }

        this._ddcutilService = ddcutilService
        this._settings = settings
        this._displays = []
        this._destroyed = false

        this._brightnessIcon = new Gio.ThemedIcon({ name: 'display-brightness-symbolic' })
        this._contrastIcon = new Gio.FileIcon({
            file: iconsDirectory.get_child('contrast-symbolic.svg')
        })

        /**
         * Values are read from the displays asynchronously and a display can be
         * unplugged meanwhile. Replies of a previous layout are discarded.
         */
        this._generation = 0

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
        this.connect('destroy', () => (this._destroyed = true))

        this.visible = false
    }

    setDisplays(displays) {
        this._displays = displays
        this._rebuild()
    }

    _rebuild() {
        this._generation++
        this._section.removeAll()

        const showContrast = this._settings.get_boolean('show-contrast')
        const grouped = this._settings.get_boolean('group-displays') && this._displays.length >= 2

        if (grouped) {
            this._addGroup(this._displays, showContrast, this._generation)
        } else {
            for (const display of this._displays) {
                this._addDisplay(display, showContrast, this._generation)
            }
        }

        this.visible = this._displays.length > 0

        if (this._displays.length === 1) {
            this.subtitle = this._displays[0].name
        } else {
            this.subtitle = ngettext('%d display', '%d displays', this._displays.length).format(this._displays.length)
        }
    }

    _addDisplay(display, showContrast, generation) {
        const heading = new PopupMenu.PopupSeparatorMenuItem(display.name)

        /**
         * The connector disambiguates two displays of the same model, which
         * share the name Mutter reports.
         */
        heading.add_child(new St.Label({
            text: display.connector,
            style_class: 'popup-menu-item-connector',
            y_align: Clutter.ActorAlign.CENTER,
            opacity: 150
        }))

        this._section.addMenuItem(heading)

        const brightness = new VcpSliderItem(
            this._ddcutilService, [display.displayId], BRIGHTNESS_VCP_CODE,
            this._brightnessIcon, _('Brightness of %s').format(display.name),
            MIN_BRIGHTNESS
        )
        this._section.addMenuItem(brightness)

        let contrast = null

        if (showContrast) {
            contrast = new VcpSliderItem(
                this._ddcutilService, [display.displayId], CONTRAST_VCP_CODE,
                this._contrastIcon, _('Contrast of %s').format(display.name)
            )
            this._section.addMenuItem(contrast)
        }

        this._fetchValues(display.name, heading, brightness, contrast, generation)
    }

    _addGroup(displays, showContrast, generation) {
        const heading = new PopupMenu.PopupSeparatorMenuItem(_('All displays'))
        this._section.addMenuItem(heading)

        const displayIds = displays.map(display => display.displayId)

        const brightness = new VcpSliderItem(
            this._ddcutilService, displayIds, BRIGHTNESS_VCP_CODE,
            this._brightnessIcon, _('Brightness of all displays'),
            MIN_BRIGHTNESS
        )
        this._section.addMenuItem(brightness)

        let contrast = null

        if (showContrast) {
            contrast = new VcpSliderItem(
                this._ddcutilService, displayIds, CONTRAST_VCP_CODE,
                this._contrastIcon, _('Contrast of all displays')
            )
            this._section.addMenuItem(contrast)
        }

        this._fetchValues(_('All displays'), heading, brightness, contrast, generation)
    }

    async _fetchValues(label, heading, brightness, contrast, generation) {
        const hasBrightness = await brightness.fetchValue()
        const hasContrast = contrast ? await contrast.fetchValue() : false

        if (this._destroyed || generation !== this._generation) {
            return
        }

        if (!hasBrightness && !hasContrast) {
            devLog("[multi-display-adjustment] No adjustable features on display", label)

            heading.hide()
        }
    }
})

export { DisplaysToggle }
