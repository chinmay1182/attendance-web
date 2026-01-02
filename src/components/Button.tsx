
import React, { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    className = '',
    disabled,
    ...props
}) => {
    return (
        <button
            className={`${styles.button} ${styles[variant]} ${isLoading ? styles.loading : ''} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {children}
        </button>
    );
};
