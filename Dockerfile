FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run the app using gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8000", "server:app"]
