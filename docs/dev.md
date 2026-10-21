# Development

## Clone

```bash
git clone git@github.com:samuelcecilio/multi-display-adjustment.git ~/Code/multi-display-adjustment
```

`make` on its own lists every target mentioned below.

What to check by hand in a real session, before a release and when a new GNOME version comes, is in
[testing.md](./testing.md).

## Getting the working tree into the shell

There are two ways, and they cannot be combined. `make status` tells which one is in place.

### Symlink

```bash
make link
```

Edits in the working tree are picked up by the next shell restart, with no need to rebuild.
`make link` links `src/`, the part of the working tree that is the extension, and compiles
`src/schemas/` first: `getSettings()` looks for `schemas/gschemas.compiled` in the extension
directory, which for a symlink is `src/`. Re-run `make schemas` after
changing a `.gschema.xml` file.

The compiled schema can also be exercised without logging out:

```bash
gsettings --schemadir src/schemas set org.gnome.shell.extensions.multi-display-adjustment group-displays true
gsettings --schemadir src/schemas set org.gnome.shell.extensions.multi-display-adjustment show-contrast false
```

> [!WARNING]
> While this symlink exists, never run `gnome-extensions install --force`. It empties the extension
> directory before unpacking and follows the symlink while doing so, which **deletes the contents of
> `src/`**. `make install` checks for the symlink and refuses to run, but the plain
> `gnome-extensions` command does not.
>
> A symlinked extension does not show up in `gnome-extensions list`, so check with `make status` or
> `ls -l ~/.local/share/gnome-shell/extensions/` instead.

Undone with `make unlink`.

### Package

Installs a copy, which is what a user ends up with. Run `make uninstall` first if the symlink is in
place.

```bash
make install
```

## Reloading

On Wayland the shell cannot be restarted in place, so a full log out and back in is needed to pick
up changed extension code. On X11, `Alt`+`F2` followed by `r` is enough.

The extension is enabled with

```bash
make enable
```

which only works once the shell has seen the extension, so it has to happen after the first log in.

`make logs` follows what the shell writes to the journal. The extension's own messages only show up
once the `log` call in `devLog` is uncommented.

## Nested session

```bash
make nested
```

Useful for catching errors at startup without logging out. The displays of that session are virtual
and have no DDC/CI, so no sliders appear in it — the extension finds no matching display and hides
its tile. Errors from the extension appear on the standard error of the command.

It runs GNOME Shell headless, because GNOME Shell 50 dropped both `--nested` and
`MUTTER_DEBUG_DUMMY_MODE_SPECS`. Displays are simulated by repeating `--virtual-monitor`.

`make check` parses the sources, which catches a syntax error without starting a shell at all.
`make nested` compiles the GSettings schema first, because `getSettings()` throws if
`schemas/gschemas.compiled` is missing.

## Mock displays

To try the sliders on a machine with no DDC/CI display, or in a virtual machine, build the
extension with mock displays instead of the real ones:

```bash
make install MOCK_DISPLAYS_NUMBER=3
```

It builds `dist/multi-display-adjustment@cecilio.xyz-mock.shell-extension.zip` and installs it. In
that package the extension uses three mock displays instead of what Mutter and ddcutil-service
report, and it is called "Multi Display Adjustment (mock)". Their brightness and contrast live in
memory, and every write is logged as `Mock display 1: VCP 0x10 set to 42`. The second display does
not report contrast, so that a display without it is covered too.

The mock files are put in a copy of `src/` while the package is built, so the working tree
stays as it is, and `make pack`, `make install` and the release without the variable are built as
before, with a mock-loader.js that does nothing. It does not work with `make link`, for the same
reason, and `make install` refuses to install over the symlink.

The number of displays is in `mock.json` in the extension directory, and it is read every time the
extension is enabled, so it can be changed without building again or logging in again:

```bash
echo '{ "displays": 5 }' > ~/.local/share/gnome-shell/extensions/multi-display-adjustment@cecilio.xyz/mock.json
gnome-extensions disable multi-display-adjustment@cecilio.xyz
gnome-extensions enable multi-display-adjustment@cecilio.xyz
```

In a virtual machine, clone the repository there and run `make install MOCK_DISPLAYS_NUMBER=2`, or
copy the package and run `gnome-extensions install --force` on it, then log out and back in and
enable the extension. `make install` without the variable puts the real one back.

`make nested MOCK_DISPLAYS_NUMBER=2` starts the headless shell of the previous section with the mock
build in a temporary data directory, so the installed extension is not touched. That session has no
screen to look at, so it shows that the extension starts and what it does with the displays, and to
see the sliders, use a whole session as above.

What the mock does not do: the connectors are made up, so no on-screen display appears, and displays
are not plugged in or out while it runs. The extension also writes `external-display-count`, like it
always does, to the settings of the user who runs it.

## Lint

```bash
make lint
```

builds the package and runs [Shexli](https://pypi.org/project/shexli/) on it, the analyzer behind
the warnings on the extensions.gnome.org review page. It fails unless Shexli reports the package as
clean.

Shexli runs through `uvx`, so it needs [uv](https://docs.astral.sh/uv/) and no Python setup. With
mise:

```bash
mise use -g uv
```

Another way of running Shexli goes in `SHEXLI`, for example `make lint SHEXLI=shexli` for one
installed with `uv tool install shexli`. The default pins `tree-sitter` below 0.26, which makes
Shexli 0.2.1 crash.

## Dbus examples

This extension is using a Mutter interface called `DisplayConfig`

Consider example of three displays
  * `DP-1` `1920x1200@59.950`
  * `DP-2` `2560x1440@59.951`
  * `HDMI-2` `1680x1050@59.954`

Example retrieval of display configuration from Mutter using GJS

```js
// gdbus call --session --dest=org.gnome.Mutter.DisplayConfig --object-path /org/gnome/Mutter/DisplayConfig --method org.gnome.Mutter.DisplayConfig.GetResources

const displayResources = await proxy.GetResourcesAsync()
console.log("[multi-display-adjustment] Display resources", displayResources)
const [rawSerial, crtcs, outputs, modes] = displayResources

// gdbus call --session --dest=org.gnome.Mutter.DisplayConfig --object-path /org/gnome/Mutter/DisplayConfig --method org.gnome.Mutter.DisplayConfig.GetCurrentState

const currentState = await proxy.GetCurrentStateAsync()
console.log("[multi-display-adjustment] Current displays state", currentState)
const [rawSerial, monitors, logicalMonitors, properties] = currentState
```

The human readable name of a display, the one Settings shows, comes from the `display-name` property
of a monitor, which is the third member of each entry of `monitors`.

```bash
gdbus call --session --dest=org.gnome.Mutter.DisplayConfig \
  --object-path /org/gnome/Mutter/DisplayConfig \
  --method org.gnome.Mutter.DisplayConfig.GetCurrentState | tr ',' '\n' | grep display-name
```

Reading and writing a VCP feature of a display, `0x10` (16) is brightness and `0x12` (18) is contrast.
The last two members of the reply are a status and a message, `DDCRC_REPORTED_UNSUPPORTED` being what
a display answers for a feature it does not have.

```bash
gdbus call --session --dest=com.ddcutil.DdcutilService \
  --object-path /com/ddcutil/DdcutilObject \
  --method com.ddcutil.DdcutilInterface.Detect 0

gdbus call --session --dest=com.ddcutil.DdcutilService \
  --object-path /com/ddcutil/DdcutilObject \
  --method com.ddcutil.DdcutilInterface.GetVcp 1 "" 16 0
```

## Logging

* Use `log` procedure to log messages, or uncomment the call in `devLog` to get the messages the
  extension already emits.
* Use `journalctl -f` to see messages.
