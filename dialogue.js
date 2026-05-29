/**
 * Dialogue system: room narration, NPC conversation, branching options, identity poem.
 */
(function () {
  const content = window.DialogueContent;
  const identityApi = window.GameObjects;

  let hasTalkedToNPC = false;
  let isInConversation = false;
  let currentDialogueLines = [];
  let currentDialogueIndex = 0;
  let afterLinesAction = null;

  let idealIdentity = null;
  let cachedIdentityPoem = null;
  let whoAmIOptionCount = 0;

  /** @type {'room'|'lines'|'options'} */
  let dialoguePhase = 'room';

  let els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function getPlayerSelection() {
    const slots = window.GameState?.getPieceSlots?.() ?? [];
    return {
      body: slots[0] || null,
      head: slots[1] || null,
      limbs: [slots[2], slots[3]].filter(Boolean),
      specials: [slots[4], slots[5]].filter(Boolean),
    };
  }

  function playerHasAnySelection() {
    const sel = getPlayerSelection();
    return Boolean(sel.body || sel.head || sel.limbs.length || sel.specials.length);
  }

  function comparePlayerSelectionToIdeal() {
    if (!idealIdentity) return false;
    const sel = getPlayerSelection();
    if (!sel.body || !sel.head || sel.limbs.length !== 2 || sel.specials.length !== 2) {
      return false;
    }

    const limbIds = [...sel.limbs].sort().join(',');
    const idealLimbIds = idealIdentity.limbs.map((o) => o.id).sort().join(',');
    const specialIds = [...sel.specials].sort().join(',');
    const idealSpecialIds = idealIdentity.specials.map((o) => o.id).sort().join(',');

    return (
      sel.body === idealIdentity.body.id &&
      sel.head === idealIdentity.head.id &&
      limbIds === idealLimbIds &&
      specialIds === idealSpecialIds
    );
  }

  function setDialogueTitle(text) {
    if (els.title) els.title.textContent = text;
  }

  function setDialogueText(text) {
    if (!els.text) return;
    els.text.textContent = text || '\u00a0';
  }

  function updateAdvanceArrow() {
    if (!els.advance) return;
    /* No arrow on option buttons (A / B / C) or idle room narration */
    if (dialoguePhase === 'options' || dialoguePhase === 'room') {
      els.advance.hidden = true;
      els.advance.disabled = true;
      return;
    }
    const onLastLine =
      dialoguePhase === 'lines' &&
      currentDialogueLines.length > 0 &&
      currentDialogueIndex >= currentDialogueLines.length - 1;
    const hasMoreLines =
      dialoguePhase === 'lines' &&
      currentDialogueLines.length > 0 &&
      currentDialogueIndex < currentDialogueLines.length - 1;
    const canAdvance =
      hasMoreLines || (onLastLine && afterLinesAction != null);
    els.advance.hidden = !canAdvance;
    els.advance.disabled = !canAdvance;
  }

  function clearOptionButtons() {
    if (!els.options) return;
    els.options.innerHTML = '';
  }

  function syncDialogueModeClass() {
    if (!els.box) return;
    els.box.classList.toggle('left-dialogue--lines', dialoguePhase === 'lines');
    els.box.classList.toggle('left-dialogue--options', dialoguePhase === 'options');
  }

  function canAdvanceDialogue() {
    if (dialoguePhase !== 'lines') return false;
    const onLastLine =
      currentDialogueLines.length > 0 &&
      currentDialogueIndex >= currentDialogueLines.length - 1;
    const hasMoreLines =
      currentDialogueLines.length > 0 &&
      currentDialogueIndex < currentDialogueLines.length - 1;
    return hasMoreLines || (onLastLine && afterLinesAction != null);
  }

  function tryAdvanceDialogue() {
    if (!canAdvanceDialogue()) return;
    advanceDialogue();
  }

  function setDialogueInteractive(interactive) {
    if (els.content) {
      els.content.classList.toggle('dialogue-content--interactive', interactive);
    }
    if (els.box) {
      els.box.classList.toggle('left-dialogue--interactive', interactive);
    }
  }

  function setBodyVisible(visible) {
    if (els.body) els.body.hidden = !visible;
  }

  function hideOptions() {
    if (!els.options) return;
    clearOptionButtons();
    els.options.hidden = true;
    els.options.setAttribute('aria-hidden', 'true');
    setBodyVisible(true);
  }

  function showOptions() {
    if (!els.options || !content?.options?.length) return;
    dialoguePhase = 'options';
    clearOptionButtons();
    setBodyVisible(false);
    els.options.removeAttribute('hidden');
    els.options.hidden = false;
    els.options.removeAttribute('aria-hidden');

    content.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dialogue-option';
      btn.dataset.option = opt.id;
      btn.setAttribute('aria-label', opt.label);
      const img = document.createElement('img');
      img.className = 'dialogue-option-img';
      img.src = opt.img;
      img.alt = opt.label;
      img.decoding = 'async';
      btn.appendChild(img);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleOption(opt.id);
      });
      els.options.appendChild(btn);
    });

    updateAdvanceArrow();
    setDialogueInteractive(true);
    syncDialogueModeClass();
  }

  function showDialogueLine(lines) {
    if (!lines?.length) {
      finishLineSequence();
      return;
    }
    dialoguePhase = 'lines';
    currentDialogueLines = lines;
    currentDialogueIndex = 0;
    hideOptions();
    setBodyVisible(true);
    setDialogueText(currentDialogueLines[0]);
    updateAdvanceArrow();
    setDialogueInteractive(true);
    syncDialogueModeClass();
  }

  function advanceDialogue() {
    if (dialoguePhase !== 'lines') return;
    if (currentDialogueIndex < currentDialogueLines.length - 1) {
      currentDialogueIndex += 1;
      setDialogueText(currentDialogueLines[currentDialogueIndex]);
      updateAdvanceArrow();
      return;
    }
    finishLineSequence();
  }

  function finishLineSequence() {
    const action = afterLinesAction;
    afterLinesAction = null;
    currentDialogueLines = [];
    currentDialogueIndex = 0;
    updateAdvanceArrow();
    syncDialogueModeClass();

    if (typeof action === 'function') {
      action();
      return;
    }
    if (action === 'options') {
      showOptions();
      return;
    }
    if (action === 'default-room') {
      setDefaultRoomDialogue();
    }
  }

  function runLinesThen(lines, nextAction) {
    afterLinesAction = nextAction;
    showDialogueLine(lines);
  }

  function revealNpcPortrait() {
    const portrait = $('npc-portrait');
    if (!portrait || !portrait.hidden) return;
    if (typeof window.syncNpcPortraitToDialogue === 'function') {
      window.syncNpcPortraitToDialogue();
    }
    portrait.hidden = false;
    portrait.setAttribute('aria-hidden', 'false');
  }

  function hideNpcPortrait() {
    const portrait = $('npc-portrait');
    if (!portrait) return;
    portrait.hidden = true;
    portrait.setAttribute('aria-hidden', 'true');
  }

  function setDefaultRoomDialogue() {
    isInConversation = false;
    dialoguePhase = 'room';
    afterLinesAction = null;
    currentDialogueLines = [];
    currentDialogueIndex = 0;
    hideOptions();
    setBodyVisible(true);
    setDialogueTitle(content.roomTitle);
    setDialogueText(content.defaultRoomLines[0]);
    updateAdvanceArrow();
    setDialogueInteractive(false);
    syncDialogueModeClass();
  }

  function startNPCConversation() {
    if (isInConversation) return;
    isInConversation = true;
    revealNpcPortrait();
    setDialogueTitle(content.roomTitle);

    const greeting = hasTalkedToNPC ? content.greetingReturn : content.greetingFirst;
    hasTalkedToNPC = true;

    runLinesThen(greeting, 'options');
  }

  function handleOptionWhoAreYou() {
    const responses = content.npcBackgroundResponses;
    const pick = responses[Math.floor(Math.random() * responses.length)];
    runLinesThen([...pick], 'options');
  }

  function handleOptionWhoAmI() {
    whoAmIOptionCount += 1;

    if (whoAmIOptionCount > 1 && playerHasAnySelection()) {
      if (comparePlayerSelectionToIdeal()) {
        runLinesThen([...content.whoAmISuccess], 'options');
        return;
      }
      runLinesThen([...content.whoAmIMismatch], () => {
        runLinesThen([...cachedIdentityPoem], 'options');
      });
      return;
    }

    runLinesThen([...cachedIdentityPoem], 'options');
  }

  function handleOption(optionId) {
    hideOptions();
    switch (optionId) {
      case 'who-are-you':
        handleOptionWhoAreYou();
        break;
      case 'who-am-i':
        handleOptionWhoAmI();
        break;
      case 'gotta-go':
        exitConversation();
        break;
      default:
        showOptions();
    }
  }

  function exitConversation() {
    hideNpcPortrait();
    setDefaultRoomDialogue();
  }

  function onDialoguePointer(e) {
    if (dialoguePhase === 'options') return;
    if (e.target.closest('.dialogue-option')) return;
    tryAdvanceDialogue();
  }

  function initDialogueUI() {
    initDialogueElements();

    if (els.box) {
      els.box.addEventListener('click', onDialoguePointer);
    }

    if (els.advance) {
      els.advance.addEventListener('click', (e) => {
        e.stopPropagation();
        tryAdvanceDialogue();
      });
    }

    idealIdentity = identityApi.generateIdealIdentity();
    cachedIdentityPoem = identityApi.generateIdentityPoem(idealIdentity);
    setDefaultRoomDialogue();
    syncDialogueModeClass();
  }

  function initDialogueElements() {
    els = {
      box: document.querySelector('.left-dialogue'),
      content: document.querySelector('.dialogue-content'),
      title: $('dialogue-title'),
      body: $('dialogue-body'),
      text: $('dialogue-text'),
      options: $('dialogue-options'),
      advance: $('dialogue-advance'),
    };
  }

  function initNpcDialogueHooks() {
    const clickBtn = $('npc-click');
    if (!clickBtn) return;

    clickBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startNPCConversation();
    });

    clickBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        startNPCConversation();
      }
    });
  }

  window.DialogueSystem = {
    startNPCConversation,
    showDialogueLine,
    advanceDialogue,
    showOptions,
    handleOption,
    generateIdealIdentity: () => {
      idealIdentity = identityApi.generateIdealIdentity();
      cachedIdentityPoem = identityApi.generateIdentityPoem(idealIdentity);
      return idealIdentity;
    },
    generateIdentityPoem: (id) => identityApi.generateIdentityPoem(id || idealIdentity),
    comparePlayerSelectionToIdeal,
    exitConversation,
    setDefaultRoomDialogue,
    isInConversation: () => isInConversation,
    getIdealIdentity: () => idealIdentity,
    getHasTalkedToNPC: () => hasTalkedToNPC,
  };

  initDialogueUI();
  initNpcDialogueHooks();
})();
