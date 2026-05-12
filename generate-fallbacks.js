const fs = require('fs');
const path = require('path');

const failedPartners = [
  { name: 'ihms', label: 'IHMS' },
  { name: 'mso', label: 'MSO Health' },
  { name: 'avon-hmo', label: 'Avon HMO' },
  { name: 'metro-health', label: 'Metro Health' },
  { name: 'alleanza-health', label: 'Alleanza Health' },
  { name: 'anchor-hmo', label: 'Anchor HMO' },
  { name: 'health-partners', label: 'Health Partners' },
  { name: 'precious-health-care', label: 'Precious Health' },
  { name: 'nem-health', label: 'NEM Health' }
];

const targetDir = path.join(__dirname, 'public', 'images', 'partners');

const generateSVG = (partner) => {
  const svgContent = `<svg width="240" height="80" xmlns="http://www.w3.org/2000/svg">
  <!-- Clean, minimal corporate fallback logo -->
  <rect width="240" height="80" fill="transparent" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="600" fill="#333333">
    ${partner.label}
  </text>
</svg>`;

  const targetPath = path.join(targetDir, `${partner.name}.png`); // To be consistent with extension if we were assuming .png, but let's write .svg
  const targetSvgPath = path.join(targetDir, `${partner.name}.svg`);
  fs.writeFileSync(targetSvgPath, svgContent);
  console.log(`Generated SVG for ${partner.name}`);
};

for (const p of failedPartners) {
  generateSVG(p);
}
