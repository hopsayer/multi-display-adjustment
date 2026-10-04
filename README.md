# Multi Display Adjustment GNOME shell extension

Offers sliders to control external displays' brightness and contrast through DDC/CI.

A single _Displays_ entry in Quick Settings opens a menu where every connected display has its own
brightness and contrast sliders, under the display name that Settings shows. Each slider shows the
level as a number from 0 to 100. Brightness stops at 1, since some displays turn the backlight off at
0 and leave no way to see the slider again.

The menu's _Display Adjustment Settings_ item (or the gear in the Extensions app) opens preferences:

* **Adjust all displays together** — one brightness slider and one contrast slider set the same
  percentage on every display. Until the slider is moved, it shows the average of the current
  levels; it does not write to the displays just by turning the option on.
* **Show contrast sliders** — turn this off to keep only brightness.
* **Placement** — _In a tile_ is the menu described above. _Next to the brightness slider_ drops the
  tile and puts a brightness slider for every display next to the brightness slider of GNOME, or
  below the volume sliders on a desktop, which has none. Only brightness is shown that way, and the
  preferences are then reached through the gear in the Extensions app. This choice is only offered
  on GNOME 50 for now, the version it was checked on; elsewhere the tile is used.
* **Position** — with the sliders next to the one of GNOME, whether they go below it or above it.
  With a display above the laptop, above makes the sliders read in the same order as the screens.

![](./screenshot.png)

> **This is a fork of [w8jcik/display-adjustment](https://gitlab.com/w8jcik/display-adjustment)** by Maciej Wójcik,
> focused on multi-monitor setups. All credit for the original extension goes to the upstream author;
> see the git history for authorship of individual changes and [CHANGELOG.md](./CHANGELOG.md) for how this
> fork diverges. It installs under a different UUID, so it can coexist with the original — but running
> both at once will give you duplicate sliders.

Extension relies on `ddcutil-service`. Installation process of `ddcutil-service` is quick and non-intrusive. `ddcutil-service` allows more responsive communication with the displays than calling `ddcutil`.

## Dependencies

* GNOME 46-50
* [_ddcutil-service_](https://github.com/digitaltrails/ddcutil-service)

## Installation

This extension is not on [extensions.gnome.org](https://extensions.gnome.org) yet, so it is installed
from a package built here. Grab the `.shell-extension.zip` of the
[latest release](https://github.com/samuelcecilio/multi-display-adjustment/releases/latest) and

```bash
gnome-extensions install --force multi-display-adjustment@cecilio.xyz.shell-extension.zip
```

Log out and back in, then enable it with

```bash
gnome-extensions enable multi-display-adjustment@cecilio.xyz
```

To build the package from a clone instead, run `make install` and log out and back in.
[dev.md](./dev.md) covers working on the extension itself.

## Installation of _ddcutil-service_

`ddcutil-service` can be installed from a package or built and installed from the source code.

### From a package

* [Ubuntu and Debian packages](https://gitlab.com/w8jcik/ddcutil-service.deb)
* [Arch AUR package](https://aur.archlinux.org/packages/ddcutil-service)
* [OpenSUSE packages](https://software.opensuse.org/package/ddcutil-service)

### Build by yourself

1. __Install dependencies `ddcutil`, `libddcutil` and `glib`__  

   On Ubuntu and Debian

   ```bash
   sudo apt install build-essential git ddcutil libddcutil-dev libglib2.0-dev
   ```

   On Fedora (and likely other RPM based distributions)

   ```bash
   sudo dnf install make gcc git ddcutil libddcutil-devel glib2-devel
   ```

2. __Build and install the service__

   ```bash
   git clone --branch v1.0.14 https://github.com/digitaltrails/ddcutil-service.git
   cd ddcutil-service
   make
   make install
   ```

   Service installs to `~/.local/share/dbus-1/services/com.ddcutil.DdcutilService.service` and  `~/.local/bin/ddcutil-service`. It is activated after the next login. You might have to reboot for `ddcutil` to detect your display.

### Access to the displays

`ddcutil` reaches the displays through the `/dev/i2c-*` devices, which the `i2c-dev` kernel module
provides. Usually nothing has to be set up: `ddcutil` installs a udev rule that gives the logged-in
user access to the I2C buses of the graphics card. That rule does not match every graphics card,
though, and some distributions do not load `i2c-dev` at boot. If `ddcutil detect` finds the displays
only with `sudo`, or not at all, see [I2C device permissions](https://www.ddcutil.com/i2c_permissions/)
in the ddcutil documentation.

# Troubleshooting

* [Diagnosing issues](./troubleshooting.md#diagnosing-issues)
* [Known issues](./troubleshooting.md#known-issues)

# License

This extension is distributed under the terms of the GNU General Public License, version 2 or later.

Copyright of the original work belongs to Maciej Wójcik and the contributors to
[w8jcik/display-adjustment](https://gitlab.com/w8jcik/display-adjustment). Modifications in this fork are
copyright their respective authors and released under the same license. See [COPYING](./COPYING).
