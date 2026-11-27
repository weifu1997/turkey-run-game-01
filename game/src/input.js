// Keyboard and mouse input. Keys are tracked as held sets plus one-frame
// "pressed" edges, so a jump fires once per press and a held key never
// double-fires. Clicks report their canvas position for menu buttons, and a
// click during play counts as a jump, so the game works with a mouse alone.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    this.clicks = [];
    this.anyKey = false;

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.held.add(event.code);
      this.pressed.add(event.code);
      this.anyKey = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
    });
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (canvas.height / rect.height);
      this.clicks.push({ x, y });
      this.anyKey = true;
    });
    window.addEventListener('blur', () => {
      this.held.clear();
    });
  }

  // Called at the end of each frame: edges live for exactly one frame.
  endFrame() {
    this.pressed.clear();
    this.clicks.length = 0;
  }

  jumpPressed() {
    return (
      this.pressed.has('Space') ||
      this.pressed.has('ArrowUp') ||
      this.pressed.has('KeyW') ||
      this.clicks.length > 0
    );
  }

  hideHeld() {
    return this.held.has('ArrowDown') || this.held.has('KeyS');
  }

  leftHeld() {
    return this.held.has('ArrowLeft') || this.held.has('KeyA');
  }

  rightHeld() {
    return this.held.has('ArrowRight') || this.held.has('KeyD');
  }

  startPressed() {
    return (
      this.pressed.has('Space') ||
      this.pressed.has('Enter') ||
      this.pressed.has('KeyR') ||
      this.clicks.length > 0
    );
  }

  restartPressed() {
    return this.pressed.has('KeyR') || this.pressed.has('Enter') || this.clicks.length > 0;
  }

  mutePressed() {
    return this.pressed.has('KeyM');
  }

  pausePressed() {
    return this.pressed.has('KeyP') || this.pressed.has('Escape');
  }
}
