
# ⚡ Attendance Pro

A premium Attendance Management System built with **Next.js 16**, **Firebase Auth**, and **Supabase**.

## 🚀 Features
- **Role-Based Access**: 
  - **Admin**: View live attendance, manage leave requests.
  - **Employee**: Clock In/Out, request leaves, view history.
- **Real-time Clock**: Live timer for effective working hours.
- **Glassmorphism UI**: Premium dark mode design.

## 🛠️ Setup Instructions

### 1. Database Setup (Supabase)
Go to your Supabase SQL Editor and run the content of `schema.sql`.
This will create:
- `users` table
- `attendance` table
- `leaves` table

### 2. Authentication (Firebase)
Ensure Email/Password provider is enabled in your Firebase Console.

### 3. Run Locally
```bash
npm install
npm run dev
```

## 🧪 Testing Roles
When signing up, you can currently **select** your role (Employee/Admin) for demonstration purposes. 
- Create an **Admin** account to see the Admin Dashboard.
- Create an **Employee** account to test Clock In/Out and Leave Requests.
