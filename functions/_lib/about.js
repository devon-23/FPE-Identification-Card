// everything on /about comes from here. blank anything you don't want shown.

export const ABOUT = {
  name: 'DEVON',
  station: 'ARCHIVIST OF RECORD',
  designation: 'FPE-0001',
  hometown: 'COLUMBUS, OH',

  // square image in public/, e.g. '/me.jpg'
  photo: null,

  bio: 'I made these cards and handed them out at the show. '
     + 'One hundred of them, one number each. If you have one, it is yours.',

  links: [
    { label: 'INSTAGRAM', value: '@yourhandle', href: 'https://instagram.com/yourhandle' },
    { label: 'X',         value: '@yourhandle', href: 'https://x.com/yourhandle' },
    { label: 'EMAIL',     value: 'you@example.com', href: 'mailto:you@example.com' },
  ],

  // credits / where the look came from / anything that helped
  sources: [
    { label: 'dmaorg.info', href: 'https://dmaorg.info', note: 'the original' },
    { label: 'Cloudflare Pages + D1', href: 'https://developers.cloudflare.com', note: 'hosting and database' },
    { label: 'NFC Tools', href: null, note: 'writing the tags' },
  ],
};
