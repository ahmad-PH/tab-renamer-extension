// import Subject from './subject.js';
// const selectedEmoji = new Subject();

async function populateEmojiPicker(EMOJI_PICKER_ID, EMOJI_PICKER_IMAGE_ID, emojiPickCallback) {
    let emojis = null;
    try {
        // TODO: Refactor this somewhere better that makes more sense:
        // (Shouldn't be loaded every single time)
        emojis = await (await fetch(chrome.runtime.getURL('assets/emojis.json'))).json();
    } catch (e) {
        console.error('Error loading emojis:', e)
    }

    const emojiPickerElement = document.getElementById(EMOJI_PICKER_ID);

    const searchBarCallback = (searchValue) => {
        console.log('Emoji search value:', searchValue);
        // You can filter and display emojis based on the searchValue here
    };
    emojiPickerElement.appendChild(createSearchBar(searchBarCallback));

    for (const category in emojis) {
        // Create a div for each category
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'emoji-category';
        categoryDiv.id = category;

        // You can also add a title for each category
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'emoji-category-title';
        categoryTitle.innerText = formatEmojiCategoryTitle(category);
        categoryDiv.appendChild(categoryTitle);

        // Create emoji elements
        const categoryEmojis = document.createElement('div'); 
        categoryEmojis.className = 'emoji-category-emojis';

        for (const emoji of emojis[category]) {
            const emojiElement = document.createElement('span');
            emojiElement.className = 'emoji-item';
            emojiElement.dataset.unicode = emoji.unicode;
            emojiElement.dataset.shortcode = emoji.shortcode;
            emojiElement.textContent = String.fromCodePoint(parseInt(emoji.unicode.replace("U+", ""), 16));
            
            emojiElement.addEventListener('click', function() {
                emojiPickCallback(this.textContent)
            });

            categoryEmojis.appendChild(emojiElement);
      }
      categoryDiv.appendChild(categoryEmojis);
      emojiPickerElement.appendChild(categoryDiv);
    }
}
  
const formatEmojiCategoryTitle = (categoryTitle) => {
    return categoryTitle
        .replace(/_/g, ' ')  // Replace underscores with spaces
        .replace(/\band\b/gi, '&')  // Replace 'and' with '&'
        .replace(/\b\w/g, (char) => char.toUpperCase());  // Capitalize first letter of each word
};

function createSearchBar(callback) {
    const searchBar = document.createElement('input');
    searchBar.type = 'text';
    searchBar.placeholder = 'Search for an emoji';
    searchBar.id = 'tab-renamer-extension-emoji-search-bar';

    searchBar.addEventListener('input', function() {
        callback(this.value);
    });

    return searchBar;
}


export {populateEmojiPicker};

