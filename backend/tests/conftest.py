import pytest
import pytest_asyncio
from pathlib import Path
from app.core.config import settings
from app.db.database import init_db

@pytest_asyncio.fixture(autouse=True)
async def isolate_test_environment(tmp_path, monkeypatch):
    """
    Isolates each test's database and storage directory to tmp_path.
    Prevents polluting real data/ directory and ensures LLM_PROVIDER=mock.
    """
    test_data_dir = tmp_path / "test_data"
    test_data_dir.mkdir(parents=True, exist_ok=True)
    test_db = test_data_dir / "test.db"

    repo_root = Path(__file__).resolve().parent.parent.parent
    demo_src = repo_root / "data" / "demo" / "calculator_app"

    # Create a local demo directory inside test_data
    demo_dir = test_data_dir / "demo"
    demo_dir.mkdir(parents=True, exist_ok=True)
    calc_file = demo_dir / "calculator.py"
    calc_file.write_text(
        '"""Calculator module."""\n\nclass Calculator:\n    def __init__(self):\n        self.history = []\n    def add(self, a: float, b: float) -> float:\n        return a + b\n    def subtract(self, a: float, b: float) -> float:\n        return a - b\n    def divide(self, a: float, b: float) -> float:\n        if b == 0:\n            raise ValueError("Division by zero")\n        return a / b\n',
        encoding="utf-8"
    )
    test_calc_file = demo_dir / "test_calculator.py"
    test_calc_file.write_text(
        'import pytest\nfrom calculator import Calculator\n\ndef test_add():\n    c = Calculator()\n    assert c.add(2, 3) == 5\n',
        encoding="utf-8"
    )

    monkeypatch.setattr(settings, "PARIKSHIT_DATA_DIR", str(test_data_dir))
    monkeypatch.setattr(settings, "PARIKSHIT_DB_URL", f"sqlite:///{test_db.resolve()}")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "mock")
    monkeypatch.setattr(settings, "PARIKSHIT_ENV", "development")
    monkeypatch.setattr(settings, "AUTH_DISABLED", True)
    monkeypatch.setattr(
        settings,
        "PARIKSHIT_LOCAL_SOURCE_ROOTS",
        f"{test_data_dir},{demo_dir},{demo_src},{repo_root / 'data'}"
    )

    await init_db()
    yield
