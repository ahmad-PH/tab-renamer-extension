
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './settings.module.css';
import PropTypes from 'prop-types';

const SettingsPage = () => {
  return (
    <>
      <div className={styles.topBar}>
        <img src={chrome.runtime.getURL("assets/icon128.png")} alt="Tab Renamer Logo" className={styles.logo} />
        <span className={styles.appName}>Tab Renamer</span>
      </div>

      <div className={styles.mainContainer}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <div className={styles.settingsPane}>
          <SettingItem
            label="Emoji Style"
            description="The style of emojis in emoji picker and tab titles"
          >
            <select id="emojiStyle">
              <option value="system">Native</option>
              <option value="twemoji">Twemoji</option>
            </select>
          </SettingItem>
        </div>
      </div>
    </>
  );
};

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

  
const root = createRoot(document.getElementById('root'));
console.log("The root element is:", document.getElementById('root'));
root.render(
    <StrictMode>
        <SettingsPage />
    </StrictMode>
);



// import bgScriptApi from "../backgroundScriptApi";
// import { EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI, SETTINGS_KEY_EMOJI_STYLE } from "../config";
// import { castType } from "../utils";
// import { getLogger } from "../log";

// const log = getLogger('settings', 'debug');

// document.addEventListener('DOMContentLoaded', async () => {
//     const { emojiStyle } = await chrome.storage.sync.get(SETTINGS_KEY_EMOJI_STYLE);
//     if (emojiStyle) {
//         const emojiStyleSelect = castType(document.getElementById('emojiStyle'), HTMLSelectElement);
//         emojiStyleSelect.value = emojiStyle;
//     }
// });

// document.getElementById('emojiStyle').addEventListener('change', (event) => {
//     const valuesMapUIToBackend = {
//         "system": EMOJI_STYLE_NATIVE,
//         "twemoji": EMOJI_STYLE_TWEMOJI,
//     }
//     const selectedStyle = castType(event.target, HTMLSelectElement).value;
//     log.debug("Emoji style change listener in settings.js called with value:", selectedStyle);
//     bgScriptApi.setEmojiStyle(valuesMapUIToBackend[selectedStyle])
// });