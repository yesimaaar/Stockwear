"""Organiza imágenes en divisiones train/ y val/."""
from __future__ import annotations

import argparse
import pathlib
import random
import shutil
from typing import Sequence

VALID_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def collect_images(directory: pathlib.Path) -> list[pathlib.Path]:
    return [p for p in directory.iterdir() if p.suffix.lower() in VALID_EXTENSIONS]


def split_and_copy(
    source: pathlib.Path,
    destination: pathlib.Path,
    train_ratio: float,
    seed: int,
) -> None:
    random.seed(seed)
    for class_dir in source.iterdir():
        if not class_dir.is_dir():
            continue
        images = collect_images(class_dir)
        if not images:
            continue
        random.shuffle(images)
        pivot = int(len(images) * train_ratio)
        subsets: Sequence[tuple[str, list[pathlib.Path]]] = (
            ("train", images[:pivot]),
            ("val", images[pivot:]),
        )
        for split_name, files in subsets:
            target_dir = destination / split_name / class_dir.name
            target_dir.mkdir(parents=True, exist_ok=True)
            for img in files:
                shutil.copy2(img, target_dir / img.name)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=pathlib.Path)
    parser.add_argument("--dest", default=pathlib.Path("data"), type=pathlib.Path)
    parser.add_argument("--train-ratio", default=0.8, type=float)
    parser.add_argument("--seed", default=42, type=int)
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"No se encontró la ruta fuente: {args.source}")
    args.dest.mkdir(parents=True, exist_ok=True)

    split_and_copy(args.source, args.dest, args.train_ratio, args.seed)
    print("Dataset organizado en", args.dest)


if __name__ == "__main__":
    main()
