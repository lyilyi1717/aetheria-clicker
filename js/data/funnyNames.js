// Default leaderboard nicknames for accounts that haven't picked one (Google sign-ins, accounts
// made before nicknames): "Sneaky Potato 42". Picked from the account id, so the same account gets
// the same name on every device until the player changes it. Never the email: names are public.
// Every combination fits the leaderboard name rules (3-20 letters, numbers, spaces).
export const FUNNY_ADJECTIVES = [
  'Sneaky', 'Wobbly', 'Grumpy', 'Sleepy', 'Dizzy', 'Spicy', 'Fluffy', 'Cheeky', 'Clumsy', 'Jolly',
  'Bouncy', 'Soggy', 'Sassy', 'Zesty', 'Goofy', 'Crispy', 'Lazy', 'Nervous', 'Shiny', 'Turbo',
  'Mighty', 'Tiny', 'Chunky', 'Salty'
];
export const FUNNY_NOUNS = [
  'Potato', 'Camel', 'Hummus', 'Pickle', 'Llama', 'Waffle', 'Noodle', 'Penguin', 'Goblin', 'Taco',
  'Walrus', 'Muffin', 'Donkey', 'Burrito', 'Hamster', 'Pigeon', 'Nugget', 'Biscuit', 'Goat',
  'Dumpling', 'Mango', 'Kebab', 'Shawarma', 'Date'
];

// FNV-1a: a small, stable string hash
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function funnyName(seed = '') {
  const h = hash(String(seed));
  const adj = FUNNY_ADJECTIVES[h % FUNNY_ADJECTIVES.length];
  const noun = FUNNY_NOUNS[Math.floor(h / FUNNY_ADJECTIVES.length) % FUNNY_NOUNS.length];
  const n = 10 + (Math.floor(h / (FUNNY_ADJECTIVES.length * FUNNY_NOUNS.length)) % 90);
  return `${adj} ${noun} ${n}`;
}
