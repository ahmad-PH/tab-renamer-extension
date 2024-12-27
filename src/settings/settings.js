
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './settings.module.css';

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
          {/* <SettingItem
            label="Emoji Style"
            description="The style of emojis in emoji picker and tab titles"
            id="emojiStyle"
            options={[
              { value: 'system', label: 'Native' },
              { value: 'twemoji', label: 'Twemoji' }
            ]}
          /> */}
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <label htmlFor="emojiStyle">Emoji Style</label>
              <div className={styles.description}>
                The style of emojis in emoji picker and tab titles
              </div>
            </div>
            <div className={styles.settingControl}>
              <select id="emojiStyle">
                <option value="system">Nattttive</option>
                <option value="twemoji">Twemoji</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// const SettingItem = ({ label, description, options, id }) => {
//   return (
//       <div className={styles.settingItem}>
//           <div className={styles.settingLabel}>
//               <label htmlFor={id}>{label}</label>
//               <div className={styles.description}>
//                   {description}
//               </div>
//           </div>
//           <div className={styles.settingControl}>
//               <select id={id}>
//                   {options.map(option => (
//                       <option key={option.value} value={option.value}>
//                           {option.label}
//                       </option>
//                   ))}
//               </select>
//           </div>
//       </div>
//   );
// };

  
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