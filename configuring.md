## Two ways to show the sliders

* **Tile** (default, see the screenshot) — a single _Displays_ entry in Quick Settings opens a menu
  where every display has a brightness and a contrast slider, each with its level as a number from
  0 to 100. The entry is hidden when there are no displays.
* **Inline** (see the screenshot) — no tile: every display gets a brightness slider among the sliders of
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

