# Troubleshooting

## Diagnosing issues

In case sliders are not visible or they don't change the brightness/contrast, check if the underlaying `ddcutil` works.

Following call checks if the displays are reachable

```bash
ddcutil detect
```

Following call adjusts the brightness of the first display to 50%

```bash
ddcutil -d 1 setvcp 10 50
```

In case `ddcutil` commands do not work:
- If they work with `sudo` but not without it, see [I2C device permissions](https://www.ddcutil.com/i2c_permissions/).
- Check the [ddcutil notes on specific monitors](https://github.com/rockowitz/ddcutil/wiki/Notes-on-Specific-Monitors).
- Search in [the past issues of ddcutil](https://github.com/rockowitz/ddcutil/issues) using your monitor model or the error message.
- Finally consider opening an issue in the `ddcutil` project.

In case `ddcutil` works then this extension is at fault. Create [an issue](https://github.com/samuelcecilio/multi-display-adjustment/issues) in this project. Please attach:

- Output from
  ```sh
  ddcutil detect
  ```

- Output from
  ```sh
  ddcutil-service --version  # or ~/.local/bin/ddcutil-service --version
  ```

- Output from 
  ```sh
  gdbus call --session --dest=com.ddcutil.DdcutilService --object-path /com/ddcutil/DdcutilObject --method com.ddcutil.DdcutilInterface.Detect 8
  ```

- The error message visible in Alt + F2, `lg`, _Extensions_, _Multi Display Adjustment_, _Show Errors_.

- Output from (optional):
  ```sh
  gdbus call --session --dest=org.gnome.Mutter.DisplayConfig --object-path /org/gnome/Mutter/DisplayConfig --method org.gnome.Mutter.DisplayConfig.GetResources
  gdbus call --session --dest=org.gnome.Mutter.DisplayConfig --object-path /org/gnome/Mutter/DisplayConfig --method org.gnome.Mutter.DisplayConfig.GetCurrentState
  ```

- Extra debug output from this extension (optional):

  1. Edit `~/.local/share/gnome-shell/extensions/multi-display-adjustment@cecilio.xyz/code-convenience.js` 
     ```diff
       function devLog(...args) {
         // Enable during development to see the logs in journalctl -xef
     -   // log(...args)
     +   log(...args)
       } 
     ```
  2. Disable this extension.
  3. Re-login.
  4. Call `journalctl -xef`
  5. Enable this extension.

  Just after enabling the extension, messages will appear in the terminal marked with `[multi-display-adjustment] ...` prefix. Copy them.

## Known issues

1. `ddcutil@2` (or maybe `ddcutil-service`) sometimes needs a bit of time after boot to calibrate. Calibration happens after the first use. That means that the first change of slider might change the actual brightness or contrast with a delay of about 10 seconds.
2. There are settings in displays that might lock the brightness control. Examples:
   - Iiyama's _Eco mode_ locks brightness at specific level. Just disable the _Eco mode_.
   - Eizo's ambient light sensor. With sensor enabled, the brightness slider still works, but not as you might expect. It sets the upper bound for brightness. Sensor can be disabled to get the manual control.
3. Extension relies on display's serial number to identify it. There are displays that don't report their serial number. Fallback mechanism is present, but not well tested. Feel free to open an issue for your display.
