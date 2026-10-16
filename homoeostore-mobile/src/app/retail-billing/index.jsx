import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Modal, Button, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { useCart } from '../../context/CartContext';
import { API_URL } from '../../constants/config';

export default function RetailBillingSearch() {
  const router = useRouter();
  const { cartItems, addToCart } = useCart();
  
  // UI State
  const [companyQuery, setCompanyQuery] = useState('');
  const [medicineQuery, setMedicineQuery] = useState('');
  
  // Data State
  const [medicines, setMedicines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [saleType, setSaleType] = useState('Sealed');
  const [showPackingDropdown, setShowPackingDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [selectedType, setSelectedType] = useState('');
  const [selectedPacking, setSelectedPacking] = useState('');
  const [selectedPower, setSelectedPower] = useState('');
  
  // Modal State
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [discount, setDiscount] = useState('10');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_URL}/getCompanies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [] })
      });
      const result = await response.json();
      if (result.success) {
        setCompanies(result.data);
      }
    } catch (err) {
      console.error('Fetch companies failed:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (medicineQuery.trim().length > 0) {
        // Strip numbers for the backend query so it successfully fetches the base medicine family (e.g. "Arnica 30" -> "Arnica")
        const baseQuery = medicineQuery.replace(/[0-9]/g, '').trim();
        searchMedicines(baseQuery || medicineQuery);
      } else {
        setMedicines([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [medicineQuery]);

  const searchMedicines = async (query) => {
    setLoading(true);
    try {
      const searchQuery = companyQuery.trim() ? `${companyQuery} ${query}` : query;
      const response = await fetch(`${API_URL}/searchMedicinesPaginated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [{ search: searchQuery, page: 1, limit: 20 }] })
      });
      const result = await response.json();
      if (result.success) {
        setMedicines(result.data.data || result.data);
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
    setLoading(false);
  };

  const handleMedicinePress = async (medicine) => {
    console.log('--- Selected Medicine ---', medicine);
    setSelectedMedicine(medicine);
    setSelectedType(medicine.category || '');
    setSelectedPacking(medicine.unit || '');
    setSelectedPower(medicine.potency || '');
    setLoadingBatches(true);
    setSelectedBatch(null);
    setQuantity('1');
    setDiscount('10');
    try {
      const response = await fetch(`${API_URL}/getStockBatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [medicine.id] })
      });
      const result = await response.json();
      if (result.success) {
        setBatches(result.data);
      }
    } catch (err) {
      console.error('Fetch batches failed:', err);
    }
    setLoadingBatches(false);
  };

  const handleAddToCart = () => {
    if (!selectedBatch) {
      alert('Please select a batch first');
      return;
    }
    addToCart({
      medicine_id: selectedMedicine.id,
      medicine_name: selectedMedicine.name,
      batch_id: selectedBatch.id,
      batch_number: selectedBatch.batch_number,
      mrp: selectedBatch.mrp,
      quantity: parseInt(quantity) || 1,
      discount_percent: parseFloat(discount) || 0,
      gst_rate: selectedMedicine.gst_rate || 0,
      sale_type: saleType.toLowerCase()
    });
    setSelectedMedicine(null);
    setMedicineQuery('');
  };

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        
        {/* Company Card */}
        <View style={[styles.card, { zIndex: 2000 }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#d1fae5' }]}>
              <MaterialIcons name="domain" size={24} color="#059669" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Company</Text>
              <Text style={styles.cardSubtitle}>Select or search company</Text>
            </View>
          </View>

          <View style={[styles.columnGroup, { zIndex: 1000 }]}>
            <View style={[styles.inputContainer, { zIndex: 1000 }]}>
              <Text style={styles.label}>COMPANY NAME</Text>
              <View style={[styles.inputWrapper, { borderColor: '#10b981' }]}>
                <Feather name="search" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputInner}
                  placeholder="Type or select company..."
                  value={companyQuery}
                  onChangeText={(text) => {
                    setCompanyQuery(text);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                />
                <Feather name="chevron-down" size={18} color="#94a3b8" />
              </View>
              {showCompanyDropdown && companies.length > 0 && (
                <View style={[{ marginTop: 4, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff', maxHeight: 200 }, Platform.OS === 'web' && { position: 'absolute', top: 75, left: 15, right: 15, zIndex: 9999, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: {width: 0, height: 4} }]}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                    {companies
                      .filter(c => c.name.toLowerCase().includes(companyQuery.toLowerCase()))
                      .map((comp, index) => (
                      <TouchableOpacity 
                        key={comp.id || index}
                        style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                        onPress={() => {
                          setCompanyQuery(comp.name);
                          setShowCompanyDropdown(false);
                        }}
                      >
                        <Text style={{ fontSize: 14, color: '#333' }}>{comp.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={[styles.inputContainer, { zIndex: 900 }]}>
              <Text style={styles.label}>PACKING TYPE</Text>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                onPress={() => setShowPackingDropdown(!showPackingDropdown)}
              >
                <Text style={styles.inputText}>{saleType}</Text>
                <Feather name="chevron-down" size={18} color="#94a3b8" />
              </TouchableOpacity>
              {showPackingDropdown && (
                <View style={[{ marginTop: 4, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff' }, Platform.OS === 'web' && { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 9999, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: {width: 0, height: 4} }]}>
                  {['Sealed', 'Loose'].map((option) => (
                    <TouchableOpacity 
                      key={option} 
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                      onPress={() => {
                        setSaleType(option);
                        setShowPackingDropdown(false);
                      }}
                    >
                      <Text style={{ fontSize: 14, color: '#333' }}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Medicine Card */}
        <View style={[styles.card, { zIndex: 1 }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#dbeafe' }]}>
              <MaterialCommunityIcons name="pill" size={24} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Medicine</Text>
              <Text style={styles.cardSubtitle}>
                {!companyQuery.trim() ? "Please select a company first" : "Search medicine details"}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 15, zIndex: 1000 }}>
            <Text style={styles.label}>MEDICINE NAME</Text>
            <View style={[styles.inputWrapper, { 
              borderColor: companyQuery.trim() ? '#3b82f6' : '#e2e8f0', 
              backgroundColor: companyQuery.trim() ? '#f8fafc' : '#f1f5f9' 
            }]}>
              <Feather name="search" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput 
                style={styles.inputInner}
                placeholder={companyQuery.trim() ? "Search medicine..." : "Locked (Select Company)"}
                value={medicineQuery}
                onChangeText={setMedicineQuery}
                editable={!!companyQuery.trim()}
              />
            </View>
            
            {loading && <ActivityIndicator style={{ marginTop: 10 }} size="small" color="#3b82f6" />}

            {/* Inline Medicine Dropdown inside the Card, floating on Web */}
            {!loading && (() => {
              const queryTerms = medicineQuery.toLowerCase().split(' ').filter(Boolean);
              const filteredMedicines = medicines.filter(item => {
                // Excluded item.unit so that searching for power (e.g. "30") doesn't falsely match "30 ML" packing
                const searchStr = `${item.name} ${item.potency || ''} ${item.category || ''}`.toLowerCase();
                return queryTerms.every(term => searchStr.includes(term));
              });

              if (filteredMedicines.length === 0 || medicineQuery.length === 0) return null;

              return (
                <View style={[{ marginTop: 4, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#10b981', maxHeight: 250, overflow: 'hidden' }, Platform.OS === 'web' && { position: 'absolute', top: 85, left: 0, right: 0, zIndex: 9999, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: {width: 0, height: 4} }]}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                    {filteredMedicines.map((item) => (
                      <TouchableOpacity 
                        key={item.id} 
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                        onPress={() => {
                          handleMedicinePress(item);
                          setMedicineQuery(`${item.name} ${item.potency || ''}`.trim());
                          setMedicines([]);
                        }}
                      >
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', marginRight: 8, color: '#0f172a' }}>{item.name}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b', marginRight: 8, fontWeight: '500' }}>{item.potency || ''}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b', marginRight: 8, fontWeight: '500' }}>{item.unit || ''}</Text>
                          {item.category ? (
                            <Text style={{ fontSize: 11, color: '#3b82f6', fontWeight: '500' }}>[{item.category}]</Text>
                          ) : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '600' }}>
                            Qty: {item.stock_quantity || 0} {item.unit ? `| ${item.unit}` : ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              );
            })()}
          </View>
          
          {saleType === 'Loose' && (
            <View style={styles.columnGroup}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>TYPE</Text>
                <View style={[styles.inputWrapper, selectedType ? {backgroundColor: '#f8fafc'} : {}]}>
                  <MaterialCommunityIcons name="pill" size={16} color="#2563eb" style={{ marginRight: 6 }} />
                  <TextInput style={styles.inputInner} placeholder="Type..." value={selectedType} editable={false} />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>PACKING</Text>
                <View style={[styles.inputWrapper, selectedPacking ? {backgroundColor: '#f8fafc'} : {}]}>
                  <Feather name="box" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                  <TextInput style={styles.inputInner} placeholder="Packing..." value={selectedPacking} editable={false} />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>POWER</Text>
                <View style={[styles.inputWrapper, selectedPower ? {backgroundColor: '#f8fafc'} : {}]}>
                  <Feather name="zap" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                  <TextInput style={styles.inputInner} placeholder="Power..." value={selectedPower} editable={false} />
                </View>
              </View>
            </View>
          )}

          <View style={styles.locationRow}>
            <TouchableOpacity style={styles.viewLocationBtn}>
              <Feather name="map-pin" size={14} color="#2563eb" style={{ marginRight: 6 }} />
              <Text style={styles.viewLocationText}>View Locations</Text>
            </TouchableOpacity>
            <View style={styles.stockZeroBox}>
              <Text style={styles.stockZeroText}>{selectedMedicine ? (selectedMedicine.stock_quantity || 0) : 0}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {cartItems.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingCart}
          onPress={() => router.push('/retail-billing/checkout')}
        >
          <Text style={styles.cartText}>🛒 View Cart ({cartItems.length} items)</Text>
        </TouchableOpacity>
      )}

      {/* Batch Modal */}
      <Modal visible={!!selectedMedicine} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedMedicine?.name}</Text>
            
            {loadingBatches ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : batches.length === 0 ? (
              <Text style={{ textAlign: 'center', margin: 20 }}>Out of Stock</Text>
            ) : (
              <FlatList 
                data={batches}
                keyExtractor={b => b.id.toString()}
                style={{ maxHeight: 250, marginVertical: 10 }}
                renderItem={({ item: batch }) => (
                  <TouchableOpacity 
                    style={[styles.batchCard, selectedBatch?.id === batch.id && styles.batchCardSelected, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => setSelectedBatch(batch)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: '#0f172a' }}>
                        {batch.godown || 'N/A'}  •  {batch.location_type || ''} {batch.location_value || ''}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Batch: {batch.batch_no || '-'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: '#2563eb' }}>
                        Qty: {batch.quantity || 0}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#0f172a', marginTop: 4, fontWeight: '600' }}>
                        MRP: ₹{batch.mrp || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            {selectedBatch && (
              <>
                <View style={[styles.qtyContainer, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600' }}>Qty:</Text>
                    <TextInput 
                      style={[styles.qtyInput, { width: 60 }]}
                      keyboardType="number-pad"
                      value={quantity}
                      onChangeText={setQuantity}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600' }}>Disc(%):</Text>
                    <TextInput 
                      style={[styles.qtyInput, { width: 60 }]}
                      keyboardType="number-pad"
                      value={discount}
                      onChangeText={setDiscount}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}>
                    <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600' }}>GST: </Text>
                    <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '700' }}>{selectedMedicine?.gst_rate || 0}%</Text>
                  </View>
                </View>
                
                <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600' }}>Calculated Amount:</Text>
                  <Text style={{ fontSize: 18, color: '#10b981', fontWeight: 'bold' }}>
                    ₹ {(((parseInt(quantity) || 0) * (selectedBatch.mrp || 0)) - (((parseInt(quantity) || 0) * (selectedBatch.mrp || 0)) * (parseFloat(discount) || 0) / 100)).toFixed(2)}
                  </Text>
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <TouchableOpacity 
                style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, backgroundColor: '#f1f5f9' }} 
                onPress={() => {
                  setSelectedMedicine(null);
                  setMedicineQuery('');
                  setDiscount('10');
                  setSelectedType('');
                  setSelectedPacking('');
                  setSelectedPower('');
                }}
              >
                <Text style={{ fontWeight: '600', color: '#64748b', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ paddingVertical: 10, paddingHorizontal: 30, borderRadius: 6, backgroundColor: '#10b981', elevation: 2, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }} 
                onPress={handleAddToCart}
              >
                <Text style={{ fontWeight: '700', color: '#ffffff', fontSize: 15 }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 0, // removed heavy shadow for cleaner look
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  columnGroup: {
    flexDirection: 'column',
    marginBottom: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 72, 
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputInner: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    height: '100%',
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
  },
  viewLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
  },
  viewLocationText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  stockZeroBox: {
    backgroundColor: '#bfdbfe',
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockZeroText: {
    color: '#1e3a8a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 15,
    marginBottom: 8,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  resultName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  resultCompany: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  stockBadge: {
    backgroundColor: '#64748b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.secondary,
    padding: SIZES.large,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 5
  },
  cartText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SIZES.large,
    minHeight: 400
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.primary
  },
  batchCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    marginBottom: 8
  },
  batchCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E6F4FE'
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15
  },
  qtyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: 8,
    width: 80,
    marginLeft: 10,
    textAlign: 'center',
    fontSize: 16
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  }
});
