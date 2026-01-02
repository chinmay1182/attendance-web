
import React, { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    className = '',
    ...props
}) => {
    return (
        <div className={styles.inputGroup}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.inputWrapper}>
                <input
                    className={`${styles.input} ${error ? styles.errorInput : ''} ${className}`}
                    {...props}
                />
            </div>
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};
