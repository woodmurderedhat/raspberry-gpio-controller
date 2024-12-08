#!/bin/bash

# Exit on error
set -e

echo "Starting Raspberry Pi GPIO Controller Installation..."

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Update system packages
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Python and pip if not already installed
echo "Installing Python and pip..."
sudo apt-get install -y python3 python3-pip python3-dev python3-rpi.gpio

# Install Node.js and npm
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create virtual environment
echo "Setting up Python virtual environment..."
cd "$SCRIPT_DIR"
python3 -m pip install virtualenv
python3 -m virtualenv venv
source venv/bin/activate

# Install Python dependencies
echo "Installing Python packages..."
pip install -r requirements.txt

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install
npm run build
cd "$SCRIPT_DIR"

# Create systemd service
echo "Setting up systemd service..."
sudo tee /etc/systemd/system/gpio-controller.service > /dev/null << EOL
[Unit]
Description=Raspberry Pi GPIO Controller
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
Environment=PATH=$SCRIPT_DIR/venv/bin:$PATH
ExecStart=$SCRIPT_DIR/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable gpio-controller
sudo systemctl start gpio-controller

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "Installation complete!"
echo "Your GPIO Controller is now running!"
echo ""
echo "Access the controller at: http://$LOCAL_IP:5000"
echo ""
echo "Useful commands:"
echo "- Check status: sudo systemctl status gpio-controller"
echo "- View logs: sudo journalctl -u gpio-controller"
echo "- Restart: sudo systemctl restart gpio-controller"
