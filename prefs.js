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
            subtitle: _('One pair of sliders sets the same level on every display')
        })
        settings.bind('group-displays', groupDisplays, 'active', Gio.SettingsBindFlags.DEFAULT)

        const showContrast = new Adw.SwitchRow({
            title: _('Show contrast sliders')
        })
        settings.bind('show-contrast', showContrast, 'active', Gio.SettingsBindFlags.DEFAULT)

        // The inline sliders only work on some shell versions, elsewhere there is nothing to choose
        if (supportsInline(Config.PACKAGE_VERSION)) {
            const placement = new Adw.ComboRow({
                title: _('Placement'),
                subtitle: _('Next to the brightness slider of GNOME, only brightness is shown'),
                model: Gtk.StringList.new([_('In a tile'), _('Next to the brightness slider')])
            })

            const position = new Adw.ComboRow({
                title: _('Position'),
                model: Gtk.StringList.new([_('Below the brightness slider'), _('Above the brightness slider')])
            })

            const syncPlacement = () => {
                const current = settings.get_string('slider-placement')

                placement.selected = PLACEMENTS.indexOf(current)
                position.selected = POSITIONS.indexOf(settings.get_string('inline-position'))
                position.sensitive = current === 'inline'
                showContrast.sensitive = current === 'tile'
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

        group.add(groupDisplays)
        group.add(showContrast)

        const page = new Adw.PreferencesPage()
        page.add(group)
        window.add(page)
    }
}
