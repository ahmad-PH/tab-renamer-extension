import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './settings.module.css';
import SettingItem from './components/SettingItem/SettingItem';

import { EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI, SETTINGS_KEY_EMOJI_STYLE, SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID } from "../config";
import { getLogger } from "../log";
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { StyledEngineProvider } from '@mui/material/styles';

const log = getLogger('settings', 'debug');

const SettingsPage: React.FC = () => {
  const [emojiStyle, setEmojiStyle] = useState(EMOJI_STYLE_NATIVE);

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

  const handleEmojiStyleChange = async (selectedStyle: string) => {
    log.debug("Emoji style change handler in SettingsPage called with value:", selectedStyle);
    await chrome.storage.sync.set({[SETTINGS_KEY_EMOJI_STYLE]: selectedStyle});
    setEmojiStyle(selectedStyle);
  };

  return (
    <>
      <StyledEngineProvider injectFirst>
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
              <FormControl sx={{ m: 1, minWidth: 120}} size="small">
                <Select
                  id={SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID}
                  value={emojiStyle}
                  onChange={(e: SelectChangeEvent<string>) => handleEmojiStyleChange(e.target.value)}
                  className={styles.selectElement}
                >
                  <MenuItem value={EMOJI_STYLE_NATIVE} className={styles.selectElementItem}>Native</MenuItem>
                  <MenuItem value={EMOJI_STYLE_TWEMOJI} className={styles.selectElementItem}>Twemoji</MenuItem>
                </Select>
              </FormControl>
            </SettingItem>
          </div>
        </div>
      </StyledEngineProvider>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <StrictMode>
        <SettingsPage />
    </StrictMode>
);

