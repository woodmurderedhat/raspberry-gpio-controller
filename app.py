from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
import json
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# In development environment, we'll simulate GPIO
try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    IS_PI = True
except:
    print("Running in development mode - GPIO functions will be simulated")
    IS_PI = False

# Dictionary to store pin states (simulated when not on Pi)
pin_states = {
    pin: {
        'mode': 'OUT',
        'state': False,
        'function': 'GPIO',  # Can be: GPIO, PWM, I2C, SPI, UART
        'pwm_frequency': 1000,
        'pwm_duty_cycle': 0,
        'pull_updown': 'NONE'  # Can be: NONE, UP, DOWN
    } 
    for pin in [2, 3, 4, 17, 27, 22, 10, 9, 11, 5, 6, 13, 19, 26]
}

# Pin function mappings
PIN_FUNCTIONS = {
    'I2C': [2, 3],           # I2C pins (SDA, SCL)
    'SPI': [9, 10, 11],      # SPI pins (MISO, MOSI, SCLK)
    'UART': [14, 15],        # UART pins (TX, RX)
    'PWM': [12, 13, 18, 19]  # Hardware PWM capable pins
}

def setup_gpio():
    if IS_PI:
        for pin in pin_states:
            if pin_states[pin]['function'] == 'GPIO':
                GPIO.setup(pin, GPIO.OUT if pin_states[pin]['mode'] == 'OUT' else GPIO.IN)
                if pin_states[pin]['mode'] == 'OUT':
                    GPIO.output(pin, GPIO.LOW)

@app.route('/api/pins', methods=['GET'])
def get_pins():
    return jsonify(pin_states)

@app.route('/api/pins/<int:pin_number>', methods=['POST'])
def control_pin(pin_number):
    data = request.get_json()
    if pin_number not in pin_states:
        return jsonify({'error': 'Invalid pin number'}), 400
    
    action = data.get('action')
    if action not in ['HIGH', 'LOW']:
        return jsonify({'error': 'Invalid action'}), 400

    if IS_PI:
        GPIO.output(pin_number, GPIO.HIGH if action == 'HIGH' else GPIO.LOW)
    
    pin_states[pin_number]['state'] = action == 'HIGH'
    socketio.emit('pin_state_change', {
        'pin': pin_number,
        'state': pin_states[pin_number]['state']
    })
    
    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/mode', methods=['POST'])
def set_pin_mode(pin_number):
    data = request.get_json()
    if pin_number not in pin_states:
        return jsonify({'error': 'Invalid pin number'}), 400
    
    mode = data.get('mode')
    if mode not in ['IN', 'OUT']:
        return jsonify({'error': 'Invalid mode'}), 400

    if IS_PI:
        GPIO.setup(pin_number, GPIO.IN if mode == 'IN' else GPIO.OUT)
    
    pin_states[pin_number]['mode'] = mode
    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/function', methods=['POST'])
def set_pin_function(pin_number):
    data = request.get_json()
    if pin_number not in pin_states:
        return jsonify({'error': 'Invalid pin number'}), 400
    
    function = data.get('function')
    if function not in ['GPIO', 'PWM', 'I2C', 'SPI', 'UART']:
        return jsonify({'error': 'Invalid function'}), 400
    
    # Validate if pin supports the requested function
    if function != 'GPIO':
        if function == 'PWM' and pin_number not in PIN_FUNCTIONS['PWM']:
            return jsonify({'error': 'Pin does not support PWM'}), 400
        elif function == 'I2C' and pin_number not in PIN_FUNCTIONS['I2C']:
            return jsonify({'error': 'Pin does not support I2C'}), 400
        elif function == 'SPI' and pin_number not in PIN_FUNCTIONS['SPI']:
            return jsonify({'error': 'Pin does not support SPI'}), 400
        elif function == 'UART' and pin_number not in PIN_FUNCTIONS['UART']:
            return jsonify({'error': 'Pin does not support UART'}), 400

    pin_states[pin_number]['function'] = function
    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/pwm', methods=['POST'])
def set_pwm(pin_number):
    data = request.get_json()
    if pin_number not in pin_states or pin_states[pin_number]['function'] != 'PWM':
        return jsonify({'error': 'Invalid pin or not in PWM mode'}), 400
    
    frequency = data.get('frequency', 1000)
    duty_cycle = data.get('duty_cycle', 0)
    
    if IS_PI:
        # Implementation for actual PWM control would go here
        pass
    
    pin_states[pin_number]['pwm_frequency'] = frequency
    pin_states[pin_number]['pwm_duty_cycle'] = duty_cycle
    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/pull', methods=['POST'])
def set_pull_updown(pin_number):
    data = request.get_json()
    if pin_number not in pin_states:
        return jsonify({'error': 'Invalid pin number'}), 400
    
    pull = data.get('pull')
    if pull not in ['NONE', 'UP', 'DOWN']:
        return jsonify({'error': 'Invalid pull setting'}), 400
    
    if IS_PI:
        if pull == 'UP':
            GPIO.setup(pin_number, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        elif pull == 'DOWN':
            GPIO.setup(pin_number, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        else:
            GPIO.setup(pin_number, GPIO.IN)
    
    pin_states[pin_number]['pull_updown'] = pull
    return jsonify({'success': True})

# Add SSH connection status endpoint
@app.route('/api/ssh/status', methods=['GET'])
def get_ssh_status():
    ssh_status = {
        'enabled': True,
        'address': os.popen('hostname -I').read().strip(),
        'hostname': os.popen('hostname').read().strip()
    }
    return jsonify(ssh_status)

if __name__ == '__main__':
    setup_gpio()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
