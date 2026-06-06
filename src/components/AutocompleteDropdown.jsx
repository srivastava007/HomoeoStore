import React, { useState, useMemo } from 'react';

export default function AutocompleteDropdown({ value, onChange, options, onEnter, placeholder, id, inputStyle, readOnly, tabIndex, maxItems = 50 }) {
    const [show, setShow] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState(0)

    const searchTerms = useMemo(() => {
        return String(value || '').toLowerCase().split(/\s+/).filter(Boolean);
    }, [value]);

    const filtered = useMemo(() => {
        if (!show) return [];
        if (searchTerms.length === 0) return options.slice(0, maxItems);
        return options.filter(o => {
            if (o._searchKey) {
                return searchTerms.every(term => o._searchKey.includes(term));
            }
            if (o.nameLower) {
                return searchTerms.every(term => o.nameLower.includes(term));
            }
            const searchStr = (o.name + ' ' + (o.company || '')).toLowerCase();
            return searchTerms.every(term => searchStr.includes(term));
        }).slice(0, maxItems);
    }, [show, options, searchTerms, maxItems]);

    function handleKeyDown(e) {
        if (readOnly) {
            if (e.key === 'Enter') {
                e.preventDefault();
                onEnter(value);
            }
            return;
        }
        if (!show) {
            if (e.key === 'Enter') {
                e.preventDefault();
                onEnter(value);
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
                setFocusedIdx(0)
                const selectedVal = filtered[focusedIdx].name
                setTimeout(() => onEnter(selectedVal), 50)
            } else {
                setShow(false)
                onEnter(value)
            }
        } else if (e.key === 'Escape') {
            e.stopPropagation()
            setShow(false)
            setFocusedIdx(0)
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input 
                id={id}
                className="modern-input"
                style={inputStyle}
                value={value}
                onChange={e => { if (readOnly) return; onChange(e.target.value); setShow(true); setFocusedIdx(0); }}
                onFocus={(e) => { if (readOnly) return; setShow(true); setFocusedIdx(0); e.target.select(); }}
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
                    background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px',
                    maxHeight: '180px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}>
                    {filtered.map((opt, idx) => {
                        const isHigh = idx === focusedIdx
                        return (
                            <div 
                                key={opt.id || opt.name || idx}
                                onClick={() => { 
                                    onChange(opt.name); 
                                    setShow(false); 
                                    setTimeout(() => onEnter(opt.name), 50); 
                                }}
                                onMouseEnter={() => setFocusedIdx(idx)}
                                style={{
                                    padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                                    background: isHigh ? '#f0fdf4' : '#fff', color: isHigh ? '#16a34a' : '#1f2937',
                                    fontWeight: isHigh ? '600' : 'normal', borderBottom: '1px solid #f1f5f9'
                                }}
                            >
                                {opt.name} {opt.company ? <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>({opt.company})</span> : null}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
