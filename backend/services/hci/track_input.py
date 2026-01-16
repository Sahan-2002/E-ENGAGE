from pynput import keyboard, mouse
import time

key_count = 0
mouse_count = 0
last_activity_time = time.time()
start_time = time.time()

def on_key_press(key):
    global key_count, last_activity_time
    key_count += 1
    last_activity_time = time.time()

def on_mouse_move(x, y):
    global mouse_count, last_activity_time
    mouse_count += 1
    last_activity_time = time.time()

def on_mouse_click(x, y, button, pressed):
    global mouse_count, last_activity_time
    mouse_count += 1
    last_activity_time = time.time()

keyboard_listener = keyboard.Listener(on_press=on_key_press)
mouse_listener = mouse.Listener(
    on_move=on_mouse_move,
    on_click=on_mouse_click
)

keyboard_listener.start()
mouse_listener.start()

print("Tracking started... Press Ctrl+C to stop.")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    duration = time.time() - start_time
    idle_time = time.time() - last_activity_time

    print("\n--- HCI FEATURES ---")
    print(f"Typing speed (keys/min): {round((key_count / duration) * 60, 2)}")
    print(f"Mouse activity count: {mouse_count}")
    print(f"Idle time (seconds): {round(idle_time, 2)}")
