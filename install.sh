#!/bin/bash

# Exit on error
set -e

echo "🚀 Installing Raspberry Pi GPIO Controller Pro..."

# Check if running on Raspberry Pi
if [ -f /etc/rpi-issue ]; then
    IS_PI=1
    echo "✅ Running on Raspberry Pi"
else
    IS_PI=0
    echo "⚠️ Not running on Raspberry Pi - some features will be simulated"
fi

# Install system dependencies
echo "📦 Installing system dependencies..."
if [ $IS_PI -eq 1 ]; then
    sudo apt-get update
    sudo apt-get install -y python3-pip python3-venv nodejs npm sqlite3 libsqlite3-dev
    sudo usermod -a -G gpio $USER
else
    # Assuming Windows/Mac has Python, Node.js, and SQLite installed
    echo "ℹ️ Please ensure Python 3.x, Node.js, and SQLite are installed on your system"
fi

# Create and activate virtual environment
echo "🐍 Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# Install frontend dependencies
echo "🎨 Setting up frontend..."
cd frontend
npm install
npm run build
cd ..

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔐 Creating environment file..."
    echo "JWT_SECRET_KEY=$(openssl rand -hex 32)" > .env
    echo "FLASK_ENV=production" >> .env
    echo "CORS_ORIGIN=http://localhost:3000" >> .env
fi

# Initialize database
echo "🗄️ Setting up database..."
python3 -c "
from app import app, db
with app.app_context():
    db.create_all()
"

# Create systemd service file (only on Raspberry Pi)
if [ $IS_PI -eq 1 ]; then
    echo "🔧 Setting up system service..."
    sudo tee /etc/systemd/system/gpio-controller.service > /dev/null << EOL
[Unit]
Description=Raspberry Pi GPIO Controller Pro
After=network.target

[Service]
User=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin:$PATH
ExecStart=$(pwd)/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOL

    # Start and enable the service
    sudo systemctl daemon-reload
    sudo systemctl enable gpio-controller
    sudo systemctl start gpio-controller
    
    echo "✅ Service installed and started"
    echo "📝 View logs with: sudo journalctl -u gpio-controller"
else
    echo "🚀 Starting development server..."
    python app.py &
    cd frontend && npm start
fi

# Get IP address
IP_ADDRESS=$(hostname -I | cut -d' ' -f1)

echo "
✨ Installation complete! ✨

📱 Access the application:
   Frontend: http://$IP_ADDRESS:3000
   Backend API: http://$IP_ADDRESS:5000

🔐 Default admin credentials:
   Username: admin
   Password: admin

⚠️ IMPORTANT: Change the admin password immediately after first login!

📚 Documentation: https://github.com/yourusername/raspberry-gpio-controller

Need help? Create an issue on GitHub or contact support@example.com
"
