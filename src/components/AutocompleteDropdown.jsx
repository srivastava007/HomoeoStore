import React, { useState, useEffect, useMemo } from 'react';

export default function AutocompleteDropdown({ 
    value, 
    onChange, 
    options = [], 
    onEnter, 
    placeholder, 
    id, 
    className,
    inputStyle, 
    readOnly, 
    tabIndex, 
    nameOnly,
    onEscape,
    dropdownWidth,
    passObject = false,
    maxItems = 50 
}) {
    const [show, setShow] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState(-1)

    const searchTerms = useMemo(() => {
        return String(value || '').toLowerCase().split(/\s+/).filter(Boolean);
    }, [value]);

    const filtered = useMemo(() => {
        if (!show) return [];
        if (searchTerms.length === 0) return options.slice(0, maxItems);
        return options.filter(o => {
            if (typeof o === 'string') {
                const searchStr = o.toLowerCase();
                return searchTerms.every(term => searchStr.includes(term));
            }
            if (o._searchKey && !nameOnly) {
                return searchTerms.every(term => o._searchKey.includes(term));
            }
            if (nameOnly) {
                if (o.nameLower) return searchTerms.every(term => o.nameLower.includes(term));
                return searchTerms.every(term => String(o.name || '').toLowerCase().includes(term));
            }
            const searchStr = (String(o.name || '') + ' ' + String(o.company || '') + ' ' + String(o.potency || '')).toLowerCase();
            return searchTerms.every(term => searchStr.includes(term));
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
            if (e.key === 'Enter' && onEnter) {
                e.preventDefault();
                onEnter(value);
            }
            return;
        }
        if (!show) {
            if (e.key === 'Enter' && onEnter) {
                e.preventDefault();
                onEnter(value);
            }
            if (e.key === 'Escape' && onEscape) {
                e.preventDefault();
                e.stopPropagation();
                onEscape();
                return;
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
                const selectedOption = filtered[focusedIdx];
                const finalValue = passObject ? selectedOption : (typeof selectedOption === 'string' ? selectedOption : selectedOption.name);
                onChange(finalValue)
                setShow(false)
                setFocusedIdx(-1)
                if (onEnter) {
                    setTimeout(() => onEnter(finalValue), 50)
                }
            } else {
                setShow(false)
                if (onEnter) onEnter(value)
            }
        } else if (e.key === 'Escape') {
            e.stopPropagation()
            setShow(false)
            setFocusedIdx(-1)
            if (onEscape) onEscape()
        }
    }

    const handleSelectOption = (opt) => {
        const finalValue = passObject ? opt : (typeof opt === 'string' ? opt : opt.name);
        onChange(finalValue);
        setShow(false);
        setFocusedIdx(-1);
        if (onEnter) {
            setTimeout(() => onEnter(finalValue), 50);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input 
                id={id}
                className={className || "modern-input"}
                style={inputStyle}
                value={value}
                onChange={e => { if (readOnly) return; onChange(e.target.value); setShow(true); setFocusedIdx(0); }}
                onFocus={(e) => { if (readOnly) return; setShow(true); setFocusedIdx(-1); e.target.select(); }}
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
                    background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                    maxHeight: '220px', overflowY: 'auto', boxSizing: 'border-box',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    width: dropdownWidth || '100%'
                }}>
                    {filtered.map((opt, idx) => {
                        const isHigh = idx === focusedIdx
                        const isString = typeof opt === 'string';
                        return (
                            <div 
                                key={isString ? opt : (opt.id || opt.name || idx)}
                                onClick={() => handleSelectOption(opt)}
                                onMouseEnter={() => setFocusedIdx(idx)}
                                style={{
                                    padding: '8px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                                    background: isHigh ? '#f0fdf4' : '#fff', color: isHigh ? '#16a34a' : '#1f2937',
                                    fontWeight: isHigh ? '600' : 'normal', borderBottom: '1px solid #f1f5f9',
                                    whiteSpace: dropdownWidth === 'max-content' ? 'nowrap' : 'normal',
                                    wordBreak: 'break-word'
                                }}
                            >
                                {isString ? (
                                    <span>{opt}</span>
                                ) : (
                                    <>
                                        <span style={{ fontWeight: '700' }}>{opt.name}</span>
                                        {!nameOnly && opt.company && <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>({opt.company})</span>}
                                        {opt.potency && <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '8px', fontWeight: '700' }}>{opt.potency}</span>}
                                        {opt.unit && <span style={{ background: '#f8fafc', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '4px', fontWeight: '600' }}>{opt.unit}</span>}
                                        {opt.category && <span style={{ color: '#3b82f6', fontSize: '11px', marginLeft: '8px', fontWeight: '700' }}>[{opt.category}]</span>}
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
