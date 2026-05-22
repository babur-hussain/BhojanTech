import React, { useRef, KeyboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({ length = 6, value, onChange, onComplete }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const inputValue = e.target.value.replace(/[^0-9]/g, '');
    if (!inputValue) return;

    const newValue = value.split('');
    newValue[index] = inputValue.slice(-1);
    const updatedValue = newValue.join('');
    
    onChange(updatedValue);

    // Auto focus to next input
    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (inputValue && index === length - 1 && onComplete) {
      // If it's the last input and we have a value, we can optionally trigger onComplete
      // setTimeout to allow state to update first
      setTimeout(() => onComplete(), 50);
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
    } else if (e.key === 'Enter' && value.length === length && onComplete) {
      e.preventDefault();
      onComplete();
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
    
    if (pastedData.length === length && onComplete) {
      setTimeout(() => onComplete(), 50);
    }
  };

  return (
    <div className="flex justify-between items-center w-full gap-2 mt-4 mb-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-14 sm:w-14 sm:h-16 border-2 border-gray-200 rounded-xl text-center text-2xl font-black text-gray-900 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 focus:outline-none transition-all shadow-sm bg-white"
        />
      ))}
    </div>
  );
};
