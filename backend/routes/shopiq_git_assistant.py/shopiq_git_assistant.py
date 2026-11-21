import subprocess
import json
import os
import sys

# ShopIQ Git Assistant
# Commit real changes safely and interactively.

ROOT = os.path.dirname(os.path.abspath(__file__))

def run(cmd, capture=False):
    return subprocess.run(
        cmd,
        cwd=ROOT,
        text=True,
        capture_output=capture
    )

def output(cmd):
    result = run(cmd, capture=True)
    return result.stdout.strip()

def main():
    if not os.path.isdir(os.path.join(ROOT, ".git")):
        print("Error: This folder is not a Git repository.")
        sys.exit(1)

    print("\n=== ShopIQ Git Assistant ===\n")

    status = output(["git", "status", "--short"])

    if not status:
        print("No changes found. Make actual code changes first.")
        return

    print("Changes detected:\n")
    print(status)

    # Detect package scripts
    package_file = os.path.join(ROOT, "package.json")

    if os.path.exists(package_file):
        with open(package_file, "r", encoding="utf-8") as f:
            package = json.load(f)

        scripts = package.get("scripts", {})

        checks = [
            ("lint", "npm run lint"),
            ("test", "npm test"),
            ("build", "npm run build")
        ]

        print("\nAvailable checks:")

        for name, command in checks:
            if name in scripts:
                print(f"  {command}")

        choice = input(
            "\nRun project checks before committing? (y/n): "
        ).lower().strip()

        if choice == "y":
            for name, command in checks:
                if name not in scripts:
                    continue

                answer = input(f"Run {command}? (y/n): ").lower()

                if answer == "y":
                    result = run(command.split())

                    if result.returncode != 0:
                        print(f"\n{command} failed.")
                        print("Commit cancelled.")
                        return

    # Stage changed files
    print("\nStaging changes...")

    result = run(["git", "add", "-A"])

    if result.returncode != 0:
        print("Unable to stage changes.")
        return

    staged = output(["git", "diff", "--cached", "--stat"])

    if not staged:
        print("No staged changes.")
        return

    print("\nStaged changes:\n")
    print(staged)

    # Commit type
    types = [
        "feat",
        "fix",
        "refactor",
        "perf",
        "test",
        "docs",
        "style",
        "chore"
    ]

    print("\nCommit types:")
    for i, t in enumerate(types, 1):
        print(f"{i}. {t}")

    selected = input("\nSelect type (1-8): ").strip()

    if not selected.isdigit() or not 1 <= int(selected) <= 8:
        print("Invalid selection.")
        return

    commit_type = types[int(selected) - 1]

    scope = input("Scope (optional, e.g. dashboard, products): ").strip()
    subject = input("Describe the actual changes: ").strip()

    if not subject:
        print("Commit message cannot be empty.")
        return

    if scope:
        message = f"{commit_type}({scope}): {subject}"
    else:
        message = f"{commit_type}: {subject}"

    print(f"\nCommit message:\n{message}")

    confirm = input("\nCommit these changes? (y/n): ").lower()

    if confirm != "y":
        print("Cancelled.")
        return

    result = run(["git", "commit", "-m", message])

    if result.returncode == 0:
        print("\nCommit created successfully!")
        print(output(["git", "log", "-1", "--oneline"]))
    else:
        print("\nCommit failed.")

if __name__ == "__main__":
    main()