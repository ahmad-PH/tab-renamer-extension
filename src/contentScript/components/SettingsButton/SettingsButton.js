import React from 'react';
import styles from './SettingsButton.module.css';
import gearIcon from 'bootstrap-icons/icons/gear.svg';

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
            <div className={styles.settingsButtonContainer}>
                <button 
                    className={styles.settingsButton}
                    onClick={handleClick}
                    title="Settings"
                >
                    <img className={styles.settingsButtonIcon} src={gearIcon} alt="Settings" />
                </button>
            </div>
        </>
    );
} 