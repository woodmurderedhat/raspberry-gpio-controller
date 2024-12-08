# Raspberry Pi GPIO Controller Pro

A professional-grade web application for controlling and monitoring Raspberry Pi GPIO pins with enterprise features.

## 🚀 Features

- **Complete GPIO Control**
  - GPIO Input/Output
  - Hardware & Software PWM
  - I2C (6 buses)
  - SPI (Multiple buses)
  - UART (5 ports)
  - PCM Audio

- **Advanced Pin Configuration**
  - Drive strength (2mA to 16mA)
  - Slew rate control
  - Hysteresis settings
  - Edge detection

- **Enterprise Security**
  - User authentication with JWT
  - Role-based access control (Admin/User)
  - Comprehensive audit logging
  - Secure password hashing

- **System Monitoring**
  - Real-time temperature tracking
  - CPU usage monitoring
  - Memory utilization
  - Power management
  - Voltage readings
  - Clock speeds
  - Throttling status

## 📋 Requirements

- Raspberry Pi 5 (recommended) or compatible model
- Python 3.x
- Node.js 18.x or later
- npm or yarn
- SQLite3

## 🛠️ Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/raspberry-gpio-controller.git
   cd raspberry-gpio-controller
   ```

2. **Backend Setup**
   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Start the backend server
   python app.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## 🔐 First-Time Setup

1. **Default Admin Account**
   - Username: `admin`
   - Password: `admin`
   - **Important**: Change the password immediately after first login

2. **Creating Additional Users**
   - Log in as admin
   - Navigate to User Management
   - Click "Add User"
   - Set username, password, and role (Admin/User)

## 📱 Using the Application

### Authentication

1. **Login**
   - Navigate to http://your-pi-ip:3000
   - Enter your credentials
   - The system will provide a JWT token for subsequent requests

### GPIO Control

1. **Basic Pin Control**
   - Select a pin from the grid
   - Choose pin mode (Input/Output)
   - For output pins:
     Toggle HIGH/LOW state
     Set PWM values if applicable

2. **Advanced Pin Settings**
   - Click "Advanced Settings" on any pin
   - Configure:
     Drive strength
     Slew rate
     Hysteresis
     Edge detection

3. **Pin Presets**
   - Save current configuration as preset
   - Load presets for quick setup

### System Monitoring

1. **Dashboard**
   - Real-time system metrics
   - Temperature readings
   - CPU/Memory usage
   - Power consumption
   - Clock speeds
   - Throttling status
   - Voltage readings

### Audit Logging

1. **View Logs**
   - Access audit logs from menu
   - Filter by:
     User
     Action type
     Pin number
     Timestamp

## 🔧 Advanced Configuration

### Environment Variables
```bash
JWT_SECRET_KEY=your-secret-key
FLASK_ENV=production
CORS_ORIGIN=http://your-frontend-url
```

## 🛡️ Security Best Practices

1. **Change Default Credentials**
   - Modify admin password immediately
   - Use strong passwords

2. **Network Security**
   - Run behind reverse proxy
   - Enable HTTPS
   - Restrict to local network
   - Use VPN for remote access

3. **Access Control**
   - Use appropriate user roles (Admin/User)
   - Limit admin accounts
   - Regular access audits

## 🔍 Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Add user to gpio group
   sudo usermod -a -G gpio $USER
   ```

2. **Connection Issues**
   - Check if backend is running
   - Verify frontend URL in CORS settings
   - Ensure correct IP and port configuration

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and feature requests, please open an issue in the GitHub repository.
=======
- Create GitHub issue

- Documentation: [Raspberry GPIO Controller](https://woodmurderedhat.github.io/raspberry-gpio-controller/)
