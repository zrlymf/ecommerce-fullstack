# 🛍️ Belanjain: Multi-Vendor E-commerce Platform

> **A robust Full-Stack E-commerce solution designed for scalability, featuring complex multi-vendor split-orders, automated reporting, and real-time analytics.**

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Coverage](https://img.shields.io/badge/Test_Coverage-86%25-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-MERN%2FPERN-blue)

## 📖 Overview
**Belanjain** is a modern marketplace simulation designed to help MSMEs transition to the digital ecosystem. Unlike standard e-commerce templates, this project focuses on **backend complexity**, specifically handling **atomic multi-vendor transactions**, automated inventory management, and deep analytical insights for sellers.

Built with a **Decoupled Architecture**, it separates the high-performance NestJS backend from the reactive React frontend, communicating via secure RESTful APIs.

## 🚀 Tech Stack & Architecture

### **Backend (The Brain)**
* **Framework:** NestJS (Node.js) with Modular Monolith Architecture.
* **Language:** TypeScript (Strict Type Safety).
* **Database:** MySQL with **Prisma ORM**.
* **Security:** JWT (Access + Refresh Tokens) & RBAC.
* **Automation:** Cron Jobs (@nestjs/schedule) for weekly reports.
* **Testing:** Jest & Supertest (End-to-End Testing).

### **Frontend (The Face)**
* **Framework:** React.js (Single Page Application).
* **Styling:** Tailwind CSS.
* **State Management & Networking:** Axios with Interceptors.
* **Visualization:** Recharts for analytics data.

## ✨ Key Features (Highlights)

### 🛒 1. Advanced Split-Order Mechanism
The core complexity of this system. When a user checks out items from multiple different sellers in a single cart:
* The system uses **Prisma Interactive Transactions** to atomically split the order.
* It generates unique Order IDs for each seller while maintaining a single payment flow.
* Ensures **Data Integrity**: If one item fails (e.g., out of stock), the entire transaction rolls back.

### 📊 2. Smart Inventory & Analytics
* **Real-time Dashboard:** Visualizes daily, weekly, and monthly revenue trends.
* **Low Stock Alerts:** Visual indicators when stock drops below 10 units.
* **Quick Inventory Management:** Inline editing for rapid stock updates.

### 🤖 3. Automation & Background Services
* **Weekly Sales Report:** A background Cron Job runs automatically every week to send summary emails via SMTP (Nodemailer).
* **Auto-Restock:** Automatically returns items to inventory if a pending order is cancelled.

## 🔧 Installation & Setup

**1. Clone the repository**
```bash
git clone [https://github.com/zrlymf/ecommerce-fullstack.git](https://github.com/zrlymf/ecommerce-fullstack.git)
cd ecommerce-fullstack
```

**2. Backend Setup**
```bash
cd backend
npx prisma migrate dev
pnpm install
pnpm run start:dev
```

**3. Frontend Setup**
```bash
cd ../frontend
pnpm install
pnpm run dev
```
