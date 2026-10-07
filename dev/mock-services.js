// SPDX-FileCopyrightText: 2026 Samuel Cecilio
// SPDX-License-Identifier: GPL-2.0-or-later
//
// Development only: not part of the package. See "Mock displays" in dev.md.

const BRIGHTNESS_VCP_CODE = 0x10
const CONTRAST_VCP_CODE = 0x12

// Brightness each mock display starts at, in turn, so that they can be told apart
const START_BRIGHTNESS = [30, 70, 50]

/**
 * Replaces what the two services find with `count` mock displays side by side,
 * and keeps their brightness and contrast in memory, so that the sliders can be
 * tried on a machine with no DDC/CI display, or in a virtual machine.
 *
 * The services are changed in place, so whatever holds them uses the mock too.
 * The second display does not report contrast, to see a display without it.
 *
 * The connectors are made up, so no on-screen display shows for them.
 */
function installMockServices(displayConfigService, ddcutilService, count) {
    const displays = Array.from({ length: count }, (_, index) => {
        const model = 'Mock display'
        const serial = String(index + 1)

        return {
            connector: `MOCK-${index + 1}`,
            model,
            serial,
            name: `Mock display ${index + 1}`,
            width: 1920,
            height: 1080,
            enabled: true,
            x: index * 1920,
            y: 0,
            key: `${model}#${serial}`
        }
    })

    // What each display reports, by display id and VCP code
    const values = new Map()

    displays.forEach((display, index) => {
        const displayId = index + 1

        values.set(`${displayId}#${BRIGHTNESS_VCP_CODE}`, { current: START_BRIGHTNESS[index % START_BRIGHTNESS.length], max: 100 })

        if (index !== 1) {
            values.set(`${displayId}#${CONTRAST_VCP_CODE}`, { current: 75, max: 100 })
        }
    })

    log(`[multi-display-adjustment] Using ${count} mock display(s) instead of the real ones`)

    displayConfigService.init = async () => {}
    displayConfigService.connectMonitorsChanged = () => {}
    displayConfigService.disconnectMonitorsChanged = () => {}
    displayConfigService.getDisplays = async () => displays.map(display => ({ ...display }))

    ddcutilService.init = async () => {}

    ddcutilService.getDisplays = async () => {
        const ddcDisplays = new Map()

        displays.forEach((display, index) => {
            ddcDisplays.set(display.key, [{ displayId: index + 1, model: display.model, serial: display.serial }])
        })

        return ddcDisplays
    }

    ddcutilService.getVcp = async (displayId, vcpCode) => {
        const value = values.get(`${displayId}#${vcpCode}`)

        return value === undefined ? null : { ...value }
    }

    ddcutilService.setVcp = async (displayId, vcpCode, newValue) => {
        const value = values.get(`${displayId}#${vcpCode}`)

        if (value !== undefined) {
            value.current = newValue
        }

        log(`[multi-display-adjustment] Mock display ${displayId}: VCP 0x${vcpCode.toString(16)} set to ${newValue}`)
    }
}

export { installMockServices }
