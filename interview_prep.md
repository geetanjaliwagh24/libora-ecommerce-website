# 🚀 Libora AI Marketplace: Full Tech Stack & Interview Prep Guide

This document is your ultimate cheat sheet for explaining **Libora** in software engineering interviews. It covers the entire tech stack from scratch, deep dives into the architecture, and provides a comprehensive list of potential interview questions (and how to answer them!).

---

## 🛠️ 1. The Technology Stack (From Scratch)

If an interviewer asks, *"Walk me through the tech stack of your e-commerce project"*, this is your answer.

### Frontend (Client-Side)
*   **Core Library:** React 19 (Component-based UI development)
*   **Build Tool / Bundler:** Vite (Extremely fast HMR and optimized builds compared to Webpack/CRA)
*   **Routing:** React Router DOM (v7) for handling multi-page navigation (Home, Dashboards, Cart, AI Stylist)
*   **Styling:** Vanilla CSS (Custom tokens, CSS variables `var(--primary)`, glassmorphism effects, dynamic gradients)
*   **Icons:** `lucide-react` (Lightweight, customizable SVG icons)
*   **State Management:** React Context API (`AuthContext`, `CartContext`) for global state (user tokens, cart items) + Local `useState`/`useEffect`.
*   **Internationalization (Optional/Configured):** `i18next` & `react-i18next`

### Backend (Server-Side)
*   **Framework:** Flask (Python lightweight WSGI web application framework)
*   **WSGI Server:** Waitress (Production-grade server for Windows/cross-platform) / Gunicorn (Linux)
*   **API Architecture:** RESTful APIs (Endpoints for `/orders`, `/products`, `/chat`, `/ai`)

### Database & ORM
*   **Database:** SQLite (development) / PostgreSQL (production-ready via `psycopg2-binary`)
*   **ORM (Object-Relational Mapper):** Flask-SQLAlchemy (Allows querying the database using Python objects instead of raw SQL strings)
*   **Schema Highlights:** Users, Sellers, Products, Categories, Orders, CartItems, Reviews, Coupons, ChatMessages.

### Integrations & 3rd Party APIs
*   **Authentication:** JWT (JSON Web Tokens) via `PyJWT` for stateless, secure user sessions.
*   **Payment Gateway:** Razorpay API (Handling checkouts, order creation, payment verification, and refunds).
*   **AI Integration:** Groq API (`groq` SDK) using LLaMA models to power the "AI Stylist" (Natural Language Processing for product recommendations).
*   **Email/Notifications:** SMTP Email Service (For sending order updates, OTP verification codes, and KYC alerts).
*   **Security/Rate Limiting:** `flask-limiter` (Prevents DDoS and brute-force attacks on login/AI endpoints).

---

## 🏗️ 2. Key Architectural Decisions & Features (The "Why")

Interviewers love to ask *why* you built something a certain way.

### 1. How does Authentication work?
**Mechanism:** Stateless JWT Authentication.
**Flow:** 
*   User signs up with their phone and email address. An OTP is sent to their email to verify ownership.
*   Upon OTP verification, a verification token is issued and used to complete registration with a secure password and account role (Buyer or Seller).
**Why:** Stateless authentication means the backend doesn't need to store session IDs in the database, making the application highly scalable.

### 2. How does the AI Stylist work?
**Mechanism:** RAG (Retrieval-Augmented Generation) Concept.
**Flow:** 
1. The frontend sends a user prompt (e.g., *"I need a summer dress"*).
2. The Flask backend queries the database for all available products.
3. The backend constructs a highly detailed prompt injecting the database products as context, and sends it to the **Groq API** (running an LLM).
4. The LLM returns a structured JSON response of recommended product IDs.
**Why Groq?:** Groq uses LPU (Language Processing Units) which are significantly faster than traditional GPUs, providing near-instantaneous AI responses for a snappy user experience.

### 3. How does the Real-Time Messaging System work?
**Mechanism:** HTTP Polling (or WebSockets if extended).
**Flow:** 
1. The frontend `ChatModal` uses a `setInterval` to poll the `/api/chat/messages/<id>` endpoint every 3 seconds.
2. The backend retrieves messages between the buyer and seller.
3. **Constraint Logic:** The backend enforces a **14-day window**. Buyers can only message sellers if they have an active order that was delivered less than 14 days ago.
**Why:** Polling is easier to implement and scale across load balancers for moderate traffic compared to maintaining persistent WebSocket connections, though WebSockets are the ideal next step for scale.

### 4. How are Payments Handled?
**Mechanism:** Razorpay Order & Verify Flow.
**Flow:**
1. User clicks checkout. Backend calculates totals (applying coupons, tax, shipping) and calls Razorpay to create an `Order ID`.
2. Frontend opens the Razorpay checkout modal using this `Order ID`.
3. Upon success, Razorpay returns a `payment_id` and `signature`.
4. The frontend sends these to the backend's `/verify-payment` endpoint. The backend cryptographically verifies the signature using the Razorpay Secret Key before marking the order as 'Paid'.
**Why:** This prevents malicious users from simply faking a "success" API call from the client side.

### 5. Seller KYC & Fraud Prevention
**Mechanism:** Manual Admin verification and automated metrics.
**Flow:** Sellers must submit GSTIN and Bank Details. Until approved by an Admin, their profile is capped (e.g., max checkout limits) and flagged with a "Scam Risk" UI badge. The system also tracks `return_rate` and `complaint_rate`.

---

## 🎤 3. Full-Depth Interview Questions

Here are the questions you should be prepared to answer, categorized by domain.

### 💻 Frontend (React) Questions
> [!IMPORTANT]
> Focus your answers on hooks, state management, and performance.

1. **"Why did you use React Context instead of Redux?"**
   *Answer:* "For this application, global state was relatively simple—mostly just the Auth Token, User Profile, and Cart Items. React's native Context API combined with custom hooks provided a lightweight, built-in solution without the heavy boilerplate of Redux."
2. **"How do you handle routing and protected routes?"**
   *Answer:* "I used React Router v7. I created a wrapper component that checks the `AuthContext`. If the user isn't logged in, or doesn't have the correct role (e.g., a Buyer trying to access the Admin dashboard), it redirects them to the login page."
3. **"How did you manage side effects, like fetching data?"**
   *Answer:* "I used the `useEffect` hook. I also ensured I handled loading states and error states (try/catch blocks) so the UI could show a spinner while data was fetching."
4. **"How does the cart update seamlessly across the app?"**
   *Answer:* "The Cart state is lifted to a global `CartContext`. Whenever a user clicks 'Add to Cart', the context updates, and any component consuming that context (like the Navbar cart badge) re-renders automatically."

### ⚙️ Backend (Python/Flask) Questions
> [!TIP]
> Emphasize security, database relationships, and API design.

1. **"Explain the database relationships in your models."**
   *Answer:* "We have a One-to-Many relationship between Users and Orders. Sellers are an extension of Users (One-to-One). A Product belongs to a Category (Many-to-One) and a Seller (Many-to-One). Orders contain OrderItems (One-to-Many), which link back to Products."
2. **"How do you secure user passwords?"**
   *Answer:* "Passwords are never stored in plain text. I use `werkzeug.security.generate_password_hash` to hash the password with a salt before saving it to the database."
3. **"How did you implement the 14-day return/messaging policy?"**
   *Answer:* "In the backend API routes, before allowing a message or a return to be posted, I calculate the `datetime.utcnow() - order.created_at`. If the `.days` exceeds 14, the API returns a `400 Bad Request`. The frontend also checks this logic to hide the UI buttons."
4. **"What happens if two people try to buy the last item in stock at the exact same time?"**
   *Answer:* "This is a race condition. In SQLAlchemy, we handle this using `with_for_update()` during the checkout process. This locks the database row for that specific product until the transaction is complete, preventing overselling."

### 🧠 System Design & AI Questions
> [!NOTE]
> Interviewers want to see how you think about scale and external systems.

1. **"How did you integrate the Groq AI model?"**
   *Answer:* "The frontend sends a natural language prompt. The backend fetches the product catalog from the database, formats it into a JSON string, and appends it to a system prompt. This prompt instructs the LLaMA model (via Groq API) to act as a fashion stylist and return only a JSON array of product IDs that match the user's request. We then parse that JSON and return the matching products to the frontend."
2. **"How do you handle API rate limits and external failures?"**
   *Answer:* "I implemented `flask-limiter` on our own endpoints to prevent users from spamming the AI and OTP features. If a 3rd party API rate limits us or fails, we catch the exception in a `try/except` block and gracefully degrade the UI, showing a friendly error message to the user rather than crashing the app."
3. **"How do Style Coins work?"**
   *Answer:* "Style coins are an internal digital currency stored as an integer on the `User` model. Buyers can use them to offset their total order cost at checkout, while Sellers can spend them to buy 'Sponsored' status for their products. The logic subtracts the coins and adjusts the financial total before sending the final amount to Razorpay."

---

## 🎯 Final Tips for the Interview

1. **Be Honest:** If they ask about something you didn't build (like microservices or Docker), just say: *"For the MVP, a monolithic architecture with SQLite/Postgres was the most efficient way to prove the concept. If we were to scale to millions of users, my next step would be containerizing with Docker and splitting the AI service into a microservice."*
2. **Focus on Business Value:** Don't just talk about code. Explain *why* you built features. Example: *"I built a 14-day return reason feature so sellers could get direct feedback on defective items, which helps them improve their inventory and reduces future return rates."*
3. **Highlight the UI/UX:** Mention that you prioritized a modern, glassmorphic design because trust and aesthetics are critical in e-commerce conversion rates.
