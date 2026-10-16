import { Stack } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { CartProvider } from '../../context/CartContext';
import ConnectionStatus from '../../components/ConnectionStatus';

export default function RetailBillingLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTintColor: COLORS.text,
        headerShadowVisible: true,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: COLORS.text,
        },
        headerRight: () => <ConnectionStatus />
      }}>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Search Medicines' 
          }} 
        />
        <Stack.Screen 
          name="checkout" 
          options={{ 
            title: 'Cart & Checkout' 
          }} 
        />
      </Stack>
    </CartProvider>
  );
}
