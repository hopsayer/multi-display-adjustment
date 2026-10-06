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

export default class MultiDisplayAdjustmentPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings()

        const group = new Adw.PreferencesGroup({ title: _('Sliders') })

        const groupDisplays = new Adw.SwitchRow({
            title: _('Adjust all displays together'),
            subtitle: _('One slider block controls all external displays. No effect with one.')
        })
        settings.bind('group-displays', groupDisplays, 'active', Gio.SettingsBindFlags.DEFAULT)

        const showContrast = new Adw.SwitchRow({
            title: _('Show contrast sliders')
        })

        // While the switch is greyed out it shows as off, as an "on" would claim contrast sliders that are
        // not there. The setting is left alone, so the switch is back as it was when the sliders are in a tile.
        const syncContrast = () => {
            showContrast.active = showContrast.sensitive && settings.get_boolean('show-contrast')
        }

        showContrast.connect('notify::active', () => {
            if (showContrast.sensitive) {
                settings.set_boolean('show-contrast', showContrast.active)
            }
        })

        const contrastChangedId = settings.connect('changed::show-contrast', syncContrast)
        window.connect('close-request', () => settings.disconnect(contrastChangedId))

        syncContrast()

        // The inline sliders only work on some shell versions, elsewhere there is nothing to choose
        if (supportsInline(Config.PACKAGE_VERSION)) {
            const placement = new Adw.ComboRow({
                title: _('Placement'),
                subtitle: _('Inline means among other Quick Settings sliders'),
                model: Gtk.StringList.new([_('Tile'), _('Inline')])
            })

            const position = new Adw.ComboRow({
                title: _('Position'),
                subtitle: _('Relative to GNOME\'s laptop display slider. No effect on PC.'),
                model: Gtk.StringList.new([_('Below'), _('Above')])
            })

            const syncPlacement = () => {
                const current = settings.get_string('slider-placement')

                placement.selected = PLACEMENTS.indexOf(current)
                position.selected = POSITIONS.indexOf(settings.get_string('inline-position'))
                position.sensitive = current === 'inline'
                showContrast.sensitive = current === 'tile'
                syncContrast()

                // A greyed out switch alone is easy to miss, so say why it is
                showContrast.subtitle = current === 'tile' ? '' : _('Not available when the sliders are inline')
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
