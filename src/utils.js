export function emojiToDataURL(emoji, sideLength) {
    const canvas = document.createElement('canvas');
    canvas.width = sideLength;
    canvas.height = sideLength;

    // Get the canvas context and set the emoji
    const ctx = canvas.getContext('2d');
    ctx.font = `${sideLength}px serif`;
    ctx.fillText(emoji, 0, sideLength - 8);
    return canvas.toDataURL();
}