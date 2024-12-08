import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  Box,
  Slider,
  Paper,
  Alert
} from '@mui/material';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = 'http://localhost:5000';
const socket = io(API_URL);

const PIN_FUNCTIONS = {
  PWM: [12, 13, 18, 19],
  I2C: [2, 3],
  SPI: [7, 8, 9, 10, 11],
  UART: [14, 15]
};

function App() {
  const [pins, setPins] = useState({});
  const [sshStatus, setSshStatus] = useState(null);

  useEffect(() => {
    // Fetch initial pin states
    fetchPins();
    fetchSSHStatus();

    // Listen for real-time updates
    socket.on('pin_state_change', ({ pin, state }) => {
      setPins(prev => ({
        ...prev,
        [pin]: { ...prev[pin], state }
      }));
    });

    return () => {
      socket.off('pin_state_change');
    };
  }, []);

  const fetchSSHStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ssh/status`);
      setSshStatus(response.data);
    } catch (error) {
      console.error('Error fetching SSH status:', error);
    }
  };

  const fetchPins = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pins`);
      setPins(response.data);
    } catch (error) {
      console.error('Error fetching pins:', error);
    }
  };

  const handlePinToggle = async (pinNumber) => {
    try {
      const newState = !pins[pinNumber].state;
      await axios.post(`${API_URL}/api/pins/${pinNumber}`, {
        action: newState ? 'HIGH' : 'LOW'
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleModeChange = async (pinNumber, mode) => {
    try {
      await axios.post(`${API_URL}/api/pins/${pinNumber}/mode`, { mode });
      setPins(prev => ({
        ...prev,
        [pinNumber]: { ...prev[pinNumber], mode }
      }));
    } catch (error) {
      console.error('Error changing pin mode:', error);
    }
  };

  const handleFunctionChange = async (pinNumber, newFunction) => {
    try {
      await axios.post(`${API_URL}/api/pins/${pinNumber}/function`, {
        function: newFunction
      });
      setPins(prev => ({
        ...prev,
        [pinNumber]: { ...prev[pinNumber], function: newFunction }
      }));
    } catch (error) {
      console.error('Error changing pin function:', error);
    }
  };

  const handlePWMChange = async (pinNumber, type, value) => {
    try {
      await axios.post(`${API_URL}/api/pins/${pinNumber}/pwm`, {
        [type]: value
      });
      setPins(prev => ({
        ...prev,
        [pinNumber]: { ...prev[pinNumber], [`pwm_${type}`]: value }
      }));
    } catch (error) {
      console.error('Error setting PWM:', error);
    }
  };

  const handlePullChange = async (pinNumber, pull) => {
    try {
      await axios.post(`${API_URL}/api/pins/${pinNumber}/pull`, { pull });
      setPins(prev => ({
        ...prev,
        [pinNumber]: { ...prev[pinNumber], pull_updown: pull }
      }));
    } catch (error) {
      console.error('Error setting pull-up/down:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Raspberry Pi GPIO Controller
          </Typography>
        </Toolbar>
      </AppBar>
      
      {sshStatus && (
        <Paper sx={{ p: 2, m: 2 }}>
          <Typography variant="h6" gutterBottom>
            SSH Connection Details
          </Typography>
          <Alert severity="info">
            Connect via SSH using: ssh pi@{sshStatus.address}
            <br />
            Hostname: {sshStatus.hostname}
          </Alert>
        </Paper>
      )}

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {Object.entries(pins).map(([pinNumber, pinData]) => (
            <Grid item xs={12} sm={6} md={4} key={pinNumber}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    GPIO {pinNumber}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Function</InputLabel>
                        <Select
                          value={pinData.function}
                          label="Function"
                          onChange={(e) => handleFunctionChange(parseInt(pinNumber), e.target.value)}
                        >
                          <MenuItem value="GPIO">GPIO</MenuItem>
                          {PIN_FUNCTIONS.PWM.includes(parseInt(pinNumber)) && 
                            <MenuItem value="PWM">PWM</MenuItem>
                          }
                          {PIN_FUNCTIONS.I2C.includes(parseInt(pinNumber)) && 
                            <MenuItem value="I2C">I2C</MenuItem>
                          }
                          {PIN_FUNCTIONS.SPI.includes(parseInt(pinNumber)) && 
                            <MenuItem value="SPI">SPI</MenuItem>
                          }
                          {PIN_FUNCTIONS.UART.includes(parseInt(pinNumber)) && 
                            <MenuItem value="UART">UART</MenuItem>
                          }
                        </Select>
                      </FormControl>
                    </Grid>

                    {pinData.function === 'GPIO' && (
                      <>
                        <Grid item xs={6}>
                          <FormControl fullWidth>
                            <InputLabel>Mode</InputLabel>
                            <Select
                              value={pinData.mode}
                              label="Mode"
                              onChange={(e) => handleModeChange(parseInt(pinNumber), e.target.value)}
                            >
                              <MenuItem value="IN">Input</MenuItem>
                              <MenuItem value="OUT">Output</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography component="div">
                            State: {pinData.state ? 'HIGH' : 'LOW'}
                            <Switch
                              checked={pinData.state}
                              onChange={() => handlePinToggle(parseInt(pinNumber))}
                              disabled={pinData.mode === 'IN'}
                            />
                          </Typography>
                        </Grid>
                        {pinData.mode === 'IN' && (
                          <Grid item xs={12}>
                            <FormControl fullWidth>
                              <InputLabel>Pull Up/Down</InputLabel>
                              <Select
                                value={pinData.pull_updown}
                                label="Pull Up/Down"
                                onChange={(e) => handlePullChange(parseInt(pinNumber), e.target.value)}
                              >
                                <MenuItem value="NONE">None</MenuItem>
                                <MenuItem value="UP">Pull Up</MenuItem>
                                <MenuItem value="DOWN">Pull Down</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                        )}
                      </>
                    )}

                    {pinData.function === 'PWM' && (
                      <>
                        <Grid item xs={12}>
                          <Typography gutterBottom>
                            Frequency: {pinData.pwm_frequency} Hz
                          </Typography>
                          <Slider
                            value={pinData.pwm_frequency}
                            onChange={(_, value) => handlePWMChange(parseInt(pinNumber), 'frequency', value)}
                            min={1}
                            max={10000}
                            step={1}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Typography gutterBottom>
                            Duty Cycle: {pinData.pwm_duty_cycle}%
                          </Typography>
                          <Slider
                            value={pinData.pwm_duty_cycle}
                            onChange={(_, value) => handlePWMChange(parseInt(pinNumber), 'duty_cycle', value)}
                            min={0}
                            max={100}
                            step={1}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
