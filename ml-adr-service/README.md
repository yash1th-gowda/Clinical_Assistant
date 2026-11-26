# Experimental ADR Prediction Service

A small Flask prototype that demonstrates drug-pair interaction classification and simple allergy matching.

> **Clinical safety warning:** This service is not clinically validated and must not be used to prescribe, discontinue, or modify medication. Its bundled Random Forest model is trained on a tiny synthetic dataset. Predictions and confidence values are demonstrations, not medical evidence.

## What is implemented

- Flask `GET /health` endpoint
- Flask `POST /predict-adr` endpoint
- Drug-pair classification using a Random Forest model
- Basic string and drug-class allergy matching
- Request validation and a 1 MB request-size limit
- Optional browser CORS allowlist through `ADR_ALLOWED_ORIGINS`

Age-based risk scoring and production-grade clinical validation are not implemented.

## Run locally

Requires Python 3.9+.

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

The service listens on port 6001 by default. Set `PORT` to override it. Debug mode is disabled by default; set `FLASK_DEBUG=true` only for local development.

## API

### Health

```http
GET /health
```

### Predict

```http
POST /predict-adr
Content-Type: application/json
```

Example request:

```json
{
  "medications": [
    { "name": "warfarin" },
    { "name": "aspirin" }
  ],
  "patient": {
    "allergies": ["penicillin"]
  }
}
```

The response contains the prototype's detected interactions. Input is limited to 100 medication entries and a 1 MB request body.

## CORS

CORS is disabled unless `ADR_ALLOWED_ORIGINS` is set to a comma-separated allowlist of trusted origins. CORS is not authentication; do not expose this prototype publicly without a separate authentication and network-access design.

## Model limitations

The included model is trained on a very small hand-authored synthetic dataset. It is not representative of real-world medication use, clinical populations, dosage, timing, comorbidities, or evidence-based interaction databases. Do not interpret its class labels or confidence scores as calibrated clinical risk.
