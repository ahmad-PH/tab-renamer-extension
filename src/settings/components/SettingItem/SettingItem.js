import React from 'react';
import PropTypes from 'prop-types';
import styles from './SettingItem.module.css';

const SettingItem = ({ label, description, children }) => {
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

SettingItem.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

export default SettingItem; 