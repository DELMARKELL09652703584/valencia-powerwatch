# Valencia PowerWatch: Complete Deployment & Operations Manual
**Community Power Interruption Reporting, Verification, and Information Management System**
*Valencia City, Bukidnon*

---

## 1. Executive Summary & Live Access Links

Valencia PowerWatch is a centralized, real-time power outage monitoring and verification platform designed for Valencia City, Bukidnon. It connects residents reporting local outages directly with utility administrators and emergency dispatchers.

### 🌐 Portal Links
Render is the official, stable online deployment:

* **🖥️ Admin Portal (Desktop / Web)**
  * Online (Internet): <https://valencia-powerwatch.onrender.com/admin>
  * Local: <http://localhost:4000/admin>
* **📱 User / Community Portal (Mobile / PWA)**
  * Online (Internet): <https://valencia-powerwatch.onrender.com/community>
  * Local: <http://localhost:4000/community>
* **🦺 Staff Field App (Mobile / installable PWA)**
  * Online (Internet): <https://valencia-powerwatch.onrender.com/staff>
  * Local: <http://localhost:4000/staff>
* **📲 Install / QR Code Page**
  * Online (Internet): <https://valencia-powerwatch.onrender.com/install>
* **🩺 API Health Check**
  * Online (Internet): <https://valencia-powerwatch.onrender.com/api/health>
  * Local: <http://localhost:4000/api/health>

The Cloudflare Tunnel started by `start-public-online.bat` is temporary. Its link changes when the tunnel restarts; use the Render links above as the permanent public addresses.

### Render free-plan data limits
This service is configured for Render's Free plan to avoid monthly charges. Free instances do not support persistent disks, and their filesystem is ephemeral. SQLite accounts, outage records, and uploaded evidence can therefore be lost when Render restarts or redeploys the service. The app's startup migration can seed a new data directory from the bundled `data/powerwatch.db`, but that is not a backup of live changes and cannot recover data already lost from an earlier instance. If persistent account and report storage becomes essential, a paid plan with a persistent disk will be required; otherwise, continue with the Free plan knowing this limitation.

### Staff Field App setup
1. In User Management, create an account with the **System Personnel** role.
2. In Admin Portal → Repair & Dispatch, create or select a repair team, open **Manage Staff Team Access**, and assign the personnel account to that team.
3. Verify a resident report and dispatch the response team. Only personnel assigned to that team can view its work orders and evidence in the Staff App.
4. Open `/staff` on the staff member's phone and sign in with the Admin-created account. On compatible Android browsers, use **Install**; on iOS Safari, use **Share → Add to Home Screen**.
5. Staff acknowledge, navigate to, inspect, and repair assigned incidents; they can post field notes and JPG/PNG/WebP photos (up to 8 MB). After staff marks work complete, Admin reviews the response under **Awaiting Review** and confirms resolution.

---

## 2. Test Credentials

| Role | Portal URL | Email | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Residente (Community)** | `/community` | `resident@test.com` *(or Register new)* | `password123` | Report power outages, view map & announcements |
| **System Administrator** | `/admin` | `admin@valencia.gov.ph` | `Admin@123` | Full control: verify reports, GIS heatmaps, manage incidents |
| **Utility Engineer** | `/admin` | `engineer@valencia.gov.ph` | `Engineer@123` | Outage clustering, technical verification |

---

## 3. End-to-End System Architecture

```mermaid
flowchart TD
    subgraph Public_Internet["PUBLIC INTERNET (Any Device / Any Network)"]
        UserPhone["📱 Resident Smartphone / Laptop (Globe, Smart, DITO, Wi-Fi)"]
        StaffPhone["🦺 Field Staff Smartphone (Staff PWA)"]
    end

    subgraph Cloudflare_Edge["CLOUDFLARE SECURE EDGE"]
        CF["Cloudflare Global Network (HTTPS / SSL Encryption)"]
    end

    subgraph Host_Machine["LOCAL HOST SERVER (Valencia City Server)"]
        Tunnel["Cloudflare Tunnel (cloudflared.exe)"]
        Express["Node.js Express Backend (Port 4000)"]
        DB[("Central SQLite Database\ndata/powerwatch.db")]
        AdminWeb["🖥️ Administrator Portal (/admin)"]
        StaffWeb["🦺 Staff Field App (/staff)"]
    end

    UserPhone -->|HTTPS POST Report / Login| CF
    CF --> Tunnel
    Tunnel --> Express
    Express --> DB
    DB --> Express
    Express --> AdminWeb
    Express --> StaffWeb
    StaffPhone -->|HTTPS Login / Field Updates| CF
    StaffWeb -->|Role-scoped API| Express
```

### Key Integration Principles:
1. **Centralized Database Synchronization:** Every account created and every power outage reported from any smartphone immediately writes to the central SQLite database (`data/powerwatch.db`).
2. **Instant Admin Visibility:** When an administrator opens the Admin Portal, all community reports appear instantly with timestamps, barangay locations, and map coordinates.
3. **Role-Based Security:** Resident accounts trying to access the `/admin` route are automatically rejected with `"Access restricted. Resident accounts cannot access the Administrator Portal"` and redirected back to `/community`.

---

## 4. Step-by-Step Operations Guide

### A. Resident / Community User Walkthrough
1. **Open Portal:** Navigate to `/community` on any phone browser.
2. **Account Registration / Login:**
   - Click **Register** to create a personal account (Name, Contact Number, Barangay, Email, Password).
   - Or log in with `resident@test.com` / `password123`.
3. **Submitting a Power Outage Report:**
   - Tap **"Report Outage"**.
   - Select your Barangay (e.g., Poblacion, Bagontaas, Mailag, Batangan, etc.).
   - Pinpoint your exact location on the interactive Leaflet GPS Map.
   - Choose outage type (Complete Blackout, Partial Voltage/Flicker, Line Down/Transformer Spark).
   - Optional: Attach a photo or notes.
   - Tap **"Submit Report"**.
4. **Connectivity:** Report submission requires an active internet connection. If the connection drops, reconnect before submitting; reports are not currently saved to an offline queue.

### B. Administrator Walkthrough
1. **Login:** Navigate to `/admin` and enter administrator credentials.
2. **Real-time Incident Monitoring:**
   - View incoming reports on the live dispatch board.
   - Filter by Barangay, status (Pending, Verified, Dispatched, Resolved), or severity.
3. **Outage Heatmap & Smart Clustering:**
   - Open the **GIS Map** tab.
   - Toggle the **Heatmap Layer** to see outage density across Valencia City.
   - Use **Cluster Analysis** to detect transformer-level or feeder-level multi-household blackouts.
4. **Broadcast Emergency Advisories:**
   - Post scheduled maintenance announcements or emergency typhoon advisories that immediately appear on all resident phones.
5. **Printable Incident Reports:**
   - Click **"Generate Official Incident Report"** to export printable, audit-ready PDF documents for utility records and city hall archives.

---

## 5. Maintenance & Startup Procedures

If the computer is restarted or turned off, follow these simple steps:

### 1-Click Startup:
1. Open the project folder on your computer.
2. Double-click **`start-public-online.bat`**.
3. A console window will open, verify the local backend, connect to Cloudflare, print the new public HTTPS link, copy it to your clipboard, and automatically launch Google Chrome!
4. Keep the black console window open while using or demonstrating the system.
