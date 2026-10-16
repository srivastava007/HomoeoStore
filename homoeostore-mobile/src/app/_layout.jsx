import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="retail-billing" options={{ headerShown: false }} />
      <Stack.Screen name="stock-update" options={{ headerShown: false }} />
    </Stack>
  );
}
