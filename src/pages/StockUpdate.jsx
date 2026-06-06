import { useState, useEffect, useMemo, useCallback } from 'react'

function AutocompleteDropdown({ value, onChange, options, onEnter, placeholder, id, inputStyle, maxItems = 50 }) {
    const [show, setShow] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState(0)

    const filtered = show ? options.filter(o => {
        const searchStr = (o.name || '').toLowerCase();
        const searchTerms = String(value||'').toLowerCase().split(/\s+/).filter(Boolean);
        return searchTerms.every(term => searchStr.includes(term));
    }).slice(0, maxItems) : []

    function handleKeyDown(e) {
        if (!show) {
            if (e.key === 'Enter') {
                e.preventDefault();
                onEnter();
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setShow(true);
            }
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedIdx(prev => prev < filtered.length - 1 ? prev + 1 : prev)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedIdx(prev => prev > 0 ? prev - 1 : prev)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (focusedIdx >= 0 && focusedIdx < filtered.length) {
                onChange(filtered[focusedIdx].name)
                setShow(false)
                setFocusedIdx(-1)
                setTimeout(onEnter, 50)
            } else {
                setShow(false)
                onEnter()
            }
        } else if (e.key === 'Escape') {
            setShow(false)
            setFocusedIdx(0)
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input 
                id={id}
                style={{...inputStyle, padding: '4px 8px', fontSize: '12px', height: '30px', borderRadius: '4px', border: '1px solid #cbd5e1', transition: 'all 0.2s'}}
                value={value}
                onChange={e => { onChange(e.target.value); setShow(true); setFocusedIdx(0); }}
                onFocus={() => { setShow(true); setFocusedIdx(0); }}
                onBlur={() => setTimeout(() => setShow(false), 200)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
            />
            {show && filtered.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                    background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px',
                    maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    marginTop: '4px'
                }}>
                    {filtered.map((opt, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                onChange(opt.name)
                                setShow(false)
                                setTimeout(onEnter, 50)
                            }}
                            onMouseEnter={() => setFocusedIdx(idx)}
                            style={{
                                padding: '10px 14px', fontSize: '14px', cursor: 'pointer',
                                fontFamily: 'Outfit, sans-serif', borderBottom: '1px solid #f8fafc',
                                background: focusedIdx === idx ? '#f0fdf4' : '#fff',
                                color: focusedIdx === idx ? '#16a34a' : '#1e293b',
                                fontWeight: focusedIdx === idx ? '600' : '500'
                            }}
                        >
                            {opt.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function StockUpdate() {
    const [medicines, setMedicines] = useState([])
    const [companies, setCompanies] = useState([])
    const [godowns, setGodowns] = useState([])
    const [allBatches, setAllBatches] = useState([])
    const [medicineBatches, setMedicineBatches] = useState([])
    const [errorMsg, setErrorMsg] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [types, setTypes] = useState([])
    const [powers, setPowers] = useState([])
    const [packings, setPackings] = useState([])

    function showError(msg) {
        setErrorMsg(msg)
        setTimeout(() => setErrorMsg(''), 3000)
    }
    const [selectedMed, setSelectedMed] = useState(null)

    // Search state (same pattern as Billing.jsx)
    const [search, setSearch] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [focusedMedIndex, setFocusedMedIndex] = useState(0)

    // Transaction mode: 'update' (add new) or 'alter' (edit existing)
    const [transactionMode, setTransactionMode] = useState('update')
    const [editingBatchId, setEditingBatchId] = useState(null)

    // Bottom search bar
    const [gridSearch, setGridSearch] = useState('')

    // Current entry state
    const [currentEntry, setCurrentEntry] = useState({
        company: '',
        medicine: '',
        medicine_id: null,
        type: '',
        packing: '',
        power: '',
        godown: '',
        locationType: 'BOX',
        locationValue: '',
        qty: '',
        batch: '',
        expMonth: '',
        expYear: '',
        mrp: '',
        disPercent: ''
    })

    const handleScan = useCallback((scannedText) => {
        if (transactionMode !== 'update') return; // Don't auto-fill while editing

        console.log("Scanned:", scannedText);
        let parsedBatch = '';
        let parsedExpM = '';
        let parsedExpY = '';
        let parsedMrp = '';

        // Check for Semicolon separated format (e.g., 6108IN46928D;Staphysagria 30;11 ml;0614026108)
        let parsedMedicine = '';
        let parsedPacking = '';
        let parsedPower = '';
        let parsedType = '';

        if (scannedText.includes(';')) {
            const parts = scannedText.split(';');
            if (parts.length >= 3) {
                parsedBatch = parts[0]; 
                
                // Parse Medicine and Power from parts[1] (e.g. "Staphysagria 30")
                let rawMed = parts[1].trim();
                let medParts = rawMed.split(' ');
                if (medParts.length > 1) {
                    let lastPart = medParts[medParts.length - 1].toUpperCase();
                    // Detect if last part is a homoeopathic power
                    if (/^(\d+X?|Q|MT|CM|1M|10M|50M|LM\d+)$/i.test(lastPart)) {
                        parsedPower = lastPart;
                        parsedMedicine = medParts.slice(0, -1).join(' ');
                        
                        if (lastPart !== 'Q' && lastPart !== 'MT') {
                            parsedType = 'Dilution';
                        } else {
                            parsedType = 'Mother Tincture';
                        }
                    } else {
                        parsedMedicine = rawMed;
                    }
                } else {
                    parsedMedicine = rawMed;
                }
                
                parsedPacking = parts[2]; 
            } else {
                parsedBatch = scannedText;
            }
        } else {
            // Universal SBL Format Parsing
            // Find all dates (MM/YYYY)
            const dateMatches = scannedText.match(/\d{2}\/\d{4}/g);

            if (dateMatches && dateMatches.length >= 2) {
                // Usually, the second date is the Expiry date
                const exp = dateMatches[1];
                const [m, y] = exp.split('/');
                parsedExpM = m;
                parsedExpY = y;

                // Extract MRP: very first number with 2 decimals
                const mrpMatch = scannedText.match(/^(\d+\.\d{2})/);
                if (mrpMatch) parsedMrp = mrpMatch[1];

                // Extract Batch: 2 letters followed by numbers (e.g., HM250333 or HL240165)
                const batchMatch = scannedText.match(/[a-zA-Z]{2}\d{5,}/);
                if (batchMatch) {
                    // SBL batches are usually 8 characters. Any trailing digits are often alcohol %.
                    parsedBatch = batchMatch[0].substring(0, 8);
                } else {
                    // Fallback
                    parsedBatch = '';
                }
            } else if (scannedText.length === 13 && /^\d+$/.test(scannedText)) {
                // It's a standard 13-digit EAN/UPC product barcode (e.g., 8902456530426)
                // This barcode identifies the product, NOT the batch/expiry.
                // We can put it in the Batch field temporarily, or leave it blank.
                parsedBatch = scannedText;
            } else {
                // Fallback for unknown formats
                parsedBatch = scannedText;
            }
        }

        setTimeout(() => {
            setSearch(parsedMedicine || (prevSearch => prevSearch));
            setShowSearch(true);
            
            setCurrentEntry(prev => ({
                ...prev,
                medicine: parsedMedicine || prev.medicine,
                type: parsedType || prev.type,
                power: parsedPower || prev.power,
                packing: parsedPacking || prev.packing,
                batch: parsedBatch,
                expMonth: parsedExpM || prev.expMonth,
                expYear: parsedExpY || prev.expYear,
                mrp: parsedMrp || prev.mrp
            }));

            showError(`Barcode Scanned! Details auto-filled.`);
            
            // Focus location input after scanning
            document.getElementById('stock-loc-value')?.focus();
        }, 50);

    }, [transactionMode]);

    async function load() {
        const [m, c, g, batches, cats, pows, packs] = await Promise.all([
            window.api.getMedicines(),
            window.api.getCompanies(),
            window.api.getGodowns(),
            window.api.getAllStockBatches(),
            window.api.getCategories(),
            window.api.getPowers(),
            window.api.getPackings()
        ])
        const processedMeds = (m || []).map(item => {
            const name = item.name || '';
            const potency = item.potency || '';
            const company = item.company || '';
            return {
                ...item,
                nameLower: name.toLowerCase(),
                companyLower: company.toLowerCase(),
                _searchKey: `${name} ${potency} ${company}`.toLowerCase()
            };
        });
        setMedicines(processedMeds)
        setCompanies(c || [])
        setGodowns(g || [])
        setTypes(cats || [])
        setPowers(pows || [])
        setPackings(packs || [])
        
        const mappedBatches = (batches || []).map(b => ({
            id: b.id,
            company: b.company,
            medicine: b.medicine_name,
            medicine_id: b.medicine_id,
            type: b.category,
            power: b.potency,
            packing: b.unit,
            qty: b.quantity,
            batch: b.batch_no,
            expMonth: b.expiry_month,
            expYear: b.expiry_year,
            mrp: b.mrp,
            godown: b.godown,
            locationType: b.location_type,
            locationValue: b.location_value
        }))
        setAllBatches(mappedBatches)

        if (g && g.length > 0) {
            setCurrentEntry(prev => ({ ...prev, godown: prev.godown || g[0].name }))
        }
    }

    useEffect(() => { load() }, [])

    // Resolve precise medicine_id based on selected Name, Type, Packing, Power
    const resolvedMedId = useMemo(() => {
        if (currentEntry.medicine) {
            const match = medicines.find(m => 
                m.name.toLowerCase() === currentEntry.medicine.toLowerCase() &&
                (m.category || '').toLowerCase() === (currentEntry.type || '').toLowerCase() &&
                (m.unit || '').toLowerCase() === (currentEntry.packing || '').toLowerCase() &&
                (m.potency || '').toLowerCase() === (currentEntry.power || '').toLowerCase()
            )
            return match ? match.id : null
        }
        return null
    }, [currentEntry.medicine, currentEntry.type, currentEntry.packing, currentEntry.power, medicines])

    // Update currentEntry medicine_id if resolved changes
    useEffect(() => {
        if (currentEntry.medicine_id !== resolvedMedId) {
            setCurrentEntry(prev => ({ ...prev, medicine_id: resolvedMedId }))
        }
    }, [resolvedMedId, currentEntry.medicine_id])

    // Load batches only when an exact medicine is resolved (all 4 fields matched)
    useEffect(() => {
        if (resolvedMedId) {
            window.api.getStockBatches(resolvedMedId).then(b => setMedicineBatches(b || []))
        } else {
            setMedicineBatches([])
        }
    }, [resolvedMedId])

    // Sync existing quantity when medicines update
    useEffect(() => {
        if (selectedMed && medicines.length > 0) {
            const updatedMed = medicines.find(m => m.id === selectedMed.id)
            if (updatedMed && updatedMed.stock_quantity !== selectedMed.stock_quantity) {
                setSelectedMed(updatedMed)
            }
        }
    }, [medicines, selectedMed])

    // Scroll to focused medicine item
    useEffect(() => {
        if (showSearch && focusedMedIndex >= 0) {
            document.getElementById(`stock-med-item-${focusedMedIndex}`)?.scrollIntoView({ block: 'nearest' })
        }
    }, [focusedMedIndex, showSearch])

    // Filtered search list (Optimized for fast typing/backspace)
    const filtered = useMemo(() => {
        if (!showSearch) return []
        
        const companyLower = (currentEntry.company || '').toLowerCase()
        const searchTerms = search.toLowerCase().split(' ').filter(t => t.trim() !== '')
        
        return medicines.filter(m => {
            const matchesCompany = companyLower ? m.companyLower === companyLower : true
            
            const matchesSearch = searchTerms.length === 0 ? true : searchTerms.every(term => {
                if (m._searchKey) return m._searchKey.includes(term);
                const inName = (m.name || '').toLowerCase().includes(term)
                const inPotency = (m.potency || '').toLowerCase().includes(term)
                const isPureNumber = /^\d+$/.test(term)
                const inUnit = !isPureNumber && (m.unit || '').toLowerCase().includes(term)
                return inName || inPotency || inUnit
            })
            
            return matchesCompany && matchesSearch
        })
    }, [showSearch, medicines, currentEntry.company, search])

    // Grid search filter based on current godown and location
    const displayItems = currentEntry.locationValue
        ? allBatches.filter(i => {
            const matchesGodown = i.godown === currentEntry.godown
            const matchesLocation = (i.locationValue || '').toLowerCase() === currentEntry.locationValue.toLowerCase()
            const matchesSearch = gridSearch.length > 0 ? (i.medicine || '').toLowerCase().includes(gridSearch.toLowerCase()) : true
            return matchesGodown && matchesLocation && matchesSearch
        })
        : []

    // Total box quantity
    const totalBoxQty = displayItems.reduce((sum, item) => sum + Number(item.qty), 0)

    // Dynamic dropdown options based on selected medicine and type
    const sameNameMedicines = useMemo(() => {
        if (!currentEntry.medicine) return [];
        const medNameLower = currentEntry.medicine.toLowerCase();
        return medicines.filter(m => m.nameLower === medNameLower);
    }, [medicines, currentEntry.medicine]);
        
    const sameNameAndTypeMedicines = useMemo(() => {
        if (!currentEntry.type) return sameNameMedicines;
        const typeLower = currentEntry.type.toLowerCase();
        return sameNameMedicines.filter(m => (m.category || '').toLowerCase() === typeLower);
    }, [sameNameMedicines, currentEntry.type]);
    
    const availableTypes = useMemo(() => {
        if (sameNameMedicines.length === 0) return types;
        return types.filter(t => sameNameMedicines.some(m => (m.category || '').toLowerCase() === t.name.toLowerCase()));
    }, [sameNameMedicines, types]);

    const availablePackings = useMemo(() => {
        if (sameNameMedicines.length === 0) return packings;
        return packings.filter(p => sameNameAndTypeMedicines.some(m => (m.unit || '').toLowerCase() === p.name.toLowerCase()));
    }, [sameNameMedicines, sameNameAndTypeMedicines, packings]);

    const availablePowers = useMemo(() => {
        if (sameNameMedicines.length === 0) return powers;
        return powers.filter(p => sameNameAndTypeMedicines.some(m => (m.potency || '').toLowerCase() === p.name.toLowerCase()));
    }, [sameNameMedicines, sameNameAndTypeMedicines, powers]);

    function selectMedicine(m) {
        setCurrentEntry({
            ...currentEntry,
            company: m.company || '',
            medicine: m.name,
            medicine_id: m.id,
            type: m.category || '',
            packing: m.unit || '',
            power: m.potency || ''
        })
        setSearch(m.name)
        setShowSearch(false)
        setSelectedMed(m)
        setEditingBatchId(null)

        // Focus the first field that wasn't auto-filled
        setTimeout(() => {
            if (!m.category) { document.getElementById('stock-type-input')?.focus() }
            else if (!m.unit) { document.getElementById('stock-packing-input')?.focus() }
            else if (!m.potency && (!m.category || m.category.toLowerCase() !== 'mt')) { document.getElementById('stock-power-input')?.focus() }
            else { document.getElementById('stock-godown-select')?.focus() }
        }, 50)
    }

    function handleMedKeyDown(e) {
        if (!showSearch) {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setShowSearch(true)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                document.getElementById('stock-type-input')?.focus()
            }
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedMedIndex(prev => prev < filtered.length - 1 ? prev + 1 : prev)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedMedIndex(prev => prev > 0 ? prev - 1 : prev)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (focusedMedIndex >= 0 && focusedMedIndex < filtered.length) {
                selectMedicine(filtered[focusedMedIndex])
                setFocusedMedIndex(-1)
            } else if (filtered.length > 0) {
                selectMedicine(filtered[0])
            } else {
                setShowSearch(false)
                document.getElementById('stock-type-input')?.focus()
            }
        } else if (e.key === 'Escape') {
            setShowSearch(false)
            setFocusedMedIndex(0)
        }
    }

    async function handleAdd() {
        if (!currentEntry.medicine || !currentEntry.medicine_id) return showError('Select a medicine first')
        if (!currentEntry.qty || Number(currentEntry.qty) <= 0) {
            document.getElementById('stock-qty-input')?.focus()
            return showError('Enter a valid quantity')
        }
        if (!currentEntry.mrp || String(currentEntry.mrp).trim() === '') {
            document.getElementById('stock-mrp-input')?.focus()
            return showError('MRP is required before adding')
        }

        const batchData = {
            medicine_id: currentEntry.medicine_id,
            company: currentEntry.company,
            batch_no: currentEntry.batch.trim() || '-',
            quantity: Number(currentEntry.qty),
            mrp: Number(currentEntry.mrp) || 0,
            dis_percent: Number(currentEntry.disPercent) || 0,
            expiry_month: Number(currentEntry.expMonth) || 0,
            expiry_year: Number(currentEntry.expYear) || 0,
            godown: currentEntry.godown,
            location_type: currentEntry.locationType,
            location_value: currentEntry.locationValue
        }

        try {
            if (transactionMode === 'alter' && editingBatchId) {
                await window.api.updateStockBatch({ id: editingBatchId, ...batchData })
                setEditingBatchId(null)
            } else {
                await window.api.addStockBatch(batchData)
            }
        } catch (err) {
            return showError('Error saving batch: ' + (err.message || err))
        }

        // Refresh batches for selected medicine
        if (selectedMed) {
            window.api.getStockBatches(selectedMed.id).then(b => setMedicineBatches(b || []))
        }

        // Reload medicines and all batches for updated stock
        await load()

        // Reset entry fields (keep company and location context)
        setCurrentEntry({
            ...currentEntry,
            medicine: '',
            medicine_id: null,
            type: '',
            packing: '',
            power: '',
            qty: '',
            batch: '',
            expMonth: '',
            expYear: '',
            mrp: '',
            disPercent: ''
        })
        setSearch('')
        setSelectedMed(null)
        setEditingBatchId(null)

        setTimeout(() => {
            document.getElementById('stock-medicine-input')?.focus()
        }, 50)
    }

    function handleGridRowClick(item) {
        if (transactionMode === 'alter') {
            setCurrentEntry({
                company: item.company || '',
                medicine: item.medicine || '',
                medicine_id: item.medicine_id || null,
                type: item.type || '',
                packing: item.packing || '',
                power: item.power || '',
                godown: item.godown || '',
                locationType: item.locationType || 'BOX',
                locationValue: item.locationValue || '',
                qty: String(item.qty || ''),
                batch: item.batch || '',
                expMonth: String(item.expMonth || ''),
                expYear: String(item.expYear || ''),
                mrp: String(item.mrp || ''),
                disPercent: String(item.disPercent || '')
            })
            setSearch(item.medicine || '')
            setEditingBatchId(item.id)
            // Find the selected medicine object
            const med = medicines.find(m => m.id === item.medicine_id)
            if (med) setSelectedMed(med)
        }
    }

    async function removeItem(id) {
        try {
            await window.api.deleteStockBatch(id)
        } catch (err) {
            showError('Error deleting: ' + err.message)
        }
        if (selectedMed) {
            window.api.getStockBatches(selectedMed.id).then(b => setMedicineBatches(b || []))
        }
        await load()
    }

    function handleCancel() {
        setEditingBatchId(null)
        setTransactionMode('update')
        setCurrentEntry({
            company: '', medicine: '', medicine_id: null, type: '', packing: '', power: '',
            godown: currentEntry.godown, locationType: 'BOX', locationValue: '', qty: '', batch: '', expMonth: '', expYear: '', mrp: '', disPercent: ''
        })
        setSearch('')
        setSelectedMed(null)
        document.getElementById('stock-company-input')?.focus()
        setMedicineBatches([])
        setGridSearch('')
    }

    // Enter-key navigation helper
    function enterNav(nextId) {
        return (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                document.getElementById(nextId)?.focus()
            }
        }
    }

    // Style tokens (Premium Theme - Compact)
    const inputStyle = {
        padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1',
        fontSize: '12px', fontFamily: 'Outfit, sans-serif', outline: 'none',
        width: '100%', boxSizing: 'border-box', color: '#0f172a',
        transition: 'all 0.2s', background: '#fff', height: '30px'
    }

    const darkInputStyle = inputStyle;

    const labelStyle = {
        fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '2px', display: 'block', letterSpacing: '0.01em'
    }

    const sectionStyle = {
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '10px 14px',
        background: '#ffffff',
        boxShadow: '0 1px 3px -1px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', gap: '8px'
    }

    const legendStyle = {
        fontSize: '14px',
        fontWeight: '700',
        color: '#0f172a',
        margin: '0 0 2px 0',
        letterSpacing: '-0.01em'
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative', gap: '8px' }}>
            
            {/* Custom Error Toast */}
            {errorMsg && (
                <div style={{
                    position: 'fixed', bottom: '32px', right: '32px',
                    background: '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '10px',
                    fontWeight: '600', fontSize: '14px', zIndex: 99999,
                    boxShadow: '0 10px 25px -5px rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', gap: '12px',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span> {errorMsg}
                </div>
            )}

            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>Stock Update</h1>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: '500' }}>Manage inventory and barcodes</p>
                </div>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '6px 6px 6px 16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '20px' }}>📷</span>
                        <input 
                            type="text" 
                            placeholder="Scan Barcode Here..." 
                            id="dedicated-scan-input"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleScan(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'; }}
                            onBlur={e => { e.target.style.boxShadow = 'none'; }}
                            style={{ 
                                padding: '8px 12px', 
                                border: 'none', 
                                background: '#f8fafc',
                                borderRadius: '8px', 
                                outline: 'none',
                                width: '280px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#0f172a',
                                transition: 'all 0.2s'
                            }} 
                        />
                    </div>

                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
                {/* LEFT PANEL */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>

                    {/* Company Section */}
                    <div style={sectionStyle}>
                        <div style={legendStyle}>Company</div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Name</label>
                                <AutocompleteDropdown
                                    id="stock-company-input"
                                    inputStyle={inputStyle}
                                    value={currentEntry.company || ''}
                                    onChange={val => {
                                        setCurrentEntry({ ...currentEntry, company: val, medicine: '', medicine_id: null, type: '', packing: '', power: '' })
                                        setSearch('')
                                        setSelectedMed(null)
                                    }}
                                    options={companies}
                                    onEnter={() => document.getElementById('stock-medicine-input')?.focus()}
                                    placeholder="Type or select company..."
                                    maxItems={1000}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Medicine Name Section */}
                    <div style={{ ...sectionStyle, borderLeft: '4px solid #3b82f6' }}>
                        <div style={legendStyle}>Medicine Details</div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 3, position: 'relative' }}>
                                <label style={labelStyle}>Medicine Name</label>
                                <input
                                    id="stock-medicine-input"
                                    style={{ ...darkInputStyle, fontWeight: '600' }}
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setShowSearch(true); setFocusedMedIndex(0) }}
                                    onFocus={(e) => {
                                        setShowSearch(true);
                                        e.target.style.borderColor = '#10b981'
                                        e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#cbd5e1'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                    onKeyDown={handleMedKeyDown}
                                    placeholder="Search medicine..."
                                    autoComplete="off"
                                />
                                {filtered.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        zIndex: 9999,
                                        background: '#fff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        boxSizing: 'border-box',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                        marginTop: '4px',
                                        animation: 'slideDown 0.2s ease-out'
                                    }}>
                                        {filtered.slice(0, 1000).map((m, idx) => {
                                            const isHighlighted = idx === focusedMedIndex
                                            return (
                                                <div
                                                    key={m.id}
                                                    id={`stock-med-item-${idx}`}
                                                    onClick={() => selectMedicine(m)}
                                                    onMouseEnter={() => setFocusedMedIndex(idx)}
                                                    style={{
                                                        padding: '10px 14px',
                                                        fontSize: '14px',
                                                        fontFamily: 'Outfit, sans-serif',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #f1f5f9',
                                                        background: isHighlighted ? '#f0fdf4' : '#fff',
                                                        color: isHighlighted ? '#16a34a' : '#1e293b',
                                                        fontWeight: isHighlighted ? '600' : '500',
                                                        borderLeft: isHighlighted ? '3px solid #16a34a' : '3px solid transparent',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    <span>{m.name}</span>
                                                    {m.potency && <span style={{ opacity: 0.6, marginLeft: '6px' }}>({m.potency})</span>}
                                                    {m.unit && <span style={{ opacity: 0.6, marginLeft: '6px' }}>- {m.unit}</span>}
                                                    <span style={{ float: 'right', color: isHighlighted ? '#16a34a' : '#64748b', fontSize: '13px' }}>
                                                        Qty: <span style={{ fontWeight: '700' }}>{m.stock_quantity || 0}</span> | ₹{m.selling_price}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                        {filtered.length > 1000 && (
                                            <div style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#64748b', background: '#f8fafc', fontWeight: '500' }}>
                                                Keep typing to see more results...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Category</label>
                                <AutocompleteDropdown
                                    id="stock-type-input"
                                    inputStyle={darkInputStyle}
                                    value={currentEntry.type || ''}
                                    onChange={val => setCurrentEntry({ ...currentEntry, type: val })}
                                    options={availableTypes}
                                    onEnter={() => document.getElementById('stock-packing-input')?.focus()}
                                    placeholder="Type..."
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Packing</label>
                                <AutocompleteDropdown
                                    id="stock-packing-input"
                                    inputStyle={darkInputStyle}
                                    value={currentEntry.packing || ''}
                                    onChange={val => setCurrentEntry({ ...currentEntry, packing: val })}
                                    options={availablePackings}
                                    onEnter={() => document.getElementById('stock-power-input')?.focus()}
                                    placeholder="Packing..."
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Power</label>
                                <AutocompleteDropdown
                                    id="stock-power-input"
                                    inputStyle={darkInputStyle}
                                    value={currentEntry.power || ''}
                                    onChange={val => setCurrentEntry({ ...currentEntry, power: val })}
                                    options={availablePowers}
                                    onEnter={() => document.getElementById('stock-godown-select')?.focus()}
                                    placeholder="Power..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Godown / Entry Section */}
                    <div style={{ ...sectionStyle, borderLeft: '4px solid #10b981' }}>
                        <div style={legendStyle}>Godown To Store</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
                            <div style={{ flex: 1.5, minWidth: 0 }}>
                                <label style={labelStyle}>Godown</label>
                                <select
                                    id="stock-godown-select"
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                    value={currentEntry.godown}
                                    onChange={e => setCurrentEntry({ ...currentEntry, godown: e.target.value })}
                                    onKeyDown={enterNav('stock-loc-box')}
                                >
                                    {godowns.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1.8, minWidth: 0 }}>
                                <label style={labelStyle}>Location</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', cursor: 'pointer', fontWeight: '500' }}>
                                        <input
                                            type="radio"
                                            id="stock-loc-box"
                                            name="locationType"
                                            value="BOX"
                                            checked={currentEntry.locationType === 'BOX'}
                                            onChange={() => setCurrentEntry({ ...currentEntry, locationType: 'BOX' })}
                                            onKeyDown={enterNav('stock-loc-value')}
                                            style={{ margin: 0, accentColor: '#10b981' }}
                                        />
                                        BOX
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', cursor: 'pointer', fontWeight: '500' }}>
                                        <input
                                            type="radio"
                                            id="stock-loc-rack"
                                            name="locationType"
                                            value="RACK"
                                            checked={currentEntry.locationType === 'RACK'}
                                            onChange={() => setCurrentEntry({ ...currentEntry, locationType: 'RACK' })}
                                            onKeyDown={enterNav('stock-loc-value')}
                                            style={{ margin: 0, accentColor: '#10b981' }}
                                        />
                                        RACK
                                    </label>
                                    <input
                                        id="stock-loc-value"
                                        style={{ ...inputStyle, flex: 1, minWidth: '40px' }}
                                        value={currentEntry.locationValue}
                                        onChange={e => setCurrentEntry({ ...currentEntry, locationValue: e.target.value.toUpperCase() })}
                                        onKeyDown={enterNav('stock-qty-input')}
                                        placeholder="No."
                                    />
                                </div>
                            </div>
                            <div style={{ flex: 0.8, minWidth: 0 }}>
                                <label style={labelStyle}>Qty</label>
                                <input
                                    id="stock-qty-input"
                                    style={inputStyle}
                                    type="number"
                                    value={currentEntry.qty}
                                    onChange={e => setCurrentEntry({ ...currentEntry, qty: e.target.value })}
                                    onKeyDown={enterNav('stock-batch-input')}
                                />
                            </div>
                            <div style={{ flex: 1.2, minWidth: 0 }}>
                                <label style={labelStyle}>Batch</label>
                                <input
                                    id="stock-batch-input"
                                    style={inputStyle}
                                    value={currentEntry.batch}
                                    onChange={e => setCurrentEntry({ ...currentEntry, batch: e.target.value })}
                                    onKeyDown={enterNav('stock-expm-input')}
                                />
                            </div>
                            <div style={{ flex: 0.7, minWidth: 0 }}>
                                <label style={labelStyle}>Exp M</label>
                                <input
                                    id="stock-expm-input"
                                    style={{ ...inputStyle, textAlign: 'center' }}
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={currentEntry.expMonth}
                                    onChange={e => setCurrentEntry({ ...currentEntry, expMonth: e.target.value })}
                                    onKeyDown={enterNav('stock-expy-input')}
                                    placeholder="MM"
                                />
                            </div>
                            <div style={{ flex: 0.8, minWidth: 0 }}>
                                <label style={labelStyle}>Exp Y</label>
                                <input
                                    id="stock-expy-input"
                                    style={{ ...inputStyle, textAlign: 'center' }}
                                    type="number"
                                    value={currentEntry.expYear}
                                    onChange={e => setCurrentEntry({ ...currentEntry, expYear: e.target.value })}
                                    onKeyDown={enterNav('stock-mrp-input')}
                                    placeholder="YYYY"
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <label style={labelStyle}>MRP</label>
                                <input
                                    id="stock-mrp-input"
                                    style={{ ...inputStyle, textAlign: 'right' }}
                                    type="number"
                                    value={currentEntry.mrp}
                                    onChange={e => setCurrentEntry({ ...currentEntry, mrp: e.target.value })}
                                    onKeyDown={enterNav('stock-add-btn')}
                                    placeholder="₹0.00"
                                />
                            </div>
                            <button
                                id="stock-add-btn"
                                onClick={handleAdd}
                                style={{
                                    padding: '0 16px', background: '#10b981', color: '#fff',
                                    border: 'none', borderRadius: '4px', fontSize: '12px',
                                    cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap',
                                    height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(16, 185, 129, 0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2)'; }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
                            >
                                {transactionMode === 'alter' && editingBatchId ? 'Save' : 'Add Stock'}
                            </button>
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Items Detail</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Search Grid:</span>
                                <input
                                    style={{ ...inputStyle, width: '180px', height: '28px', padding: '4px 10px', fontSize: '12px' }}
                                    value={gridSearch}
                                    onChange={e => setGridSearch(e.target.value)}
                                    placeholder="Type to filter..."
                                />
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                                    <tr>
                                        {['S.No', 'Company', 'Medicine', 'Type', 'Power', 'Packing', 'Location', 'Qty', 'Batch', 'Exp M', 'Exp Y', 'MRP'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayItems.map((item, idx) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => handleGridRowClick(item)}
                                            style={{
                                                background: editingBatchId === item.id ? '#fef3c7' : '#fff',
                                                borderBottom: '1px solid #f1f5f9',
                                                cursor: transactionMode === 'alter' ? 'pointer' : 'default',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={e => { if (editingBatchId !== item.id) e.currentTarget.style.background = '#f8fafc' }}
                                            onMouseLeave={e => { if (editingBatchId !== item.id) e.currentTarget.style.background = '#fff' }}
                                        >
                                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{idx + 1}</td>
                                            <td style={{ padding: '8px 12px', color: '#475569' }}>{item.company}</td>
                                            <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>{item.medicine}</td>
                                            <td style={{ padding: '8px 12px', color: '#475569' }}>{item.type}</td>
                                            <td style={{ padding: '8px 12px', color: '#475569' }}>{item.power}</td>
                                            <td style={{ padding: '8px 12px', color: '#475569' }}>{item.packing}</td>
                                            <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '500' }}>
                                                <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {item.locationType}-{item.locationValue}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#10b981' }}>{item.qty}</td>
                                            <td style={{ padding: '8px 12px', color: '#475569' }}>{item.batch}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{item.expMonth}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{item.expYear}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>₹{item.mrp}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id) }} 
                                                    style={{ 
                                                        background: '#fee2e2', border: 'none', color: '#dc2626', 
                                                        cursor: 'pointer', padding: '6px', borderRadius: '6px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#fecaca' }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2' }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {displayItems.length === 0 && (
                                        <tr><td colSpan="13" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No items added yet. Start scanning or adding above.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Footer Totals */}
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '14px', color: '#475569' }}>
                                Selected Godown: <span style={{ fontWeight: '700', color: '#0f172a' }}>{currentEntry.godown || '—'}</span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#475569' }}>
                                Total Box QTY: <span style={{ fontWeight: '800', color: '#10b981', fontSize: '16px' }}>{totalBoxQty}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT PANEL */}
                <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* Box Wise Quantity */}
                    <div style={{ ...sectionStyle, flex: 1, padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Box Wise Quantity</h3>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9' }}>
                                    <tr>
                                        {['LOC', 'Qty', 'Batch', 'Exp', 'MRP'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: '600', color: '#475569' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {medicineBatches.length > 0 ? medicineBatches.map((b, idx) => (
                                        <tr key={b.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '500' }}>{b.location_type ? `${b.location_type}-${b.location_value || ''}` : '—'}</td>
                                            <td style={{ padding: '8px 12px', fontWeight: '700', color: '#10b981' }}>{b.quantity}</td>
                                            <td style={{ padding: '8px 12px', color: '#475569' }}>{b.batch_no}</td>
                                            <td style={{ padding: '8px 12px', color: '#475569' }}>{b.expiry_month}/{b.expiry_year}</td>
                                            <td style={{ padding: '8px 12px', color: '#475569', fontWeight: '500' }}>{b.mrp}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Select a medicine to view batches</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Re-Order Level */}
                    <div style={{...sectionStyle, gap: '4px'}}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Re-Order Level</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#475569' }}>Low Stock Threshold</span>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#ef4444' }}>
                                {selectedMed ? (selectedMed.low_stock_threshold || 0) : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Transaction */}
                    <div style={{...sectionStyle, gap: '8px'}}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Transaction Mode</div>
                        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                            <button
                                onClick={() => { setTransactionMode('update'); setEditingBatchId(null) }}
                                style={{
                                    flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
                                    background: transactionMode === 'update' ? '#fff' : 'transparent',
                                    color: transactionMode === 'update' ? '#10b981' : '#64748b',
                                    boxShadow: transactionMode === 'update' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >Update</button>
                            <button
                                onClick={() => setTransactionMode('alter')}
                                style={{
                                    flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
                                    background: transactionMode === 'alter' ? '#fff' : 'transparent',
                                    color: transactionMode === 'alter' ? '#f59e0b' : '#64748b',
                                    boxShadow: transactionMode === 'alter' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >Alter</button>
                        </div>
                        {transactionMode === 'alter' && (
                            <div style={{ fontSize: '12px', color: '#d97706', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fde68a', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span>✏️</span> Click a row in the grid to edit it
                            </div>
                        )}
                    </div>

                    {/* Existing Qty */}
                    <div style={{...sectionStyle, textAlign: 'center', background: '#0f2d1f', borderColor: '#0f2d1f' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>Existing Total Qty</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', margin: '2px 0' }}>
                            {selectedMed ? (selectedMed.stock_quantity || 0) : '—'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedMed ? selectedMed.name : 'No medicine selected'}
                        </div>
                    </div>

                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: '#fff', padding: '32px', borderRadius: '16px', width: '380px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '16px',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Confirm Deletion</div>
                        </div>
                        <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginLeft: '60px' }}>
                            Are you sure you want to delete this batch? This action cannot be undone.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                style={{
                                    padding: '10px 20px', background: '#f1f5f9', border: 'none',
                                    borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#475569',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                            >Cancel</button>
                            <button
                                onClick={() => {
                                    removeItem(confirmDeleteId)
                                    setConfirmDeleteId(null)
                                }}
                                style={{
                                    padding: '10px 20px', background: '#ef4444', border: 'none',
                                    borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#fff',
                                    transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(239, 68, 68, 0.3)' }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(239, 68, 68, 0.2)' }}
                            >Delete Item</button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
