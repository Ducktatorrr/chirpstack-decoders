#!/usr/bin/env python3
import os
import re

START_MARKER = "<!-- AUTOGEN START -->"
END_MARKER = "<!-- AUTOGEN END -->"
REPO_ROOT = "."
IGNORE_DIRS = {".git", ".github"}


def get_navigation():
    """Generate markdown for device navigation based on folder structure."""
    lines = []
    lines.append("## Documented Device Brands & Devices\n")
    for brand in sorted(os.listdir(REPO_ROOT)):
        brand_path = os.path.join(REPO_ROOT, brand)
        if os.path.isdir(brand_path) and brand not in IGNORE_DIRS:
            lines.append(f"### {brand}")
            subdirs = sorted(
                [
                    d
                    for d in os.listdir(brand_path)
                    if os.path.isdir(os.path.join(brand_path, d))
                ]
            )
            if not subdirs:
                lines.append(f"- No subdirectories found in {brand}.")
            for device in subdirs:
                device_path = os.path.join(brand_path, device)
                readme_path = os.path.join(device_path, "README.md")
                if os.path.isfile(readme_path):
                    lines.append(
                        f"- **[{device}]({brand}/{device}/README.md)**")
                else:
                    lines.append(
                        f"- **[{device}]({brand}/{device}/)**  "
                        f"*Note: No README available.*"
                    )
            lines.append("")
    return "\n".join(lines)


def update_readme():
    readme_file = os.path.join(REPO_ROOT, "README.md")
    with open(readme_file, "r") as f:
        content = f.read()

    new_nav = get_navigation()
    replacement = f"{START_MARKER}\n{new_nav}\n{END_MARKER}"

    pattern = re.compile(f"{START_MARKER}.*?{END_MARKER}", re.DOTALL)
    if pattern.search(content):
        new_content = pattern.sub(replacement, content)
    else:
        new_content = content + "\n" + replacement

    if new_content != content:
        with open(readme_file, "w") as f:
            f.write(new_content)
        print("README.md updated.")
    else:
        print("No changes made to README.md.")


if __name__ == "__main__":
    update_readme()
