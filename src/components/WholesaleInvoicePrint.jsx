import React from 'react';

export default function WholesaleInvoicePrint({ bill, storeProfile }) {
    if (!bill || !storeProfile) return null;

    return (
        <div className="wholesale-print-container" style={{ position: 'fixed', left: '-9999px', top: 0, width: '210mm', background: '#fff' }}>
            <style>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .wholesale-print-container { 
                        position: static !important;
                        left: auto !important;
                        display: block !important; 
                        width: 210mm; 
                        min-height: 297mm; 
                        padding: 15mm; 
                        box-sizing: border-box; 
                        font-family: 'Outfit', sans-serif, system-ui; 
                        color: #000;
                        background: #fff;
                    }
                    /* Hide everything else */
                    .no-print, aside, header, .drag-bar { display: none !important; }
                    #root > .no-print { display: none !important; }
                    
                    .inv-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .inv-table th, .inv-table td { border: 1px solid #333; padding: 6px 8px; font-size: 11px; }
                    .inv-table th { background-color: #f1f5f9; font-weight: 700; text-align: left; }
                    
                    .text-right { text-align: right !important; }
                    .text-center { text-align: center !important; }
                    .font-bold { font-weight: bold; }
                }
            `}</style>

            <div style={{ border: '2px solid #000', padding: '15px', borderRadius: '4px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                
                {/* Header Section */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '10px' }}>
                    <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: '800', color: '#0f2d1f' }}>{storeProfile.store_name?.toUpperCase()}</h1>
                    <p style={{ margin: '2px 0', fontSize: '13px' }}>{storeProfile.address_line1}, {storeProfile.address_line2}, {storeProfile.address_line3}</p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Phone:</strong> {storeProfile.phone} | <strong>Email:</strong> {storeProfile.email}</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '5px', fontSize: '13px' }}>
                        <div><strong>GSTIN:</strong> {storeProfile.gstin}</div>
                        <div><strong>DL No:</strong> {storeProfile.dl_no}</div>
                    </div>
                    <div style={{ marginTop: '10px', display: 'inline-block', background: '#f1f5f9', padding: '4px 15px', borderRadius: '20px', border: '1px solid #000', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>TAX INVOICE (B2B)</div>
                </div>

                {/* Party & Invoice Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '10px', fontSize: '12px' }}>
                    <div style={{ flex: 1, paddingRight: '15px', borderRight: '1px solid #ccc' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>Billed To:</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{bill.party_name}</div>
                        <div style={{ marginTop: '2px' }}>{bill.address}</div>
                        <div style={{ marginTop: '4px' }}><strong>GSTIN:</strong> {bill.gstin || 'N/A'}</div>
                        <div style={{ marginTop: '2px' }}><strong>DL No:</strong> {bill.dl_no || 'N/A'}</div>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span><strong>Invoice No:</strong></span>
                            <span className="font-bold">{bill.bill_number}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span><strong>Invoice Date:</strong></span>
                            <span>{new Date(bill.bill_date).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span><strong>State:</strong></span>
                            <span>{bill.saleDestination === 'in_state' ? 'Delhi' : 'Other State'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span><strong>Bill Type:</strong></span>
                            <span>{bill.bill_type}</span>
                        </div>
                        {bill.challan_no && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span><strong>Challan No:</strong></span>
                                <span>{bill.challan_no}</span>
                            </div>
                        )}
                        {bill.order_no && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span><strong>Order No:</strong></span>
                                <span>{bill.order_no}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div style={{ flexGrow: 1 }}>
                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th style={{ width: '4%' }} className="text-center">S.No</th>
                                <th style={{ width: '22%' }}>Medicine & Company</th>
                                <th style={{ width: '10%' }}>Power/Pack</th>
                                <th style={{ width: '8%' }}>Batch</th>
                                <th style={{ width: '8%' }}>Exp</th>
                                <th style={{ width: '6%' }} className="text-center">Qty</th>
                                <th style={{ width: '6%' }} className="text-center">Free</th>
                                <th style={{ width: '8%' }} className="text-right">Rate</th>
                                <th style={{ width: '8%' }} className="text-center">Dis%</th>
                                <th style={{ width: '6%' }} className="text-center">GST%</th>
                                <th style={{ width: '14%' }} className="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bill.items && bill.items.map((item, idx) => {
                                const dis = item.discount_percent || 0;
                                const scdis = item.scheme_discount_percent || 0;
                                const totalDis = dis + scdis;
                                const gstPercent = (item.cgst_rate || 0) + (item.sgst_rate || 0) + (item.igst_rate || 0);

                                return (
                                    <tr key={idx}>
                                        <td className="text-center">{idx + 1}</td>
                                        <td>
                                            <div className="font-bold">{item.medicine_name}</div>
                                            <div style={{ fontSize: '9px', color: '#555' }}>{item.company}</div>
                                        </td>
                                        <td>{item.potency} {item.unit}</td>
                                        <td>{item.batch_no || '-'}</td>
                                        <td>{item.expiry_month ? `${item.expiry_month}/${item.expiry_year}` : '-'}</td>
                                        <td className="text-center">{item.quantity}</td>
                                        <td className="text-center">{item.free_quantity || 0}</td>
                                        <td className="text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                                        <td className="text-center">{totalDis}%</td>
                                        <td className="text-center">{gstPercent}%</td>
                                        <td className="text-right font-bold">₹{Number(item.total_price).toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Section */}
                <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
                    <div style={{ display: 'flex', border: '1px solid #000', borderBottom: 'none' }}>
                        <div style={{ flex: 2, borderRight: '1px solid #000', padding: '10px', fontSize: '11px' }}>
                            <div className="font-bold" style={{ marginBottom: '5px' }}>Terms & Conditions:</div>
                            <ol style={{ margin: 0, paddingLeft: '15px', color: '#333' }}>
                                <li>Goods once sold will not be taken back or exchanged.</li>
                                <li>All disputes are subject to local jurisdiction only.</li>
                                <li>Interest @ 24% p.a. will be charged if payment is delayed.</li>
                            </ol>

                            <div className="font-bold" style={{ marginTop: '15px', marginBottom: '5px' }}>Bank Details:</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', color: '#333' }}>
                                <span>Bank Name:</span> <strong>HDFC Bank Ltd.</strong>
                                <span>A/C No:</span> <strong>12345678901234</strong>
                                <span>IFSC Code:</span> <strong>HDFC0001234</strong>
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                                <span>Gross Amount:</span>
                                <span>₹{Number(bill.total_amount).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                                <span>Total Discount:</span>
                                <span>-₹{Number(bill.total_discount).toFixed(2)}</span>
                            </div>
                            
                            {/* GST Breakdown */}
                            <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px dashed #ccc', fontSize: '11px', color: '#444' }}>
                                {bill.saleDestination === 'in_state' ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span>CGST:</span>
                                            <span>₹{(Number(bill.total_gst) / 2).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span>SGST:</span>
                                            <span>₹{(Number(bill.total_gst) / 2).toFixed(2)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                        <span>IGST:</span>
                                        <span>₹{Number(bill.total_gst).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #000', fontSize: '16px', fontWeight: '800' }}>
                                <span>Net Total:</span>
                                <span>₹{Number(bill.net_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', border: '1px solid #000', padding: '10px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '11px' }}>
                            <span className="font-bold">Amount in Words: </span>
                            Rupees {convertNumberToWords(Math.round(bill.net_amount || 0))} Only.
                        </div>
                        <div style={{ textAlign: 'center', width: '250px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '40px' }}>For {storeProfile.store_name?.toUpperCase()}</div>
                            <div style={{ borderTop: '1px dashed #000', paddingTop: '5px', fontSize: '11px' }}>Authorized Signatory</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

function convertNumberToWords(amount) {
    if (amount === 0) return 'Zero';
    const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const formatTenth = (digit, prev) => { return 0 == digit ? "" : " " + (1 == digit ? double[prev] : tens[digit]) };
    const formatOther = (digit, next, denom) => { return (0 != digit && 1 != next ? " " + single[digit] : "") + (0 != next || digit > 0 ? " " + denom : "") };
    let res = "";
    let index = 0;
    let digit = 0;
    let next = 0;
    let words = [];
    if (amount += "", isNaN(parseInt(amount))) { res = ""; }
    else if (parseInt(amount) > 0 && amount.length <= 10) {
        for (index = amount.length - 1; index >= 0; index--) switch (digit = amount[index] - 0, next = index > 0 ? amount[index - 1] - 0 : 0, amount.length - index - 1) {
            case 0: words.push(formatOther(digit, next, "")); break;
            case 1: words.push(formatTenth(digit, amount[index + 1])); break;
            case 2: words.push(0 != digit ? " " + single[digit] + " Hundred" + (0 != amount[index + 1] && 0 != amount[index + 2] ? " and" : "") : ""); break;
            case 3: words.push(formatOther(digit, next, "Thousand")); break;
            case 4: words.push(formatTenth(digit, amount[index + 1])); break;
            case 5: words.push(formatOther(digit, next, "Lakh")); break;
            case 6: words.push(formatTenth(digit, amount[index + 1])); break;
            case 7: words.push(formatOther(digit, next, "Crore")); break;
            case 8: words.push(formatTenth(digit, amount[index + 1])); break;
            case 9: words.push(0 != digit ? " " + single[digit] + " Hundred" + (0 != amount[index + 1] || 0 != amount[index + 2] ? " and" : " Crore") : "");
        }
        res = words.reverse().join("")
    }
    return res.trim();
}
