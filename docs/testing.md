# Testing on other GNOME Shell versions

The tile is the original interface, and the one used wherever the inline sliders are not offered.
The inline sliders find their place through parts of Quick Settings that are private to the shell
and change between releases, so they are only offered on the versions listed in
`INLINE_SHELL_VERSIONS` in `inline-support.js`. A version goes on that list once somebody has run
the checks below on it. This page holds the checks and the record of what has been checked.

## What you need

* A machine running the GNOME Shell version to check. `gnome-shell --version` says which one. A live
  USB image of a distribution that ships it is enough, nothing has to be installed on the disk.
* At least one external display that answers DDC/CI. `ddcutil detect` has to work without `sudo`,
  and `ddcutil-service` has to be installed, as the README describes.
* A laptop to check how the inline sliders sit next to the built-in display's slider, or a desktop
  to check how they sit without one. Both are worth a run, but one is enough to start.
* A second external display for the grouping check. It can be skipped, say so in the notes.

Put the extension in with `make install` (see [dev.md](../dev.md)), log out and back in, then
`make enable`. Keep `make logs` open in a terminal, it should stay free of errors from the extension
during all of the checks. On a machine where the shell may update extensions by itself, prefer
`make install` to `make link`, as `dev.md` explains.

## Checks for every version: the tile

- [ ] The _Displays_ entry shows up in Quick Settings, and opening it lists every display by name.
- [ ] The number on a slider matches `ddcutil getvcp 10` for that display.
- [ ] Moving the brightness slider changes the display, shows the on-screen display on it, and the
      display ends where the slider does after a quick drag.
- [ ] Dragging to the bottom stops at 1, and with _Minimum brightness of 1%_ off it goes down to 0.
- [ ] _Show contrast sliders_ adds and removes the contrast sliders. A display that does not report
      contrast has none.
- [ ] With two external displays and _Adjust all external displays together_, one slider moves both.
      With fewer than two, the switch is greyed out and says why.
- [ ] Disabling and enabling the extension a few times, and unplugging and plugging the display,
      leaves the sliders as they were, with no errors in the log.
- [ ] The preferences window opens, and its rows and subtitles fit and read well.

## Checks for the inline sliders

Only on a version that is meant to get them. In the preferences, set _Placement_ to _Inline_.

- [ ] The tile is gone, and a brightness slider per display sits right below the brightness
      slider of GNOME on a laptop, or below the volume slider on a desktop.
- [ ] _Position_ set to _Above_ puts them right above the brightness slider of GNOME, and _Below_
      puts them back, without logging out. On a desktop it changes nothing.
- [ ] The sliders keep their place after logging out and in three times, after a reboot, after
      disabling and enabling the extension, and after unplugging and plugging the display.
- [ ] Moving a slider changes the display and shows the on-screen display, like in the tile.
- [ ] With two external displays and grouping on, there is one slider for both, below or above the
      one of GNOME. With one, nothing changes.
- [ ] _Show contrast sliders_ and _Position_ are greyed out when they do not apply, and say why.
- [ ] Setting _Placement_ back to _Tile_ brings the tile back.

## Checks for a version that is not meant to get them

On a version that is not in `INLINE_SHELL_VERSIONS`, the inline sliders must stay out of the way:

- [ ] The preferences have no _Placement_ and no _Position_ row.
- [ ] After setting the key by hand, the tile is still used:

```bash
gsettings --schemadir ~/.local/share/gnome-shell/extensions/multi-display-adjustment@cecilio.xyz/schemas \
    set org.gnome.shell.extensions.multi-display-adjustment slider-placement inline
```

Set it back to `tile` afterwards.

## What has been checked

| GNOME Shell | Tile | Inline | Checked | Notes |
|---|---|---|---|---|
| 46 | | | | |
| 47 | | | | |
| 48 | | | | |
| 49 | | | | |
| 50 | yes | yes | 2026-10 | One external display, on a laptop |
| 51 | | | | Not declared in `metadata.json` yet |

When a version passes the inline checks, add its number to `INLINE_SHELL_VERSIONS`, change the line
about GNOME 50 in the README and in the changelog entry of the _Placement_ setting, and fill in its
row here. If a check fails, note which one in the row and open an issue with the part of `make logs`
around it.
