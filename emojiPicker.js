export async function populateEmojiPicker(emojiPickerId) {
    let emojis = null;
    try {
        // TODO: Refactor this somewhere better that makes more sense:
        // (Shouldn't be loaded every single time)
        emojis = await (await fetch(chrome.runtime.getURL('assets/emojis.json'))).json();
    } catch (e) {
        console.error('Error loading emojis:', e)
    }

    const emojiPickerElement = document.getElementById(emojiPickerId);

    console.log('loaded emojis:', emojis);
  
    for (const category in emojis) {
      // Create a div for each category
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'emoji-category';
      categoryDiv.id = category;
  
      // You can also add a title for each category
      const categoryTitle = document.createElement('div');
      categoryTitle.className = 'emoji-category-title';
      categoryTitle.innerText = category.replace(/_/g, ' '); // replace underscores with spaces
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
        });
  
        // Append the emoji element to the category div
        categoryEmojis.appendChild(emojiElement);
      }
      categoryDiv.appendChild(categoryEmojis);
  
      // Append the category div to the emoji picker
      emojiPickerElement.appendChild(categoryDiv);
    }
  }
  

  