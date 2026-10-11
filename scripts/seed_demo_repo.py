"""
Seed script to create standalone sample demo repositories in data/demo/
1. data/demo/calculator_app: Math operations and history tracking.
2. data/demo/task_queue: In-memory priority queue with deliberate boundary bug.
"""
import sys
from pathlib import Path

CALC_DIR = Path("./data/demo/calculator_app")
QUEUE_DIR = Path("./data/demo/task_queue")

CALC_FILES = {
    "calculator.py": '''"""Core Calculator implementation."""

class Calculator:
    def __init__(self):
        self.history = []

    def add(self, a: float, b: float) -> float:
        """Adds two numbers and stores in history."""
        res = a + b
        self.history.append(("add", a, b, res))
        return res

    def subtract(self, a: float, b: float) -> float:
        """Subtracts b from a."""
        res = a - b
        self.history.append(("sub", a, b, res))
        return res

    def divide(self, a: float, b: float) -> float:
        """Divides a by b. Raises ValueError on zero division."""
        if b == 0:
            raise ValueError("Division by zero is not allowed.")
        res = a / b
        self.history.append(("div", a, b, res))
        return res
''',
    "test_calculator.py": '''import pytest
from calculator import Calculator

def test_add():
    c = Calculator()
    assert c.add(2, 3) == 5
    assert len(c.history) == 1

def test_subtract():
    c = Calculator()
    assert c.subtract(5, 2) == 3

def test_divide():
    c = Calculator()
    assert c.divide(10, 2) == 5

def test_divide_zero():
    c = Calculator()
    with pytest.raises(ValueError):
        c.divide(10, 0)
''',
    "README.md": '''# Calculator Demo Repository
Seed repository for Parikshit Grounded Codebase Mentor and Adversarial Battle verification.
'''
}

QUEUE_FILES = {
    "queue_service.py": '''"""Task Priority Queue service with intentional edge case."""

from typing import List, Dict, Any, Optional

class PriorityTaskQueue:
    def __init__(self):
        self.tasks: List[Dict[str, Any]] = []

    def push(self, task_id: str, priority: int = 1) -> None:
        """Adds a task with priority (higher integer = higher priority)."""
        self.tasks.append({"id": task_id, "priority": priority})
        self.tasks.sort(key=lambda x: x["priority"], reverse=True)

    def pop(self) -> Optional[Dict[str, Any]]:
        """Pops the highest priority task. Bug: raises IndexError if empty."""
        # Intended behavior: return None or raise IndexError if empty
        if not self.tasks:
            raise IndexError("Queue is empty")
        return self.tasks.pop(0)

    def size(self) -> int:
        return len(self.tasks)
''',
    "test_queue_service.py": '''import pytest
from queue_service import PriorityTaskQueue

def test_push_and_pop():
    q = PriorityTaskQueue()
    q.push("task-low", priority=1)
    q.push("task-high", priority=10)
    top = q.pop()
    assert top["id"] == "task-high"
    assert q.size() == 1

def test_empty_pop():
    q = PriorityTaskQueue()
    with pytest.raises(IndexError):
        q.pop()
''',
    "README.md": '''# Task Queue Demo Service
Secondary non-calculator seed repository demonstrating generalized AST analysis,
Adversarial QA boundary discovery, and Self-Healing loop on priority queues.
'''
}

def seed_repo(target_dir: Path, files: dict, name: str) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    for filename, content in files.items():
        file_path = target_dir / filename
        file_path.write_text(content, encoding="utf-8")
    print(f"[*] Successfully seeded {name} at {target_dir}")

def main():
    seed_repo(CALC_DIR, CALC_FILES, "Calculator Demo")
    seed_repo(QUEUE_DIR, QUEUE_FILES, "Priority Queue Demo")
    print("[+] All demo repositories successfully seeded and ready for ingestion.")

if __name__ == "__main__":
    main()
