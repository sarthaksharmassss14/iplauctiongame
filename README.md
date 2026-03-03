# 🏏 IPL AUCTION SIMULATOR

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-purple?style=for-the-badge&logo=framer-motion)](https://www.framer.com/motion/)

A high-performance, ultra-realtime IPL Auction simulation platform. Build your dream squad, outbid your rivals, and dominate the league with a premium glassmorphic interface.

---

## ✨ Key Features

### ⚡ Ultra-Realtime Synchronization
- **Zero Drift Timer:** Uses absolute timestamps (`timerEndsAt`) and Firebase `serverTimeOffset` to ensure every player, regardless of their local clock or network speed, sees the EXACT same countdown.
- **High-Frequency Resolution:** 50ms polling loop on the host for instant "Sold/Unsold" transitions.

### 🤖 Elite Bot AI
- **Smart Bidding:** Bots evaluate players based on **Star Ratings**, **Current Budget**, **Squad Role Diversity**, and **Overseas Limits**.
- **Human-Like Behavior:** Delayed opening bids and staggered reactions prevent "all bots bidding at once," giving you a realistic auction room experience.

### 🏎️ Dynamic Auction Mechanics
- **Accelerated Round:** Unsold players are brought back in an accelerated phase with faster timers.
- **Auto-Assign (Squad Completion):** A one-click logic to fill remaining mandatory squad slots (min 15) for all teams based on eligibility and budget.
- **Skip Logic:** Strategic option for single-player mode to automatically assign or unsold players to keep the momentum going.

### 📊 Expert AI Post-Auction Analysis
- **Squad Evaluation:** Generates a professional quality score out of 100 for every team.
- **Best XI Generator:** Expert algorithm selects the strongest starting 11 based on 4-foreigner limits and role-wise balance (Top order, Finishers, Pace, Spin).
- **Strengths & Weaknesses:** Detailed insights into your finalized roster.

### 💎 Premium Experience
- **Glassmorphic UI:** Modern design system with vibrant team-specific themes (CSK Yellow, MI Blue, etc.).
- **Micro-Animations:** Fluid transitions and interactive feedback using Framer Motion.
- **Audio Feedback:** Authentic auction sounds for coin bids, hammer drops, and countdown ticks.

---

## 🛠️ Tech Stack

- **Core:** [Next.js 16](https://nextjs.org/) (App Router + Turbopack)
- **Backend:** [Firebase Realtime Database](https://firebase.google.com/)
- **State & Logic:** TypeScript, React Hooks, Custom RTDB Transactions
- **Styling:** Vanilla CSS (Modern Design Tokens)
- **Animations:** [Framer Motion 12](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Utilities:** [Lodash](https://lodash.com/), [Groq SDK](https://groq.com/) (Future AI integrations)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- A Firebase Project (Realtime Database enabled)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sarthaksharmassss14/iplauctiongame.git
   cd iplauctiongame
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables (Create a `.env.local` file):
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_db_url
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your friends to start the action!

---

## 📈 Optimization Notes

### Floating Point Budget Fix
The system uses rounded integer arithmetic (`Math.round(val * 100)`) for all budget-to-bid comparisons to prevent the common JavaScript floating-point bug where players couldn't bid with an exact 1.00 Cr purse.

### Network Efficiency
By moving away from per-second database writes for the timer, network traffic has been reduced by ~80%, allowing the game to sustain 10+ concurrent human players without lag spikes.

---

## 📝 License
This project is for educational and entertainment purposes. IPL and team logos are property of their respective owners.

Developed with ❤️ by [Sarthak](https://github.com/sarthaksharmassss14)
