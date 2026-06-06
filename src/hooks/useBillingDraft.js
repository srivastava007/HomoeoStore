import { useState, useEffect } from 'react';

export function useBillingDraft({ 
    items, setItems, 
    billDetails, setBillDetails, 
    setCurrentEntry, 
    showToast 
}) {
    const [heldBills, setHeldBills] = useState([])
    const [showHeldModal, setShowHeldModal] = useState(false)
    const [showClearConfirm, setShowClearConfirm] = useState(false)

    // Load drafts and held bills on mount
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('retailHeldBills') || '[]');
            setHeldBills(stored);
        } catch (e) {}

        try {
            const draft = JSON.parse(localStorage.getItem('retailDraft'));
            if (draft) {
                if (draft.items) setItems(draft.items);
                if (draft.billDetails) setBillDetails(draft.billDetails);
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        if (items.length > 0) {
            localStorage.setItem('retailDraft', JSON.stringify({ items, billDetails }));
        } else {
            localStorage.removeItem('retailDraft');
        }
    }, [items, billDetails]);

    function handleHoldBill() {
        if (items.length === 0) return showToast('Cannot hold an empty bill', 'error');
        const newHold = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            items: [...items],
            billDetails: { ...billDetails }
        };
        const updated = [...heldBills, newHold];
        setHeldBills(updated);
        localStorage.setItem('retailHeldBills', JSON.stringify(updated));
        
        setItems([]);
        setBillDetails({ patientName: 'CASH', address: '-', prescribedBy: 'Self', discountRs: 0, otherCharges: 0, otherChargesType: 'E' });
        setCurrentEntry({
            company: '', medicine: '', medicine_id: null, type: '', saleType: 'Sealed', power: '', packing: '', qty: '', price: '', disPercent: 10, gstPercent: 5, batch: '', gid: '', location: '', stock: 0
        });
        localStorage.removeItem('retailDraft');
        showToast('Bill put on hold', 'success');
        document.getElementById('billing-company-input')?.focus();
    }

    function handleRestoreBill(holdId) {
        if (items.length > 0) return showToast('Please clear or hold the current bill first', 'error');
        
        const holdIndex = heldBills.findIndex(h => h.id === holdId);
        if (holdIndex === -1) return;
        
        const hold = heldBills[holdIndex];
        setItems(hold.items);
        setBillDetails(hold.billDetails);
        
        const updated = heldBills.filter(h => h.id !== holdId);
        setHeldBills(updated);
        localStorage.setItem('retailHeldBills', JSON.stringify(updated));
        
        setShowHeldModal(false);
        showToast('Bill restored', 'success');
        setTimeout(() => {
            document.getElementById('billing-company-input')?.focus();
        }, 100);
    }

    return {
        heldBills, showHeldModal, setShowHeldModal,
        showClearConfirm, setShowClearConfirm,
        handleHoldBill, handleRestoreBill
    }
}
