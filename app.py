from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
import json
import os
import time
import threading
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import subprocess

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gpio_controller.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

jwt = JWTManager(app)
db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    api_key = db.Column(db.String(64), unique=True)
    pin_presets = db.relationship('PinPreset', backref='user', lazy=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class PinPreset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    configuration = db.Column(db.JSON, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    pin_number = db.Column(db.Integer)
    details = db.Column(db.JSON)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# In development environment, we'll simulate GPIO
try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    IS_PI = True
except:
    print("Running in development mode - GPIO functions will be simulated")
    IS_PI = False

# Pin definitions for Raspberry Pi 5
PIN_DEFINITIONS = {
    'GPIO': [2, 3, 4, 17, 27, 22, 10, 9, 11, 5, 6, 13, 19, 26, 14, 15, 18, 23, 24, 25, 8, 7, 12, 16, 20, 21],
    'PWM': {
        'Hardware': [12, 13, 18, 19],  # Hardware PWM channels
        'Software': list(range(2, 28))  # All GPIO pins support software PWM
    },
    'I2C': {
        'I2C0': {'SDA': 0, 'SCL': 1},  # Primary I2C bus
        'I2C1': {'SDA': 2, 'SCL': 3},  # Secondary I2C bus
        'I2C3': {'SDA': 4, 'SCL': 5},  # Additional I2C bus
        'I2C4': {'SDA': 6, 'SCL': 7},  # Additional I2C bus
        'I2C5': {'SDA': 8, 'SCL': 9},  # Additional I2C bus
        'I2C6': {'SDA': 10, 'SCL': 11}  # Additional I2C bus
    },
    'SPI': {
        'SPI0': {'MOSI': 10, 'MISO': 9, 'SCLK': 11, 'CE0': 8, 'CE1': 7},
        'SPI1': {'MOSI': 20, 'MISO': 19, 'SCLK': 21, 'CE0': 18, 'CE1': 17},
        'SPI2': {'MOSI': 40, 'MISO': 39, 'SCLK': 41, 'CE0': 38, 'CE1': 37}  # Additional SPI bus
    },
    'UART': {
        'UART0': {'TX': 14, 'RX': 15},  # Primary UART
        'UART1': {'TX': 0, 'RX': 1},    # Secondary UART
        'UART2': {'TX': 4, 'RX': 5},    # Additional UART
        'UART3': {'TX': 8, 'RX': 9},    # Additional UART
        'UART4': {'TX': 12, 'RX': 13}   # Additional UART
    },
    'PCM': {
        'CLK': 18,
        'FS': 19,
        'DIN': 20,
        'DOUT': 21
    }
}

# Dictionary to store pin states
pin_states = {
    pin: {
        'mode': 'OUT',
        'state': False,
        'function': 'GPIO',
        'pwm_frequency': 1000,
        'pwm_duty_cycle': 0,
        'pull_updown': 'NONE',
        'edge_detect': 'NONE',
        'name': f'GPIO{pin}',
        'description': '',
        'last_trigger': None,
        'drive_strength': '8mA',  # Default drive strength
        'slew_rate': 'SLOW',     # Default slew rate
        'hysteresis': True,      # Default hysteresis enabled
        'software_pwm': False    # Whether using software PWM
    } 
    for pin in PIN_DEFINITIONS['GPIO']
}

# Store PWM objects
pwm_objects = {}

def setup_gpio():
    if IS_PI:
        for pin in pin_states:
            GPIO.setup(pin, GPIO.OUT)
            GPIO.output(pin, GPIO.LOW)

def edge_callback(channel):
    pin_states[channel]['last_trigger'] = time.time()
    socketio.emit('pin_state_change', {
        'pin': channel,
        'state': GPIO.input(channel) if IS_PI else pin_states[channel]['state'],
        'last_trigger': pin_states[channel]['last_trigger']
    })

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    user = User(
        username=data['username'],
        password_hash=generate_password_hash(data['password']),
        role=data.get('role', 'user')
    )
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role
            }
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401

# Pin preset routes
@app.route('/api/presets', methods=['GET'])
@jwt_required()
def get_presets():
    user_id = get_jwt_identity()
    presets = PinPreset.query.filter_by(user_id=user_id).all()
    return jsonify([{
        'id': preset.id,
        'name': preset.name,
        'configuration': preset.configuration
    } for preset in presets])

@app.route('/api/presets', methods=['POST'])
@jwt_required()
def create_preset():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    preset = PinPreset(
        name=data['name'],
        configuration=data['configuration'],
        user_id=user_id
    )
    db.session.add(preset)
    db.session.commit()
    
    return jsonify({
        'id': preset.id,
        'name': preset.name,
        'configuration': preset.configuration
    }), 201

# Audit logging function
def log_action(user_id, action, pin_number=None, details=None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        pin_number=pin_number,
        details=details
    )
    db.session.add(log)
    db.session.commit()

# Add JWT requirement to existing routes
@app.route('/api/pins', methods=['GET'])
@jwt_required()
def get_pins():
    user_id = get_jwt_identity()
    log_action(user_id, 'get_pins')
    return jsonify({
        'pins': pin_states,
        'definitions': PIN_DEFINITIONS
    })

@app.route('/api/pins/<int:pin_number>', methods=['POST'])
@jwt_required()
def control_pin(pin_number):
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if pin_number not in pin_states:
        return jsonify({'error': 'Invalid pin number'}), 400
    
    action = data.get('action')
    if action not in ['HIGH', 'LOW']:
        return jsonify({'error': 'Invalid action'}), 400

    log_action(user_id, 'control_pin', pin_number, {'action': action})
    
    if IS_PI:
        if pin_states[pin_number]['function'] == 'GPIO':
            GPIO.output(pin_number, GPIO.HIGH if action == 'HIGH' else GPIO.LOW)
    
    pin_states[pin_number]['state'] = action == 'HIGH'
    socketio.emit('pin_state_change', {
        'pin': pin_number,
        'state': pin_states[pin_number]['state']
    })
    
    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/config', methods=['POST'])
@jwt_required()
def configure_pin(pin_number):
    user_id = get_jwt_identity()
    data = request.get_json()
    log_action(user_id, 'configure_pin', pin_number, data)
    
    if pin_number not in pin_states:
        return jsonify({'error': 'Invalid pin number'}), 400
    
    # Update pin name and description
    if 'name' in data:
        pin_states[pin_number]['name'] = data['name']
    if 'description' in data:
        pin_states[pin_number]['description'] = data['description']

    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/mode', methods=['POST'])
@jwt_required()
def set_pin_mode(pin_number):
    user_id = get_jwt_identity()
    data = request.get_json()
    log_action(user_id, 'set_pin_mode', pin_number, data)
    
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
@jwt_required()
def set_pin_function(pin_number):
    user_id = get_jwt_identity()
    data = request.get_json()
    log_action(user_id, 'set_pin_function', pin_number, data)
    
    if pin_number not in pin_states:
        return jsonify({'error': 'Invalid pin number'}), 400
    
    function = data.get('function')
    if function not in ['GPIO', 'PWM', 'I2C', 'SPI', 'UART']:
        return jsonify({'error': 'Invalid function'}), 400

    # Validate pin function compatibility
    if function == 'PWM' and pin_number not in PIN_DEFINITIONS['PWM']['Hardware'] and not pin_states[pin_number]['software_pwm']:
        return jsonify({'error': 'Pin does not support PWM'}), 400
    elif function == 'I2C' and pin_number not in [PIN_DEFINITIONS['I2C']['I2C0']['SDA'], PIN_DEFINITIONS['I2C']['I2C0']['SCL']]:
        return jsonify({'error': 'Pin does not support I2C'}), 400
    elif function == 'UART' and pin_number not in [PIN_DEFINITIONS['UART']['UART0']['TX'], PIN_DEFINITIONS['UART']['UART0']['RX']]:
        return jsonify({'error': 'Pin does not support UART'}), 400

    if IS_PI:
        if function == 'PWM':
            if pin_number in pwm_objects:
                pwm_objects[pin_number].stop()
            GPIO.setup(pin_number, GPIO.OUT)
            pwm_objects[pin_number] = GPIO.PWM(pin_number, pin_states[pin_number]['pwm_frequency'])
            pwm_objects[pin_number].start(pin_states[pin_number]['pwm_duty_cycle'])

    pin_states[pin_number]['function'] = function
    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/pwm', methods=['POST'])
@jwt_required()
def set_pwm(pin_number):
    user_id = get_jwt_identity()
    data = request.get_json()
    log_action(user_id, 'set_pwm', pin_number, data)
    
    if pin_number not in pin_states or pin_states[pin_number]['function'] != 'PWM':
        return jsonify({'error': 'Invalid pin or not in PWM mode'}), 400
    
    frequency = data.get('frequency', pin_states[pin_number]['pwm_frequency'])
    duty_cycle = data.get('duty_cycle', pin_states[pin_number]['pwm_duty_cycle'])
    
    if IS_PI and pin_number in pwm_objects:
        if 'frequency' in data:
            pwm_objects[pin_number].ChangeFrequency(frequency)
        if 'duty_cycle' in data:
            pwm_objects[pin_number].ChangeDutyCycle(duty_cycle)
    
    if 'frequency' in data:
        pin_states[pin_number]['pwm_frequency'] = frequency
    if 'duty_cycle' in data:
        pin_states[pin_number]['pwm_duty_cycle'] = duty_cycle
    
    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/edge', methods=['POST'])
@jwt_required()
def set_edge_detect(pin_number):
    user_id = get_jwt_identity()
    data = request.get_json()
    log_action(user_id, 'set_edge_detect', pin_number, data)
    
    if pin_number not in pin_states or pin_states[pin_number]['mode'] != 'IN':
        return jsonify({'error': 'Invalid pin or not in input mode'}), 400
    
    edge = data.get('edge', 'NONE')
    if edge not in ['NONE', 'RISING', 'FALLING', 'BOTH']:
        return jsonify({'error': 'Invalid edge detection mode'}), 400

    if IS_PI:
        if edge == 'NONE':
            GPIO.remove_event_detect(pin_number)
        else:
            GPIO.remove_event_detect(pin_number)
            GPIO.add_event_detect(
                pin_number,
                GPIO.RISING if edge == 'RISING' else GPIO.FALLING if edge == 'FALLING' else GPIO.BOTH,
                callback=edge_callback,
                bouncetime=50
            )
    
    pin_states[pin_number]['edge_detect'] = edge
    return jsonify({'success': True})

@app.route('/api/pins/<int:pin_number>/advanced', methods=['POST'])
@jwt_required()
def set_pin_advanced(pin_number):
    """Configure advanced pin settings available on Raspberry Pi 5"""
    user_id = get_jwt_identity()
    data = request.get_json()
    log_action(user_id, 'set_pin_advanced', pin_number, data)
    
    if pin_number not in pin_states:
        return jsonify({'error': 'Invalid pin number'}), 400
    
    if IS_PI:
        try:
            # Set drive strength (2mA, 4mA, 8mA, 12mA, 16mA)
            if 'drive_strength' in data:
                drive_strength = data['drive_strength']
                if drive_strength not in ['2mA', '4mA', '8mA', '12mA', '16mA']:
                    return jsonify({'error': 'Invalid drive strength'}), 400
                subprocess.run(['raspi-gpio', 'set', str(pin_number), 'dl', drive_strength[:-2]], check=True)
                pin_states[pin_number]['drive_strength'] = drive_strength

            # Set slew rate (FAST/SLOW)
            if 'slew_rate' in data:
                slew_rate = data['slew_rate']
                if slew_rate not in ['FAST', 'SLOW']:
                    return jsonify({'error': 'Invalid slew rate'}), 400
                subprocess.run(['raspi-gpio', 'set', str(pin_number), 'sl', '1' if slew_rate == 'FAST' else '0'], check=True)
                pin_states[pin_number]['slew_rate'] = slew_rate

            # Set hysteresis (ON/OFF)
            if 'hysteresis' in data:
                hysteresis = bool(data['hysteresis'])
                subprocess.run(['raspi-gpio', 'set', str(pin_number), 'hy', '1' if hysteresis else '0'], check=True)
                pin_states[pin_number]['hysteresis'] = hysteresis

        except Exception as e:
            return jsonify({'error': f'Failed to set advanced settings: {str(e)}'}), 500

    return jsonify({'success': True})

@app.route('/api/system/info', methods=['GET'])
@jwt_required()
def get_system_info():
    user_id = get_jwt_identity()
    log_action(user_id, 'get_system_info')
    try:
        temp = os.popen('vcgencmd measure_temp').readline().replace('temp=', '').replace('\'C\n', '')
        voltage = os.popen('vcgencmd measure_volts core').readline().replace('volt=', '').replace('V\n', '')
        memory = os.popen('free -h').readlines()[1].split()[1:4]
        cpu = os.popen('top -bn1 | grep "Cpu(s)"').readline().split()[1]
        
        return jsonify({
            'temperature': float(temp),
            'voltage': float(voltage),
            'memory': {
                'total': memory[0],
                'used': memory[1],
                'free': memory[2]
            },
            'cpu_usage': float(cpu),
            'is_pi': IS_PI
        })
    except:
        return jsonify({
            'temperature': 0,
            'voltage': 0,
            'memory': {'total': '0', 'used': '0', 'free': '0'},
            'cpu_usage': 0,
            'is_pi': IS_PI
        })

@app.route('/api/system/power', methods=['GET'])
@jwt_required()
def get_power_info():
    """Get detailed power information from the Raspberry Pi"""
    user_id = get_jwt_identity()
    log_action(user_id, 'get_power_info')
    try:
        # Get various voltage readings
        core_volt = os.popen('vcgencmd measure_volts core').readline().strip()
        sdram_c_volt = os.popen('vcgencmd measure_volts sdram_c').readline().strip()
        sdram_i_volt = os.popen('vcgencmd measure_volts sdram_i').readline().strip()
        sdram_p_volt = os.popen('vcgencmd measure_volts sdram_p').readline().strip()
        
        # Get clock speeds
        arm_clock = os.popen('vcgencmd measure_clock arm').readline().strip()
        core_clock = os.popen('vcgencmd measure_clock core').readline().strip()
        h264_clock = os.popen('vcgencmd measure_clock h264').readline().strip()
        isp_clock = os.popen('vcgencmd measure_clock isp').readline().strip()
        v3d_clock = os.popen('vcgencmd measure_clock v3d').readline().strip()
        
        # Get throttling status
        throttled = os.popen('vcgencmd get_throttled').readline().strip()
        
        # Get memory split
        gpu_mem = os.popen('vcgencmd get_mem gpu').readline().strip()
        arm_mem = os.popen('vcgencmd get_mem arm').readline().strip()
        
        return jsonify({
            'voltages': {
                'core': core_volt,
                'sdram_c': sdram_c_volt,
                'sdram_i': sdram_i_volt,
                'sdram_p': sdram_p_volt
            },
            'clocks': {
                'arm': arm_clock,
                'core': core_clock,
                'h264': h264_clock,
                'isp': isp_clock,
                'v3d': v3d_clock
            },
            'memory': {
                'gpu': gpu_mem,
                'arm': arm_mem
            },
            'throttling': throttled
        })
    except Exception as e:
        return jsonify({
            'error': f'Failed to get power information: {str(e)}'
        }), 500

@app.route('/api/system/config', methods=['GET'])
@jwt_required()
def get_config():
    """Get Raspberry Pi configuration information"""
    user_id = get_jwt_identity()
    log_action(user_id, 'get_config')
    try:
        # Get various configuration settings
        config_data = {}
        
        # Read from /boot/config.txt if it exists
        if os.path.exists('/boot/config.txt'):
            with open('/boot/config.txt', 'r') as f:
                config_data['boot_config'] = f.read()
        
        # Get DT overlays
        overlays = os.popen('dtoverlay -l').readline().strip()
        config_data['active_overlays'] = overlays
        
        # Get current governor
        with open('/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor', 'r') as f:
            config_data['cpu_governor'] = f.read().strip()
        
        return jsonify(config_data)
    except Exception as e:
        return jsonify({
            'error': f'Failed to get configuration: {str(e)}'
        }), 500

def cleanup():
    if IS_PI:
        for pwm in pwm_objects.values():
            pwm.stop()
        GPIO.cleanup()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Initialize database tables
        
        # Create default admin user if it doesn't exist
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                password_hash=generate_password_hash('admin'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
    
    setup_gpio()
    try:
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    finally:
        cleanup()
