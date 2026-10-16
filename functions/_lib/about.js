
export const ABOUT = {
  name: 'DEVONNN',
  station: 'ARCHIVIST OF RECORD',
  designation: 'FPE-0001',
  hometown: 'Philadelphia, PA',

  photo: '/images/me.webp',

  bio: 'I made these cards and handed them out at the show. One hundred of them, one number each. See the other banditos that attended the show, and those i didn\'t get to meet. This is our drag path. I am a software engineer that has been creating twenty one pilots inspired websites for over 10 years (yes, since i was 15 (if you know, you know))',


  contact: {
    label: 'TWITTER',
    handle: '@devonisreallyco',
    href: 'https://x.com/devonisreallyco',
  },

  links: [
    { label: 'TWITTER', value: '@devonisreallyco', href: 'https://x.com/devonisreallyco' }
  ],

  support: {
    href: 'https://buymeacoffee.com/chnpy6w8fv4',
    label: 'BUY ME A COFFEE',
  },

  howto: [
    'Tap the card against the back of your phone. The record opens on its own. On an iPhone you have to tap the banner that slides down.',
    'If nobody has claimed it, hit REGISTER THIS ID and fill in as much or as little as you want. Everything except the number is optional, and anything you skip reads [REDACTED].',
    'The card is yours from then on. Anyone who taps it sees your record.',
    'Only the phone you registered on can edit it. Clear your browser data or switch phones and it goes read-only. Message me and I can reset it.',
    'No card? Turn yourself in and the register issues you a provisional one.',
  ],

  // the things people actually message me about
  faq: [
    {
      q: 'Why is my pin not on the map?',
      a: 'You left the show box unticked when you filed. Only the subjects who '
        + 'ticked it go on the plot. Open your record, hit AMEND, tick it, save '
        + '\u2014 and honestly, tick it even if you are not coming to Columbus. '
        + 'I would rather see where everybody is than keep the map pure.',
    },
    {
      q: 'I cannot edit my card any more.',
      a: 'Editing is tied to the browser you filed from \u2014 clear your data, '
        + 'switch phones or use a private window and it goes read only. Nothing is '
        + 'lost. Message me with your number and I can hand it back to you.',
    },
    {
      q: 'Is my photo public?',
      a: 'Only if you ticked the consent box under it. Without that the photo never '
        + 'leaves your phone \u2014 you see it on your card, nobody else does. If you '
        + 'swap your photo later, make sure that box is ticked or the old one stays.',
    },
    {
      q: 'Can I take my record down?',
      a: 'Yes, and no questions asked. Provisional records have a WITHDRAW button on '
        + 'the turn yourself in page. For anything else, message me and it is done.',
    },
    {
      q: 'Where did my name come from?',
      a: 'You left it blank, so the register assigned you one. It is generated from '
        + 'your designation, so it will always be the same name. Amend the record if '
        + 'you would rather pick your own.',
    },
    {
      q: 'How many cards can I make?',
      a: 'Three per device. Make a fourth and you will be asked to amend or withdraw '
        + 'one of the others first.',
    },
    {
      q: 'What are the numbered cards?',
      a: 'A hundred physical NFC cards, FPE-0001 to FPE-0100, handed out by hand at '
        + 'the show. Tap one and that number is yours. If you already made a card '
        + 'online it moves your whole record onto the card.',
    },
  ],

  sources: [
    { label: 'dmaorg.info', href: 'https://dmaorg.info', note: 'the original' },
    { label: 'Cloudflare Pages + D1', href: 'https://developers.cloudflare.com', note: 'hosting and database' },
    { label: 'DMA ORG Archive', href: 'https://www.dmaorg.site', note: 'dma archive' },
    { label: 'Reddit Post', href: 'https://www.reddit.com/r/twentyonepilots/comments/1cfi97t/official_twenty_one_pilots_clancy_lore_megathread/', note: 'lore thread' },
    { label: 'Breach Assets', href: 'https://drive.google.com/drive/u/1/folders/1jspNenSxN8xXBUmcg7fMb9WtR1sdQeyZ?direction=a', note: 'reference material' },
    { label: 'Leaflet', href: 'https://leafletjs.com', note: 'the maps' },
    { label: 'Esri basemaps', href: 'https://www.arcgis.com', note: 'map tiles' },
    { label: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright', note: 'map data' },
    { label: 'Nominatim', href: 'https://nominatim.openstreetmap.org', note: 'turning towns into coordinates' }
    //{ label: 'GitHub', href: 'https://github.com/devon-23/fpe-identification-card', note: 'source code' }
  ],
};
