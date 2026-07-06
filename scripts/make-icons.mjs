// One-off: renders the app icon SVG to the PNG sizes the PWA manifest needs.
import sharp from "sharp";

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6355f2"/><stop offset="1" stop-color="#0ea5b7"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="104" fill="url(#g)"/>
  <path d="M256 116l28 84 84 28-84 28-28 84-28-84-84-28 84-28z" fill="white"/>
  <circle cx="366" cy="150" r="16" fill="white" opacity="0.9"/>
  <circle cx="150" cy="368" r="12" fill="white" opacity="0.7"/>
</svg>`);

await sharp(svg).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(svg).resize(192, 192).png().toFile("public/icon-192.png");
console.log("icons written");
