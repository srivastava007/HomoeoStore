import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, Button } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { API_URL } from '../../constants/config';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function StockUpdateForm() {
  const router = useRouter();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [barcodeData, setBarcodeData] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search States
  const [companies, setCompanies] = useState([]);
  const [companyQuery, setCompanyQuery] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [medicines, setMedicines] = useState([]);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const [selectedType, setSelectedType] = useState('');
  const [selectedPacking, setSelectedPacking] = useState('');
  const [selectedPower, setSelectedPower] = useState('');

  // Form States
  const [batchNo, setBatchNo] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mrp, setMrp] = useState('');
  const [expM, setExpM] = useState('');
  const [expY, setExpY] = useState('');
  const [godown, setGodown] = useState('G1');
  const [locationType, setLocationType] = useState('BOX');
  const [locationValue, setLocationValue] = useState('');
  
  const [allBatches, setAllBatches] = useState([]);
  const [gridSearch, setGridSearch] = useState('');

  useEffect(() => {
    fetchCompanies();
    fetchAllBatches();
  }, []);

  const fetchAllBatches = async () => {
    try {
      const res = await fetch(`${API_URL}/getAllStockBatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [] })
      });
      const data = await res.json();
      if (data.success) {
        setAllBatches(data.data);
      }
    } catch (error) {
      console.log('Error fetching all batches:', error);
    }
  };

  // Local filtering logic exactly like desktop
  const locationItems = locationValue
    ? allBatches.filter(i => {
        const matchesGodown = i.godown === godown;
        const matchesLocation = (i.location_value || '').toLowerCase() === locationValue.toLowerCase();
        const matchesSearch = gridSearch.length > 0 ? ((i.medicine_name || '').toLowerCase().includes(gridSearch.toLowerCase()) || (i.company || '').toLowerCase().includes(gridSearch.toLowerCase()) || (i.batch_no || '').toLowerCase().includes(gridSearch.toLowerCase())) : true;
        return matchesGodown && matchesLocation && matchesSearch;
    })
    : [];

  useEffect(() => {
    if (companyQuery.trim() !== '') {
      fetchMedicines(companyQuery);
    } else {
      setMedicines([]);
      setSelectedMedicine(null);
    }
  }, [companyQuery]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/getCompanies`, { method: 'POST', body: JSON.stringify({args:[]}), headers: { 'Content-Type': 'application/json' } });
      const result = await res.json();
      if (result.success) setCompanies(result.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMedicines = async (companyName) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/searchMedicinesPaginated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [{ search: companyName, page: 1, limit: 9999 }] })
      });
      const result = await res.json();
      
      const meds = result?.data?.data || result?.data || [];
      console.log(`Fetched ${meds.length} medicines for company: ${companyName}`);
      
      setMedicines(meds);
    } catch (err) {
      console.error('Error fetching medicines:', err);
      setMedicines([]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    console.log('--- ACTION: Clicked Save Stock Update ---');
    if (!selectedMedicine) {
      console.log('Validation Failed: No medicine selected');
      Alert.alert('Validation', 'Please select a medicine');
      return;
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      console.log('Validation Failed: Invalid quantity', quantity);
      Alert.alert('Validation', 'Please enter a valid quantity');
      return;
    }
    if (!batchNo) {
      console.log('Validation Failed: No batch number');
      Alert.alert('Validation', 'Batch number is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        medicine_id: selectedMedicine.id,
        company: selectedMedicine.company,
        batch_no: batchNo,
        quantity: parseInt(quantity),
        mrp: parseFloat(mrp) || 0,
        dis_percent: 0,
        expiry_month: expM ? parseInt(expM) : null,
        expiry_year: expY ? parseInt(expY) : null,
        godown: godown,
        location_type: locationType,
        location_value: locationValue
      };
      
      console.log('Payload being sent to /addStockBatch:', JSON.stringify(payload, null, 2));

      const res = await fetch(`${API_URL}/addStockBatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [payload] })
      });
      const data = await res.json();
      
      console.log('API Response for Stock Update:', data);

      if (data.success) {
        Alert.alert('Success', 'Stock updated successfully!');
        // Clear some fields
        setBatchNo('');
        setQuantity('');
        setMrp('');
        setExpM('');
        setExpY('');
        setBarcodeData(null);
        // Refresh the batches
        fetchAllBatches();
      } else {
        console.log('API Error:', data.error);
        Alert.alert('Error', data.error || 'Failed to update stock');
      }
    } catch (err) {
      console.error('Network Error during save:', err);
      Alert.alert('Network Error', 'Could not save stock');
    }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 15 }}>
        
        <TouchableOpacity 
          style={styles.scanLauncherBtn} 
          onPress={() => {
            if (!permission?.granted) {
              requestPermission();
            }
            setShowScanner(true);
            setScanned(false);
          }}
        >
          <MaterialCommunityIcons name="barcode-scan" size={20} color="#fff" style={{marginRight: 8}} />
          <Text style={{color: '#fff', fontWeight: 'bold'}}>Launch Barcode Scanner</Text>
        </TouchableOpacity>

        {barcodeData && (
          <View style={styles.scannedDataContainer}>
            <Text style={styles.scannedTitle}>Scanned Barcode / QR Data:</Text>
            <Text style={styles.scannedText}>{barcodeData}</Text>
          </View>
        )}

        {/* Search Medicine Section */}
        <View style={[styles.card, { zIndex: 2000 }]}>
          <Text style={styles.sectionTitle}>Select Medicine</Text>
          
          <View style={[styles.inputContainer, { zIndex: 1000 }]}>
            <Text style={styles.label}>COMPANY</Text>
            <View style={styles.inputWrapper}>
              <TextInput 
                style={styles.inputInner}
                placeholder="Search Company..."
                value={companyQuery}
                onChangeText={(text) => {
                  console.log('User typed company search:', text);
                  setCompanyQuery(text);
                  setShowCompanyDropdown(true);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
              />
            </View>
            {showCompanyDropdown && companies && companies.length > 0 && (
              <View style={styles.dropdown}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                  {companies
                    .filter(c => c.name.toLowerCase().includes(companyQuery.toLowerCase()))
                    .map((comp, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        console.log('User selected company:', comp.name);
                        setCompanyQuery(comp.name);
                        setShowCompanyDropdown(false);
                        setShowMedicineDropdown(true);
                      }}
                    >
                      <Text style={styles.dropdownText}>{comp.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={[styles.inputContainer, { zIndex: 900 }]}>
            <Text style={styles.label}>MEDICINE</Text>
            <View style={styles.inputWrapper}>
              <TextInput 
                style={styles.inputInner}
                placeholder="Search Medicine..."
                value={medicineQuery}
                onChangeText={(text) => {
                  console.log('User typed medicine search:', text);
                  setMedicineQuery(text);
                  setSelectedMedicine(null);
                  setShowMedicineDropdown(true);
                }}
                onFocus={() => {
                  if (companyQuery.trim()) {
                    setShowMedicineDropdown(true);
                  }
                }}
                editable={!!companyQuery.trim()}
              />
            </View>
            {loading && <ActivityIndicator size="small" color={COLORS.primary} style={{marginTop: 5}} />}
            {!loading && showMedicineDropdown && (() => {
              if (!medicines || medicines.length === 0) return null;
              
              let filteredMedicines = medicines;
              if (medicineQuery.trim().length > 0) {
                const queryTerms = medicineQuery.toLowerCase().split(' ').filter(Boolean);
                filteredMedicines = medicines.filter(item => {
                  const searchStr = `${item.name} ${item.potency || ''} ${item.category || ''}`.toLowerCase();
                  return queryTerms.every(term => searchStr.includes(term));
                });
              }

              if (filteredMedicines.length === 0) return null;

              const displayMedicines = filteredMedicines.slice(0, 50);

              return (
                <View style={[{ marginTop: 4, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#10b981', maxHeight: 250, overflow: 'hidden' }, Platform.OS === 'web' && { position: 'absolute', top: 60, left: 0, right: 0, zIndex: 9999, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: {width: 0, height: 4} }]}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                    {displayMedicines.map((item) => (
                      <TouchableOpacity 
                        key={item.id}  
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                        onPress={() => {
                          console.log('User selected medicine:', item.name, 'ID:', item.id);
                          setMedicineQuery(item.name.trim());
                          setSelectedMedicine(item);
                          setSelectedType(item.category || '');
                          setSelectedPacking(item.unit || '');
                          setSelectedPower(item.potency || '');
                          setShowMedicineDropdown(false);
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
                            Qty: {item.stock_quantity || 0}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              );
            })()}
          </View>

          {selectedMedicine && medicineQuery.trim() !== '' && (
            <View style={{ marginTop: 15 }}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>TYPE</Text>
                <View style={[styles.inputWrapper, selectedType ? {backgroundColor: '#f8fafc'} : {}]}>
                  <MaterialCommunityIcons name="pill" size={16} color="#2563eb" style={{ marginLeft: 10, marginRight: 6 }} />
                  <TextInput style={styles.inputInner} placeholder="Type..." value={selectedType} editable={false} />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>PACKING</Text>
                <View style={[styles.inputWrapper, selectedPacking ? {backgroundColor: '#f8fafc'} : {}]}>
                  <Feather name="box" size={16} color="#94a3b8" style={{ marginLeft: 10, marginRight: 6 }} />
                  <TextInput style={styles.inputInner} placeholder="Packing..." value={selectedPacking} editable={false} />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>POWER</Text>
                <View style={[styles.inputWrapper, selectedPower ? {backgroundColor: '#f8fafc'} : {}]}>
                  <Feather name="zap" size={16} color="#94a3b8" style={{ marginLeft: 10, marginRight: 6 }} />
                  <TextInput style={styles.inputInner} placeholder="Power..." value={selectedPower} editable={false} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Stock Entry Section */}
        <View style={[styles.card, { zIndex: 1 }]}>
          <Text style={styles.sectionTitle}>Stock Details</Text>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 5 }]}>
              <Text style={styles.label}>BATCH NO</Text>
              <TextInput style={styles.input} value={batchNo} onChangeText={(t) => { console.log('User typed batch no:', t); setBatchNo(t); }} placeholder="e.g. B123" />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 5 }]}>
              <Text style={styles.label}>QUANTITY</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={(t) => { console.log('User typed quantity:', t); setQuantity(t); }} placeholder="e.g. 10" keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 5 }]}>
              <Text style={styles.label}>MRP (₹)</Text>
              <TextInput style={styles.input} value={mrp} onChangeText={(t) => { console.log('User typed MRP:', t); setMrp(t); }} placeholder="0.00" keyboardType="numeric" />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 5 }]}>
              <Text style={styles.label}>GODOWN</Text>
              <TextInput style={styles.input} value={godown} onChangeText={(t) => { console.log('User typed Godown:', t); setGodown(t); }} placeholder="e.g. G1" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 5 }]}>
              <Text style={styles.label}>EXPIRY MONTH</Text>
              <TextInput style={styles.input} value={expM} onChangeText={(t) => { console.log('User typed Exp Month:', t); setExpM(t); }} placeholder="MM (01-12)" keyboardType="numeric" maxLength={2} />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 5 }]}>
              <Text style={styles.label}>EXPIRY YEAR</Text>
              <TextInput style={styles.input} value={expY} onChangeText={(t) => { console.log('User typed Exp Year:', t); setExpY(t); }} placeholder="YYYY" keyboardType="numeric" maxLength={4} />
            </View>
          </View>

          <View style={[styles.inputContainer, { marginTop: 15 }]}>
            <Text style={styles.label}>Location</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              
              <TouchableOpacity onPress={() => { console.log('User selected Location Type: BOX'); setLocationType('BOX'); }} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <MaterialIcons name={locationType === 'BOX' ? "radio-button-checked" : "radio-button-unchecked"} size={22} color={locationType === 'BOX' ? COLORS.primary : '#64748b'} />
                <Text style={{ marginLeft: 6, fontSize: 16, color: '#334155', fontWeight: '500' }}>BOX</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { console.log('User selected Location Type: RACK'); setLocationType('RACK'); }} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <MaterialIcons name={locationType === 'RACK' ? "radio-button-checked" : "radio-button-unchecked"} size={22} color={locationType === 'RACK' ? COLORS.primary : '#64748b'} />
                <Text style={{ marginLeft: 6, fontSize: 16, color: '#334155', fontWeight: '500' }}>RACK</Text>
              </TouchableOpacity>

              <TextInput 
                style={[styles.input, { flex: 1, height: 40 }]} 
                placeholder="No." 
                value={locationValue}
                onChangeText={(t) => { console.log('User typed Location Value:', t); setLocationValue(t); }}
              />
            </View>
          </View>

        </View>

        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Stock Update</Text>}
        </TouchableOpacity>

        {/* Items Detail Grid */}
        <View style={[styles.card, { marginTop: 20, padding: 0, overflow: 'hidden' }]}>
          <View style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>Items Detail</Text>
            <TextInput 
              style={[styles.inputInner, { width: 140, height: 35, paddingHorizontal: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4 }]} 
              placeholder="Type to filter..." 
              value={gridSearch}
              onChangeText={(t) => { console.log('User typed Grid Search:', t); setGridSearch(t); }}
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ minWidth: 900 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 15 }}>
                <Text style={[styles.gridHeaderCell, { width: 50 }]}>S.NO</Text>
                <Text style={[styles.gridHeaderCell, { width: 120 }]}>COMPANY</Text>
                <Text style={[styles.gridHeaderCell, { width: 150 }]}>MEDICINE</Text>
                <Text style={[styles.gridHeaderCell, { width: 80 }]}>TYPE</Text>
                <Text style={[styles.gridHeaderCell, { width: 80 }]}>POWER</Text>
                <Text style={[styles.gridHeaderCell, { width: 100 }]}>PACKING</Text>
                <Text style={[styles.gridHeaderCell, { width: 100 }]}>LOCATION</Text>
                <Text style={[styles.gridHeaderCell, { width: 60 }]}>QTY</Text>
                <Text style={[styles.gridHeaderCell, { width: 90 }]}>BATCH</Text>
                <Text style={[styles.gridHeaderCell, { width: 60 }]}>EXP M</Text>
                <Text style={[styles.gridHeaderCell, { width: 60 }]}>EXP Y</Text>
                <Text style={[styles.gridHeaderCell, { width: 80 }]}>MRP</Text>
              </View>

              {/* Rows */}
              {locationItems.map((item, index) => (
                <View key={item.id || index} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 15 }}>
                  <Text style={[styles.gridCell, { width: 50 }]}>{index + 1}</Text>
                  <Text style={[styles.gridCell, { width: 120 }]} numberOfLines={1}>{item.company}</Text>
                  <Text style={[styles.gridCell, { width: 150, fontWeight: '500', color: '#0f172a' }]} numberOfLines={1}>{item.medicine_name}</Text>
                  <Text style={[styles.gridCell, { width: 80 }]}>{item.category}</Text>
                  <Text style={[styles.gridCell, { width: 80 }]}>{item.potency}</Text>
                  <Text style={[styles.gridCell, { width: 100 }]}>{item.unit}</Text>
                  <Text style={[styles.gridCell, { width: 100 }]}>{item.location_type}-{item.location_value}</Text>
                  <Text style={[styles.gridCell, { width: 60, fontWeight: '700', color: '#10b981' }]}>{item.quantity}</Text>
                  <Text style={[styles.gridCell, { width: 90 }]}>{item.batch_no}</Text>
                  <Text style={[styles.gridCell, { width: 60 }]}>{item.expiry_month}</Text>
                  <Text style={[styles.gridCell, { width: 60 }]}>{item.expiry_year}</Text>
                  <Text style={[styles.gridCell, { width: 80, fontWeight: '600' }]}>₹{item.mrp}</Text>
                </View>
              ))}

              {locationItems.length === 0 && (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>No items added yet. Start scanning or adding above.</Text>
                </View>
              )}
            </View>
          </ScrollView>
          
          {/* Footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
            <Text style={{ fontSize: 14, color: '#475569' }}>Selected Godown: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{godown || '—'}</Text></Text>
            <Text style={{ fontSize: 14, color: '#475569' }}>Total Box QTY: <Text style={{ fontWeight: 'bold', color: '#10b981' }}>{locationItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)}</Text></Text>
          </View>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" transparent={false} onRequestClose={() => setShowScanner(false)}>
        {permission && permission.granted ? (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "code128", "code39", "upc_a", "upc_e", "ean8", "pdf417", "aztec", "datamatrix"],
              }}
              onBarcodeScanned={scanned ? undefined : ({ type, data }) => {
                setScanned(true);
                console.log(`Scanned: ${type}, ${data}`);
                setBarcodeData(data);
                setShowScanner(false);
                
                // Parse the specific SBL barcode format
                const regex = /^(\d+\.\d{2})(\d+\.\d{2}\/[a-zA-Z]+)(\d{2}\/\d{4})(\d{2}\/\d{4}|N\/A)([A-Z0-9]*\d)([a-zA-Z\s\.\-\&]+?)(\s*\d+[a-zA-Z]*)$/i;
                const match = data.match(regex);
                if (match) {
                  const mrp = match[1];
                  const exp = match[4];
                  const batch = match[5];
                  const medName = match[6].trim();
                  let power = match[7].trim();
                  
                  if (power.toUpperCase().endsWith('C')) {
                    power = power.slice(0, -1);
                  }

                  setMrp(mrp);
                  setBatchNo(batch);
                  
                  if (exp.toUpperCase() === 'N/A') {
                    setExpM('0');
                    setExpY('0');
                  } else {
                    const parts = exp.split('/');
                    if (parts.length === 2) {
                      setExpM(parts[0]);
                      setExpY(parts[1]);
                    }
                  }
                  
                  const searchQuery = `${medName} ${power}`.trim();
                  setMedicineQuery(searchQuery);
                  setSelectedMedicine(null);
                  setShowMedicineDropdown(true);

                  console.log('Parsed Barcode ->', { batch, exp, medName, power });
                }
              }}
            >
              <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ width: 250, height: 250, borderWidth: 2, borderColor: '#0f0', backgroundColor: 'transparent' }} />
                </View>
                <View style={{ padding: 20, paddingBottom: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', marginBottom: 20 }}>Position barcode inside the box</Text>
                  <TouchableOpacity onPress={() => setShowScanner(false)} style={{ backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close Scanner</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ textAlign: 'center', marginBottom: 20, fontSize: 16 }}>We need your permission to show the camera</Text>
            <Button onPress={requestPermission} title="Grant Permission" />
            <View style={{ marginTop: 20 }}>
              <Button onPress={() => setShowScanner(false)} title="Cancel" color="red" />
            </View>
          </View>
        )}
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scanLauncherBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  scannedDataContainer: {
    backgroundColor: '#e0f2fe',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  scannedTitle: {
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 5,
  },
  scannedText: {
    color: '#0c4a6e',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#fff',
    height: 40,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#fff',
    height: 40,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdown: {
    marginTop: 4, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 6, 
    backgroundColor: '#fff', 
    maxHeight: 150,
    ...(Platform.OS === 'web' && { position: 'absolute', top: 60, left: 0, right: 0, zIndex: 9999, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: {width: 0, height: 4} })
  },
  dropdownItem: {
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9'
  },
  dropdownText: {
    fontSize: 14, 
    color: '#333'
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
