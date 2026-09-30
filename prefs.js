// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw'
import Gio from 'gi://Gio'

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'


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

        group.add(groupDisplays)
        group.add(showContrast)

        const page = new Adw.PreferencesPage()
        page.add(group)
        window.add(page)
    }
}
