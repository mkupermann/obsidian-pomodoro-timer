const { Plugin, PluginSettingTab, Setting, Notice, Modal } = require('obsidian');

const DEFAULT_SETTINGS = {
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    showNotifications: true,
    playSound: true
};

class PomodoroWidget {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = null;
        this.isDragging = false;
        this.isOpen = false;
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        // Create floating widget
        this.containerEl = document.body.createDiv({ cls: 'pomodoro-widget' });

        // Load saved position or use default
        const savedPos = this.plugin.widgetPosition || { top: 100, left: 100 };
        this.containerEl.style.top = savedPos.top + 'px';
        this.containerEl.style.left = savedPos.left + 'px';

        const contentEl = this.containerEl.createDiv({ cls: 'pomodoro-content' });

        // Header (draggable)
        const header = contentEl.createDiv({ cls: 'pomodoro-header' });

        this.titleEl = header.createEl('div', {
            text: '🍅',
            cls: 'pomodoro-title'
        });

        const closeBtn = header.createEl('button', {
            text: '×',
            cls: 'pomodoro-close'
        });
        closeBtn.onclick = () => this.close();

        // Make header draggable
        this.makeDraggable(header);

        // Session counter
        this.sessionEl = contentEl.createDiv({ cls: 'pomodoro-session' });
        this.updateSessionDisplay();

        // Timer display (large and centered)
        this.timerEl = contentEl.createDiv({
            cls: 'pomodoro-timer',
            text: this.formatTime(this.plugin.timeRemaining)
        });

        // Controls (compact icon buttons)
        const controls = contentEl.createDiv({ cls: 'pomodoro-controls' });

        this.startBtn = controls.createEl('button', {
            text: '▶',
            cls: 'pomodoro-btn',
            attr: { title: 'Start' }
        });
        this.startBtn.onclick = () => this.plugin.start();

        this.pauseBtn = controls.createEl('button', {
            text: '⏸',
            cls: 'pomodoro-btn',
            attr: { title: 'Pause' }
        });
        this.pauseBtn.onclick = () => this.plugin.pause();
        this.pauseBtn.disabled = true;

        this.resetBtn = controls.createEl('button', {
            text: '↻',
            cls: 'pomodoro-btn',
            attr: { title: 'Reset' }
        });
        this.resetBtn.onclick = () => this.plugin.reset();

        // Update interval
        this.updateInterval = window.setInterval(() => this.update(), 100);
    }

    makeDraggable(header) {
        let offsetX, offsetY;

        header.style.cursor = 'move';

        header.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            offsetX = e.clientX - this.containerEl.offsetLeft;
            offsetY = e.clientY - this.containerEl.offsetTop;

            const onMouseMove = (e) => {
                if (!this.isDragging) return;
                this.containerEl.style.left = (e.clientX - offsetX) + 'px';
                this.containerEl.style.top = (e.clientY - offsetY) + 'px';
            };

            const onMouseUp = () => {
                this.isDragging = false;
                // Save position
                this.plugin.widgetPosition = {
                    top: parseInt(this.containerEl.style.top),
                    left: parseInt(this.containerEl.style.left)
                };
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    update() {
        this.timerEl.setText(this.formatTime(this.plugin.timeRemaining));
        this.updateSessionDisplay();

        // Update button states
        if (this.plugin.isRunning) {
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.startBtn.style.opacity = '0.5';
            this.pauseBtn.style.opacity = '1';
        } else {
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.startBtn.style.opacity = '1';
            this.pauseBtn.style.opacity = '0.5';
        }

        // Update colors based on mode
        if (this.plugin.mode === 'work') {
            this.timerEl.style.color = '#e74c3c';
            this.containerEl.style.borderColor = '#e74c3c';
        } else {
            this.timerEl.style.color = '#2ecc71';
            this.containerEl.style.borderColor = '#2ecc71';
        }
    }

    updateSessionDisplay() {
        this.sessionEl.setText(`Session ${this.plugin.completedSessions + 1} of ${this.plugin.settings.sessionsBeforeLongBreak}`);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    close() {
        if (this.updateInterval) {
            window.clearInterval(this.updateInterval);
        }
        if (this.containerEl) {
            this.containerEl.remove();
        }
        this.isOpen = false;
        this.plugin.widget = null;
    }
}

class PomodoroTimerPlugin extends Plugin {
    async onload() {
        console.log('Pomodoro Timer: Loading...');

        await this.loadSettings();

        this.mode = 'work';
        this.isRunning = false;
        this.timeRemaining = this.settings.workDuration * 60;
        this.totalTime = this.settings.workDuration * 60;
        this.completedSessions = 0;
        this.timer = null;
        this.widget = null;
        this.widgetPosition = { top: 100, left: 100 };

        // Add ribbon icon
        this.ribbonIcon = this.addRibbonIcon('clock', 'Pomodoro Timer', () => {
            this.openTimer();
        });
        this.updateRibbonIcon();

        // Add commands
        this.addCommand({
            id: 'open-pomodoro',
            name: 'Open Pomodoro Timer',
            callback: () => this.openTimer()
        });

        this.addCommand({
            id: 'start-pomodoro',
            name: 'Start/Pause Timer',
            callback: () => {
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.start();
                }
            }
        });

        this.addCommand({
            id: 'reset-pomodoro',
            name: 'Reset Timer',
            callback: () => this.reset()
        });

        this.addSettingTab(new PomodoroSettingTab(this.app, this));

        // Update ribbon every second
        this.ribbonUpdateInterval = window.setInterval(() => {
            this.updateRibbonIcon();
        }, 1000);
    }

    openTimer() {
        if (!this.widget) {
            this.widget = new PomodoroWidget(this.app, this);
        }
        this.widget.open();
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.ribbonIcon.addClass('pomodoro-running');

        this.timer = window.setInterval(() => {
            this.timeRemaining--;

            if (this.timeRemaining <= 0) {
                this.complete();
            }
        }, 1000);

        new Notice('Pomodoro started!');
    }

    pause() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.ribbonIcon.removeClass('pomodoro-running');

        if (this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
        }

        new Notice('Pomodoro paused');
    }

    reset() {
        this.pause();

        if (this.mode === 'work') {
            this.timeRemaining = this.settings.workDuration * 60;
            this.totalTime = this.settings.workDuration * 60;
        } else {
            const isLongBreak = this.completedSessions % this.settings.sessionsBeforeLongBreak === 0;
            const breakDuration = isLongBreak ? this.settings.longBreak : this.settings.shortBreak;
            this.timeRemaining = breakDuration * 60;
            this.totalTime = breakDuration * 60;
        }

        new Notice('Timer reset');
    }

    skip() {
        this.complete();
    }

    complete() {
        this.pause();

        if (this.mode === 'work') {
            // Work session completed
            this.completedSessions++;

            if (this.settings.showNotifications) {
                new Notice('🍅 Work session complete! Time for a break.', 5000);
            }

            if (this.settings.playSound) {
                this.playSound();
            }

            // Switch to break
            const isLongBreak = this.completedSessions % this.settings.sessionsBeforeLongBreak === 0;
            this.mode = isLongBreak ? 'long-break' : 'short-break';
            const breakDuration = isLongBreak ? this.settings.longBreak : this.settings.shortBreak;
            this.timeRemaining = breakDuration * 60;
            this.totalTime = breakDuration * 60;

            if (this.settings.autoStartBreaks) {
                setTimeout(() => this.start(), 2000);
            }

        } else {
            // Break completed
            if (this.settings.showNotifications) {
                new Notice('☕ Break complete! Ready to focus?', 5000);
            }

            if (this.settings.playSound) {
                this.playSound();
            }

            // Switch to work
            this.mode = 'work';
            this.timeRemaining = this.settings.workDuration * 60;
            this.totalTime = this.settings.workDuration * 60;

            if (this.settings.autoStartPomodoros) {
                setTimeout(() => this.start(), 2000);
            }
        }
    }

    playSound() {
        // Simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Failed to play sound:', error);
        }
    }

    updateRibbonIcon() {
        if (this.isRunning) {
            const mins = Math.floor(this.timeRemaining / 60);
            const secs = this.timeRemaining % 60;
            this.ribbonIcon.setAttribute('aria-label',
                `Pomodoro: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
            );
        } else {
            this.ribbonIcon.setAttribute('aria-label', 'Pomodoro Timer');
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        if (this.timer) {
            window.clearInterval(this.timer);
        }
        if (this.ribbonUpdateInterval) {
            window.clearInterval(this.ribbonUpdateInterval);
        }
        console.log('Pomodoro Timer: Unloaded');
    }
}

class PomodoroSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Pomodoro Timer Settings' });

        new Setting(containerEl)
            .setName('Work Duration')
            .setDesc('Length of work sessions (minutes)')
            .addSlider(slider => slider
                .setLimits(1, 60, 1)
                .setValue(this.plugin.settings.workDuration)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.workDuration = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Short Break')
            .setDesc('Length of short breaks (minutes)')
            .addSlider(slider => slider
                .setLimits(1, 30, 1)
                .setValue(this.plugin.settings.shortBreak)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.shortBreak = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Long Break')
            .setDesc('Length of long breaks (minutes)')
            .addSlider(slider => slider
                .setLimits(5, 60, 1)
                .setValue(this.plugin.settings.longBreak)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.longBreak = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Sessions Before Long Break')
            .setDesc('Number of work sessions before a long break')
            .addSlider(slider => slider
                .setLimits(2, 10, 1)
                .setValue(this.plugin.settings.sessionsBeforeLongBreak)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.sessionsBeforeLongBreak = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Behavior' });

        new Setting(containerEl)
            .setName('Auto-start Breaks')
            .setDesc('Automatically start break timer after work session')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoStartBreaks)
                .onChange(async (value) => {
                    this.plugin.settings.autoStartBreaks = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-start Pomodoros')
            .setDesc('Automatically start work timer after break')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoStartPomodoros)
                .onChange(async (value) => {
                    this.plugin.settings.autoStartPomodoros = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Notifications' });

        new Setting(containerEl)
            .setName('Show Notifications')
            .setDesc('Display notification when timer completes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showNotifications)
                .onChange(async (value) => {
                    this.plugin.settings.showNotifications = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Play Sound')
            .setDesc('Play sound when timer completes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.playSound)
                .onChange(async (value) => {
                    this.plugin.settings.playSound = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = PomodoroTimerPlugin;
