// Socket.io connection
const socket = io('http://localhost:5000');
let gpioState = {};

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const gpioGrid = document.querySelector('.gpio-grid');
const cpuTemp = document.getElementById('cpu-temp');
const memoryUsage = document.getElementById('memory-usage');
const notification = document.getElementById('notification');

// Socket event handlers
socket.on('connect', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.add('connected');
    showNotification('Connected to server');
});

socket.on('disconnect', () => {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.remove('connected');
    showNotification('Disconnected from server', 'error');
});

socket.on('gpio_state', (state) => {
    gpioState = state;
    updateGPIOGrid();
});

socket.on('system_stats', (stats) => {
    cpuTemp.textContent = stats.cpu_temp.toFixed(1);
    memoryUsage.textContent = stats.memory_usage.toFixed(1);
});

// Initialize GPIO grid
function initializeGPIOGrid() {
    const validPins = [17, 18, 27, 22, 23, 24, 25, 4];
    validPins.forEach(pin => {
        const pinElement = document.createElement('div');
        pinElement.className = 'gpio-pin';
        pinElement.innerHTML = `
            <h3>GPIO ${pin}</h3>
            <p class="pin-state">OFF</p>
        `;
        pinElement.addEventListener('click', () => togglePin(pin));
        gpioGrid.appendChild(pinElement);
    });
}

// Update GPIO grid display
function updateGPIOGrid() {
    const pins = document.querySelectorAll('.gpio-pin');
    pins.forEach(pin => {
        const pinNumber = parseInt(pin.querySelector('h3').textContent.split(' ')[1]);
        const state = gpioState[pinNumber];
        pin.classList.toggle('active', state);
        pin.querySelector('.pin-state').textContent = state ? 'ON' : 'OFF';
    });
}

// Toggle individual GPIO pin
function togglePin(pin) {
    socket.emit('toggle_pin', { pin: pin });
}

// Show notification
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeGPIOGrid();

    // Add event listeners for quick controls
    document.getElementById('all-on').addEventListener('click', () => {
        socket.emit('set_all_pins', { state: true });
    });

    document.getElementById('all-off').addEventListener('click', () => {
        socket.emit('set_all_pins', { state: false });
    });
});
