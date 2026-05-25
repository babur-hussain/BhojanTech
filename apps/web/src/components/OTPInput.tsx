import React, { useRef, KeyboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({ length = 6, value, onChange }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const inputValue = e.target.value.replace(/[^0-9]/g, '');
    if (!inputValue) return;

    if (inputValue.length > 2) {
      const pastedData = inputValue.slice(0, length);
      onChange(pastedData);
      
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const singleChar = inputValue.slice(-1);
    const newValue = value.split('');
    newValue[index] = singleChar;
    const updatedValue = newValue.join('');
    
    onChange(updatedValue);

    // Auto focus to next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = value.split('');
      
      if (newValue[index]) {
        // If current box has a value, just clear it
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // If current box is empty, move focus back and clear previous
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '').slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    
    // Focus the next empty input or the last input
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex justify-between items-center w-full gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-14 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold text-gray-900 focus:border-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none transition-all shadow-sm"
        />
      ))}
    </div>
  );
};
