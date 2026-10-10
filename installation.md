# Installation, in detail

The short version is in the [README](./README.md#installation). This page has what does not fit there.

## Build `ddcutil-service` from source

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
   git clone --branch v1.0.15 https://github.com/digitaltrails/ddcutil-service.git
   cd ddcutil-service
   make
   make install
   ```

   Service installs to `~/.local/share/dbus-1/services/com.ddcutil.DdcutilService.service` and  `~/.local/bin/ddcutil-service`. It is activated after the next login. You might have to reboot for `ddcutil` to detect your display.

   The packages for Debian and Ubuntu linked from the README are built from `1.0.14`. The methods the extension uses are the same in both versions.

## Install from a release

A new version shows up there once it passes review. To install a release before that, grab the
`.shell-extension.zip` of the
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

## Access to the displays

`ddcutil` reaches the displays through the `/dev/i2c-*` devices, which the `i2c-dev` kernel module
provides. Usually nothing has to be set up: `ddcutil` installs a udev rule that gives the logged-in
user access to the I2C buses of the graphics card. That rule does not match every graphics card,
though, and some distributions do not load `i2c-dev` at boot. If `ddcutil detect` finds the displays
only with `sudo`, or not at all, see [I2C device permissions](https://www.ddcutil.com/i2c_permissions/)
in the ddcutil documentation.
