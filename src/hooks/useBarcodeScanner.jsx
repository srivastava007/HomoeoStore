import { useEffect, useRef } from 'react';

// Typically, barcode scanners output characters very fast (e.g., < 20ms between keystrokes)
// and end with an 'Enter' key. Humans usually type much slower.
const TYPING_DELAY_MS = 50; 

export function useBarcodeScanner({ onScan, enabled = true }) {
    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);

    useEffect(() => {
        if (!enabled) return;

        function handleKeyDown(e) {
            // Ignore if focus is in an input where we shouldn't intercept, 
            // BUT wait, we actually WANT to intercept even if focus is in an input,
            // so we can auto-fill. We just preventDefault if it's a valid scan.
            
            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTimeRef.current;
            
            // If it's been too long since the last key, reset the buffer (it's human typing)
            if (timeDiff > TYPING_DELAY_MS && bufferRef.current.length > 0) {
                bufferRef.current = '';
            }

            lastKeyTimeRef.current = currentTime;

            // Scanners usually append 'Enter' at the end
            if (e.key === 'Enter') {
                if (bufferRef.current.length > 5) { // Minimum length for a barcode
                    const scannedText = bufferRef.current;
                    bufferRef.current = '';
                    
                    // Call the callback
                    onScan(scannedText);
                } else {
                    bufferRef.current = '';
                }
                return;
            }

            // Append printable characters to the buffer
            if (e.key.length === 1) {
                bufferRef.current += e.key;
            }
        }

        window.addEventListener('keydown', handleKeyDown, true); // Capture phase

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [onScan, enabled]);
}
