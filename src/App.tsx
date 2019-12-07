import React, { useState, useEffect, useReducer } from 'react';
import logo from './logo.svg';
import './App.css';
import Button from '@material-ui/core/Button';
import io from 'socket.io-client';
import axios from 'axios'
import { config } from './config'
import { TextField, Box, Paper } from '@material-ui/core';


const initialState = {
  emit: [],
  widgets: []
}

interface Event {
  type: string;
  payload: any;
}
interface EventWithId extends Event {
  id: number;
}
type Reducer = (state: any, event: Event) => any;

interface Widget {
  id: number;
  variant: string;
}
interface BlocksWidget extends Widget {
  blocks: number;
}

const commonLanguage = {
  commands: {
    Connect: 'CONNECT',

    Widgets: {
      Add: 'WIDGETS:ADD',
      Remove: 'WIDGETS:REMOVE',
      Emit: 'WIDGETS:EMIT'
    },
  },
  events: {
    Widgets: {
      Initialized: 'INITIALIZED', // This event is called by all widgets and contain their initial state

      Emitted: 'WIDGETS:EMITTED',
      Removed: 'WIDGETS:REMOVED',
    }
  }
}

const withWidgetEvent = (state: any, { type, id, payload }: EventWithId) => {
  switch (type) {
    case commonLanguage.events.Widgets.Initialized:
      // When widgets are initialized they're added to the state widgets with the provided payload
      return {
        ...state,
        widgets: [
          ...state.widgets,
          { id, ...payload }
        ]
      }
  }
  return state
}
const reducer: Reducer = (state, event) => {
  const { type, payload } = event;

  switch (type) {
    case commonLanguage.events.Widgets.Emitted:
      return withWidgetEvent(state, payload as EventWithId);
    case commonLanguage.events.Widgets.Removed:
      const { id } = payload; // id of widget to remove
      return {
        ...state,
        widgets: state.widgets.filter((widget: any) => widget.id !== id)
      }

  }
  return state
}

const App: React.FC = () => {
  const [logs, setLog] = useState('');
  const [state, dispatch] = useReducer(reducer, initialState);
  const [socket, setSocket] = useState<SocketIOClient.Socket>();


  const addLog = (log: string) => {
    const timePrefix = new Date().toISOString()
    setLog(logs => logs + `${timePrefix}: ${log}\n`);
  }

  const initConnection = async () => {
    try {
      addLog('Reserving socket connection...');
      const api = axios.create({
        baseURL: config.reservations.endpoint,
        timeout: 1000,
        headers: { 'X-Carver-Framework-Version': config.version }
      });

      const reservationRequest = await api.post('/users/login')

      const id = reservationRequest.data.id;
      addLog(`Connecting to socket server with reservation id: ${id}...`);

      const newReservation = reservationRequest.data.reservation;
      const { websocketEndpoint } = newReservation
      const socket = io(websocketEndpoint, {
        query: { id }
      });
      setSocket(socket);

      socket.on('connect', (test: any) => {
        addLog(`Socket connection established successfuly. Welcome to Carver Blockchain Framework!`);

        addLog(`Initializing session...`);
        alert('connect');
        socket.emit('emit', { type: commonLanguage.commands.Connect })
      });
      socket.on('emit', (data: any) => {
        dispatch(data)

        addLog(`Event: ${JSON.stringify(data)}`);
      });


      socket.on(commonLanguage.events.Widgets.Emitted, (payload: any) => {
        dispatch({ type: commonLanguage.events.Widgets.Emitted, payload })
        addLog(`Widget Event: ${JSON.stringify(payload)}`);
      });
      socket.on(commonLanguage.events.Widgets.Removed, (payload: any) => {
        dispatch({ type: commonLanguage.events.Widgets.Removed, payload })
        addLog(`Widget Removed: ${JSON.stringify(payload)}`);
      });


      socket.on('disconnect', () => {
        addLog(`Socket disconnected...`);
      });
    } catch (err) {
      // @todo Proper error handling. World's greatest error handling right here.
      console.log(err);
      addLog('Error connecting!');
      alert('Error connecting!')
    }
  }

  const emit = (type: string, payload: any) => {
    if (!socket) {
      return;
    }

    socket.emit('emit', { type, payload })
  }

  const addWidget = () => {
    emit(commonLanguage.commands.Widgets.Add, {
      variant: 'blocks'
    });
  }
  const removeWidget = (id: number) => {
    emit(commonLanguage.commands.Widgets.Remove, { id });
  }

  useEffect(() => {
    addLog(`Starting Carver Blockchain Framework (Version ${config.version})...`);
    initConnection();
  }, [])

  const getWidgets = () => {
    console.log(state.widgets);
    return state.widgets.map((widget: BlocksWidget) => {
      console.log(widget);
      return (
        <Paper>
          <Box p={1} m={1}>
            <Button variant="contained" onClick={() => removeWidget(widget.id)}>
              Remove
            </Button>
            (Widget ID: {widget.id}) Blocks:{widget.blocks}
          </Box>
        </Paper >)
    });
  }

  return (
    <Box p={2}>
      <Box mb={3}>
        <Button variant="contained" onClick={addWidget}>
          Add Widget
      </Button>
      </Box>
      {getWidgets()}
      <TextField
        label="Debug Log"
        fullWidth={true}
        multiline={true}
        value={logs}
        InputProps={{
          readOnly: true,
        }}
      />
    </Box>
  );
}

export default App;
