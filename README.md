# Pomodoro Timer

A simple, beautiful Pomodoro timer for Obsidian. Stay focused with the time-tested Pomodoro Technique - work in 25-minute intervals with short breaks.

## Features

- 🍅 **Floating Widget** - Compact, draggable timer that stays on top
- ⏱️ **Customizable Intervals** - Set your own work/break durations
- 🔔 **Notifications** - Get notified when sessions complete
- 🔊 **Sound Alerts** - Audio notification at session end
- 📊 **Session Tracking** - Track completed Pomodoro sessions
- ⚡ **Auto-start** - Optionally auto-start breaks and work sessions
- 🎨 **Visual Feedback** - Color-coded for work (red) and breaks (green)

## Usage

1. Click the ribbon icon (🕐) or run command "Open Pomodoro Timer"
2. A floating widget appears - drag it anywhere on screen
3. Click ▶ to start, ⏸ to pause, ↻ to reset
4. Widget position is saved automatically

### Keyboard Shortcuts

Add custom hotkeys in Obsidian Settings → Hotkeys:
- "Start/Pause Timer"
- "Reset Timer"
- "Open Pomodoro Timer"

## The Pomodoro Technique

1. Work for 25 minutes (1 Pomodoro) 🍅
2. Take a 5-minute break ☕
3. After 4 Pomodoros, take a 15-minute long break 🌴

## Settings

### Timer Durations
- **Work Duration** - Length of work sessions (1-60 min, default: 25)
- **Short Break** - Length of short breaks (1-30 min, default: 5)
- **Long Break** - Length of long breaks (5-60 min, default: 15)
- **Sessions Before Long Break** - Number of work sessions before long break (default: 4)

### Behavior
- **Auto-start Breaks** - Automatically start break timer after work
- **Auto-start Pomodoros** - Automatically start work timer after break

### Notifications
- **Show Notifications** - Display Obsidian notice when timer completes
- **Play Sound** - Play audio alert when timer completes

## Tips

- Position the widget in a corner where it doesn't block your work
- Enable auto-start for a fully automated flow
- Disable notifications if you prefer silent tracking
- Use with Live Statistics plugin to track your writing progress!

## License

MIT License - see LICENSE file

## Author

Michael Kupermann

## Credits

- Built with [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Inspired by the [Pomodoro Technique](https://francescocirillo.com/pages/pomodoro-technique) by Francesco Cirillo
