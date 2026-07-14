# AI-Marketplace Production Setup & Razorpay Integration

This repository has been fully upgraded to meet production-ready standards. It contains a complete containerization strategy, security header policies, a service diagnostic checker, and a production-grade Razorpay payment integration with server-side signature verification.

---

## 🛠️ Production Enhancements

### 1. Razorpay Integration
Online transactions are powered by Razorpay.
* **Backend**: Order creation returns standard Razorpay metadata. A new verification endpoint `/api/orders/verify-payment` performs server-side cryptographic verification of Razorpay signatures before updating payment statuses.
* **Frontend**: The checkout page loads the Razorpay widget dynamically and redirects payment callbacks directly to backend verification APIs.
* **Robust Fail-Safe**: If `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` are not set in the environment, the app gracefully falls back to a Sandbox payment simulation, allowing local development and testing to run seamlessly.

### 2. Containerization (Docker & Compose)
Multi-container orchestration setup splits the application stack into three isolated services:
* `db`: Standard PostgreSQL database.
* `backend`: Python Gunicorn server serving Flask routes. Runs a database connectivity check script before boot to prevent container start race conditions.
* `frontend`: Nginx server serving the built Vite React app and proxying API endpoints, which resolves CORS issues.

### 3. Security Hardening
The backend includes security filters:
* `X-Content-Type-Options: nosniff` (prevents MIME type sniffing).
* `X-Frame-Options: SAMEORIGIN` (mitigates clickjacking attacks).
* `X-XSS-Protection: 1; mode=block` (mitigates cross-site scripting).
* `Content-Security-Policy: default-src 'none'` (enforced on JSON API payloads).

---

## 🚀 Getting Started

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

### Setup Environment
1. Copy the template `.env.example` in the root directory to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your credentials:
   - Provide your `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to enable live Razorpay transactions.
   - Set `GEMINI_API_KEY` to enable the AI Stylist feature.

### Start the Services
Run the following command to spin up the entire application stack:
```bash
docker-compose up --build
```
Once initialized:
* **Frontend Application** is available at: [http://localhost:8080](http://localhost:8080)
* **Backend Health endpoint** is available at: [http://localhost:8080/api/health](http://localhost:8080/api/health)

---

## 🔍 Verification

### Running Automated Tests
Run unit tests inside the backend directory to check application logic:
```bash
cd backend
python -m unittest discover -s tests
```

### Inspecting Security Headers
Confirm security headers are active:
```bash
curl -I http://localhost:8080/api/health
```
You should see:
```http
HTTP/1.1 200 OK
Server: nginx/...
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'none'
```
