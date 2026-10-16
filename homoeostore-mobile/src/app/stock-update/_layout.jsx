import { Stack } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function StockUpdateLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: COLORS.white,
      },
      headerTintColor: COLORS.text,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Update Stock',
          headerShown: true
        }} 
      />
    </Stack>
  );
}
