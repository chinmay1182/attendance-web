
# ⚡ Attendance Pro - Feature Update

We have added **13 Enterprise Features** to the application.

## 🆕 New Features

1.  **Analytics & Reports**: Export attendance data to CSV/Excel. View charts. (`/admin/reports`)
2.  **Team Calendar**: View holidays and approved leaves on a monthly calendar. (`/calendar`)
3.  **Holiday Management**: Admins can add/remove company holidays. (`/admin/holidays`)
4.  **Attendance Regularization**: Employees can request corrections for missed punches. (`/regularization`)
5.  **Geofencing**: Clock In/Out restricts (or warns) based on office coordinates.
6.  **Late Marking**: Admins see a "Late" badge if employee clocks in after 9:30 AM.
7.  **Profile Settings**: Users can update bio, phone, and photo. (`/settings`)
8.  **User Management**: Admin list view of all users. (`/admin/users`)

## 🛠️ Required Database Update

**You MUST run the following SQL** in your Supabase SQL Editor to enable these features:

```sql
-- Run contents of schema_update.sql
```

(The file `schema_update.sql` is located in your project root).

## 🌍 Geofencing Setup
To enforce Geofencing, insert a row into the `settings` table:
```sql
insert into settings (key, value) values 
('general', '{"office_lat": 12.9716, "office_lng": 77.5946, "radius_meters": 500}');
```
*Replace logic with your actual office coordinates.*

## 🚀 Running the App
```bash
npm run dev
```
