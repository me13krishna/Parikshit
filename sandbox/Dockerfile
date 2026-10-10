# Parikshit Sandbox Base Image
# Strictly isolated, non-root user, no network capability
FROM python:3.11-slim

# Install minimal test & lint packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    pytest \
    coverage

# Create non-root unprivileged sandbox user
RUN useradd -m -u 1000 -s /bin/bash sandboxuser

WORKDIR /workspace
USER sandboxuser

CMD ["pytest"]
