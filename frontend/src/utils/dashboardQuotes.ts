const LOGIN_DASHBOARD_QUOTES = [
  'Every scoop you sell is someone’s best moment of the day.',
  'Great stores are built one happy customer at a time.',
  'Fresh stock, warm smiles — that’s the recipe.',
  'Small wins today become big seasons tomorrow.',
  'Consistency beats intensity — show up and serve well.',
  'Your team’s energy is the secret ingredient.',
  'Track the numbers, but never forget the people.',
  'A smooth shift starts with a clear counter.',
];

export function getLoginDashboardQuote(): string {
  const index = Math.floor(Math.random() * LOGIN_DASHBOARD_QUOTES.length);
  return LOGIN_DASHBOARD_QUOTES[index];
}
