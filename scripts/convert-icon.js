const sharp = require('sharp')
const pngToIco = require('png-to-ico')
const fs = require('fs')
const path = require('path')

// png-to-ico may export as default or named
const toIco = (typeof pngToIco === 'function') ? pngToIco : pngToIco.default || pngToIco

async function convertIcon() {
  const src = path.join(__dirname, '../resources/icon.png')
  const dest = path.join(__dirname, '../resources/icon.ico')
  const bannerDest = path.join(__dirname, '../resources/banner.bmp')
  const installerHeaderDest = path.join(__dirname, '../resources/installer-header.bmp')

  if (!fs.existsSync(src)) {
    console.error('icon.png not found in resources/'); process.exit(1)
  }

  // Generate ICO (multi-size: 16, 32, 48, 64, 128, 256)
  const sizes = [16, 32, 48, 64, 128, 256]
  const pngBuffers = await Promise.all(sizes.map(s =>
    sharp(src).resize(s, s).png().toBuffer()
  ))
  const icoBuffer = await toIco(pngBuffers)
  fs.writeFileSync(dest, icoBuffer)
  console.log('✅ Generated icon.ico')

  // Generate installer banner PNG (164x314) - sidebar image for NSIS
  await sharp(src)
    .resize(164, 314, { fit: 'contain', background: { r: 10, g: 10, b: 20, alpha: 1 } })
    .png()
    .toFile(bannerDest.replace('.bmp', '.png'))
  // Also save as original path name
  fs.copyFileSync(bannerDest.replace('.bmp', '.png'), bannerDest.replace('.bmp', '.png'))
  console.log('✅ Generated banner.png')

  // Generate installer header PNG (150x57)
  await sharp(src)
    .resize(150, 57, { fit: 'contain', background: { r: 10, g: 10, b: 20, alpha: 1 } })
    .png()
    .toFile(installerHeaderDest.replace('.bmp', '.png'))
  console.log('✅ Generated installer-header.png')
}

convertIcon().catch(console.error)
