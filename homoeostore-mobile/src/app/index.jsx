import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../constants/theme';
import ConnectionStatus from '../components/ConnectionStatus';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Custom Desktop-like Header */}
      <View style={styles.customHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.headerLogoIcon}>🌿</Text>
          <Text style={styles.headerTitle}>HomoeoStore </Text>
          <View style={styles.erpBadge}>
            <Text style={styles.erpBadgeText}>ERP</Text>
          </View>
        </View>
        
        <ConnectionStatus />
      </View>

      <View style={styles.dashboard}>
        <Text style={styles.dashboardTitle}>Dashboard Modules</Text>
        
        {/* Search Medicines & Retail Billing */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => router.push('/retail-billing')}
          activeOpacity={0.8}
        >
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>🛒</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Retail Bill (B2C)</Text>
            <Text style={styles.cardSubtitle}>Create fast bills and manage cart remotely.</Text>
          </View>
        </TouchableOpacity>

        {/* Scan & Update Stock */}
        <TouchableOpacity 
          style={[styles.card, { marginTop: 15, borderLeftColor: '#c026d3' }]} 
          onPress={() => router.push('/stock-update')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIconContainer, { backgroundColor: '#fdf4ff' }]}>
            <Text style={styles.cardIcon}>📱</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Stock Update</Text>
            <Text style={styles.cardSubtitle}>Scan Barcode/QR to update stock.</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  customHeader: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.medium,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  headerLogoIcon: {
    fontSize: 22,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  erpBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  erpBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  dashboard: {
    padding: SIZES.large,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: SIZES.medium,
    borderRadius: SIZES.radius,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  cardIconContainer: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    marginRight: SIZES.medium,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  }
});
