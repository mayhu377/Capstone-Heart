/**
 * Dialogue copy for the blue room (movie theater).
 */
const DIALOGUE_CONTENT = {
  roomTitle: 'Movie Theater',

  defaultRoomLines: [
    'Here is an obsolete movie theater that has not been renovated for years. The carpet smells damp, the posters are sun-faded, and something behind the ticket booth keeps blinking. A fish clerk is waiting for you to purchase a ticket.',
  ],

  greetingFirst: [
    'Goody goody, welcome to the old theater! What movie do you want to watch today?',
  ],

  greetingReturn: ['Welcome back again. Are you looking for something else?'],

  options: [
    { id: 'who-are-you', label: 'Who are you?', img: 'images/general/optionA.png' },
    { id: 'who-am-i', label: 'Who am I?', img: 'images/general/optionB.png' },
    { id: 'gotta-go', label: 'I gotta go.', img: 'images/general/optionC.png' },
  ],

  whoAmIMismatch: [
    'This is not what you look like. Do you not want to know what you truly look like?',
  ],

  whoAmISuccess: ['Seems you found yourself. Good work. You can go now.'],

  npcBackgroundResponses: [
    [
      'I used to sell tickets when people still came here.',
      'Then one night, the projector kept running after everyone left.',
      'Since then, I have been counting guests who do not remember buying a ticket.',
    ],
    [
      'Me? I am only the clerk.',
      'Or maybe I am the last thing this theater remembered how to make.',
      'Either way, I know every seat that has ever been occupied.',
    ],
    [
      'Before I had scales, I had a name.',
      'Before I had a booth, I had a home.',
      'But the theater prefers simple roles, so now I sell tickets.',
    ],
  ],
};

window.DialogueContent = DIALOGUE_CONTENT;
