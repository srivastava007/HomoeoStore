import { useState, useEffect } from 'react';
import { numberToWords, formatInvoiceDate } from '../utils/billingUtils';

export function useInvoicePrinter(storeProfile, billDetails, showToast) {
    const [printBillData, setPrintBillData] = useState(null);
    const [triggerPrint, setTriggerPrint] = useState(false);

    async function triggerInvoicePrint(billId, enrichFromActiveForm = false) {
        try {
            const dbBill = await window.api.getBillById(billId)
            const enrichedBill = {
                ...dbBill,
                address: enrichFromActiveForm ? billDetails.address : '-',
                prescribed_by: enrichFromActiveForm ? billDetails.prescribedBy : '-'
            }
            setPrintBillData(enrichedBill)
            setTriggerPrint(true)
        } catch (err) {
            console.error('[PRINT] Failed to fetch bill for printing:', err)
            showToast('Failed to fetch bill details', 'error')
        }
    }

    useEffect(() => {
        if (triggerPrint && printBillData) {
            setTriggerPrint(false)
            
            const printReceiptData = async () => {
                try {
                    let totalGross = 0;
                    let totalDiscount = 0;
                    
                    const rowsHtml = (printBillData.items || []).map((item, idx) => {
                        const medName = item.medicine_name || '';
                        const details = `${item.potency ? item.potency : ''} ${item.packing || ''} ${item.unit || ''}`.trim();
                        const companyStr = item.company ? `(${item.company})` : '';
                        const subLine = [details, companyStr].filter(Boolean).join(' ');
                        const descHtml = subLine ? `${medName}<br><span style="font-size: 9px; font-weight: 600;">${subLine}</span>` : medName;
                        
                        const qty = Number(item.quantity) || 0;
                        const price = Number(item.unit_price) || 0;
                        const net = Number(item.total_price) || 0;
                        const gross = price * qty;
                        const discount = gross - net;
                        
                        totalGross += gross;
                        totalDiscount += discount;

                        return `
                            <tr>
                                <td style="vertical-align: top; padding: 1px 0;">${idx + 1}</td>
                                <td style="vertical-align: top; padding: 1px 2px; line-height: 1.1;">${descHtml}</td>
                                <td style="text-align: center; vertical-align: top; padding: 1px 0;">${qty}</td>
                                <td style="text-align: right; vertical-align: top; padding: 1px 0;">${price.toFixed(2)}</td>
                                <td style="text-align: right; vertical-align: top; padding: 1px 0;">${discount > 0 ? discount.toFixed(2) : '-'}</td>
                                <td style="text-align: right; vertical-align: top; padding: 1px 0;">${net.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('');

                    const roundedTotal = Math.round(Number(printBillData.total_amount) || 0);
                    const roundOff = roundedTotal - Number(printBillData.total_amount);

                    const cgst = (Number(printBillData.total_tax) || 0) / 2;
                    const sgst = (Number(printBillData.total_tax) || 0) / 2;

                    const numInWords = numberToWords(roundedTotal);

                    const qrSvg = `<svg width="25" height="25" viewBox="0 0 100 100" fill="none"><path d="M10 10h30v30H10V10zm10 10h10v10H20V20zm40-10h30v30H60V10zm10 10h10v10H70V20zM10 60h30v30H10V60zm10 10h10v10H20V70zm40 0h10v10H60V70zm20 0h10v10H80V70zm-20 20h30v10H60V90zm20-20h10v10H80V70zM45 45h10v10H45V45zm0 20h10v10H45V65zm20 0h10v10H65V65z" fill="#000"/></svg>`;

                    const logoSvg = `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 2px;"><path d="M7 10h10M5 6l2 4 1.5-1.5M19 6l-2 4-1.5-1.5"/><path d="M5 10c0 4.418 3.134 8 7 8s7-3.582 7-8H5z"/><path d="M12 18v4M9 22h6"/><path d="M12 11v4M10 13h4"/></svg>`;

                    const printStyles = `style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"`;

                    const receiptData = [
                        {
                            type: 'html',
                            value: `
                                <div style="text-align: center; margin-bottom: 4px;">
                                    ${logoSvg}
                                    <h1 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${storeProfile?.store_name || 'HOMOEOSTORE'}</h1>
                                    <p style="margin: 1px 0 0 0; font-size: 9px;">${[storeProfile?.address_line1, storeProfile?.address_line2, storeProfile?.address_line3].filter(Boolean).join(', ') || 'Address'}</p>
                                    ${storeProfile?.phone ? `<p style="margin: 0; font-size: 9px;">Mobile: ${storeProfile.phone}</p>` : ''}
                                    ${storeProfile?.gstin ? `<p style="margin: 0; font-size: 9px;">GSTIN: ${storeProfile.gstin}</p>` : ''}
                                    ${storeProfile?.dl_no ? `<p style="margin: 0; font-size: 9px;">DL RETAIL: ${storeProfile.dl_no}</p>` : ''}
                                </div>
                                
                                <div style="font-size: 10px; margin-top: 2px;">
                                    <div style="font-weight: 800; font-size: 11px; margin-bottom: 1px;">CASH MEMO / INVOICE</div>
                                    <div style="display: flex;">
                                        <div style="width: 20px;">To:</div>
                                        <div style="font-weight: 800; text-transform: uppercase;">${printBillData.customer_name || 'CASH'}</div>
                                    </div>
                                </div>
                                <div style="border-bottom: 1px dashed #000; margin: 3px 0;"></div>
                                
                                <div style="font-size: 10px;">
                                    <div><span style="font-weight: 800; display: inline-block; width: 50px;">Bill No.:</span> <span style="font-weight: 800;">${printBillData.bill_number}</span></div>
                                    <div><span style="font-weight: 800; display: inline-block; width: 50px;">Date:</span> <span style="font-weight: 800;">${formatInvoiceDate(printBillData.created_at + (printBillData.created_at.includes('Z') ? '' : 'Z'))}</span></div>
                                </div>

                                <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin-top: 4px; padding: 2px 0; ${printStyles}">
                                    <table style="width: 100%; font-size: 9px; font-weight: 800;">
                                        <tr>
                                            <td style="width: 5%;">#</td>
                                            <td style="width: 43%;">MEDICINE</td>
                                            <td style="width: 7%; text-align: center;">QT</td>
                                            <td style="width: 13%; text-align: right;">PRICE</td>
                                            <td style="width: 12%; text-align: right;">DISC</td>
                                            <td style="width: 20%; text-align: right;">AMOUNT</td>
                                        </tr>
                                    </table>
                                </div>

                                <table style="width: 100%; font-size: 10px; margin-bottom: 2px; margin-top: 1px; font-weight: 600;">
                                    ${rowsHtml}
                                </table>

                                ${cgst > 0 ? `
                                <div style="border-bottom: 1px dashed #000; margin: 2px 0;"></div>
                                <table style="width: 100%; font-size: 10px; margin-top: 2px; font-weight: 600;">
                                    <tr>
                                        <td style="width: 35%;"></td>
                                        <td style="width: 35%;">CGST (2.50%) :</td>
                                        <td style="width: 5%;">₹</td>
                                        <td style="width: 25%; text-align: right;">${cgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>SGST (2.50%) :</td>
                                        <td>₹</td>
                                        <td style="text-align: right;">${sgst.toFixed(2)}</td>
                                    </tr>
                                </table>
                                <div style="display: flex; justify-content: flex-end;">
                                    <div style="width: 65%; border-bottom: 1px dashed #000; margin: 2px 0;"></div>
                                </div>
                                <table style="width: 100%; font-size: 10px; font-weight: 800; margin-bottom: 4px;">
                                    <tr>
                                        <td style="width: 35%;"></td>
                                        <td style="width: 35%;">Total CGST :</td>
                                        <td style="width: 5%;">₹</td>
                                        <td style="width: 25%; text-align: right;">${cgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>Total SGST :</td>
                                        <td>₹</td>
                                        <td style="text-align: right;">${sgst.toFixed(2)}</td>
                                    </tr>
                                </table>
                                ` : `<div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>`}

                                <div style="font-size: 10px; font-weight: 800; margin-bottom: 2px;">SUMMARY</div>
                                <table style="width: 100%; font-size: 10px; font-weight: 600;">
                                    <tr>
                                        <td style="width: 50%;">Total MRP</td>
                                        <td style="width: 10%;">:</td>
                                        <td style="width: 5%;">₹</td>
                                        <td style="width: 35%; text-align: right;">${totalGross.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding-bottom: 2px;">Less Discount</td>
                                        <td style="padding-bottom: 2px;">:</td>
                                        <td style="padding-bottom: 2px;">₹</td>
                                        <td style="text-align: right; padding-bottom: 2px;">${totalDiscount.toFixed(2)}</td>
                                    </tr>
                                </table>
                                <div style="border-bottom: 1px dashed #000; margin: 2px 0;"></div>
                                <table style="width: 100%; font-size: 12px; font-weight: 900;">
                                    <tr>
                                        <td style="width: 50%;">TOTAL (Tax Incl.)</td>
                                        <td style="width: 10%;">:</td>
                                        <td style="width: 5%;">₹</td>
                                        <td style="width: 35%; text-align: right;">${roundedTotal.toFixed(2)}</td>
                                    </tr>
                                </table>
                                <table style="width: 100%; font-size: 10px; font-weight: 600; margin-top: 1px;">
                                    <tr>
                                        <td style="width: 50%;">Round</td>
                                        <td style="width: 10%;">:</td>
                                        <td style="width: 5%;"></td>
                                        <td style="width: 35%; text-align: right;">${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}</td>
                                    </tr>
                                </table>
                                
                                <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; ${printStyles} padding: 4px 0; margin-top: 4px;">
                                    <table style="width: 100%; font-size: 13px; font-weight: 900;">
                                        <tr>
                                            <td style="width: 50%;">FINAL TOTAL</td>
                                            <td style="width: 10%;">:</td>
                                            <td style="width: 5%;">₹</td>
                                            <td style="width: 35%; text-align: right;">${roundedTotal.toFixed(2)}</td>
                                        </tr>
                                    </table>
                                </div>

                                <div style="font-size: 9px; margin-top: 6px;">
                                    <div style="font-weight: 800;">TOTAL IN WORDS:</div>
                                    <div style="margin-top: 1px;">${numInWords}</div>
                                </div>
                                <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>

                                <div style="display: flex; justify-content: space-between; font-size: 8px; align-items: flex-end;">
                                    <div style="width: 60%;">
                                        <div style="margin-bottom: 2px;">For <span style="font-weight: 800;">${storeProfile?.store_name?.toUpperCase() || 'HOMOEOSTORE'}</span></div>
                                        <div>1. Goods once sold will not be taken back.</div>
                                        <div>2. All disputes subject to local jurisdiction.</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="margin-bottom: 20px;">E&OE</div>
                                        <div>Authorised Signatory</div>
                                    </div>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                    <div style="font-weight: 900; font-size: 11px; letter-spacing: 0.5px; color: #000; ${printStyles}">
                                        WE WISH YOU GOOD HEALTH
                                    </div>
                                    <div>${qrSvg}</div>
                                </div>
                                
                                <div style="text-align: center; font-size: 7px; margin-top: 8px;">
                                    Printed with Homoeostore POS
                                </div>
                            `
                        }
                    ]

                    console.log('[PRINT] Calling window.api.printReceipt with', receiptData.length, 'items')
                    const response = await window.api.printReceipt(receiptData)
                    console.log('[PRINT] Response from backend:', response)
                    if (response.success) {
                        showToast('Bill Sent to Thermal Printer!', 'success')
                    } else {
                        showToast('Thermal Printing failed: ' + response.error, 'error')
                    }
                } catch (e) {
                    console.error('[PRINT] Error in printReceiptData:', e)
                    showToast('Failed to prepare print data', 'error')
                }
            }
            
            printReceiptData()
        }
    }, [triggerPrint, printBillData, storeProfile])

    return { triggerInvoicePrint }
}
