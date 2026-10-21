# Testing

The extension lives inside GNOME Shell, which has no way to be run from a test suite, so what it
does in a real session is checked by hand. This page has the plans for that: what to run when a new
version of GNOME comes, and what to run for a change or a release. How to get the working tree into
the shell, the mock displays and the logs are in [dev.md](./dev.md).

## When to test

| Occasion | What to run |
| --- | --- |
| A new GNOME version is to be added to `shell-version` in `metadata.json` | [The new version procedure](#a-new-gnome-version), which is the quick pass and the plans below with the mock, and all of them with real displays if there are any |
| A release | The quick pass on the oldest and the newest supported version, and the plans of what changed |
| A change in the tile, the inline sliders or the preferences | The quick pass, and the plan of that part on the oldest and the newest supported version |
| A change in how displays are found, paired or written to | The quick pass, [order](#6-order-of-the-displays) and [displays and hot plugging](#7-displays-and-hot-plugging), with real displays |

`make check` and `make lint` come first, they do not need a session. Then the plans below.

## Setup

* **Versions.** The oldest and the newest in `shell-version`, and the one that is coming, in a
  virtual machine whose distribution has that GNOME. For a version that is not released yet, the
  beta or rolling images of the distributions that ship GNOME early, or the nightly image of
  GNOME OS, are the places to look. A version in the middle only needs the quick pass.
* **Session.** Wayland, and X11 too where the version still offers it. Note which, since the shell
  restarts in place only on X11, see _Reloading_ in [dev.md](./dev.md#reloading).
* **Displays.** In a virtual machine there is no DDC/CI, so build with mock displays, which is
  `make install MOCK_DISPLAYS_NUMBER=2`, then log out and back in and enable the extension, see
  [mock displays](./dev.md#mock-displays). The number of displays can be changed without a new
  login, by editing `mock.json` and disabling and enabling the extension. Real displays are a
  second pass on hardware, with `make install` and ddcutil-service installed, see
  [installation.md](./installation.md).
* **Logs.** Keep `make logs` open during every plan, and mark the lines that are new. A plan
  fails on a `JS ERROR`, on a warning about the extension, and on anything the shell prints about
  a destroyed or disposed object.

What the mock cannot do is in the list at the end of its section in [dev.md](./dev.md#mock-displays):
no on-screen display, and no hot plugging. Those parts are only checked with real displays.

## Quick pass

A few minutes. If one step fails, the version is not ready, and the plans are not worth running
until it is fixed.

- [ ] Install, log in, enable. No errors in the log.
- [ ] The tile _Displays_ is in Quick Settings and opens a menu with a brightness and a contrast
  slider for every display. With the mock, the second display has no contrast slider.
- [ ] Dragging a slider moves the number next to it, from 0 to 100.
- [ ] _Display Adjustment Settings_ at the bottom of the menu opens the preferences.
- [ ] In the preferences, _Placement_ set to _Inline_ takes the tile away and puts a brightness
  slider per display among the sliders of Quick Settings. Set to _Tile_ it goes back.
- [ ] Disable the extension: the tile and the inline sliders are gone, with no errors in the log.
  Enable it again and it all comes back.

## Plans

### 1. Enabling, disabling and sessions

Why: the extension adds items to the shell and has to take every one of them away.

- [ ] Disable and enable it five times in a row, in each placement. Nothing is left behind or
  doubled, there are no errors.
- [ ] Log out and in with each placement. Everything is where it should be, with no errors.
- [ ] Lock the screen and unlock it. The sliders still work.
- [ ] Suspend and resume. The sliders still work and the displays are not lost. With real
  displays, the first write after resume may be slow, see _Known issues_ in
  [troubleshooting.md](./troubleshooting.md#known-issues).
- [ ] Without ddcutil-service, the notification with _Open instructions_ appears once per session
  and the button opens the installation guide. To try it, move the D-Bus service file of
  ddcutil-service (`com.ddcutil.DdcutilService.service`, in a `dbus-1/services` directory) away,
  stop ddcutil-service and enable the extension. Put it back afterwards.

### 2. The tile

- [ ] The tile is hidden when there are no displays, and shows up when there are.
- [ ] The menu has the title _Displays_, then every display by its name as in Settings, with a
  brightness slider, and a contrast slider unless the display has none. Next to the name, in a
  fainter colour, is the connector, which tells apart two displays of the same model.
- [ ] _Show contrast sliders_ off hides the contrast sliders at once, on brings them back.
- [ ] _Display Adjustment Settings_ closes Quick Settings and opens the preferences.
- [ ] Keyboard: Tab and the arrows reach the sliders. With a slider selected, Left and Right
  move it by 10 points, and in a right-to-left language the other way round. Check this one on
  every version, since GNOME 51 changed how a slider takes the keys.
- [ ] A screen reader or the accessibility inspector reads the name of the button that opens the
  menu, on versions that have it (GNOME 49 and later).
- [ ] The contrast slider has an icon. GNOME 47 removed it from the icons of Adwaita, so the
  extension brings its own.

### 3. Inline sliders

- [ ] In _Inline_, every display has a brightness slider that looks and behaves like the slider of
  GNOME, and it spans both columns of Quick Settings like the sliders of GNOME do.
- [ ] _Position_ _Below_ puts them under the brightness slider of GNOME, _Above_ over it. Changing
  it moves them without logging in again.
- [ ] On a desktop, which has no brightness slider of its own, they go below the volume sliders,
  and _Position_ changes nothing.
- [ ] Log in with _Inline_ already set. The sliders end up next to the others and not at the
  bottom of Quick Settings, which is what happens when they are added before the shell has built
  its own. The extension waits up to five seconds for that, so also try a slow start, for example
  while the machine is busy.
- [ ] _Show contrast sliders_ is greyed out, and the tile's contrast sliders are not shown.
- [ ] The preferences are only reachable from the gear in the Extensions app, and open from there.

### 4. Moving the sliders

- [ ] Drag a slider fast from one end to the other. The display ends up at the last position and
  the extension does not freeze. DDC/CI writes are slow, and the last value has to win.
- [ ] _Minimum brightness of 1%_ on stops the brightness sliders at 1, and off lets them reach 0.
  Changing it takes effect without a new login. With real displays, check that a display that
  turns the backlight off at 0 can be brought back.
- [ ] With real displays, the on-screen display shows on the monitor that was changed. On GNOME 49
  and later on exactly the monitors that were, and on earlier ones either on one monitor or on
  all, so only check the first on 49 and later.
- [ ] With real displays, the value shown by a slider after a restart is what the display has.

### 5. Adjusting all displays together

- [ ] _Adjust all external displays together_ is greyed out with fewer than two external displays,
  and available with two or more. With the mock, change the number to see both.
- [ ] On, there is one brightness slider, and in the tile one contrast slider, for all displays.
  Until it is moved it shows the average of the levels, and turning the setting on does not write
  anything to the displays.
- [ ] Moving it sets the same level on every external display. The screen of a laptop is never
  included.
- [ ] Off brings the sliders of every display back, in both placements, without a new login.

### 6. Order of the displays

The displays are listed by their position in the arrangement of Mutter, the one in _Settings_,
_Displays_: from left to right, and top to bottom for the displays in one column. It does not
depend on the connectors or on the order the displays were plugged in. Both placements list them
this way, so check both. The mock puts its displays side by side, so with it only the first step
can be done, and the rest needs real displays.

- [ ] With the mock, _Mock display 1_ to _Mock display N_ come in this order, from the first to the
  last, in the tile and in the inline sliders.
- [ ] With two displays side by side, the one on the left is first. Swap them in _Settings_,
  _Displays_, and the sliders swap too, without a new login.
- [ ] With two displays in one column, the upper one is first.
- [ ] With a display on the left but lower than the other one, it is still first, since the
  position from left to right comes before the one from top to bottom.
- [ ] With a display above the screen of a laptop and _Position_ _Above_ in the inline sliders,
  the sliders read in the same order as the screens. The screen of the laptop is not in the list.
- [ ] A display turned off in _Settings_ is not in the list, and when it is turned on it comes back
  in its place.
- [ ] Mirrored displays share a position. Note the order they come in, and whether it stays the
  same after plugging one out and in.

### 7. Displays and hot plugging

Only with real displays, since the mock has neither.

- [ ] Plug in an external display while the session runs. It gets its sliders without a new login,
  and the number in the preferences follows.
- [ ] Unplug it. The sliders go away and nothing is left behind, and with the last one the tile
  hides.
- [ ] Two displays of the same model are told apart, each slider writes to its own display, and
  after plugging one out and in they are still paired the same way.
- [ ] A display that does not report a serial number still gets sliders. Note its model, since the
  fallback is not well tested, see _Known issues_ in
  [troubleshooting.md](./troubleshooting.md#known-issues).
- [ ] A display that does not report contrast has no contrast slider and nothing else is affected.
- [ ] Display names are the ones in the Settings of GNOME.
- [ ] Restart ddcutil-service while the session runs, and the sliders either keep working or come
  back after the next hot plug. Note which.

### 8. Different numbers of displays

With the mock, changing `mock.json` between the runs.

- [ ] One display: no difference between grouped and not, and _Adjust all external displays
  together_ is greyed out.
- [ ] Two displays: the second has no contrast slider.
- [ ] Five displays: the menu of the tile and the inline sliders still fit, scroll or wrap
  without being cut off, on a small screen too.

### 9. Settings from outside

- [ ] Every key in [configuring.md](./configuring.md#settings) can be set with `gsettings` and the
  sliders follow.
- [ ] The preferences window follows a change of the settings made while it is open, for example
  the greyed-out rows when _Placement_ changes.

## A new GNOME version

Do this in order, and write the result in the pull request that adds the version to
`shell-version`.

1. Read what the version changes for extensions, in
   [the notes on porting extensions](https://gjs.guide/extensions/) and in the release notes of
   GNOME Shell. Look for anything about Quick Settings, sliders, menus, the on-screen display and
   preferences, which is what the extension uses.
2. Get a session of it, see [Setup](#setup), and run the [quick pass](#quick-pass) with the mock.
   If it fails, look at the places below first.
3. Run every plan above with the mock, except those that need real displays.
4. Only after that add the version to `shell-version` in `metadata.json`. It is the one list of the
   versions the extension supports, nothing else in the sources has a list of its own. Run the
   plans that need real displays, if there are any to run them on.
5. Put the results in the pull request, in the form at the end of this page.

What to look at in the sources when a new version comes out. These are the places where the
extension depends on the inside of GNOME Shell, so where a new version is most likely to break it:

* `src/inline-sliders.js`, `insertNextToNativeSliders()`: the items `_brightness`, `_volumeInput`
  and `_volumeOutput` of `Main.panel.statusArea.quickSettings`, which are not public and which a
  version can rename or remove, and `quickSettings.menu.insertItemBefore()` with two columns.
  Without the items the sliders must still end up in Quick Settings. The same file waits for the
  shell to build its own items, with `WAIT_STEP_MS` and `MAX_WAIT_STEPS`, and `BrightnessSlider`
  extends `QuickSlider`.
* `src/displays-menu.js`: `DisplaysToggle` extends `QuickMenuToggle`, and the arguments of its
  `_init()` and the properties it sets, such as `menuButtonAccessibleName`, differ between
  versions. `vfunc_key_press_event()` moves the sliders with Left and Right, since how a `Slider`
  takes the keys changed in GNOME 51.
* `src/extension.js`: `SystemIndicator` and `addExternalIndicator()`, which put the tile in Quick
  Settings.
* `src/vcp-controller.js`, `showOsd()`: the on-screen display, which GNOME 49 can show on any set
  of monitors.
* `src/display-config-service.js`: the `DisplayConfig` D-Bus interface of Mutter and its
  `MonitorsChanged` signal. The answer of `GetCurrentState` is read by the position of the fields
  in it, so a field added in the middle breaks it silently.
* `src/prefs.js`: the Adwaita widgets the preferences window is built from.

What already differs between the versions, so that it is not taken for a bug:

| Version | Difference |
| --- | --- |
| GNOME 47 | The contrast icon is no longer in Adwaita, the extension brings its own |
| GNOME 49 | The button of the tile has an accessible name, and the on-screen display can be shown on any set of monitors |
| GNOME 50 | `gnome-shell --nested` is gone, `make nested` runs the shell headless |
| GNOME 51 | A slider only takes Left and Right while it has the focus, so the menu of the tile moves it itself |

## Results

Copy this into the pull request or the issue, once per version and session.

```markdown
GNOME Shell: 51 · session: Wayland · displays: mock (2) / real (model, connection)
Quick pass: pass
1 Sessions: pass · 2 Tile: pass · 3 Inline: pass · 4 Sliders: pass
5 Together: pass · 6 Order: pass (mock only) · 7 Displays: not run (mock)
8 Numbers: pass · 9 Outside: pass
Failed or odd: steps, what happened, the lines from the log
```
