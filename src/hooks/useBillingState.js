import { useState, useMemo } from 'react';

export function useBillingState() {
    const [items, setItems] = useState([])
    const [billDetails, setBillDetails] = useState({
        patientName: 'CASH',
        address: '-',
        prescribedBy: 'Self',
        discountRs: 0,
        otherCharges: 0,
        otherChargesType: 'E'
    })
    
    const [currentEntry, setCurrentEntry] = useState({
        company: '',
        medicine: '',
        medicine_id: null,
        type: '', 
        saleType: 'Sealed',
        power: '',
        packing: '',
        qty: '',
        price: '',
        disPercent: 10,
        gstPercent: 5,
        batch: '',
        gid: '',
        location: '',
        stock: 0
    })

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount), 0), [items])
    const totalQty = useMemo(() => items.reduce((sum, item) => sum + Number(item.qty), 0), [items])
    const totalDisAmount = useMemo(() => items.reduce((sum, item) => sum + Number(item.disAmount), 0), [items])
    
    const billDiscountRs = Number(billDetails.discountRs) || 0
    const otherCharges = Number(billDetails.otherCharges) || 0
    const netAmount = subtotal - billDiscountRs + otherCharges

    const roundOff = Math.round(netAmount) - netAmount
    const finalTotal = Math.round(netAmount)

    const totalSaving = totalDisAmount + billDiscountRs

    return {
        items, setItems,
        billDetails, setBillDetails,
        currentEntry, setCurrentEntry,
        subtotal, totalQty, totalDisAmount, billDiscountRs, otherCharges, roundOff, finalTotal, totalSaving
    }
}
