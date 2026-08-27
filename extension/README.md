# Real-Time Web Permission Tracker

## Problem Statement

Modern web applications often require access to sensitive user permissions such as location, camera, and microphone. However, users lack transparency and control over which permissions are being accessed in real-time, leading to privacy concerns and potential misuse. There is a need for a system that can track, display, and manage web permissions in real-time, empowering users with better control and awareness.

## Approach and Solution

Our solution is a **Real-Time Web Permission Tracker** powered by a Chrome Extension and a live web dashboard. It monitors and visualizes web permission usage events, providing users with full transparency and insight.

### How it Works:

- **Chrome Extension Integration:** The extension detects permission-related API calls (e.g., `navigator.geolocation`, `getUserMedia`, `Notification.requestPermission`) as they happen. Every request, grant, or deny event is captured immediately.

- **Live Event Logging:** Captured events are sent to a backend server and recorded along with metadata like site origin, permission type, timestamp, and action taken.

- **Live Visualization:** A React dashboard displays a real-time feed and historical timeline of all permission events. Users can:
  - View which sites requested camera, mic, or location access.
  - See when and how often permissions were used.
 

- **User Awareness Panel:**
  - From either the extension popup or the dashboard, users can quickly **whitelist** permissions for specific sites.
  - Users are also guided to browser settings for stricter permission blocks if needed.

- **Compliance-Ready Logging:** All permission consent events are persistently stored, making the system useful for auditing and data protection regulations like **GDPR**, which require logs of informed user consent.

## Features

- **Real-Time Monitoring:** Instantly tracks and displays permission requests as they happen.
- **User Dashboard:** Centralized interface to view and analyze all web permissions.
- **Permission Awareness:** Understand which sites are using what permissions.
- **Notifications:** Real-time alerts when sensitive permissions are accessed.
- **History Logs:** View historical data of permission usage for auditing.
- **Secure & Privacy-Focused:** All data is handled securely, prioritizing user privacy.

## Tech Stack

- **Frontend:** React.js, Redux, Material-UI  
- **Backend:** Node.js, Express.js  
- **Database:** MongoDB  
- **Authentication:** JWT (JSON Web Tokens)  
- **Other Tools:** Webpack, Babel, ESLint

## Screenshots

> _Add your screenshots here_

- **Home Screenshot**







- **Dashboard Screenshot**





- **Setting Screenshot**






- **Login Screenshot**





### Prerequisites

- Node.js (v14+)
- Express.js
- npm 
- MongoDB

### Installation and Configuration

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/chrome_extension.git
   cd chrome_extension


2. **Install backend and frontend dependencies**

   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Create a `.env` file in the `backend` directory** with the following variables:

   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

4. **Start the backend server**

   ```bash
   cd backend
   node index.js
   ```

5. **Start the frontend development server**

   ```bash
   cd ../frontend
   npm start
   ```

6. **Access the application**

   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)



---

