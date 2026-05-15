const sharp = require('sharp')
const path = require('path')

const svgPath = path.join(__dirname, '../public/icon-source.svg')

async function generate() {
  for (const size of [192, 512]) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `../public/pwa-${size}.png`))
    console.log(`✓ pwa-${size}.png`)
  }
}

generate().catch(console.error)
