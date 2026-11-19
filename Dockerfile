FROM python:3.10-slim

WORKDIR /app

# Dépendances système pour pymysql/cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements_backend.txt ./
RUN pip install --no-cache-dir -r requirements_backend.txt

COPY backend/ ./backend/
COPY models/  ./models/

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
