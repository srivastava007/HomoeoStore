import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../constants/theme';
import { useCart } from '../../context/CartContext';
import { API_URL } from '../../constants/config';

export default function CheckoutScreen() {
  const router = useRouter();
  const { cartItems, removeFromCart, clearCart } = useCart();
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('0');
  const [loading, setLoading] = useState(false);

  const subTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const itemTotal = item.mrp * item.quantity;
      const itemDiscount = itemTotal * (item.discount_percent || 0) / 100;
      return sum + (itemTotal - itemDiscount);
    }, 0);
  }, [cartItems]);

  const totalItemDiscount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const itemTotal = item.mrp * item.quantity;
      return sum + (itemTotal * (item.discount_percent || 0) / 100);
    }, 0);
  }, [cartItems]);

  const finalTotal = useMemo(() => {
    const d = parseFloat(discount) || 0;
    return Math.max(0, subTotal - d);
  }, [subTotal, discount]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    setLoading(true);
    try {
      // Fetch bills to determine the next bill number
      let nextBillNumberStr = `MOB-${Date.now()}`;
      try {
        const billsResponse = await fetch(`${API_URL}/getBills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args: [] })
        });
        const billsResult = await billsResponse.json();
        if (billsResult.success) {
          const bills = billsResult.data || [];
          let maxNum = 0;
          bills.forEach(b => {
            const str = b.bill_number.toString();
            if (str.includes('/')) {
              const parts = str.split('/');
              const lastPart = Number(parts[parts.length - 1]);
              if (!isNaN(lastPart) && lastPart > maxNum) {
                maxNum = lastPart;
              }
            } else {
              const num = Number(str);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            }
          });
          const currentYear = new Date().getFullYear();
          nextBillNumberStr = `NHP/${currentYear}/${String(maxNum + 1).padStart(4, '0')}`;
        }
      } catch (err) {
        console.log('Failed to fetch bills for numbering, using fallback', err);
      }

      const payload = {
        bill_number: nextBillNumberStr,
        customer_name: customerName || 'Cash',
        customer_phone: customerPhone,
        total_amount: finalTotal, // Final amount to be paid
        discount: totalItemDiscount + (parseFloat(discount) || 0), // Total discount (item-level + additional)
        paid_amount: finalTotal,
        items: cartItems.map(item => ({
          medicine_id: item.medicine_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          unit_price: item.mrp,
          total_price: (item.mrp * item.quantity) - ((item.mrp * item.quantity) * (item.discount_percent || 0) / 100),
          gst_rate: item.gst_rate || 0,
          discount_percent: item.discount_percent || 0,
          sale_type: item.sale_type
        }))
      };

      console.log('--- Sending Bill Payload ---');
      console.log(JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_URL}/createBill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [payload] })
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Bill Saved Successfully!', [
          { text: 'OK', onPress: () => {
              clearCart();
              router.push('/');
          }}
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to save bill');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Could not reach the PC server');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <FlatList 
        data={cartItems}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Cart Items</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.cartItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>{item.medicine_name}</Text>
              <Text style={styles.medDetails}>
                Batch: {item.batch_number} | Qty: {item.quantity} 
                {item.discount_percent > 0 ? ` | Disc: ${item.discount_percent}%` : ''}
                {item.gst_rate > 0 ? ` | GST: ${item.gst_rate}%` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.price}>
                ₹{((item.mrp * item.quantity) - ((item.mrp * item.quantity) * (item.discount_percent || 0) / 100)).toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => removeFromCart(index)}>
                <Text style={styles.removeBtn}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            <TextInput 
              style={styles.input}
              placeholder="Customer Name (Optional, defaults to Cash)"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <TextInput 
              style={styles.input}
              placeholder="Phone Number (Optional)"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />

            <Text style={styles.sectionTitle}>Bill Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Subtotal (After Item Discounts):</Text>
              <Text style={styles.summaryValue}>₹{subTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Additional Flat Disc (₹):</Text>
              <TextInput 
                style={styles.discountInput}
                keyboardType="numeric"
                value={discount}
                onChangeText={setDiscount}
              />
            </View>
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 10, marginTop: 10 }]}>
              <Text style={[styles.summaryText, { fontWeight: 'bold', fontSize: 20 }]}>Final Total:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.secondary, fontSize: 22 }]}>₹{finalTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.checkoutBtn, loading && { opacity: 0.7 }]}
              onPress={handleCheckout}
              disabled={loading}
            >
              <Text style={styles.checkoutBtnText}>{loading ? 'Saving Bill...' : 'Confirm & Save Bill'}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginVertical: 10,
    marginLeft: SIZES.medium
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SIZES.medium,
    marginHorizontal: SIZES.medium,
    marginBottom: SIZES.small,
    borderRadius: SIZES.radius,
    elevation: 1
  },
  medName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text
  },
  medDetails: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text
  },
  removeBtn: {
    color: COLORS.danger,
    marginTop: 8,
    fontSize: 13,
    fontWeight: 'bold'
  },
  formContainer: {
    padding: SIZES.medium,
    backgroundColor: COLORS.white,
    marginTop: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 10,
    fontSize: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  summaryText: {
    fontSize: 16,
    color: COLORS.text
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text
  },
  discountInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: 8,
    width: 100,
    textAlign: 'right',
    fontSize: 16
  },
  checkoutBtn: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  checkoutBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold'
  }
});
