/** Some sample URLs and data to use for testing */
const googleUrl = 'https://www.google.com/';
const googleFaviconUrl = '//www.gstatic.com/images/branding/searchlogo/ico/favicon.ico';
const facebookUrl = 'https://www.facebook.com/';
const youtubeUrl = 'https://www.youtube.com/';
const ahmadphosseiniUrl = 'https://www.ahmadphosseini.com/';
const ahmadphosseiniFaviconUrl = '/images/icon_hu448cae0ae4c879367eb057f7d28d8a54_13197_32x32_fill_lanczos_center_2.png';
const websites = [
    {
        url: 'http://localhost:3000/index.html',
        faviconUrl: 'http://localhost:3000/favicon.ico',
        title: 'Test Page',
    },
    {url: ahmadphosseiniUrl, faviconUrl: ahmadphosseiniFaviconUrl, title: 'Ahmad Pourihosseini'},
    {url: googleUrl, faviconUrl: googleFaviconUrl, title: 'Google'},
    {url: 'https://motherfuckingwebsite.com/'},
    {url: youtubeUrl},
    {url: facebookUrl},
    {url: 'https://www.nationalgeographic.com/'},
];


module.exports = {
    googleUrl,
    googleFaviconUrl,
    facebookUrl,
    youtubeUrl,
    ahmadphosseiniUrl,
    ahmadphosseiniFaviconUrl,
    websites
};