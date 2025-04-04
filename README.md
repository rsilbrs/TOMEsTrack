# TOMEs Track Dashboard

![TOMEs Track Logo](https://via.placeholder.com/150x50?text=TOMEs+Track)

## Overview

TOMEs Track is a comprehensive analytics dashboard designed for blood centers and collection facilities. It provides real-time monitoring of blood collection equipment, donor metrics, and processing statistics from Trima and Reveos systems. The platform enables blood center staff to track performance, optimize workflows, and ensure quality standards are maintained.

## Features

- **Multi-device Monitoring**: Track data from Trima (apheresis collection) and Reveos (blood processing) systems
- **Performance Analytics**: Monitor donation volumes, component production, and staff productivity
- **Customizable Notifications**: Configure email alerts for key performance indicators
- **Automated Reporting**: Schedule daily, weekly, or monthly email reports with selected indicators
- **Data Visualization**: Intuitive charts and graphs for easy interpretation of trends
- **User Authentication**: Secure role-based access to data and features

## Notification System

The notification system allows users to:

- Select and monitor specific indicators across different categories (Dashboard, Trima, Reveos)
- Configure email delivery preferences (daily, weekly, monthly)
- Receive test emails to verify configuration
- Save preferences securely for future sessions
- View summaries of selected indicators

### Available Indicators

#### Dashboard Indicators
- Total donations by Apheresis
- Total donations by Whole Blood
- Total Components Produced
- Productivity

#### Trima Indicators
- Total donations by Apheresis
- Platelets Offered vs Collected
- Pre-donor Platelet Count
- Pre-donor Ht/Hb
- Procedure Duration
- Top 10 Alarms

#### Reveos Indicators
- Components Processed
- Duration
- Average Platelet Volume
- Platelet Yield Index
- Average Plasma Volume
- Total Plasma Volume
- Top 10 Alarms

## Technology Stack

- **Frontend**: React, Material-UI
- **Backend**: Node.js, Express
- **Database**: Microsoft SQL Server
- **Authentication**: JWT
- **Email Service**: Nodemailer
- **State Management**: React Hooks
- **Build Tools**: Webpack, Babel

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Microsoft SQL Server (2019 or higher)

### Setup Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/tomes-track.git
   cd tomes-track
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server Configuration
   REACT_APP_API_URL=http://localhost:8001
   REACT_APP_URL=localhost
   PORT=8001

   # Database Configuration
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_SERVER=your_db_server
   DB_NAME=TOMEs_DB
   DB_ENCRYPT=true

   # Environment Settings
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret

   # Email Configuration
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_REQUIRE_TLS=false
   EMAIL_USER=your_email@example.com
   EMAIL_PASSWORD=your_email_password
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

## Usage

1. Log in to the dashboard using your credentials
2. Navigate to different sections (Dashboard, Trima, Reveos) to view specific metrics
3. Configure notifications by selecting:
   - Indicators you want to monitor
   - Email address for notifications
   - Frequency of notifications (daily, weekly, monthly)
4. Test email delivery using the "Send Test Email" button
5. Save your configuration to receive regular notifications

## Project Structure

```
tomes-track/
├── src/
│   ├── api/                # Backend API code
│   │   ├── SQL/            # Database connections and queries
│   │   │   ├── cron/       # Scheduled tasks including notification sender
│   │   │   ├── data/       # Persistent data storage
│   │   │   ├── middleware/ # API middleware (auth, etc.)
│   │   │   └── routes/     # API endpoints
│   ├── assets/             # Static assets
│   ├── components/         # Reusable React components
│   ├── contexts/           # React context providers
│   ├── examples/           # Example components and layouts
│   ├── layouts/            # Page layouts
│   │   ├── authentication/ # Login and user management
│   │   ├── dashboard/      # Main dashboard view
│   │   └── notifications/  # Notification configuration
│   └── App.js              # Main application component
├── public/                 # Public assets
├── .env                    # Environment variables
└── package.json            # Dependencies and scripts
```

## Contributing

We welcome contributions to TOMEs Track! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please contact:
- Email: support@tomestrack.com
- Website: https://www.tomestrack.com

---

Developed by Terumo BCT & TOMEs Team © 2023 