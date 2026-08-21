import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';

const WS_URL = 'ws://127.0.0.1:8001/ws/traffic';

export const useTrafficData = () => {
  const [traffic, setTraffic] = useState({
    cars: {},
    van: 0,
    motorcycle: 0,
    bus: 0,
    trucks: 0
  });

  const { lastJsonMessage, readyState } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastJsonMessage) {
      setTraffic(lastJsonMessage);
    }
  }, [lastJsonMessage]);

  return { traffic, isConnected: readyState === 1 };
};