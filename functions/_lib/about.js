// ---------------------------------------------------------------------------
// YOUR DETAILS. Everything on /about comes from here -- edit this file, nothing
// else. Any field left blank is simply left off the page.
// ---------------------------------------------------------------------------

export const ABOUT = {
  name: 'DEVON',
  station: 'ARCHIVIST OF RECORD',          // the role line under the name
  designation: 'FPE-0001',                 // your own designation, if you kept one
  hometown: 'COLUMBUS, OH',

  // A photo is optional. Drop a square image in public/ and name it here,
  // e.g. '/me.jpg'. Leave as null for the silhouette.
  photo: null,

  // Two or three sentences. Written in your own voice, not the archive's.
  bio: 'I made these cards and handed them out at the show. '
     + 'One hundred of them, one number each. If you have one, it is yours.',

  // Shown as filled-in fields. Remove any you do not want, add any you do.
  // `href` is optional -- without it the value is printed but not linked.
  links: [
    { label: 'INSTAGRAM', value: '@yourhandle', href: 'https://instagram.com/yourhandle' },
    { label: 'X',         value: '@yourhandle', href: 'https://x.com/yourhandle' },
    { label: 'EMAIL',     value: 'you@example.com', href: 'mailto:you@example.com' },
  ],

  // Set to null to leave the support block off entirely.
  support: {
    label: 'SUPPORT THIS ARCHIVE',
    value: 'BUY ME A COFFEE',
    href: 'https://buymeacoffee.com/yourhandle',
    note: 'The site costs nothing to run. Anything here goes toward the next batch of cards.',
  },
};
