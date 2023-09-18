// import Subject from './subject.js';
// const selectedEmoji = new Subject();

async function populateEmojiPicker(EMOJI_PICKER_ID, EMOJI_PICKER_IMAGE_ID, emojiPickCallback) {
    console.log("received ID:", EMOJI_PICKER_IMAGE_ID);
    let emojis = null;
    try {
        // TODO: Refactor this somewhere better that makes more sense:
        // (Shouldn't be loaded every single time)
        emojis = await (await fetch(chrome.runtime.getURL('assets/emojis.json'))).json();
    } catch (e) {
        console.error('Error loading emojis:', e)
    }

    const emojiPickerElement = document.getElementById(EMOJI_PICKER_ID);

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

            // Display the emoji. Assuming "unicode" in JSON is in the format "U+1F600"
            emojiElement.textContent = String.fromCodePoint(parseInt(emoji.unicode.replace("U+", ""), 16));
            emojiElement.addEventListener('click', function() {
                // You can define what happens when an emoji is clicked here
                // For example: setEmojiFavicon(this.dataset.unicode);


            emojiElement.addEventListener('click', () => {
                emojiPickCallback(this.textContent)
            });
        });

        // Append the emoji element to the category div
        categoryEmojis.appendChild(emojiElement);
      }
      categoryDiv.appendChild(categoryEmojis);
  
      // Append the category div to the emoji picker
      emojiPickerElement.appendChild(categoryDiv);
    }
}
  
const formatEmojiCategoryTitle = (categoryTitle) => {
return categoryTitle
    .replace(/_/g, ' ')  // Replace underscores with spaces
    .replace(/\band\b/gi, '&')  // Replace 'and' with '&'
    .replace(/\b\w/g, (char) => char.toUpperCase());  // Capitalize first letter of each word
};


export {populateEmojiPicker};

