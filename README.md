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
  - Pin naming and descriptions

- **Enterprise Security**
  - User authentication
  - Role-based access control
  - API key support
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
   - Set username, password, and role

## 📱 Using the Application

### Authentication

1. **Login**
   - Navigate to http://your-pi-ip:3000
   - Enter your credentials
   - The system will provide a JWT token for subsequent requests

2. **API Key Access**
   - Generate API keys in user settings
   - Use keys for programmatic access
   - Include in Authorization header: `Bearer your-api-key`

### GPIO Control

1. **Basic Pin Control**
   - Select a pin from the grid
   - Choose pin mode (Input/Output)
   - For output pins:
     - Toggle HIGH/LOW state
     - Set PWM values if applicable

2. **Advanced Pin Settings**
   - Click "Advanced Settings" on any pin
   - Configure:
     - Drive strength
     - Slew rate
     - Hysteresis
     - Edge detection

3. **Pin Presets**
   - Save current configuration as preset
   - Load presets for quick setup
   - Share presets with team members

### System Monitoring

1. **Dashboard**
   - Real-time system metrics
   - Temperature graphs
   - CPU/Memory usage
   - Power consumption

2. **Alerts**
   - Set up alert thresholds
   - Receive notifications for:
     - High temperature
     - Voltage issues
     - System throttling

### Audit Logging

1. **View Logs**
   - Access audit logs from menu
   - Filter by:
     - User
     - Action type
     - Time range
     - Pin number

2. **Export Logs**
   - Download as CSV
   - Filter before export
   - Automatic daily backups

## 🔧 Advanced Configuration

### Environment Variables
```bash
JWT_SECRET_KEY=your-secret-key
FLASK_ENV=production
CORS_ORIGIN=http://your-frontend-url
```

### Custom Pin Definitions
```python
PIN_DEFINITIONS = {
    "GPIO18": {
        "name": "LED Control",
        "description": "Main status LED"
    }
}
```

## 🛡️ Security Best Practices

1. **Change Default Credentials**
   - Modify admin password immediately
   - Use strong passwords
   - Rotate API keys regularly

2. **Network Security**
   - Run behind reverse proxy
   - Enable HTTPS
   - Restrict to local network
   - Use VPN for remote access

3. **Access Control**
   - Create specific user roles
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
   - Verify correct IP/port
   - Check firewall settings

3. **Database Issues**
   ```bash
   # Reset database
   rm instance/gpio_controller.db
   python app.py  # Will recreate database
   ```

## 📚 API Documentation

### REST Endpoints

```
GET  /api/pins            # List all pins
POST /api/pins/<pin>      # Control pin
GET  /api/system/info     # System information
POST /api/presets         # Save pin preset
```

### WebSocket Events

```javascript
socket.on('pin_state_change', data => {
    // Handle pin state changes
});

socket.on('system_metrics', data => {
    // Handle system metric updates
});
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Create GitHub issue
- Email: support@example.com
- Documentation: https://docs.example.com
