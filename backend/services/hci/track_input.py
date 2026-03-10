"""
backend/services/hci/track_input.py
Tracks keyboard and mouse activity for a given duration.
Duration is now 20 seconds to match the session cycle length.
"""

from pynput import keyboard, mouse
import time


def track_input(duration=20):   # ← changed from 3 to 20
    key_count         = 0
    mouse_count       = 0
    last_activity_time= time.time()
    start_time        = time.time()

    def on_key_press(key):
        nonlocal key_count, last_activity_time
        key_count += 1
        last_activity_time = time.time()

    def on_mouse_move(x, y):
        nonlocal mouse_count, last_activity_time
        mouse_count += 1
        last_activity_time = time.time()

    def on_mouse_click(x, y, button, pressed):
        nonlocal mouse_count, last_activity_time
        mouse_count += 1
        last_activity_time = time.time()

    keyboard_listener = keyboard.Listener(on_press=on_key_press)
    mouse_listener    = mouse.Listener(
        on_move=on_mouse_move,
        on_click=on_mouse_click
    )

    keyboard_listener.start()
    mouse_listener.start()

    print(f"⌨️  HCI tracking for {duration}s...")
    time.sleep(duration)

    keyboard_listener.stop()
    mouse_listener.stop()

    total_time   = time.time() - start_time
    idle_time    = time.time() - last_activity_time
    idle_time_ratio = min(1.0, max(0.0, idle_time / total_time)) if total_time > 0 else 0.0
    typing_speed = (key_count / total_time) * 60 if total_time > 0 else 0

    result = {
        "typing_speed":   round(typing_speed, 2),
        "mouse_activity": mouse_count,
        "idle_time":      round(idle_time, 2),
        "idle_time_ratio": round(idle_time_ratio, 4),
    }

    print(f"⌨️  HCI result: {result}")
    return result


if __name__ == "__main__":
    print(track_input(duration=20))
