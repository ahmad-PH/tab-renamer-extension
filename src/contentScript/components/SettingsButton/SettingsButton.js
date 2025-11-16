import React from 'react';
import styles from './SettingsButton.module.css';
import { SETTINGS_BUTTON_ID, SETTING_BUTTON_TEST_STUB_ID, SETTINGS_BUTTON_TRIGGER_AREA_ID } from '../../../config';

export default function SettingsButton() {
    const handleClick = () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
          } else {
            window.open(chrome.runtime.getURL('settings/settings.html'));
        }
    };

    // This element only exists to provide a stable clickable surface for e2e tests, because the css applied to
    // the settings button makes it not-interactable in the headless mode.
    const testStub = (
        <div className={styles.testStub} id={SETTING_BUTTON_TEST_STUB_ID} onClick={handleClick}/>
    );

    return (
        <>
            <div className={styles.triggerArea} id={SETTINGS_BUTTON_TRIGGER_AREA_ID}>
                <div className={styles.relativeContainer}>
                    <div className={styles.visibleTriggerArea} />
                    <button 
                        id={SETTINGS_BUTTON_ID}
                        className={styles.settingsButton}
                        onClick={handleClick}
                        title="Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={styles.settingsSVG} viewBox="0 0 16 16">
                            <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
                        </svg>
                    </button>
                </div>
            </div>
            {testStub}
        </>
    );
} 