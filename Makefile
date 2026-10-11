.PHONY: help dev test test-backend test-frontend lint lint-backend lint-frontend build clean

help:
	@echo "Parikshit Engineering Commands:"
	@echo "  make dev            - Run backend and frontend in development mode"
	@echo "  make test           - Run full test suite (backend pytest + frontend vitest)"
	@echo "  make lint           - Run linters across backend and frontend"
	@echo "  make build          - Build production bundles (frontend & Docker images)"
	@echo "  make clean          - Remove ephemeral cache and test artifacts"

dev:
	bash scripts/run_dev.sh

test: test-backend test-frontend

test-backend:
	cd backend && python -m pytest -v --cov=app --cov-report=term-missing

test-frontend:
	cd frontend && npm test

lint: lint-backend lint-frontend

lint-backend:
	cd backend && ruff check .

lint-frontend:
	cd frontend && npm run lint

build:
	cd frontend && npm run build
	docker compose build

clean:
	rm -rf backend/.pytest_cache backend/.ruff_cache backend/.coverage
	rm -rf frontend/.next frontend/node_modules/.cache
	find . -type d -name "__pycache__" -exec rm -rf {} +
