import React from 'react';
import styles from './SettingsButton.module.css';
import gearIcon from 'bootstrap-icons/icons/gear.svg';
import { SETTINGS_BUTTON_ID } from '../../../config';

export default function SettingsButton() {
    const handleClick = () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
          } else {
            window.open(chrome.runtime.getURL('settings/settings.html'));
        }
    };

    return (
        <>
            <div className={styles.triggerArea}>
                <div className={styles.relativeContainer}>
                    <div className={styles.visibleTriggerArea} />
                    <button 
                        id={SETTINGS_BUTTON_ID}
                        className={styles.settingsButton}
                        onClick={handleClick}
                        title="Settings"
                    >
                        <img className={styles.icon} src={gearIcon} alt="Settings" />
                    </button>
                </div>
            </div>
        </>
    );
} 