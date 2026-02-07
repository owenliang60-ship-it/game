#!/usr/bin/env python3
"""
Organize character assets into 4-direction game-ready structure.

Strategy:
- 4 directions: south, west, north, east (east = horizontal mirror of west)
- Fallback chain for S: south → south-west → west
- Fallback chain for W: west → south-west → mirror(east)
- Fallback chain for N: north → north-west → north-east → west
- E is always mirrored from whatever W source was used

Animation mapping to game states:
- idle: breathing-idle
- attack: cross-punch (melee) / fireball (archer ranged)
- hit: taking-punch
- death: falling-back-death
- run: running-6-frames
- defense: crouching
- escape: running-slide
- idle-alt: fight-stance-idle-8-frames
"""

import json
import os
import shutil
from pathlib import Path
from PIL import Image

# === CONFIG ===
BASE = Path("/Users/owen/CC workspace/Game")
SRC_CHARS = BASE / "assets" / "characters"
OUT_DIR = BASE / "src" / "assets" / "characters"

# Animation name mapping: game_state -> pixellab_animation_name
ANIM_MAP_DEFAULT = {
    "idle": "breathing-idle",
    "attack": "cross-punch",
    "hit": "taking-punch",
    "death": "falling-back-death",
    "run": "running-6-frames",
    "defense": "crouching",
    "escape": "running-slide",
    "idle-alt": "fight-stance-idle-8-frames",
}

ANIM_MAP_ARCHER = {
    **ANIM_MAP_DEFAULT,
    "attack": "fireball",  # archer uses fireball for ranged attack
    "attack-melee": "cross-punch",  # archer doesn't have cross-punch, skip if missing
}

CHARACTERS = {
    "armored-warrior": ANIM_MAP_DEFAULT,
    "archer": ANIM_MAP_ARCHER,
    "knight": ANIM_MAP_DEFAULT,
}

# Direction fallback chains
FALLBACKS = {
    "south": ["south", "south-west", "west"],
    "west":  ["west", "south-west"],  # if all fail, try mirror east
    "north": ["north", "north-west", "north-east", "west"],
}


def find_source_dir(anim_base: Path, target_dir: str) -> tuple[Path | None, bool]:
    """
    Find source directory for a target direction using fallback chain.
    Returns (source_path, needs_mirror).
    For west: if fallback chain fails, tries mirroring east.
    """
    chain = FALLBACKS[target_dir]
    for candidate in chain:
        candidate_path = anim_base / candidate
        if candidate_path.is_dir() and any(candidate_path.glob("*.png")):
            return candidate_path, False

    # Special: for west, try mirror of east
    if target_dir == "west":
        east_path = anim_base / "east"
        if east_path.is_dir() and any(east_path.glob("*.png")):
            return east_path, True  # needs horizontal mirror

    return None, False


def mirror_image(src_path: Path, dst_path: Path):
    """Horizontally flip an image."""
    img = Image.open(src_path)
    mirrored = img.transpose(Image.FLIP_LEFT_RIGHT)
    mirrored.save(dst_path)


def copy_or_mirror_frames(src_dir: Path, dst_dir: Path, mirror: bool):
    """Copy (or mirror) all PNG frames from src to dst."""
    dst_dir.mkdir(parents=True, exist_ok=True)
    frames = sorted(src_dir.glob("*.png"))
    for frame in frames:
        dst_file = dst_dir / frame.name
        if mirror:
            mirror_image(frame, dst_file)
        else:
            shutil.copy2(frame, dst_file)
    return len(frames)


def process_rotation(char_name: str, manifest: dict):
    """Process standing rotation sprites (S, W, N, E=mirror W)."""
    rot_src = SRC_CHARS / char_name / "extracted" / "rotations"
    rot_dst = OUT_DIR / char_name / "rotations"

    if not rot_src.is_dir():
        # Try alternate location
        rot_src = SRC_CHARS / char_name / "rotations"

    if not rot_src.is_dir():
        print(f"  [WARN] No rotations found for {char_name}")
        return

    rot_dst.mkdir(parents=True, exist_ok=True)

    for direction in ["south", "west", "north"]:
        src_file = rot_src / f"{direction}.png"
        if not src_file.exists():
            # Try fallback
            for fallback in FALLBACKS[direction]:
                alt = rot_src / f"{fallback}.png"
                if alt.exists():
                    src_file = alt
                    print(f"  rotation/{direction}: using fallback {fallback}")
                    break
            else:
                print(f"  [WARN] rotation/{direction}: no source found")
                continue

        shutil.copy2(src_file, rot_dst / f"{direction}.png")

    # East = mirror of west source
    west_file = rot_dst / "west.png"
    if west_file.exists():
        mirror_image(west_file, rot_dst / "east.png")
    else:
        print(f"  [WARN] rotation/east: no west source to mirror")

    manifest["rotations"] = {
        "directions": ["south", "west", "north", "east"],
        "path": f"characters/{char_name}/rotations",
    }


def process_animations(char_name: str, anim_map: dict, manifest: dict):
    """Process all animations for a character."""
    anim_src_base = SRC_CHARS / char_name / "extracted" / "animations"
    anim_dst_base = OUT_DIR / char_name / "animations"
    manifest["animations"] = {}

    for game_state, pixellab_name in anim_map.items():
        anim_src = anim_src_base / pixellab_name
        if not anim_src.is_dir():
            print(f"  [SKIP] {game_state} ({pixellab_name}): not found")
            continue

        anim_info = {
            "source": pixellab_name,
            "directions": {},
        }

        # Process S, W, N
        w_source_dir = None
        w_mirrored = False

        for direction in ["south", "west", "north"]:
            src_dir, needs_mirror = find_source_dir(anim_src, direction)
            if src_dir is None:
                print(f"  [MISS] {game_state}/{direction}: no source available")
                continue

            src_name = src_dir.name
            if needs_mirror:
                src_name = f"mirror({src_name})"

            dst_dir = anim_dst_base / game_state / direction
            frame_count = copy_or_mirror_frames(src_dir, dst_dir, needs_mirror)

            fallback_note = ""
            if src_dir.name != direction and not needs_mirror:
                fallback_note = f" (from {src_dir.name})"
            elif needs_mirror:
                fallback_note = f" (mirrored from {src_dir.name})"

            anim_info["directions"][direction] = {
                "source": src_name,
                "frames": frame_count,
                "path": f"characters/{char_name}/animations/{game_state}/{direction}",
            }

            if direction == "west":
                w_source_dir = src_dir
                w_mirrored = needs_mirror

            status = "✓" if src_dir.name == direction else f"→{src_name}"
            print(f"  {game_state}/{direction}: {frame_count} frames {status}{fallback_note}")

        # East = mirror of whatever we used for west
        if w_source_dir is not None:
            dst_dir = anim_dst_base / game_state / "east"
            # If west was already a mirror of east, east = original east (no mirror)
            if w_mirrored:
                frame_count = copy_or_mirror_frames(w_source_dir, dst_dir, False)
            else:
                frame_count = copy_or_mirror_frames(w_source_dir, dst_dir, True)

            anim_info["directions"]["east"] = {
                "source": f"mirror(west)",
                "frames": frame_count,
                "path": f"characters/{char_name}/animations/{game_state}/east",
            }
            print(f"  {game_state}/east: {frame_count} frames (mirrored from west)")
        else:
            print(f"  [MISS] {game_state}/east: no west source to mirror")

        manifest["animations"][game_state] = anim_info

    # Count total frames per direction
    total_frames = {"south": 0, "west": 0, "north": 0, "east": 0}
    for state_info in manifest["animations"].values():
        for d, d_info in state_info["directions"].items():
            total_frames[d] += d_info["frames"]
    manifest["frame_totals"] = total_frames


def main():
    # Clean output directory
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    all_manifests = {}

    for char_name, anim_map in CHARACTERS.items():
        print(f"\n{'='*60}")
        print(f"Processing: {char_name}")
        print(f"{'='*60}")

        manifest = {"character": char_name}
        process_rotation(char_name, manifest)
        process_animations(char_name, anim_map, manifest)

        # Write per-character manifest
        manifest_path = OUT_DIR / char_name / "manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

        all_manifests[char_name] = manifest

        # Summary
        anim_count = len(manifest.get("animations", {}))
        total_dirs = sum(
            len(a["directions"])
            for a in manifest.get("animations", {}).values()
        )
        print(f"\n  Summary: {anim_count} animations, {total_dirs} direction slots filled")

    # Write master manifest
    master_path = OUT_DIR / "manifest.json"
    with open(master_path, "w") as f:
        json.dump(all_manifests, f, indent=2)

    print(f"\n{'='*60}")
    print("DONE! Output at: {OUT_DIR}")
    print(f"{'='*60}")

    # Final report
    print("\n== FINAL REPORT ==\n")
    for char_name, m in all_manifests.items():
        print(f"{char_name}:")
        for state, info in m.get("animations", {}).items():
            dirs = list(info["directions"].keys())
            missing = [d for d in ["south", "west", "north", "east"] if d not in dirs]
            status = "✅ 4/4" if not missing else f"⚠️  {4-len(missing)}/4 (missing: {', '.join(missing)})"
            print(f"  {state:15s} {status}")
        print()


if __name__ == "__main__":
    main()
