# Raspberry Pi GPIO Controller

A web-based application to control and monitor GPIO pins on your Raspberry Pi 5.

## Features

- Real-time GPIO pin control through a web interface
- Support for multiple pin modes:
  - GPIO (Input/Output)
  - PWM (on supported pins)
  - I2C (pins 2, 3)
  - SPI (pins 9, 10, 11)
  - UART (pins 14, 15)
- Real-time updates using WebSocket
- Development mode with GPIO simulation for testing

## Installation

1. Install Git on your Raspberry Pi:
   ```bash
   sudo apt-get update
   sudo apt-get install -y git
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/raspberry-gpio-controller.git
   cd raspberry-gpio-controller
   ```

3. Make the installation script executable:
   ```bash
   chmod +x install.sh
   ```

4. Run the installation script:
   ```bash
   ./install.sh
   ```

The script will:
- Install all required dependencies
- Set up Python virtual environment
- Install and build the frontend
- Create and start a systemd service

## Accessing the Application

- Open a web browser on any device in your local network
- Navigate to `http://<your-pi-ip>:5000`
- The IP address will be shown after installation

## Usage

1. **GPIO Control**:
   - Select pin function (GPIO, PWM, I2C, etc.)
   - Toggle between Input/Output modes
   - Control pin states
   - Configure pull-up/down resistors

2. **PWM Features**:
   - Adjust frequency (1-10000 Hz)
   - Control duty cycle (0-100%)

## Service Management

- Check status: `sudo systemctl status gpio-controller`
- View logs: `sudo journalctl -u gpio-controller`
- Restart: `sudo systemctl restart gpio-controller`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024 Stephanus (woodmurderedhat)

This is free and open-source software. You are free to use, modify, and distribute this software under the terms of the MIT License.
