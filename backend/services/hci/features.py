# backend/services/hci/features.py
try:
    from services.hci.track_input import track_input
except Exception:
    from backend.services.hci.track_input import track_input

def get_hci_features():
    return track_input()
