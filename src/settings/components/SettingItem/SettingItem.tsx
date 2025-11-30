import React from 'react';
import styles from './SettingItem.module.css';

interface SettingItemProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, description, children }) => {
  return (
    <div className={styles.settingItem}>
      <div className={styles.settingLabel}>
        <label>{label}</label>
        <div className={styles.description}>
          {description}
        </div>
      </div>
      <div className={styles.settingControl}>
        {children}
      </div>
    </div>
  );
};

export default SettingItem;

