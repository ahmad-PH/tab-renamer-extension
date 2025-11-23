/**
 * Test data for Playwright E2E tests
 * Equivalent to selenium_e2e/data.js
 */

export const googleUrl = 'https://www.google.com/';
export const googleFaviconUrl = 'https://www.gstatic.com/images/branding/searchlogo/ico/favicon.ico';
export const facebookUrl = 'https://www.facebook.com/';
export const youtubeUrl = 'https://www.youtube.com/';
export const ahmadphosseiniUrl = 'https://www.ahmadphosseini.com/';
export const ahmadphosseiniFaviconUrl = 'https://www.ahmadphosseini.com/images/icon_hu448cae0ae4c879367eb057f7d28d8a54_13197_32x32_fill_lanczos_center_2.png';
export const exampleUrl = 'https://example.com/';
export const exampleFaviconUrl = 'https://example.com/favicon.ico';
export const wikipediaUrl = 'https://www.wikipedia.org/';
export const wikipediaFaviconUrl = 'https://www.wikipedia.org/static/favicon/wikipedia.ico';
export const githubUrl = 'https://github.com/';
export const githubFaviconUrl = 'https://github.com/fluidicon.png';
export const stackoverflowUrl = 'https://stackoverflow.com/';
export const stackoverflowFaviconUrl = 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico';

export const websites = [
    { // 0
        url: 'http://localhost:3000/index.html',
        faviconUrl: 'http://localhost:3000/favicon.ico',
        title: 'Test Page',
    },
    { // 1
        url: 'http://localhost:3000/page2.html',
        faviconUrl: 'http://localhost:3000/favicon2.ico',
        title: 'Second Test Page',
    },
    { // 2
        url: wikipediaUrl,
        faviconUrl: wikipediaFaviconUrl,
        title: 'Wikipedia'
    },
    { // 3
        url: stackoverflowUrl,
        faviconUrl: stackoverflowFaviconUrl,
        title: 'Newest Questions - Stack Overflow'
    },
    { // 4
        url: githubUrl,
        faviconUrl: githubFaviconUrl,
        title: 'GitHub · Change is constant. GitHub keeps you ahead. · GitHub'
    },
    { // 5
        url: ahmadphosseiniUrl, 
        faviconUrl: ahmadphosseiniFaviconUrl, 
        title: 'Ahmad Pourihosseini' 
    },
    { // 6
        url: googleUrl, 
        faviconUrl: googleFaviconUrl, 
        title: 'Google' 
    },
];

export default {
    googleUrl,
    googleFaviconUrl,
    facebookUrl,
    youtubeUrl,
    ahmadphosseiniUrl,
    ahmadphosseiniFaviconUrl,
    exampleUrl,
    exampleFaviconUrl,
    wikipediaUrl,
    wikipediaFaviconUrl,
    websites
};
