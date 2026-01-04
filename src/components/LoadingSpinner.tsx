import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
    fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullScreen = false }) => {
    return (
        <div className={`${styles.container} ${fullScreen ? styles.fullscreen : ''}`}>
            <div className={styles.spinner}></div>
        </div>
    );
};
