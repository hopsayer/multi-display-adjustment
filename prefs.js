// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw'
import Gio from 'gi://Gio'
import Gtk from 'gi://Gtk'

import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js'
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

import { supportsInline } from './inline-support.js'


// In the order of the choices in the enums of the slider-placement and inline-position keys
const PLACEMENTS = ['tile', 'inline']
const POSITIONS = ['below', 'above']

/**
 * Ties the switch `row` to the boolean setting `key`, except that a switch that
 * is greyed out shows as off, as an "on" would claim something that is not
 * there. The setting is left alone, so the switch is back as it was when it can
 * be used again. Returns a function to call after changing `row.sensitive`.
 */
function bindSwitch(window, settings, key, row) {
    const sync = () => {
        row.active = row.sensitive && settings.get_boolean(key)
    }

    row.connect('notify::active', () => {
        if (row.sensitive) {
            settings.set_boolean(key, row.active)
        }
    })

    const changedId = settings.connect(`changed::${key}`, sync)
    window.connect('close-request', () => settings.disconnect(changedId))

    sync()

    return sync
}

export default class MultiDisplayAdjustmentPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings()

        const group = new Adw.PreferencesGroup({ title: _('Sliders') })

        const groupDisplays = new Adw.SwitchRow({
            title: _('Adjust all external displays together')
        })
        const syncGroup = bindSwitch(window, settings, 'group-displays', groupDisplays)

        // Grouping joins external displays, so it takes two of them. The extension tells how many there are.
        const syncGroupAvailable = () => {
            const available = settings.get_int('external-display-count') >= 2

            groupDisplays.sensitive = available
            groupDisplays.subtitle = available
                ? _('One slider block controls all external displays')
                : _('Not available with fewer than two external displays')
            syncGroup()
        }

        const countChangedId = settings.connect('changed::external-display-count', syncGroupAvailable)
        window.connect('close-request', () => settings.disconnect(countChangedId))

        syncGroupAvailable()

        const showContrast = new Adw.SwitchRow({
            title: _('Show contrast sliders')
        })

        const syncContrast = bindSwitch(window, settings, 'show-contrast', showContrast)

        // The inline sliders only work on some shell versions, elsewhere there is nothing to choose
        if (supportsInline(Config.PACKAGE_VERSION)) {
            const placement = new Adw.ComboRow({
                title: _('Placement'),
                subtitle: _('Inline means among other Quick Settings sliders'),
                model: Gtk.StringList.new([_('Tile'), _('Inline')])
            })

            const positionSubtitle = _('Relative to GNOME\'s laptop display slider. No effect on PC.')

            const position = new Adw.ComboRow({
                title: _('Position'),
                subtitle: positionSubtitle,
                model: Gtk.StringList.new([_('Below'), _('Above')])
            })

            const syncPlacement = () => {
                const current = settings.get_string('slider-placement')

                placement.selected = PLACEMENTS.indexOf(current)
                position.selected = POSITIONS.indexOf(settings.get_string('inline-position'))
                position.sensitive = current === 'inline'
                position.subtitle = current === 'inline' ? positionSubtitle : _('Not available with tile placement')
                showContrast.sensitive = current === 'tile'
                syncContrast()

                // A greyed out switch alone is easy to miss, so say why it is
                showContrast.subtitle = current === 'tile' ? '' : _('Not available with inline placement')
            }

            syncPlacement()

            placement.connect('notify::selected', () => settings.set_string('slider-placement', PLACEMENTS[placement.selected]))
            position.connect('notify::selected', () => settings.set_string('inline-position', POSITIONS[position.selected]))

            const changedIds = ['slider-placement', 'inline-position']
                .map(key => settings.connect(`changed::${key}`, syncPlacement))
            window.connect('close-request', () => changedIds.forEach(id => settings.disconnect(id)))

            group.add(placement)
            group.add(position)
        }

        const limitMinimum = new Adw.SwitchRow({
            title: _('Minimum brightness of 1%'),
            subtitle: _('Some displays turn the backlight off at 0, leaving no way to see the slider')
        })
        settings.bind('limit-minimum-brightness', limitMinimum, 'active', Gio.SettingsBindFlags.DEFAULT)

        group.add(limitMinimum)
        group.add(showContrast)
        group.add(groupDisplays)

        const page = new Adw.PreferencesPage()
        page.add(group)
        window.add(page)
    }
}
