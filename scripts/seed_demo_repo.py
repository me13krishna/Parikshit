"""
Seed script to create a standalone sample Python demo repository in data/demo/
This repository serves as the baseline for testing the Codebase Mentor,
AST indexing, Citation Verifier, Adversarial Battle, and Self-Healing loop.
"""
import os
from pathlib import Path

DEMO_DIR = Path("./data/demo/calculator_app")

SAMPLE_FILES = {
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

def seed():
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    for filename, content in SAMPLE_FILES.items():
        file_path = DEMO_DIR / filename
        file_path.write_text(content, encoding="utf-8")
        print(f"Created {file_path}")
    print(f"Seeded demo repository successfully at {DEMO_DIR.resolve()}")

if __name__ == "__main__":
    seed()
