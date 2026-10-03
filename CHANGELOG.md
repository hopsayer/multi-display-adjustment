# Changelog

## Fork point

This project forked from [w8jcik/display-adjustment](https://gitlab.com/w8jcik/display-adjustment)
at commit `d0857f0` ("Correct dependency range", 2026-04-07), which was released upstream as `0.0.8`.

The full history before that commit is the upstream author's work and is preserved in this
repository — use `git log` and `git blame` for per-line authorship.

## Unreleased

### Added

* A _Placement_ setting. Besides the tile, the brightness sliders can sit right below the brightness
  slider of GNOME, like its own sliders, with no tile and no extra menu level. It is offered on GNOME
  50 only, the version it was checked on, and the tile is used on any other.

### Changed

* Reading and writing a display's brightness or contrast moved out of the menu item that shows the
  slider into `VcpController`, so that another widget can use it. The sliders behave as before.

## 1.3.0 (2026-10-02)

### Added

* Moving a slider shows the level in the on-screen display of the displays it adjusts, as GNOME does
  for the brightness of a built-in display.

## 1.2.4 (2026-10-02)

### Changed

* The cancellation checks call `matches()` directly instead of through optional chaining, as the
  extensions.gnome.org review asked. Only a `GLib.Error` reaches them.

## 1.2.3 (2026-10-02)

### Changed

* Reads of slider values still in flight are cancelled with a `Gio.Cancellable` when the slider is
  destroyed, in place of the `_destroyed` and `_generation` guards the extensions.gnome.org review
  asked to remove.

## 1.2.2 (2026-09-30)

### Fixed

* Disabling the extension left the menu of the Displays tile behind, with its sliders, because the
  shell does not destroy the menu of a quick toggle along with the toggle. Every lock and unlock of
  the screen added one more hidden menu. The menu is now destroyed with the tile.
* Cleanup runs in named `destroy` handlers, which the extensions.gnome.org linter (EGO-L-002,
  EGO-L-003, EGO-L-005) recognizes.

## 1.2.1 (2026-09-30)

### Changed

* The package credits the original author. Every source file carries a copyright and license
  header, and the description says the extension is a fork of Display Adjustment.
* Code the extension never called is gone, among it the sleep multiplier methods of the
  ddcutil-service interface. The style is consistent across files and comments are shorter.

### Fixed

* Locking the screen right after login could leave the `MonitorsChanged` handler connected to a
  proxy of the previous session, which then failed on the next display change.
* Without ddcutil-service, the notification about it came back on every display change. It now
  shows once, and startup errors are logged instead of left as unhandled promise rejections.
* `make check` fails when `gjs` is missing, instead of reporting that there are no syntax errors.

## 1.2.0 (2026-09-30)

### Changed

* Brightness sliders stop at 1 instead of 0. Some displays turn the backlight off at brightness 0,
  which leaves the screen black with no way to see the slider that would bring it back
  ([#2](https://github.com/samuelcecilio/multi-display-adjustment/issues/2)). A display already at 0
  is shown as it is, and is only written to once the slider moves. Contrast still goes down to 0.

## 1.1.1 (2026-09-16)

### Changed

* `disable()` is synchronous. The shell does not await it, and nothing inside needed a promise.
* Slider items disconnect their `notify::value` handler when destroyed. The slider dies with the
  item anyway, but the extensions.gnome.org linter (EGO-L-003) wants the disconnect to be explicit.

## 1.1.0 (2026-09-16)

### Added

* Displays can be adjusted together. One brightness slider and one contrast slider apply the same
  percentage to every connected display.
* Each slider shows the current level as a number from 0 to 100.
* Contrast sliders can be hidden, leaving only brightness.
* A preferences window holds those two options. The Quick Settings menu opens it through a
  _Display Adjustment Settings_ item.

### Changed

* Writes are coalesced: one DDC write stays in flight per display, and the last position of a drag
  always arrives. Values used to be quantized to twentieths of the range, which made the on-screen
  number disagree with what was written and often swallowed Left/Right key presses.

## 1.0.0 (2026-08-14)

### Added

* Displays are labelled. Every display appears under the name Settings shows for it, taken from
  Mutter's `display-name` property, with its connector next to it.
* Controls that a display does not support are left out instead of showing a slider that does
  nothing, which is common for contrast.

### Fixed

* The contrast slider shows a contrast icon again. It asked for `camera-iso-symbolic`, which GNOME
  47 dropped when it trimmed Adwaita's legacy icons, so on GNOME 47 and later the slider was
  labelled with the missing-image placeholder. The extension now ships its own icon.

### Changed

* Sliders moved from the Quick Settings grid into a menu behind a single *Displays* entry. Two
  unlabelled sliders per display filled the panel and gave no way to tell displays apart; a slider
  in the grid has no room for a title.
* A pair of identical displays gets a pair of controls. Displays are identified by model and serial,
  which two displays of the same model can share, and one of them used to be dropped.
* Displays sharing a column are ordered top to bottom, and mirrored displays no longer end up
  without a position.
* `dist.sh` builds the package with `gnome-extensions pack`, so the layout is the one the GNOME
  Extensions website expects, and `./dist.sh --install` installs it. It refuses to install over the
  development symlink, which `gnome-extensions install --force` would follow while emptying the
  directory, deleting the working tree.
* A `Makefile` drives the development loop: `make install` or `make link` to get the working tree
  into the shell, plus `enable`, `status`, `uninstall`, `check`, `nested` and `logs`. `make link` and
  `make uninstall` check whether they are looking at a symlink or at an installed copy before
  deleting anything.
* Tagged releases publish the package through GitHub Actions.

* Renamed to *Multi Display Adjustment* and moved to a new UUID
  (`multi-display-adjustment@cecilio.xyz`) so it can be installed alongside the original.
* Repository moved to https://github.com/samuelcecilio/multi-display-adjustment; issue and
  documentation links updated accordingly.
* Log prefix changed from the original `display-adjustment` tag to `multi-display-adjustment` so the
  two extensions can be told apart in `journalctl`.
