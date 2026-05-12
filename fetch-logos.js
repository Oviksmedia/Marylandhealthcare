const fs = require('fs');
const path = require('path');
const https = require('https');

const partners = [
  { name: 'unitedhealthcare-global', domain: 'uhcglobal.com' },
  { name: 'metlife', domain: 'metlife.com' },
  { name: 'cigna', domain: 'cigna.com' },
  { name: 'aetna', domain: 'aetna.com' },
  { name: 'allianz-care', domain: 'allianzcare.com' },
  { name: 'bupa', domain: 'bupa.com' },
  { name: 'vitality', domain: 'vitality.co.uk' },
  { name: 'optimum-global', domain: 'optimumglobal.com' },
  { name: 'ihms', domain: 'ihms.com.ng' },
  { name: 'mso', domain: 'msohealth.com' },
  { name: 'axa-mansard', domain: 'axamansard.com' },
  { name: 'leadway-health', domain: 'leadway.com' },
  { name: 'hygeia-hmo', domain: 'hygeiahmo.com' },
  { name: 'avon-hmo', domain: 'avonhealthcare.com' },
  { name: 'metro-health', domain: 'metrohealthhmo.com' },
  { name: 'alleanza-health', domain: 'alleanzahmo.com' },
  { name: 'anchor-hmo', domain: 'anchorhmo.com' },
  { name: 'health-partners', domain: 'healthpartnersng.com' },
  { name: 'novo-health', domain: 'novohealthafrica.org' },
  { name: 'nnpc', domain: 'nnpcgroup.com' },
  { name: 'bastion-health', domain: 'bastionhmo.com' },
  { name: 'hci-healthcare', domain: 'hcihealthcare.ng' },
  { name: 'precious-health-care', domain: 'precioushealthcare.com.ng' },
  { name: 'lifeworth-hmo', domain: 'lifeworthhmo.com' },
  { name: 'hallmark-hmo', domain: 'hallmarkhmo.com' },
  { name: 'nem-health', domain: 'nemhealth.com' },
  { name: 'tangerine-health', domain: 'tangerine.africa' },
  { name: 'total-health-trust', domain: 'totalhealthtrust.com' }
];

const targetDir = path.join(__dirname, 'public', 'images', 'partners');

const downloadLogo = (partner) => {
  return new Promise((resolve) => {
    // try hunter.io
    const url = `https://logos.hunter.io/${partner.domain}`;
    const targetPath = path.join(targetDir, `${partner.name}.png`);

    console.log(`Fetching ${partner.name} from ${url}`);

    const getReq = (requestUrl, redirects = 0) => {
        if (redirects > 3) {
            console.log(`Failed (too many redirects): ${partner.name}`);
            resolve(false);
            return;
        }

        https.get(requestUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (response) => {
            if (response.statusCode === 200) {
                // If it's a valid image, save it
                const contentType = response.headers['content-type'];
                if (contentType && contentType.startsWith('image/')) {
                    const file = fs.createWriteStream(targetPath);
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`Success: ${partner.name}`);
                        resolve(true);
                    });
                } else {
                    console.log(`Failed (not an image, got ${contentType}): ${partner.name}`);
                    resolve(false);
                }
            } else if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
                let redirectUrl = response.headers.location;
                if (!redirectUrl.startsWith('http')) {
                   const baseUrl = new URL(requestUrl);
                   redirectUrl = `${baseUrl.origin}${redirectUrl}`;
                }
                getReq(redirectUrl, redirects + 1);
            } else {
                console.log(`Failed (status ${response.statusCode}): ${partner.name}`);
                resolve(false);
            }
        }).on('error', (err) => {
            console.log(`Error ${partner.name}: ${err.message}`);
            resolve(false);
        });
    };

    getReq(url);
  });
};

const main = async () => {
  for (const partner of partners) {
    await downloadLogo(partner);
  }
  console.log('Done.');
};

main();
