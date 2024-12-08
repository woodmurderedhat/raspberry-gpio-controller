import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, Container, Grid, Card, CardContent,
  Switch, FormControl, Select, MenuItem, Slider, TextField,
  IconButton, Box, Paper, Chip, Tooltip, LinearProgress, Accordion, AccordionSummary, AccordionDetails, ExpandMore, InputLabel
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { styled } from '@mui/system';
import {
  PowerSettingsNew, Memory, Speed, Settings,
  DeviceThermostat, Memory as MemoryIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  backgroundColor: status ? '#4caf50' : '#f44336',
  color: '#fff',
  marginLeft: theme.spacing(1),
}));

function App() {
  const [pins, setPins] = useState({});
  const [systemInfo, setSystemInfo] = useState({
    temperature: 0,
    voltage: 0,
    memory: { total: '0', used: '0', free: '0' },
    cpu_usage: 0,
    is_pi: false
  });
  const [pinDefinitions, setPinDefinitions] = useState({
    GPIO: [],
    PWM: [],
    I2C: {},
    SPI: {},
    UART: {}
  });
  const [powerInfo, setPowerInfo] = useState({
    voltages: {},
    clocks: {},
    memory: {},
    throttling: ''
  });
  const [configInfo, setConfigInfo] = useState({
    boot_config: '',
    active_overlays: '',
    cpu_governor: ''
  });

  useEffect(() => {
    const socket = io('http://localhost:5000');
    
    socket.on('pin_state_change', (data) => {
      setPins(prev => ({
        ...prev,
        [data.pin]: {
          ...prev[data.pin],
          state: data.state,
          last_trigger: data.last_trigger
        }
      }));
    });

    // Fetch initial data
    const fetchData = async () => {
      try {
        const [pinsRes, systemRes, powerRes, configRes] = await Promise.all([
          fetch('http://localhost:5000/api/pins'),
          fetch('http://localhost:5000/api/system/info'),
          fetch('http://localhost:5000/api/system/power'),
          fetch('http://localhost:5000/api/system/config')
        ]);

        const [pinsData, systemData, powerData, configData] = await Promise.all([
          pinsRes.json(),
          systemRes.json(),
          powerRes.json(),
          configRes.json()
        ]);

        setPins(pinsData.pins);
        setPinDefinitions(pinsData.definitions);
        setSystemInfo(systemData);
        setPowerInfo(powerData);
        setConfigInfo(configData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handlePinToggle = (pinNumber) => {
    const newState = !pins[pinNumber].state;
    fetch(`http://localhost:5000/api/pins/${pinNumber}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: newState ? 'HIGH' : 'LOW' })
    });
  };

  const handlePinFunction = (pinNumber, newFunction) => {
    fetch(`http://localhost:5000/api/pins/${pinNumber}/function`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ function: newFunction })
    });
  };

  const handlePinMode = (pinNumber, newMode) => {
    fetch(`http://localhost:5000/api/pins/${pinNumber}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode })
    });
  };

  const handlePWMChange = (pinNumber, type, value) => {
    fetch(`http://localhost:5000/api/pins/${pinNumber}/pwm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [type]: value })
    });
  };

  const handleEdgeDetect = (pinNumber, edge) => {
    fetch(`http://localhost:5000/api/pins/${pinNumber}/edge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edge })
    });
  };

  const handlePinConfig = (pinNumber, config) => {
    fetch(`http://localhost:5000/api/pins/${pinNumber}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  };

  const handleAdvancedSettings = (pinNumber, settings) => {
    fetch(`http://localhost:5000/api/pins/${pinNumber}/advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static">
          <Toolbar>
            <Memory sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Raspberry Pi GPIO Controller
            </Typography>
            <StatusChip
              label={systemInfo.is_pi ? 'Connected to Pi' : 'Development Mode'}
              status={systemInfo.is_pi}
            />
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4 }}>
          {/* System Info Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <StyledCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DeviceThermostat color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Temperature</Typography>
                  </Box>
                  <Typography variant="h4">{systemInfo.temperature}°C</Typography>
                </CardContent>
              </StyledCard>
            </Grid>
            <Grid item xs={12} md={3}>
              <StyledCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Speed color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">CPU Usage</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ mr: 2 }}>
                      {systemInfo.cpu_usage}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={systemInfo.cpu_usage}
                      sx={{ flexGrow: 1 }}
                    />
                  </Box>
                </CardContent>
              </StyledCard>
            </Grid>
            <Grid item xs={12} md={3}>
              <StyledCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MemoryIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Memory</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ mr: 2 }}>
                      {systemInfo.memory.used}/{systemInfo.memory.total}
                    </Typography>
                  </Box>
                </CardContent>
              </StyledCard>
            </Grid>
            <Grid item xs={12} md={3}>
              <StyledCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Settings color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Core Voltage</Typography>
                  </Box>
                  <Typography variant="h4">{systemInfo.voltage}V</Typography>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>

          {/* System Monitoring Section */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom>System Status</Typography>
            <Grid container spacing={3}>
              {/* Power Information */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">Power Status</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">Core Voltage</Typography>
                        <Typography>{powerInfo.voltages.core || 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">ARM Clock</Typography>
                        <Typography>
                          {powerInfo.clocks.arm ? 
                            `${(parseInt(powerInfo.clocks.arm.split('=')[1]) / 1000000).toFixed(0)} MHz` : 
                            'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">GPU Memory</Typography>
                        <Typography>{powerInfo.memory.gpu || 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">Throttling Status</Typography>
                        <Chip 
                          label={powerInfo.throttling ? 'Active' : 'Normal'}
                          color={powerInfo.throttling ? 'error' : 'success'}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Configuration Information */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">System Configuration</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">CPU Governor</Typography>
                        <Typography>{configInfo.cpu_governor || 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Active Overlays</Typography>
                        <Typography 
                          sx={{ 
                            maxHeight: 100, 
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {configInfo.active_overlays || 'None'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* GPIO Pins Grid */}
          <Grid container spacing={3}>
            {Object.entries(pins).map(([pinNumber, pin]) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={pinNumber}>
                <StyledCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">
                        {pin.name || `GPIO ${pinNumber}`}
                      </Typography>
                      <IconButton
                        color={pin.state ? 'primary' : 'default'}
                        onClick={() => handlePinToggle(parseInt(pinNumber))}
                        disabled={pin.mode === 'IN' || pin.function !== 'GPIO'}
                      >
                        <PowerSettingsNew />
                      </IconButton>
                    </Box>

                    <TextField
                      size="small"
                      label="Description"
                      value={pin.description}
                      onChange={(e) => handlePinConfig(parseInt(pinNumber), { description: e.target.value })}
                      fullWidth
                      sx={{ mb: 2 }}
                    />

                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <Select
                        value={pin.function}
                        onChange={(e) => handlePinFunction(parseInt(pinNumber), e.target.value)}
                      >
                        <MenuItem value="GPIO">GPIO</MenuItem>
                        {pinDefinitions.PWM.includes(parseInt(pinNumber)) && (
                          <MenuItem value="PWM">PWM</MenuItem>
                        )}
                        {(pinDefinitions.I2C.SDA === parseInt(pinNumber) || 
                          pinDefinitions.I2C.SCL === parseInt(pinNumber)) && (
                          <MenuItem value="I2C">I2C</MenuItem>
                        )}
                        {Object.values(pinDefinitions.SPI.SPI0).includes(parseInt(pinNumber)) && (
                          <MenuItem value="SPI">SPI</MenuItem>
                        )}
                        {(pinDefinitions.UART.TXD === parseInt(pinNumber) || 
                          pinDefinitions.UART.RXD === parseInt(pinNumber)) && (
                          <MenuItem value="UART">UART</MenuItem>
                        )}
                      </Select>
                    </FormControl>

                    {pin.function === 'GPIO' && (
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <Select
                          value={pin.mode}
                          onChange={(e) => handlePinMode(parseInt(pinNumber), e.target.value)}
                        >
                          <MenuItem value="IN">Input</MenuItem>
                          <MenuItem value="OUT">Output</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    {pin.function === 'PWM' && (
                      <>
                        <Typography gutterBottom>Frequency (Hz)</Typography>
                        <Slider
                          value={pin.pwm_frequency}
                          onChange={(e, value) => handlePWMChange(parseInt(pinNumber), 'frequency', value)}
                          min={1}
                          max={10000}
                          valueLabelDisplay="auto"
                        />
                        <Typography gutterBottom>Duty Cycle (%)</Typography>
                        <Slider
                          value={pin.pwm_duty_cycle}
                          onChange={(e, value) => handlePWMChange(parseInt(pinNumber), 'duty_cycle', value)}
                          min={0}
                          max={100}
                          valueLabelDisplay="auto"
                        />
                      </>
                    )}

                    {pin.mode === 'IN' && (
                      <FormControl fullWidth size="small">
                        <Select
                          value={pin.edge_detect}
                          onChange={(e) => handleEdgeDetect(parseInt(pinNumber), e.target.value)}
                        >
                          <MenuItem value="NONE">No Edge Detection</MenuItem>
                          <MenuItem value="RISING">Rising Edge</MenuItem>
                          <MenuItem value="FALLING">Falling Edge</MenuItem>
                          <MenuItem value="BOTH">Both Edges</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    {pin.last_trigger && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Last Trigger: {new Date(pin.last_trigger * 1000).toLocaleTimeString()}
                      </Typography>
                    )}

                    {/* Advanced Pin Settings */}
                    <Accordion sx={{ mt: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>Advanced Settings</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                          <InputLabel>Drive Strength</InputLabel>
                          <Select
                            value={pin.drive_strength}
                            label="Drive Strength"
                            onChange={(e) => handleAdvancedSettings(parseInt(pinNumber), { 
                              drive_strength: e.target.value 
                            })}
                          >
                            {['2mA', '4mA', '8mA', '12mA', '16mA'].map(strength => (
                              <MenuItem key={strength} value={strength}>{strength}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                          <InputLabel>Slew Rate</InputLabel>
                          <Select
                            value={pin.slew_rate}
                            label="Slew Rate"
                            onChange={(e) => handleAdvancedSettings(parseInt(pinNumber), { 
                              slew_rate: e.target.value 
                            })}
                          >
                            <MenuItem value="FAST">Fast</MenuItem>
                            <MenuItem value="SLOW">Slow</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControlLabel
                          control={
                            <Switch
                              checked={pin.hysteresis}
                              onChange={(e) => handleAdvancedSettings(parseInt(pinNumber), { 
                                hysteresis: e.target.checked 
                              })}
                            />
                          }
                          label="Hysteresis"
                        />

                        {pin.function === 'PWM' && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={pin.software_pwm}
                                onChange={(e) => handleAdvancedSettings(parseInt(pinNumber), { 
                                  software_pwm: e.target.checked 
                                })}
                              />
                            }
                            label="Software PWM"
                          />
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
