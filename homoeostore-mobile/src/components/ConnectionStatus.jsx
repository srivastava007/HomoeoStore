import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { API_URL } from '../constants/config';

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const baseUrl = API_URL.replace('/api', '');
        await fetch(baseUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (isMounted) setIsConnected(true);
      } catch (error) {
        if (isMounted) setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={[styles.onlineBadge, !isConnected && styles.offlineBadge]}>
      <View style={[styles.onlineDot, !isConnected && styles.offlineDot]} />
      <Text style={[styles.onlineText, !isConnected && styles.offlineText]}>
        {isConnected ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  offlineBadge: {
    backgroundColor: '#ffebee',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  offlineDot: {
    backgroundColor: COLORS.error,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  offlineText: {
    color: COLORS.error,
  }
});
