# Multi Display Adjustment GNOME shell extension

Offers sliders in Quick Settings to control the brightness and contrast of external displays
through DDC/CI, one set per display, under the display name that Settings shows. Moving a slider
shows the level in the on-screen display of the screens it adjusts, as GNOME does for a laptop's
own screen.

![The sliders in the tile, left, and inline, right](./screenshot.png)

> **This is a fork of [w8jcik/display-adjustment](https://gitlab.com/w8jcik/display-adjustment)** by Maciej Wójcik,
> focused on multi-monitor setups. All credit for the original extension goes to the upstream author;
> see the git history for authorship of individual changes and [CHANGELOG.md](./CHANGELOG.md) for how this
> fork diverges. It installs under a different UUID, so it can coexist with the original — but running
> both at once will give you duplicate sliders.

Extension relies on `ddcutil-service`. Installation process of `ddcutil-service` is quick and non-intrusive. `ddcutil-service` allows more responsive communication with the displays than calling `ddcutil`.

## Two ways to show the sliders

* **Tile** (the default, left above) — a single _Displays_ entry in Quick Settings opens a menu
  where every display has a brightness and a contrast slider, each with its level as a number from
  0 to 100. The entry is hidden when there are no displays.
* **Inline** (right above) — no tile: every display gets a brightness slider among the sliders of
  Quick Settings, right next to the brightness slider of GNOME, or below the volume sliders on a
  desktop, which has none. They look and behave like the slider of GNOME. Only brightness is shown
  this way.

## Settings

Preferences open from _Display Adjustment Settings_ at the bottom of the tile's menu, or from the
gear next to the extension in the Extensions app, which is the only way with inline sliders.

| Setting | Default | What it does |
| --- | --- | --- |
| **Placement** | Tile | _Tile_ or _Inline_, see above. |
| **Position** | Below | With inline sliders, whether they go _Below_ or _Above_ the brightness slider of GNOME. With a display above the laptop, _Above_ makes the sliders read in the same order as the screens. Has no effect on a desktop, which has no brightness slider of its own. |
| **Minimum brightness of 1%** | On | Keeps brightness from going below 1, since some displays turn the backlight off at 0 and leave no way to see the slider again. Turn it off to let the sliders go all the way down. |
| **Show contrast sliders** | On | Turn it off to keep only brightness. Greyed out with inline sliders, which only show brightness. |
| **Adjust all external displays together** | Off | One brightness slider, and one contrast slider in the tile, set the same level on every external display. Until a slider is moved, it shows the average of the current levels; turning this on does not write to the displays. The laptop's own screen is never included. Greyed out with fewer than two external displays. |

Settings can also be changed from a terminal, with the key names `slider-placement` (`tile` or
`inline`), `inline-position` (`below` or `above`), `limit-minimum-brightness`, `show-contrast` and
`group-displays`, for example

```bash
gsettings --schemadir ~/.local/share/gnome-shell/extensions/multi-display-adjustment@cecilio.xyz/schemas \
    set org.gnome.shell.extensions.multi-display-adjustment slider-placement inline
```

## Dependencies

* GNOME 46-50
* [_ddcutil-service_](https://github.com/digitaltrails/ddcutil-service)

## Installation

Install it from
[extensions.gnome.org](https://extensions.gnome.org/extension/10707/multi-display-adjustment/), in
the browser or with an app such as Extension Manager. It also needs _ddcutil-service_, see
[below](#installation-of-ddcutil-service).

Other ways to install the extension, for example from a release before it passes review, are in
[Install from a release](./installation.md#install-from-a-release).

## Installation of _ddcutil-service_

`ddcutil-service` can be installed from a package or built and installed from the source code.

### From a package

* [Ubuntu and Debian packages](https://gitlab.com/w8jcik/ddcutil-service.deb)
* [Arch AUR package](https://aur.archlinux.org/packages/ddcutil-service)
* [OpenSUSE packages](https://software.opensuse.org/package/ddcutil-service)

### Build by yourself

See [Build `ddcutil-service` from source](./installation.md#build-ddcutil-service-from-source).

### Access to the displays

See [Access to the displays](./installation.md#access-to-the-displays).

# Troubleshooting

* [Diagnosing issues](./troubleshooting.md#diagnosing-issues)
* [Known issues](./troubleshooting.md#known-issues)

# Thanks

* [@hopsayer](https://github.com/hopsayer), for the inline sliders and much of what came with them
  in 1.4.0.
* Everyone who reports an issue or tries a change on their own displays. See the
  [contributors](https://github.com/samuelcecilio/multi-display-adjustment/graphs/contributors) for
  everyone whose code is in here.

# License

This extension is distributed under the terms of the GNU General Public License, version 2 or later.

Copyright of the original work belongs to Maciej Wójcik and the contributors to
[w8jcik/display-adjustment](https://gitlab.com/w8jcik/display-adjustment). Modifications in this fork are
copyright their respective authors and released under the same license. See [COPYING](./COPYING).
