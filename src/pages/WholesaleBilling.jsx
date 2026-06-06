import { useState, useEffect, useMemo } from 'react'
import WholesaleInvoicePrint from '../components/WholesaleInvoicePrint'
import './WholesaleBilling.css'
import DateInput from '../components/DateInput'
import { useCache } from '../context/CacheContext'

function AutocompleteDropdown({ value, onChange, options, onEnter, placeholder, id, className, readOnly, tabIndex, nameOnly, onEscape, dropdownWidth, maxItems = 50 }) {
    const [show, setShow] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState(-1)

    const searchTerms = useMemo(() => {
        return String(value || '').toLowerCase().split(/\s+/).filter(Boolean);
    }, [value]);

    const filtered = useMemo(() => {
        if (!show) return [];
        if (searchTerms.length === 0) return options.slice(0, maxItems);
        return options.filter(o => {
            if (o._searchKey && !nameOnly) {
                return searchTerms.every(term => o._searchKey.includes(term));
            }
            if (nameOnly) {
                if (o.nameLower) return searchTerms.every(term => o.nameLower.includes(term));
                return searchTerms.every(term => String(o.name || '').toLowerCase().includes(term));
            }
            const searchStr = o.name + ' ' + (o.potency || '');
            return searchTerms.every(term => searchStr.toLowerCase().includes(term));
        }).slice(0, maxItems);
    }, [show, options, searchTerms, nameOnly, maxItems]);

    useEffect(() => {
        if (show && filtered.length > 0) {
            setFocusedIdx(0)
        } else if (!show) {
            setFocusedIdx(-1)
        }
    }, [show, filtered])

    function handleKeyDown(e) {
        if (readOnly) {
            if (e.key === 'Enter') { e.preventDefault(); onEnter(); }
            return;
        }
        if (!show) {
            if (e.key === 'Enter') { e.preventDefault(); onEnter(); }
            if (e.key === 'Escape' && onEscape) { e.preventDefault(); e.stopPropagation(); onEscape(); return; }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') setShow(true);
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
                onChange(filtered[focusedIdx])
                setShow(false)
                setFocusedIdx(-1)
                setTimeout(onEnter, 50)
            } else {
                setShow(false)
                onEnter()
            }
        } else if (e.key === 'Escape') {
            e.stopPropagation()
            setShow(false)
            setFocusedIdx(-1)
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input 
                id={id}
                className={className}
                value={value}
                onChange={e => { if (readOnly) return; onChange(e.target.value); setShow(true); setFocusedIdx(0); }}
                onFocus={() => { if (readOnly) return; setShow(true); setFocusedIdx(-1); }}
                onBlur={() => setTimeout(() => setShow(false), 200)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                readOnly={readOnly}
                tabIndex={tabIndex}
            />
            {show && filtered.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
                    maxHeight: '250px', overflowY: 'auto', boxSizing: 'border-box',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    width: dropdownWidth || '100%'
                }}>
                    {filtered.map((opt, idx) => {
                        const isHigh = idx === focusedIdx
                        return (
                            <div 
                                key={opt.id || opt.name || idx}
                                onClick={() => { onChange(opt); setShow(false); setTimeout(onEnter, 50); }}
                                onMouseEnter={() => setFocusedIdx(idx)}
                                style={{
                                    padding: '10px 10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                                    background: isHigh ? '#ecfdf5' : '#fff', color: isHigh ? '#059669' : '#334155',
                                    fontWeight: isHigh ? '600' : '500', borderBottom: '1px solid #f8fafc',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: dropdownWidth === 'max-content' ? 'nowrap' : 'normal',
                                    wordBreak: 'break-word'
                                }}
                            >
                                {opt.name} 
                                {!nameOnly && opt.company ? <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>({opt.company})</span> : null}
                                {opt.potency ? <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '8px', fontWeight: '700' }}>{opt.potency}</span> : null}
                                {opt.unit ? <span style={{ background: '#f8fafc', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '4px', fontWeight: '600' }}>{opt.unit}</span> : null}
                                {opt.category ? <span style={{ color: '#3b82f6', fontSize: '11px', marginLeft: '8px', fontWeight: '700' }}>[{opt.category}]</span> : null}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function WholesaleHistory({ wholesaleBills, historySearchTerm, setHistorySearchTerm, loadHistory, loadingHistory, historyPage, historyTotalRows, historyLimit, setHistoryPage, handleEditBill, handleViewBill, handlePrintBill, openExportModal, isLocked }) {
    const totalPages = Math.ceil(historyTotalRows / historyLimit) || 1;

    return (
        <div className="wb-panel">
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Wholesale Bills History</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                        type="text" 
                        placeholder="Search Bill No or Party..." 
                        value={historySearchTerm}
                        onChange={e => setHistorySearchTerm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadHistory(1)}
                        className="wb-input" style={{ width: '220px' }}
                    />
                    <button onClick={() => loadHistory(1)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Search / Refresh</button>
                </div>
            </div>
            {loadingHistory ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading history...</div>
            ) : (
                <table className="wb-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Bill No</th>
                            <th>Party Name</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {wholesaleBills.map(bill => (
                            <tr key={bill.id}>
                                <td>{new Date(bill.bill_date).toLocaleDateString('en-IN')}</td>
                                <td style={{ color: '#3b82f6', fontWeight: '600' }}>{bill.bill_number}</td>
                                <td>{bill.party_name}</td>
                                <td style={{ color: '#64748b' }}>{bill.bill_type}</td>
                                <td style={{ color: '#10b981', fontWeight: '600' }}>₹{bill.net_amount?.toFixed(2)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {!isLocked && <button onClick={() => handleEditBill(bill.id)} style={{ padding: '4px 10px', background: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Edit</button>}
                                        <button onClick={() => handleViewBill(bill.id)} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>View</button>
                                        <button onClick={() => handlePrintBill(bill.id)} style={{ padding: '4px 10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Print</button>
                                        <button onClick={() => openExportModal(bill.id)} style={{ padding: '4px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Export PDF</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {wholesaleBills.length === 0 && (
                            <tr><td colSpan="6" style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>No bills found</td></tr>
                        )}
                    </tbody>
                </table>
            )}
            
            {!loadingHistory && historyTotalRows > 0 && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ color: '#64748b', fontSize: '14px' }}>
                        Showing {Math.min((historyPage - 1) * historyLimit + 1, historyTotalRows)} to {Math.min(historyPage * historyLimit, historyTotalRows)} of <strong style={{ color: '#0f172a' }}>{historyTotalRows}</strong> bills
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                            disabled={historyPage === 1}
                            onClick={() => loadHistory(historyPage - 1)}
                            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: historyPage === 1 ? '#f1f5f9' : '#fff', color: historyPage === 1 ? '#94a3b8' : '#334155', cursor: historyPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                            Previous
                        </button>
                        <span style={{ padding: '0 8px', color: '#475569', fontWeight: '500' }}>
                            Page {historyPage} of {totalPages}
                        </span>
                        <button 
                            disabled={historyPage >= totalPages}
                            onClick={() => loadHistory(historyPage + 1)}
                            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: historyPage >= totalPages ? '#f1f5f9' : '#fff', color: historyPage >= totalPages ? '#94a3b8' : '#334155', cursor: historyPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function BillHeader({ billDetails, setBillDetails, ledgers }) {
    return (
        <div className="wb-panel green-border" style={{ padding: '8px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '8px', alignItems: 'end' }}>
                <div>
                    <label className="wb-label" style={{ color: '#047857' }}>Party Name (Sundry Debtors)</label>
                    <select 
                        id="wb-party"
                        value={billDetails.ledgerId} 
                        onChange={e => setBillDetails({...billDetails, ledgerId: e.target.value})}
                        onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-date')?.focus(); }}
                        className="wb-input modern-input" style={{ border: '1px solid #6ee7b7', background: '#fff' }}
                    >
                        <option value="">Select Party...</option>
                        {ledgers.map(s => <option key={s.id} value={s.id}>{s.ledger_name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="wb-label">Bill Type</label>
                    <div style={{ display: 'flex', gap: '8px', padding: '6px 0' }}>
                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="radio" name="btype" checked={billDetails.billType==='WS'} onChange={() => setBillDetails({...billDetails, billType: 'WS'})} /> Wholesale
                        </label>
                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="radio" name="btype" checked={billDetails.billType==='Cash'} onChange={() => setBillDetails({...billDetails, billType: 'Cash'})} /> Cash
                        </label>
                    </div>
                </div>
                <div>
                    <label className="wb-label">Current Balance</label>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', padding: '6px 0' }}>
                        {(() => {
                            if (!billDetails.ledgerId) return '-';
                            const l = ledgers.find(x => x.id.toString() === billDetails.ledgerId.toString());
                            if (!l) return '0.00 Dr';
                            return `${Number(l.current_balance).toFixed(2)} ${l.current_balance_type}`;
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BillDetailsSection({ billDetails, setBillDetails, mrs }) {
    return (
        <div className="wb-panel" style={{ padding: '8px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 1.5fr 1fr', gap: '8px' }}>
                <div><label className="wb-label">TAX INVOICE No.</label><input type="text" readOnly value={billDetails.billNumber} className="wb-input modern-input readonly" style={{ fontWeight: 'bold' }} /></div>
                <div><label className="wb-label">Bill Date</label><DateInput id="wb-date"  value={billDetails.billDate} onChange={e => setBillDetails({...billDetails, billDate: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-ref')?.focus(); }} className="wb-input modern-input" /></div>
                <div>
                    <label className="wb-label">Reference (MR)</label>
                    <select id="wb-ref" value={billDetails.reference} onChange={e => setBillDetails({...billDetails, reference: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-send')?.focus(); }} className="wb-input modern-input">
                        <option value="">Select Reference...</option>
                        {mrs.map(m => (
                            <option key={`mr-${m.id}`} value={m.name}>
                                {m.name} {m.company ? `(${m.company})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="wb-label">Send Through</label>
                    <input id="wb-send" type="text" value={billDetails.sendThrough} onChange={e => setBillDetails({...billDetails, sendThrough: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-doc')?.focus(); }} className="wb-input modern-input" placeholder="DIRECT" />
                </div>
                <div>
                    <label className="wb-label">Doc. Through</label>
                    <input id="wb-doc" type="text" value={billDetails.documentsThrough} onChange={e => setBillDetails({...billDetails, documentsThrough: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-remark')?.focus(); }} className="wb-input modern-input" placeholder="Self" />
                </div>
                <div>
                    <label className="wb-label">Sale Destination</label>
                    <div style={{ display: 'flex', gap: '8px', padding: '6px 0' }}>
                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" checked={billDetails.saleDestination==='in_state'} onChange={() => setBillDetails({...billDetails, saleDestination: 'in_state'})} /> In State (CGST+SGST)</label>
                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" checked={billDetails.saleDestination==='out_state'} onChange={() => setBillDetails({...billDetails, saleDestination: 'out_state'})} /> Out State (IGST)</label>
                    </div>
                </div>
                <div><label className="wb-label">Remark</label><input id="wb-remark" type="text" value={billDetails.remark} onChange={e => setBillDetails({...billDetails, remark: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-company')?.focus(); }} className="wb-input modern-input" /></div>
            </div>
        </div>
    );
}

function ItemEntryForm({ currentItem, setCurrentItem, companies, medicines, isAutomatic, setIsAutomatic, handleAddItem, isLocked }) {
    return (
        <div className="wb-panel" style={{ padding: '8px 12px', position: 'relative', zIndex: 5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 1fr 1fr 0.8fr 0.6fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                    <label className="wb-label">Company</label>
                    <AutocompleteDropdown 
                        id="wb-company"
                        options={companies.map(c => ({name: c.name}))}
                        value={currentItem.company}
                        onChange={v => setCurrentItem({...currentItem, company: typeof v === 'string' ? v : v.name, medicineName: ''})}
                        onEnter={() => document.getElementById('wb-med')?.focus()}
                        onEscape={() => document.getElementById('wb-finish')?.focus()}
                        placeholder="Select company..."
                        className="wb-input modern-input"
                        maxItems={1000}
                    />
                </div>
                <div>
                    <label className="wb-label">Medicine Name</label>
                    <AutocompleteDropdown 
                        id="wb-med"
                        options={medicines}
                        value={currentItem.medicineName}
                        onChange={v => {
                            if (typeof v === 'string') {
                                setCurrentItem({...currentItem, medicineName: v})
                            } else {
                                setCurrentItem({
                                    ...currentItem, 
                                    medicineName: v.name, 
                                    company: v.company || currentItem.company, 
                                    packing: v.unit || '', 
                                    potency: v.potency || '', 
                                    type: v.category || '', 
                                    unitPrice: v.selling_price || '',
                                    gstRate: v.gst_rate !== undefined ? v.gst_rate.toString() : '5',
                                    hsnCode: v.hsn_code || ''
                                })
                            }
                        }}
                        onEnter={() => document.getElementById('wb-batch').focus()}
                        placeholder="Search medicine..."
                        className="wb-input modern-input"
                        nameOnly
                        dropdownWidth="max-content"
                        maxItems={1000}
                    />
                </div>
                <div><label className="wb-label">Power</label><input readOnly value={currentItem.potency} className="wb-input modern-input readonly" tabIndex={-1} /></div>
                <div><label className="wb-label">Packing</label><input readOnly value={currentItem.packing} className="wb-input modern-input readonly" tabIndex={-1} /></div>
                <div><label className="wb-label">Type</label><input readOnly value={currentItem.type} className="wb-input modern-input readonly" tabIndex={-1} /></div>
                <div><label className="wb-label">Batch</label><input id="wb-batch" value={currentItem.batchNo} onChange={e => setCurrentItem({...currentItem, batchNo: e.target.value})} onKeyDown={e => e.key === 'Enter' && document.getElementById('qty').focus()} className="wb-input modern-input" /></div>
                <div><label className="wb-label">HSN</label><input readOnly value={currentItem.hsnCode || ''} className="wb-input modern-input readonly" tabIndex={-1} /></div>
                <div><label className="wb-label">GST %</label><input readOnly value={currentItem.gstRate ? `${currentItem.gstRate}%` : ''} className="wb-input modern-input readonly" tabIndex={-1} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                <div><label className="wb-label">Qty (N)</label><input id="qty" type="number" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('freeQty').focus()} className="wb-input modern-input" /></div>
                <div><label className="wb-label">Free Qty</label><input id="freeQty" type="number" value={currentItem.freeQuantity} onChange={e => setCurrentItem({...currentItem, freeQuantity: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('rate').focus()} className="wb-input modern-input" /></div>
                <div><label className="wb-label">Rate (₹)</label><input id="rate" type="number" value={currentItem.unitPrice} onChange={e => setCurrentItem({...currentItem, unitPrice: e.target.value})} onBlur={e => { const val = e.target.value; if(val !== '') setCurrentItem(prev => ({...prev, unitPrice: Number(val).toFixed(2)})); }} onKeyDown={e => { if(e.key==='Enter'){ e.preventDefault(); const val = e.target.value; if(val !== '') setCurrentItem(prev => ({...prev, unitPrice: Number(val).toFixed(2)})); document.getElementById('dis').focus(); } }} className="wb-input modern-input" /></div>
                <div>
                    <label className="wb-label" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        Disc % 
                        <label title="Calculate Discount Inclusive of Tax" style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', color: '#3b82f6' }}>
                            <input type="checkbox" checked={isAutomatic} onChange={e => setIsAutomatic(e.target.checked)} style={{ margin: 0, width: '12px', height: '12px' }} />
                            Tax Incl.
                        </label>
                    </label>
                    <input id="dis" type="number" placeholder="0" value={currentItem.discountPercent} onChange={e => setCurrentItem({...currentItem, discountPercent: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('scdis').focus()} className="wb-input modern-input" />
                </div>
                <div><label className="wb-label">Sc.Dis %</label><input id="scdis" type="number" placeholder="0" value={currentItem.schemeDiscountPercent} onChange={e => setCurrentItem({...currentItem, schemeDiscountPercent: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('box').focus()} className="wb-input modern-input" /></div>
                <div><label className="wb-label">Box</label><input id="box" type="number" placeholder="0" value={currentItem.box} onChange={e => setCurrentItem({...currentItem, box: e.target.value})} onKeyDown={e => e.key==='Enter' && handleAddItem()} className="wb-input modern-input" /></div>
                <div><label className="wb-label">Total Amount</label><div style={{ padding: '6px 10px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700' }}>₹{currentItem.amount}</div></div>
                <div><button onClick={handleAddItem} disabled={isLocked} className="wb-btn-primary">Add</button></div>
            </div>
        </div>
    );
}

function ItemsTable({ items, removeItem }) {
    return (
        <div className="wb-panel" style={{ overflow: 'visible' }}>
            <table className="wb-table">
                <thead>
                    <tr>
                        <th>S No</th>
                        <th>Medicine</th>
                        <th>Company</th>
                        <th>Power</th>
                        <th>Packing</th>
                        <th>Qty</th>
                        <th>Free</th>
                        <th>Rate</th>
                        <th>Dis%</th>
                        <th>Sc.Dis%</th>
                        <th>Gross Total</th>
                        <th>CGST</th>
                        <th>SGST</th>
                        <th>Net</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => {
                        const cgst = item.gstRate ? Number(item.gstRate)/2 : 0;
                        const sgst = item.gstRate ? Number(item.gstRate)/2 : 0;
                        return (
                            <tr key={item.id}>
                                <td>{idx + 1}</td>
                                <td style={{ fontWeight: '600' }}>{item.medicineName}</td>
                                <td>{item.company}</td>
                                <td>{item.potency}</td>
                                <td>{item.packing}</td>
                                <td style={{ fontWeight: '600' }}>{item.quantity}</td>
                                <td>{item.freeQuantity}</td>
                                <td>₹{item.unitPrice}</td>
                                <td style={{ color: '#ef4444', fontWeight: '500' }}>{item.discountPercent}%</td>
                                <td style={{ color: '#ef4444', fontWeight: '500' }}>{item.schemeDiscountPercent}%</td>
                                <td style={{ fontWeight: '600' }}>₹{Number(item.grossTotal).toFixed(2)}</td>
                                <td style={{ color: '#3b82f6', fontWeight: '500' }}>{cgst}%</td>
                                <td style={{ color: '#3b82f6', fontWeight: '500' }}>{sgst}%</td>
                                <td style={{ fontWeight: '700', color: '#0f2d1f' }}>₹{item.amount}</td>
                                <td><button onClick={() => removeItem(item.id)} className="wb-btn-danger">X</button></td>
                            </tr>
                        )
                    })}
                    {items.length === 0 && <tr><td colSpan="15" style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>No items added yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

export default function WholesaleBilling({ isYearLocked = false }) {
    const { 
        medicines: cachedMeds, 
        ledgers: cachedLedgs, 
        companies: cachedComps, 
        mrs: cachedMrs, 
        storeProfile: cachedStoreProfile,
        refreshMedicines,
        refreshLedgers
    } = useCache()

    const medicines = cachedMeds || []

    const ledgers = useMemo(() => {
        return (cachedLedgs || []).filter(l => {
            const name = (l.ledger_name || '').toUpperCase();
            return name !== 'PURCHASE ACCOUNT' && name !== 'SALES ACCOUNT';
        });
    }, [cachedLedgs])

    const companies = useMemo(() => {
        const companySet = new Set();
        if (cachedComps) {
            for (let i = 0; i < cachedComps.length; i++) {
                if (cachedComps[i].name) companySet.add(cachedComps[i].name);
            }
        }
        if (cachedMeds) {
            for (let i = 0; i < cachedMeds.length; i++) {
                const comp = cachedMeds[i].company;
                if (comp) companySet.add(comp);
            }
        }
        return Array.from(companySet).map(name => ({ name }));
    }, [cachedComps, cachedMeds])

    const mrs = cachedMrs || []
    const storeProfile = cachedStoreProfile || {}

    const [items, setItems] = useState([])
    const isLocked = isYearLocked
    const [itemToDelete, setItemToDelete] = useState(null)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [printBill, setPrintBill] = useState(null)
    const [view, setView] = useState(isYearLocked ? 'history' : 'new')
    const [wholesaleBills, setWholesaleBills] = useState([])
    const [selectedViewBill, setSelectedViewBill] = useState(null)
    const [exportModalVisible, setExportModalVisible] = useState(false)
    async function handleEditBill(id) {
        const bill = await window.api.getWholesaleBillById(id);
        if(!bill) return showToast('Bill not found', 'error');

        setEditingBillId(id);
        setBillDetails({
            billNumber: bill.bill_number,
            billDate: bill.bill_date ? bill.bill_date.split('T')[0] : new Date().toISOString().split('T')[0],
            ledgerId: bill.ledger_id,
            billType: bill.bill_type || 'credit',
            saleDestination: bill.sale_destination || 'in_state',
            challanNo: bill.challan_no || '', challanDate: bill.challan_date ? bill.challan_date.split('T')[0] : '',
            orderNo: bill.order_no || '', orderDate: bill.order_date ? bill.order_date.split('T')[0] : '',
            grNo: bill.gr_no || '', grDate: bill.gr_date ? bill.gr_date.split('T')[0] : '',
            reference: bill.reference || '', gstAcc: bill.gst_acc || '', saleRegister: bill.sale_register || '',
            sendThrough: bill.send_through || '', documentsThrough: bill.documents_through || '',
            remark: bill.remark || ''
        });

        setItems(bill.items.map(it => ({
            id: Date.now() + Math.random(),
            medicine_id: it.medicine_id,
            medicineName: it.medicine_name || '',
            company: it.company || '',
            packing: it.unit || '',
            potency: it.potency || '',
            category: it.category || '',
            hsnCode: it.hsn_code || '',
            batchNo: it.batch_id, 
            expMonth: it.expiry_month || '',
            expYear: it.expiry_year || '',
            quantity: it.quantity || 0,
            freeQuantity: it.free_quantity || 0,
            unitPrice: it.unit_price || 0,
            discountPercent: it.discount_percent || 0,
            schemeDiscountPercent: it.scheme_discount_percent || 0,
            box: it.box || 0,
            grossTotal: it.gross_total || 0,
            gstRate: (it.cgst_rate || 0) + (it.sgst_rate || 0) + (it.igst_rate || 0),
            amount: it.total_price || 0
        })));
        setView('new');
    }

    const [exportBillId, setExportBillId] = useState(null)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [historySearchTerm, setHistorySearchTerm] = useState('')
    const [historyPage, setHistoryPage] = useState(1)
    const [historyTotalRows, setHistoryTotalRows] = useState(0)
    const historyLimit = 20
    const [editingBillId, setEditingBillId] = useState(null)
    const [isAutomatic, setIsAutomatic] = useState(true) 
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
    const [heldBills, setHeldBills] = useState([])
    const [showHeldModal, setShowHeldModal] = useState(false)

    const [billDetails, setBillDetails] = useState({
        ledgerId: '', billType: 'WS', billNumber: 'Loading...',
        billDate: new Date().toISOString().split('T')[0],
        challanNo: '', challanDate: '', orderNo: '', orderDate: '',
        grNo: '', grDate: '', reference: '', gstAcc: 'GST',
        saleRegister: 'SALES', sendThrough: '', documentsThrough: '',
        saleDestination: 'in_state', remark: '', ewayBillNo: '',
        ewayVehicleNo: '', ewayTransporter: '', ewayTransporterId: '', ewayDistance: ''
    })

    const [currentItem, setCurrentItem] = useState({
        medicineName: '', company: '', potency: '', packing: '', type: '', batchNo: '',
        quantity: '', freeQuantity: '', unitPrice: '', discountPercent: '',
        schemeDiscountPercent: '', box: '', gstRate: '', amount: '0', hsnCode: ''
    })

    const filteredMedsByCompany = useMemo(() => {
        const comp = currentItem.company ? String(currentItem.company).trim().toLowerCase() : '';
        if (!comp) return medicines;
        return medicines.filter(m => m.companyLower === comp);
    }, [medicines, currentItem.company]);

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
    }

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                if (isYearLocked) {
                    loadHistory();
                }
                loadData()

                try {
                    const stored = JSON.parse(localStorage.getItem('wholesaleHeldBills') || '[]');
                    setHeldBills(stored);
                } catch (e) {}

                setTimeout(() => {
                    document.getElementById('wb-party')?.focus();
                }, 100);
            } catch (e) { console.error(e) }
        }
        fetchInitialData()
    }, [])

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'F9') {
                e.preventDefault();
                handleHoldBill();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, items, billDetails, heldBills]);

    function handleHoldBill() {
        if (items.length === 0) return showToast('Cannot hold an empty bill', 'error');
        
        const newHold = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            items: [...items],
            billDetails: { ...billDetails }
        };
        const updated = [...heldBills, newHold];
        setHeldBills(updated);
        localStorage.setItem('wholesaleHeldBills', JSON.stringify(updated));
        
        executeResetBill(true); // silent reset
        showToast('Bill held successfully', 'success');
    }

    function handleRestoreBill(holdId) {
        if (items.length > 0) return showToast('Please clear or hold the current bill first', 'error');
        
        const holdIndex = heldBills.findIndex(h => h.id === holdId);
        if (holdIndex === -1) return;
        
        const hold = heldBills[holdIndex];
        setItems(hold.items);
        setBillDetails(hold.billDetails);
        
        window.api.getNextWholesaleBillNumber().then(nextNo => {
            setBillDetails(prev => ({...prev, billNumber: nextNo}));
        });
        
        const updated = heldBills.filter(h => h.id !== holdId);
        setHeldBills(updated);
        localStorage.setItem('wholesaleHeldBills', JSON.stringify(updated));
        
        setShowHeldModal(false);
        showToast('Bill restored', 'success');
    }

    async function loadData() {
        const nextNo = await window.api.getNextWholesaleBillNumber()
        setBillDetails(prev => ({ ...prev, billNumber: nextNo }))
    }

    async function loadHistory(page = 1) {
        setLoadingHistory(true)
        try {
            const data = await window.api.searchWholesaleBillsPaginated({ search: historySearchTerm, page: page, limit: historyLimit })
            setWholesaleBills(data.data || [])
            setHistoryTotalRows(data.total || 0)
            setHistoryPage(data.page)
        } catch (error) {
            showToast('Failed to load history', 'error')
            console.error(error)
        } finally {
            setLoadingHistory(false)
        }
    }

    async function handleViewBill(id) {
        try {
            const billData = await window.api.getWholesaleBillById(id);
            setSelectedViewBill(billData);
        } catch (error) {
            showToast('Failed to fetch bill details', 'error');
        }
    }

    async function handlePrintBill(id) {
        try {
            const billData = await window.api.getWholesaleBillById(id);
            setPrintBill(billData);
            setTimeout(() => {
                window.api.printWindow();
            }, 500);
        } catch (error) {
            showToast('Failed to prepare bill for printing', 'error');
        }
    }

    function openExportModal(id) {
        setExportBillId(id);
        setExportModalVisible(true);
    }

    async function handleExportBill(copyType) {
        if (!exportBillId) return;
        try {
            const billData = await window.api.getWholesaleBillById(exportBillId);
            if (!billData) return showToast('Bill details not found', 'error');
            
            const res = await window.api.exportWholesalePdf(billData, storeProfile, copyType);
            
            if (res.success) {
                showToast('PDF Exported Successfully!', 'success');
            } else if (!res.canceled) {
                showToast('Failed to export PDF', 'error');
            }
        } catch (error) {
            showToast('Failed to export bill', 'error');
        }
        setExportModalVisible(false);
        setExportBillId(null);
    }

    useEffect(() => {
        const q = Number(currentItem.quantity) || 0;
        const rate = Number(currentItem.unitPrice) || 0;
        const inputDis = Number(currentItem.discountPercent) || 0;
        const sdis = Number(currentItem.schemeDiscountPercent) || 0;
        const gst = Number(currentItem.gstRate) || 0;

        let gross = q * rate;
        let effectiveDis = inputDis;

        if (isAutomatic && gst > 0) {
            const targetFinal = gross * (1 - inputDis / 100);
            let tempGross = targetFinal / (1 + gst / 100);
            if (q * rate > 0) {
                let calcDis = 100 - (tempGross / (q * rate) * 100);
                effectiveDis = Math.round(calcDis * 100) / 100;
                gross = (q * rate) * (1 - effectiveDis / 100);
            }
        } else {
            if (inputDis > 0) gross = gross - (gross * inputDis / 100);
        }

        if (sdis > 0) gross = gross - (gross * sdis / 100);
        gross = Math.round(gross * 100) / 100;

        let gstAmt = 0;
        if (billDetails.saleDestination === 'in_state') {
            const halfGst = gst / 2;
            const cgst = Math.round(gross * (halfGst / 100) * 100) / 100;
            const sgst = Math.round(gross * (halfGst / 100) * 100) / 100;
            gstAmt = cgst + sgst;
        } else {
            gstAmt = Math.round(gross * (gst / 100) * 100) / 100;
        }

        const finalAmt = gross + gstAmt;
        setCurrentItem(prev => ({ 
            ...prev, 
            amount: finalAmt.toFixed(2), 
            grossTotal: gross,
            computedDiscount: effectiveDis 
        }))
    }, [currentItem.quantity, currentItem.unitPrice, currentItem.discountPercent, currentItem.schemeDiscountPercent, currentItem.gstRate, billDetails.saleDestination, isAutomatic])

    function handleAddItem() {
        if (isLocked) return showToast('Financial Year is locked. Cannot add items.', 'error')
        if (!currentItem.company) {
            showToast('Please select Company first', 'error')
            document.getElementById('wb-company')?.focus()
            return
        }
        if (!currentItem.medicineName || !currentItem.quantity) {
            showToast('Please enter Medicine Name and Quantity', 'error')
            return
        }

        const med = medicines.find(m => m.name === currentItem.medicineName)
        if (!med) {
            showToast('Medicine not found!', 'error')
            return
        }

        setItems([...items, { 
            ...currentItem, 
            discountPercent: currentItem.computedDiscount !== undefined ? currentItem.computedDiscount.toFixed(2) : currentItem.discountPercent,
            medicine_id: med.id, 
            hsn_code: med.hsn_code || '',
            id: Date.now() 
        }])
        setCurrentItem({
            medicineName: '', company: '', potency: '', packing: '', type: '', batchNo: '',
            quantity: '', freeQuantity: '0', unitPrice: '', discountPercent: '0',
            schemeDiscountPercent: '0', box: '0', gstRate: '', amount: '0', hsnCode: ''
        })
        setTimeout(() => {
            document.getElementById('wb-company')?.focus()
        }, 50)
    }

    function removeItem(id) {
        setItemToDelete(id)
    }

    function confirmRemove() {
        if (itemToDelete) {
            setItems(items.filter(i => i.id !== itemToDelete))
            setItemToDelete(null)
        }
    }

    const totals = items.reduce((acc, item) => {
        const q = Number(item.quantity) || 0;
        const rate = Number(item.unitPrice) || 0;
        const dis = Number(item.discountPercent) || 0;
        const sdis = Number(item.schemeDiscountPercent) || 0;
        const gst = Number(item.gstRate) || 0;

        let gross = q * rate;
        let originalGross = gross;
        
        if (dis > 0) gross = gross - (gross * dis / 100);
        if (sdis > 0) gross = gross - (gross * sdis / 100);
        gross = Math.round(gross * 100) / 100;

        let gstAmt = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (billDetails.saleDestination === 'in_state') {
            const halfGst = gst / 2;
            cgst = Math.round(gross * (halfGst / 100) * 100) / 100;
            sgst = Math.round(gross * (halfGst / 100) * 100) / 100;
            gstAmt = cgst + sgst;
        } else {
            igst = Math.round(gross * (gst / 100) * 100) / 100;
            gstAmt = igst;
        }

        const discountAmt = originalGross - gross;

        acc.gross += gross;
        acc.discount += discountAmt;
        acc.gst += gstAmt;
        acc.cgst += cgst;
        acc.sgst += sgst;
        acc.igst += igst;
        return acc;
    }, { gross: 0, discount: 0, gst: 0, cgst: 0, sgst: 0, igst: 0 })

    const totalAmount = totals.gross + totals.gst
    const roundedNet = totalAmount
    const roundOff = 0

    async function handleSaveBill() {
        if (isLocked) return showToast('Financial Year is locked', 'error')
        if (!billDetails.ledgerId) return showToast('Please select a Party', 'error')
        if (items.length === 0) return showToast('Please add at least one item', 'error')

        const payload = {
            ledger_id: billDetails.ledgerId,
            bill_number: billDetails.billNumber,
            bill_date: billDetails.billDate,
            bill_type: billDetails.billType,
            challan_no: billDetails.challanNo,
            challan_date: billDetails.challanDate,
            order_no: billDetails.orderNo,
            order_date: billDetails.orderDate,
            gr_no: billDetails.grNo,
            gr_date: billDetails.grDate,
            reference: billDetails.reference,
            gst_acc: billDetails.gstAcc,
            sale_register: billDetails.saleRegister,
            send_through: billDetails.sendThrough,
            documents_through: billDetails.documentsThrough,
            sale_destination: billDetails.saleDestination,
            medical_rep: '',
            remark: billDetails.remark,
            total_amount: totals.gross,
            total_discount: totals.discount,
            round_off: roundOff,
            net_amount: roundedNet,
            items: items.map(i => {
                let cgstRate = 0, sgstRate = 0, igstRate = 0;
                if (billDetails.saleDestination === 'in_state') {
                    cgstRate = Number(i.gstRate)/2;
                    sgstRate = Number(i.gstRate)/2;
                } else {
                    igstRate = Number(i.gstRate);
                }
                return {
                    medicine_id: i.medicine_id,
                    batch_id: i.batchNo ? i.batchNo.split(' (')[0] : null,
                    hsn_code: i.hsnCode,
                    quantity: Number(i.quantity) || 0,
                    free_quantity: Number(i.freeQuantity) || 0,
                    unit_price: Number(i.unitPrice) || 0,
                    discount_percent: Number(i.discountPercent) || 0,
                    scheme_discount_percent: Number(i.schemeDiscountPercent) || 0,
                    box: Number(i.box) || 0,
                    gross_total: Number(i.grossTotal) || 0,
                    cgst_rate: cgstRate,
                    sgst_rate: sgstRate,
                    igst_rate: igstRate,
                    total_price: Number(i.amount) || 0
                }
            })
        }

        try {
            if (editingBillId) {
                payload.id = editingBillId
                await window.api.updateWholesaleBill(payload)
                showToast('Wholesale Bill Updated Successfully!', 'success')
                setEditingBillId(null)
            } else {
                await window.api.createWholesaleBill(payload)
                showToast('Wholesale Bill Saved Successfully!', 'success')
            }
            refreshMedicines()
            refreshLedgers()
            setItems([])
            const nextNo = await window.api.getNextWholesaleBillNumber()
            setBillDetails(prev => ({ ...prev, challanNo: '', orderNo: '', remark: '', reference: '', ledgerId: '', billNumber: nextNo }))
            loadHistory()
        } catch (e) {
            showToast('Failed to save Wholesale Bill', 'error')
            console.error(e)
        }
    }

    async function executeResetBill(silent = false) {
        setItems([]);
        const nextNo = await window.api.getNextWholesaleBillNumber();
        setBillDetails({
            ledgerId: '', billType: 'WS', billNumber: nextNo, 
            billDate: new Date().toISOString().split('T')[0],
            challanNo: '', challanDate: '', orderNo: '', orderDate: '',
            grNo: '', grDate: '', reference: '', gstAcc: 'GST',
            saleRegister: 'SALES', sendThrough: '', documentsThrough: '',
            saleDestination: 'in_state', remark: ''
        });
        setCurrentItem({
            medicineName: '', company: '', potency: '', packing: '', type: '', batchNo: '',
            quantity: '', freeQuantity: '0', unitPrice: '', discountPercent: '0',
            schemeDiscountPercent: '0', box: '0', gstRate: '', amount: '0', hsnCode: ''
        });
        setShowResetConfirm(false);
        if (!silent) showToast('Bill Reset Successfully', 'success');
        setTimeout(() => document.getElementById('wb-party')?.focus(), 100);
    }

    return (
        <>
            <div className="no-print wb-container">
            {toast.show && (
                <div className={`wb-toast ${toast.type}`}>
                    {toast.msg}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                {isLocked && view === 'new' && (
                    <div style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', background: '#fee2e2', color: '#991b1b', padding: '8px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', border: '1px solid #f87171', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        🔒 Financial Year is Locked. No modifications permitted.
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>Wholesale Bill (B2B)</h2>
                    <div className="wb-view-toggle">
                        {['new', 'history'].filter(v => !(isLocked && v === 'new')).map(v => (
                            <button key={v} onClick={() => {
                                setView(v)
                                if (v === 'history') loadHistory()
                            }} className={`wb-view-btn ${view === v ? 'active' : ''}`}>
                                {v === 'new' ? 'New Bill' : 'History'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {view === 'history' ? (
                <WholesaleHistory 
                    wholesaleBills={wholesaleBills} 
                    historySearchTerm={historySearchTerm} setHistorySearchTerm={setHistorySearchTerm}
                    loadHistory={loadHistory} loadingHistory={loadingHistory}
                    historyPage={historyPage} historyTotalRows={historyTotalRows} historyLimit={historyLimit} setHistoryPage={setHistoryPage}
                    handleEditBill={handleEditBill}
                    handleViewBill={handleViewBill} handlePrintBill={handlePrintBill} openExportModal={openExportModal}
                isLocked={isLocked} />
            ) : (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <BillHeader billDetails={billDetails} setBillDetails={setBillDetails} ledgers={ledgers} />
                        <BillDetailsSection billDetails={billDetails} setBillDetails={setBillDetails} mrs={mrs} />
                        <ItemEntryForm 
                            currentItem={currentItem} setCurrentItem={setCurrentItem} 
                            companies={companies} medicines={filteredMedsByCompany}
                            isAutomatic={isAutomatic} setIsAutomatic={setIsAutomatic}
                            handleAddItem={handleAddItem} isLocked={isLocked}
                        />
                        <ItemsTable items={items} removeItem={removeItem} />
                    </div>
                </div>
            )}

            {/* Bottom Footer for New Bill */}
            {view === 'new' && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        <div><span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginRight: '8px' }}>Total Items:</span><span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{items.length}</span></div>
                        <div><span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginRight: '8px' }}>Total Gross:</span><span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>₹{totals.gross.toFixed(2)}</span></div>
                        <div><span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginRight: '8px' }}>Total GST:</span><span style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>₹{totals.gst.toFixed(2)}</span></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>₹{roundedNet.toFixed(2)}</div>
                        {heldBills.length > 0 && (
                            <button onClick={() => setShowHeldModal(true)} style={{ padding: '8px 16px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }}>Held Bills ({heldBills.length})</button>
                        )}
                        <button onClick={handleHoldBill} style={{ padding: '8px 16px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }}>Hold (F9)</button>
                        <button onClick={() => setShowResetConfirm(true)} style={{ padding: '8px 16px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }}>Reset Bill</button>
                        <button id="wb-finish" onClick={handleSaveBill} style={{ padding: '12px 32px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>Finish (F10)</button>
                    </div>
                </div>
            )}

            {/* Remove Item Confirm Modal */}
            {itemToDelete && (
                <div className="wb-modal-overlay">
                    <div className="wb-modal-content">
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Remove Item?</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>Are you sure you want to remove this item from the bill?</p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setItemToDelete(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={confirmRemove} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Bill Confirm Modal */}
            {showResetConfirm && (
                <div className="wb-modal-overlay">
                    <div className="wb-modal-content">
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Reset Bill?</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>This will clear all items and details. Are you sure?</p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowResetConfirm(false)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => executeResetBill(false)} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Reset</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Held Bills Modal */}
            {showHeldModal && (
                <div className="wb-modal-overlay">
                    <div className="wb-modal-content" style={{ width: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Held Bills</h3>
                            <button onClick={() => setShowHeldModal(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        {heldBills.length === 0 ? (
                            <p style={{ color: '#64748b' }}>No held bills.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                                {heldBills.map(hold => {
                                    const partyName = ledgers.find(l => l.id.toString() === hold.billDetails.ledgerId?.toString())?.ledger_name || 'Unknown Party';
                                    const amount = hold.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
                                    return (
                                        <div key={hold.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{partyName}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{hold.items.length} items • ₹{amount.toFixed(2)}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(hold.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                            <button onClick={() => handleRestoreBill(hold.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>
                                                Restore
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View Modal */}
            {selectedViewBill && (
                <div className="wb-modal-overlay">
                    <div style={{ background: '#fff', width: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
                            <div>
                                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#0f2d1f', fontWeight: '800' }}>Invoice #{selectedViewBill.bill_number}</h2>
                                <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>{new Date(selectedViewBill.bill_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billed To</div>
                                <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>{selectedViewBill.party_name}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                <div><span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Bill Type</span><strong style={{ color: '#334155' }}>{selectedViewBill.bill_type}</strong></div>
                                <div><span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Sale Destination</span><strong style={{ color: '#334155' }}>{selectedViewBill.sale_destination === 'in_state' ? 'In State' : 'Out State'}</strong></div>
                                <div><span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Reference</span><strong style={{ color: '#334155' }}>{selectedViewBill.reference || 'N/A'}</strong></div>
                                <div><span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Send Through</span><strong style={{ color: '#334155' }}>{selectedViewBill.send_through || 'N/A'}</strong></div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}><span style={{ color: '#64748b', width: '100px', fontWeight: '600' }}>Gross Amount:</span> <span style={{ color: '#334155', fontWeight: '700', width: '80px' }}>₹{selectedViewBill.total_amount?.toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}><span style={{ color: '#64748b', width: '100px', fontWeight: '600' }}>Discount:</span> <span style={{ color: '#ef4444', fontWeight: '600', width: '80px' }}>-₹{selectedViewBill.total_discount?.toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}><span style={{ color: '#0f2d1f', width: '100px', fontWeight: '800', fontSize: '14px' }}>Net Payable:</span> <span style={{ color: '#10b981', fontWeight: '800', fontSize: '15px', width: '80px' }}>₹{selectedViewBill.net_amount?.toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>Medicine</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>Company</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>Power</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>Packing</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Qty (F)</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Rate</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Dis%</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>GST%</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedViewBill.items && selectedViewBill.items.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafaf9', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{item.medicine_name}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.company}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.potency}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.unit}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>{item.quantity} <span style={{color: '#10b981', fontSize: '11px'}}>({item.free_quantity})</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>₹{item.unit_price}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#ef4444', fontWeight: '500' }}>{(item.discount_percent + item.scheme_discount_percent).toFixed(1)}%</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#3b82f6', fontWeight: '500' }}>{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#0f2d1f' }}>₹{item.total_price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedViewBill(null)} style={{ padding: '10px 32px', background: '#0f2d1f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(15, 45, 31, 0.2)' }}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Copy Type Modal */}
            {exportModalVisible && (
                <div className="wb-modal-overlay">
                    <div className="wb-modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Select Copy Type</h3>
                            <button onClick={() => {setExportModalVisible(false); setExportBillId(null);}} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={() => handleExportBill('Original')} style={{ padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}>Original for Recipient</button>
                            <button onClick={() => handleExportBill('Duplicate')} style={{ padding: '12px', background: '#eab308', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}>Duplicate for Supplier</button>
                            <button onClick={() => handleExportBill('Triplicate')} style={{ padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}>Triplicate for Transporter</button>
                        </div>
                    </div>
                </div>
            )}

            </div>
            
            <WholesaleInvoicePrint bill={printBill} storeProfile={storeProfile} />
        </>
    )
}
