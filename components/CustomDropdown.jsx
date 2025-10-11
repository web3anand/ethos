import React, { useState, useCallback } from 'react';
import styles from './CustomDropdown.module.css';

const CustomDropdown = React.memo(({ value, onChange, options, className, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value);

  const handleSelect = useCallback((optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const handleBlur = useCallback(() => {
    // Delay closing to allow click event on items to register
    setTimeout(() => {
      if (isOpen) {
        setIsOpen(false);
      }
    }, 150);
  }, [isOpen]);

  return (
    <div className={`${styles.customDropdown} ${className || ''}`.trim()} onBlur={handleBlur}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <span className={`${styles.dropdownArrow} ${isOpen ? styles.dropdownArrowOpen : ''}`}>
          <svg width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 1.5L7 7L12.5 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      
      {isOpen && (
        <div className={styles.dropdownMenu} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.dropdownItem} ${value === option.value ? styles.dropdownItemSelected : ''}`}
              onClick={() => handleSelect(option.value)}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default CustomDropdown;
