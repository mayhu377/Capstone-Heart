/**
 * Single registry for room objects: gameplay, builder, and dialogue.
 * `id` is the canonical key (HTML data-id, piece slots, ideal-identity match).
 */
const GAME_OBJECTS = {
  'body-obj1': {
    id: 'body-obj1',
    category: 'body',
    img: 'images/blue/body-obj1.png',
    name: 'Sculpture',
    desc: 'A fragment for the core of your figure.',
    builderSize: 180,
    line: 'Your body is a sculpture, cracked but still holding the pose of someone who never left.',
  },
  'body-obj2': {
    id: 'body-obj2',
    category: 'body',
    img: 'images/blue/body-obj2.png',
    name: 'Sheep Sticker',
    desc: 'A sheep sticker cut from the storybook you loved as a child',
    builderSize: 250,
    line: 'Your body is a sheep sticker, peeled from a storybook page you read until it fell apart.',
  },
  'head-obj1': {
    id: 'head-obj1',
    category: 'head',
    img: 'images/blue/head-obj1.png',
    name: 'Fist',
    desc: 'It is not a fist, it is a head',
    builderSize: 150,
    line: 'Your head is a fist, closed tight around thoughts that were never meant to be held.',
  },
  'head-obj2': {
    id: 'head-obj2',
    category: 'head',
    img: 'images/blue/head-obj2.png',
    name: 'Rabbit Head',
    desc: 'Big head with big rabbit ears.',
    builderSize: 120,
    line: 'Your head is a rabbit head, listening for footsteps in rooms that have no floor.',
  },
  'limb-obj1': {
    id: 'limb-obj1',
    category: 'limb',
    img: 'images/blue/limb-obj1.png',
    name: 'Tool',
    desc: 'You arm is made of a tool.',
    builderSize: 130,
    line: 'One limb is a tool, built to fix what your hands keep breaking.',
  },
  'limb-obj2': {
    id: 'limb-obj2',
    category: 'limb',
    img: 'images/blue/limb-obj2.png',
    name: 'Crab Claws',
    desc: 'Your hands are made of crab claws, each one sharp and ready to grab.',
    builderSize: 160,
    line: 'One limb is crab claws, each one sharp and ready to grab what you cannot name.',
  },
  'limb-obj3': {
    id: 'limb-obj3',
    category: 'limb',
    img: 'images/blue/limb-obj3.png',
    name: 'Bandage Arms',
    desc: 'Arm is wrapped in a bandage.',
    builderSize: 100,
    line: 'One limb is wrapped in bandages, holding together a story that keeps reopening.',
  },
  'special-obj1': {
    id: 'special-obj1',
    category: 'special',
    img: 'images/blue/special-obj1.png',
    name: 'Bag',
    desc: 'A bag to carry your belongings',
    builderSize: 130,
    line: 'One secret is a bag, heavy with belongings you forgot you were carrying.',
  },
  'special-obj2': {
    id: 'special-obj2',
    category: 'special',
    img: 'images/blue/special-obj2.png',
    name: 'Flower',
    desc: 'Decorative flower made of metal',
    builderSize: 90,
    line: 'One secret is a metal flower, decorative and cold, never wilting, never forgiven.',
  },
  'special-obj3': {
    id: 'special-obj3',
    category: 'special',
    img: 'images/blue/special-obj3.png',
    name: 'Pin',
    desc: 'A pin rewarded you for your bravery',
    builderSize: 130,
    line: 'One secret is a pin, given for bravery you are not sure you ever showed.',
  },
};

function getObject(id) {
  return GAME_OBJECTS[id];
}

function getByCategory(category) {
  return Object.values(GAME_OBJECTS).filter((o) => o.category === category);
}

function pickRandomFromPool(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwoDistinct(category) {
  const pool = getByCategory(category);
  const first = pickRandomFromPool(pool);
  const rest = pool.filter((o) => o.id !== first.id);
  const second = pickRandomFromPool(rest.length ? rest : pool);
  return [first, second];
}

function generateIdealIdentity() {
  return {
    body: pickRandomFromPool(getByCategory('body')),
    head: pickRandomFromPool(getByCategory('head')),
    limbs: pickTwoDistinct('limb'),
    specials: pickTwoDistinct('special'),
  };
}

function generateIdentityPoem(identity) {
  const [limbA, limbB] = identity.limbs;
  const [specialA, specialB] = identity.specials;
  return [
    identity.body.line,
    identity.head.line,
    limbA.line,
    limbB.line.replace(/^One limb/i, 'Another limb'),
    specialA.line,
    specialB.line.replace(/^One secret/i, 'Another secret'),
  ];
}

window.GameObjects = {
  byId: GAME_OBJECTS,
  getObject,
  getByCategory,
  generateIdealIdentity,
  generateIdentityPoem,
};
