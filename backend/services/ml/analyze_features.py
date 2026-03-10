import argparse
import math
import os
from typing import List

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


DEFAULT_DATASET = os.path.join("dataset", "training", "engagement_dataset.csv")
DEFAULT_OUTPUT = os.path.join("dataset", "training", "engagement_feature_boxplots.png")
LABEL_CANDIDATES = ["label", "Label", "engagement_label", "class"]
FEATURES = [
    "FacePresenceRatio",
    "EyeOpenness",
    "BlinkRate",
    "HeadPoseDeviation",
    "TypingSpeed",
    "MouseActivity",
    "IdleTimeRatio",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Plot engaged vs disengaged feature boxplots from engagement dataset."
    )
    parser.add_argument("--csv", default=DEFAULT_DATASET, help="Path to engagement_dataset.csv")
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help="Output image path for the generated figure",
    )
    parser.add_argument(
        "--score-threshold",
        type=float,
        default=60.0,
        help="Threshold used only when deriving labels from engagement_score",
    )
    parser.add_argument(
        "--show",
        action="store_true",
        help="Display the figure interactively in addition to saving it",
    )
    return parser.parse_args()


def resolve_label_column(df: pd.DataFrame, score_threshold: float) -> str:
    for column in LABEL_CANDIDATES:
        if column in df.columns:
            return column

    if "engagement_score" in df.columns:
        derived = df["engagement_score"].apply(
            lambda x: "Engaged" if float(x) >= score_threshold else "Disengaged"
        )
        df["label"] = derived
        return "label"

    raise ValueError(
        "No label column found. Add one of: "
        f"{LABEL_CANDIDATES}, or include engagement_score to auto-derive labels."
    )


def resolve_features(df: pd.DataFrame) -> List[str]:
    available = [feature for feature in FEATURES if feature in df.columns]
    if not available:
        raise ValueError(
            "None of the expected feature columns were found. "
            f"Expected: {FEATURES}"
        )
    return available


def main():
    args = parse_args()

    if not os.path.isfile(args.csv):
        raise FileNotFoundError(f"CSV not found: {args.csv}")

    df = pd.read_csv(args.csv)
    if df.empty:
        raise ValueError(f"CSV is empty: {args.csv}")

    label_col = resolve_label_column(df, args.score_threshold)
    features = resolve_features(df)

    df = df[df[label_col].isin(["Engaged", "Disengaged"])].copy()
    if df.empty:
        raise ValueError("No rows with label values 'Engaged' or 'Disengaged'.")

    sns.set_theme(style="whitegrid")

    n_features = len(features)
    n_cols = 3
    n_rows = math.ceil(n_features / n_cols)
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(5 * n_cols, 4 * n_rows))
    axes = axes.flatten() if n_features > 1 else [axes]

    palette = {"Engaged": "#1f77b4", "Disengaged": "#d62728"}

    for i, feature in enumerate(features):
        ax = axes[i]
        sns.boxplot(
            data=df,
            x=label_col,
            y=feature,
            order=["Engaged", "Disengaged"],
            palette=palette,
            ax=ax,
        )
        ax.set_title(feature)
        ax.set_xlabel("")
        ax.set_ylabel(feature)

    for j in range(n_features, len(axes)):
        fig.delaxes(axes[j])

    fig.suptitle("Feature Distributions: Engaged vs Disengaged", fontsize=14, y=1.02)
    fig.tight_layout()

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    fig.savefig(args.output, dpi=300, bbox_inches="tight")
    print(f"Saved boxplots to: {args.output}")

    if args.show:
        plt.show()


if __name__ == "__main__":
    main()
