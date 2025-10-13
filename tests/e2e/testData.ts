/**
 * Test data for Playwright E2E tests
 * Equivalent to selenium_e2e/data.js
 */

export const googleUrl = 'https://www.google.com/';
export const googleFaviconUrl = 'https://www.gstatic.com/images/branding/searchlogo/ico/favicon.ico';
export const facebookUrl = 'https://www.facebook.com/';
export const youtubeUrl = 'https://www.youtube.com/';
export const ahmadphosseiniUrl = 'https://www.ahmadphosseini.com/';
export const ahmadphosseiniFaviconUrl = 'https://www.ahmadphosseini.com/images/icon_hu448cae0ae4c879367eb057f7d28d8a54_13197_192x192_fill_lanczos_center_2.png';

export const websites = [
    {
        url: 'http://localhost:3000/index.html',
        faviconUrl: 'http://localhost:3000/favicon.ico',
        title: 'Test Page',
    },
    { 
        url: ahmadphosseiniUrl, 
        faviconUrl: ahmadphosseiniFaviconUrl, 
        title: 'Ahmad Pourihosseini' 
    },
    { 
        url: googleUrl, 
        faviconUrl: googleFaviconUrl, 
        title: 'Google' 
    },
    { 
        url: 'https://motherfuckingwebsite.com/' 
    },
    { 
        url: youtubeUrl 
    },
    { 
        url: facebookUrl 
    },
    { 
        url: 'https://www.nationalgeographic.com/' 
    },
];

export default {
    googleUrl,
    googleFaviconUrl,
    facebookUrl,
    youtubeUrl,
    ahmadphosseiniUrl,
    ahmadphosseiniFaviconUrl,
    websites
};
