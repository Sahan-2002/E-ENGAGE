# Repository Summary: E-ENGAGE

Full-stack **E-ENGAGE** student engagement monitoring app.

- **Frontend (`frontend-ui/`)**: React dashboard with login, live session monitoring, trend charts, history, and settings.
- **Backend (`backend/`)**: FastAPI API for auth, session control, status polling, and history retrieval.
- **Core pipeline**:
  - Runs sessions in **15 cycles × 20s** (`session_runner.py`).
  - Collects **CV features** from webcam (`capture_manager.py`): face presence ratio, eye openness, blink rate, head pose deviation.
  - Collects **HCI features** (`track_input.py`): typing speed, mouse activity, idle time ratio.
  - Computes engagement via rule-based fusion (`fusion.py`) and optional XGBoost inference.
- **Data/model assets (`dataset/`, `backend/services/ml/models/`)**:
  - CSV logs for session history and training data.
  - Trained model file `engagement_xgb.pkl`.
  - Scripts for training, simulation, and feature analysis (`train_xgboost.py`, `simulate_dataset.py`, `analyze_features.py`).

In short: it is a prototype engagement-detection platform combining CV + interaction signals with a live web UI and CSV-based persistence.
