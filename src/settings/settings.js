import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './settings.module.css';
import SettingItem from './components/SettingItem/SettingItem';

import bgScriptApi from "../backgroundScriptApi";
import { EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI, SETTINGS_KEY_EMOJI_STYLE } from "../config";
import { getLogger } from "../log";

const log = getLogger('settings', 'debug');

const SettingsPage = () => {
  const [emojiStyle, setEmojiStyle] = useState('system');

  useEffect(() => {
    const fetchEmojiStyle = async () => {
      const emojiStyle = (await chrome.storage.sync.get(SETTINGS_KEY_EMOJI_STYLE))[SETTINGS_KEY_EMOJI_STYLE];
      log.debug("Emoji style fetched from storage:", emojiStyle);
      if (emojiStyle) {
        setEmojiStyle(emojiStyle);
      }
    };

    fetchEmojiStyle();
  }, []);

  const handleEmojiStyleChange = (selectedStyle) => {
    const valuesMapUIToBackend = {
      "system": EMOJI_STYLE_NATIVE,
      "twemoji": EMOJI_STYLE_TWEMOJI,
    };
    log.debug("Emoji style change handler in SettingsPage called with value:", selectedStyle);
    bgScriptApi.setEmojiStyle(valuesMapUIToBackend[selectedStyle]);
    setEmojiStyle(selectedStyle);
  };

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
            <select id="emojiStyle" value={emojiStyle} onChange={(e) => handleEmojiStyleChange(e.target.value)}>
              <option value="system">Native</option>
              <option value="twemoji">Twemoji</option>
            </select>
          </SettingItem>
        </div>
      </div>
    </>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(
    <StrictMode>
        <SettingsPage />
    </StrictMode>
);