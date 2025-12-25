import { COMMAND_REFRESH_CURRENT_TITLE } from "../config";
import { getLogger } from "../log";
import { tabRepository } from "../repositories/tabRepository";

const log = getLogger('titleChangeHandler');

const titleCorrectionState: Record<number, { lastTime: number; retriesUsed: number }> = {};
const TITLE_CORRECTION_THRESHOLD_SECONDS = 1;
const TITLE_CORRECTION_MAX_RETRIES = 4;
export const STALE_ENTRY_THRESHOLD_MS = 5 * 60 * 1000;

export function cleanupStaleEntries(state: Record<number, { lastTime: number }>): void {
    const now = Date.now();
    for (const tabId of Object.keys(state)) {
        if (now - state[Number(tabId)].lastTime > STALE_ENTRY_THRESHOLD_MS) {
            delete state[Number(tabId)];
        }
    }
}

export async function handleTitleChange(tabId: number, newTitle: string): Promise<void> {
    log.debug(`Detected a title change for tabId: ${tabId}, newTitle: ${newTitle}, current tabInfo:`, await tabRepository.getById(tabId));
    
    const tabInfo = await tabRepository.getById(tabId);
    if (tabInfo?.signature?.title != null &&
        tabInfo.signature.title !== newTitle &&
        newTitle != ""
    ) {
        const now = Date.now();
        const state = titleCorrectionState[tabId] ?? { lastTime: 0, retriesUsed: 0 };
        const elapsedSeconds = (now - state.lastTime) / 1000;
        const thresholdPassed = elapsedSeconds > TITLE_CORRECTION_THRESHOLD_SECONDS;
        const hasRetriesLeft = state.retriesUsed < TITLE_CORRECTION_MAX_RETRIES;
        
        if (thresholdPassed || hasRetriesLeft) {
            log.debug(`Sending force title command. (thresholdPassed: ${thresholdPassed}, retriesUsed: ${state.retriesUsed})`)
            setTimeout(() => {
                void (async () => {
                    const tab = await chrome.tabs.get(tabId)
                    log.debug(`From inside the timedout function, looking at tab: ${JSON.stringify(tab.title)} and comparing it against the desired title: ${tabInfo.signature.title}"`);
                    // This check is important, because otherwise you can step on the MutationObserver's toes and cause problems.
                    // Essentially, because we've waited 100ms, which is needed to avoid infinite recursions with the chrome PDF extension,
                    // We want to double check our update is still needed, before we even do it.
                    if (tab.title !== tabInfo.signature.title) { 
                        void chrome.tabs.sendMessage(tabId, { command: COMMAND_REFRESH_CURRENT_TITLE });
                    }
                })();
            }, 100);
            if (thresholdPassed) {
                titleCorrectionState[tabId] = { lastTime: now, retriesUsed: 0 };
            } else {
                titleCorrectionState[tabId] = { lastTime: state.lastTime, retriesUsed: state.retriesUsed + 1 };
            }
        } else {
            log.debug(`Skipping title correction, only ${elapsedSeconds.toFixed(1)}s elapsed (need ${TITLE_CORRECTION_THRESHOLD_SECONDS}s) and no retries left`);
        }
    }
    cleanupStaleEntries(titleCorrectionState);
}

