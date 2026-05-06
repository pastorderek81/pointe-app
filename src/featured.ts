// Featured events shown on the Home tab. Curated headline pieces — the
// "big stuff" Derek wants front and center, not every PCO sign-up.
//
// To add or remove an event: edit this array. Image goes in /assets, then
// require() it here. Each card opens its URL in an in-app browser.
//
// Future: pull this dynamically from the website's /events/ page so Derek
// updates one source. For now, hardcoded so we can ship.
export type FeaturedEvent = {
  id: string;
  title: string;
  dateLabel: string; // "ALL JUNE" / "MAY 31" — short, uppercase
  description: string;
  image: any; // require() from /assets
  url: string;
};

export const featuredEvents: FeaturedEvent[] = [
  {
    id: 'family-month',
    title: 'Family Month',
    dateLabel: 'ALL JUNE',
    description:
      'A whole month built around your family — Love Week, Movie Night, Bowling Night, and a sermon series focused on building stronger families. Something for everyone.',
    image: require('../assets/photo-kids.jpg'),
    url: 'https://www.thepointe.online/familymonth/',
  },
];
