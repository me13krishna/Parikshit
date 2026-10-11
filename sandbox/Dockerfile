# Parikshit Sandbox Base Image
# Strictly isolated, non-root user, no network capability
FROM python:3.11-slim

# Install minimal test & lint packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    pytest==8.3.3 \
    coverage==7.6.4

# Create non-root unprivileged sandbox user
RUN useradd -m -u 1000 -s /bin/bash sandboxuser

WORKDIR /workspace
USER sandboxuser

CMD ["pytest"]
