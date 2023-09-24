// import Subject from './subject.js';
// const selectedEmoji = new Subject();
const SEARCH_RESULTS_ID = 'tab-renamer-extension-search-results-div';
const ALL_EMOJIS_ID = 'tab-renamer-extension-all-emojis-div';

let emojis = await loadEmojis();
async function loadEmojis() {
    try {
        return await (await fetch(chrome.runtime.getURL('assets/emojis.json'))).json();
    } catch (e) {
        console.error('Error loading emojis:', e)
    }
}

class EmojiPicker {
    constructor(EMOJI_PICKER_ID, emojiPickCallback) {
        this.EMOJI_PICKER_ID = EMOJI_PICKER_ID;
        this.emojiPickCallback = emojiPickCallback;
    }

    insertIntoDOM() {
        const emojiPickerElement = document.getElementById(this.EMOJI_PICKER_ID);
    
        emojiPickerElement.appendChild(this.createSearchBar());
    
        const searchResultsDiv = this.createSearchResultsDiv(false);
        emojiPickerElement.appendChild(searchResultsDiv);
    
        const allEmojisDiv = this.createAllEmojisDiv();
        allEmojisDiv.style.display = 'grid';
        emojiPickerElement.appendChild(allEmojisDiv);
    }

    createSearchResultsDiv(isVisible) {
        const searchResultsDiv = document.createElement('div');
        searchResultsDiv.id = SEARCH_RESULTS_ID;
        searchResultsDiv.className = 'emoji-grid';
        searchResultsDiv.style.display = isVisible? 'grid': 'none';
        return searchResultsDiv;
    }

    createAllEmojisDiv() {
        const allEmojisDiv = document.createElement('div');
        allEmojisDiv.id = ALL_EMOJIS_ID;
    
        for (const category in emojis) {
            // Create a div for each category
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'emoji-category';
            categoryDiv.id = category;
    
            // You can also add a title for each category
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'emoji-category-title';
            categoryTitle.innerText = this.formatEmojiCategoryTitle(category);
            categoryDiv.appendChild(categoryTitle);
    
            // Create emoji elements
            const categoryEmojis = document.createElement('div'); 
            categoryEmojis.className = 'emoji-grid';
    
            for (const emoji of emojis[category]) {
                categoryEmojis.appendChild(this.createEmojiElement(emoji));
          }
          categoryDiv.appendChild(categoryEmojis);
          allEmojisDiv.appendChild(categoryDiv);
        }
        return allEmojisDiv;
    }

    createEmojiElement(emoji) {
        const emojiElement = document.createElement('span');
        emojiElement.className = 'emoji-item';
        emojiElement.dataset.unicode = emoji.unicode;
        emojiElement.dataset.shortcode = emoji.shortcode;
        emojiElement.textContent = String.fromCodePoint(parseInt(emoji.unicode.replace("U+", ""), 16));
        
        emojiElement.addEventListener('click', () => {
            this.emojiPickCallback(emojiElement.textContent);
        });

        return emojiElement;
    }

    formatEmojiCategoryTitle(categoryTitle) {
        return categoryTitle
            .replace(/_/g, ' ')  // Replace underscores with spaces
            .replace(/\band\b/gi, '&')  // Replace 'and' with '&'
            .replace(/\b\w/g, (char) => char.toUpperCase());  // Capitalize first letter of each word
    }

    createSearchBar() {
        const searchBar = document.createElement('input');
        searchBar.type = 'text';
        searchBar.placeholder = 'Search for an emoji';
        searchBar.id = 'tab-renamer-extension-emoji-search-bar';
    
        searchBar.addEventListener('input', () => {
            this.onSearchBarChanged(searchBar.value);
        });
    
        return searchBar;
    }

    onSearchBarChanged(searchValue) {
        if (searchValue !== "") {
            this.setSearchMode(true);
            this.filterEmojis(searchValue);
        } else {
            this.setSearchMode(false);
        }
    }

    setSearchMode(isSearchActive) {
        let searchResultsDisplay = isSearchActive ? 'grid' : 'none';
        let allEmojisDisplay = isSearchActive ? 'none' : 'grid';
        document.getElementById(SEARCH_RESULTS_ID).style.display = searchResultsDisplay;
        document.getElementById(ALL_EMOJIS_ID).style.display = allEmojisDisplay;
    }

    filterEmojis(searchValue) {
        let filteredEmojis = [];
        console.log('Looking at all emojis to filter');
        for (const category in emojis) {
            filteredEmojis = filteredEmojis.concat(emojis[category].filter(emoji =>
                emoji.shortcode.includes(searchValue)
            ));
        }

        console.log('matching emojis:', filteredEmojis);
        
        const newSearchResultsDiv = this.createSearchResultsDiv(true);
        for (const emoji of filteredEmojis) {
            newSearchResultsDiv.appendChild(
                this.createEmojiElement(emoji)
            );
        }

        const oldSearchResultsDiv = document.getElementById(SEARCH_RESULTS_ID);
        oldSearchResultsDiv.parentElement.replaceChild(newSearchResultsDiv, oldSearchResultsDiv);
    }
}

export {EmojiPicker};

