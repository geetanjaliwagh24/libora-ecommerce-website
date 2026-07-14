<div align="center">
  <h1>🛍️ Libora - AI-Powered E-Commerce Marketplace</h1>
  <p>A modern, full-stack multi-vendor e-commerce platform featuring an AI Stylist, secure payments, and a seamless shopping experience.</p>
</div>

---

## 🌟 Features

- **Multi-Vendor Ecosystem**: Support for Admins, Sellers, and Buyers with dedicated dashboards.
- **🤖 AI Stylist**: Integrated AI assistant to help users find the perfect outfits and products based on their preferences.
- **Secure Payments**: Production-ready Razorpay integration with server-side signature verification.
- **Smart Analytics**: Real-time sales data, order tracking, and fraud detection metrics for sellers.
- **Dynamic Categories**: Deeply nested, dynamic categorization system covering Fashion, Electronics, Cosmetics, and more.
- **Fully Responsive**: Beautiful, mobile-first UI with a custom drawer and quick search.

## 💻 Tech Stack

**Frontend**
- React 19 + Vite
- React Router DOM for SPA routing
- Vanilla CSS + modern styling (Glassmorphism, Flexbox grids)
- Hosted on **Netlify**

**Backend**
- Python Flask
- SQLAlchemy + PostgreSQL (Hosted on **Neon**)
- Gunicorn WSGI server
- Hosted on **Render** (Free Tier)

**Integrations**
- **Razorpay** for payment processing
- **Groq / Gemini** for AI capabilities
- **Twilio** for SMS notifications

---

## 🚀 Live Demo

The application is deployed live! 
- **Frontend URL:** *[Add your Netlify link here, e.g., https://your-site.netlify.app]*
- **Backend API:** Hosted on Render (`https://libora-ecommerce-website.onrender.com`)

*Note: The backend is hosted on a free tier and may take 30-60 seconds to wake up from inactivity on the first request.*

---

## 🛠️ Local Development Setup

If you want to run the project locally on your machine, follow these steps:

### Prerequisites
- Node.js & npm
- Python 3.9+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Optional, for containerized setup)

### 1. Clone the repository
```bash
git clone https://github.com/geetanjaliwagh24/libora-ecommerce-website.git
cd libora-ecommerce-website
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```
Create a `.env` file in the `backend` directory based on `.env.example` and add your keys (Database URL, Razorpay, Groq, etc.).
```bash
python run.py
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend will start at `http://localhost:5173`.

---

## 🛡️ Security & Architecture

- **CORS Handling**: Handled seamlessly via Netlify Proxy redirects in production to avoid browser origin blocks.
- **Security Headers**: Backend enforces `X-Content-Type-Options`, `X-Frame-Options`, and `Content-Security-Policy`.
- **Database Safety**: Sensitive environment variables are fully isolated and ignored by `.gitignore`.

---

<div align="center">
  <i>Built with ❤️ for modern e-commerce.</i>
</div>
