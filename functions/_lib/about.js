
export const ABOUT = {
  name: 'DEVONNN',
  station: 'ARCHIVIST OF RECORD',
  designation: 'FPE-0001',
  hometown: 'Philadelphia, PA',

  photo: '/images/max.webp',

  bio: 'I made these cards and handed them out at the show. '
     + 'One hundred of them, one number each. If you have one, it is yours. See the other banditos that attended the show. This is our drag path.',

  // the one to contact for amendments, removals and questions.
  // set `handle` and `href` to wherever you actually read messages.
  contact: {
    label: 'TWITTER',
    handle: '@devonisreallyco',
    href: 'https://x.com/devonisreallyco',
  },

  links: [
    { label: 'TWITTER',         value: '@devonisreallyco', href: 'https://x.com/devonisreallyco' }
  ],

  howto: [
    'Tap the card against the back of your phone. The record opens on its own. On an iPhone you have to tap the banner that slides down.',
    'If nobody has claimed it, hit REGISTER THIS ID and fill in as much or as little as you want. Everything except the number is optional, and anything you skip reads [REDACTED].',
    'The card is yours from then on. Anyone who taps it sees your record.',
    'Only the phone you registered on can edit it. Clear your browser data or switch phones and it goes read-only. Message me and I can reset it.',
    'No card? Turn yourself in and the register issues you a provisional one.',
  ],

  sources: [
    { label: 'dmaorg.info', href: 'https://dmaorg.info', note: 'the original' },
    { label: 'Cloudflare Pages + D1', href: 'https://developers.cloudflare.com', note: 'hosting and database' },
    { label: 'DMA ORG Archive', href: 'https://www.dmaorg.site', note: 'dma archive' },
    { label: 'Reddit post', href: 'https://www.reddit.com/r/twentyonepilots/comments/1cfi97t/official_twenty_one_pilots_clancy_lore_megathread/' },
    { label: 'GitHub', href: 'https://github.com/devon-23/fpe-identification-card', note: 'source code' }
  ],
};
