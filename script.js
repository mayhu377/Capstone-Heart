/* Heart ? Identity Builder | script.js
   Slots: 1 body (z1), 1 head (z2), 2 limb (z3), 2 special (z4). Max 6 items.
   Category full ? replace an item in that category (pick which if two). */

const MAX_ITEMS = 6;

const CAPACITY = {
  body: 1,
  head: 1,
  limb: 2,
  special: 2,
};

const Z_BY_CATEGORY = {
  body: 1,
  head: 2,
  limb: 3,
  special: 4,
};

const CATEGORY_TAG = {
  body: 'images/general/body_tag.png',
  head: 'images/general/head_tag.png',
  limb: 'images/general/limb_tag.png',
  special: 'images/general/detail_tag.png',
};

const CATEGORY_LABEL = {
  body: 'Body',
  head: 'Head',
  limb: 'Limb',
  special: 'Special',
};

function popupObjectTitle(category) {
  return CATEGORY_LABEL[category] || category;
}

/** Object id → metadata. Filenames: images/blue/{id}.png */
const DATA = {
  'body-obj1': {
    img: 'images/blue/body-obj1.png',
    name: 'Body — piece 1',
    desc: 'A fragment for the core of your figure.',
    category: 'body',
    builderSize: 180,
  },
  'body-obj2': {
    img: 'images/blue/body-obj2.png',
    name: 'Body — piece 2',
    desc: 'An alternate core — choose which body you keep.',
    category: 'body',
    builderSize: 250,
  },
  'head-obj1': {
    img: 'images/blue/head-obj1.png',
    name: 'Head — piece 1',
    desc: 'Something to think with.',
    category: 'head',
    builderSize: 150,
  },
  'head-obj2': {
    img: 'images/blue/head-obj2.png',
    name: 'Head — piece 2',
    desc: 'Another vantage — only one head stays.',
    category: 'head',
    builderSize: 120,
  },
  'limb-obj1': {
    img: 'images/blue/limb-obj1.png',
    name: 'Limb — piece 1',
    desc: 'Reach or balance — you can hold two limbs.',
    category: 'limb',
    builderSize: 130,
  },
  'limb-obj2': {
    img: 'images/blue/limb-obj2.png',
    name: 'Limb — piece 2',
    desc: 'A second reach — or swap it later.',
    category: 'limb',
    builderSize: 160,
  },
  'limb-obj3': {
    img: 'images/blue/limb-obj3.png',
    name: 'Limb — piece 3',
    desc: 'A third option — replaces one of your two limbs.',
    category: 'limb',
    builderSize: 100,
  },
  'special-obj1': {
    img: 'images/blue/special-obj1.png',
    name: 'Special — piece 1',
    desc: 'Something extra — up to two specials.',
    category: 'special',
    builderSize: 130,
  },
  'special-obj2': {
    img: 'images/blue/special-obj2.png',
    name: 'Special — piece 2',
    desc: 'Another accent — or trade it in.',
    category: 'special',
    builderSize: 90,
  },
  'special-obj3': {
    img: 'images/blue/special-obj3.png',
    name: 'Special — piece 3',
    desc: 'A third flair — replaces one special slot.',
    category: 'special',
    builderSize: 130,
  },
};

/** Pill rows: label + category + slot index for multi-cap categories */
const PILL_ROWS = [
  { label: 'Body', category: 'body', index: 0 },
  { label: 'Head', category: 'head', index: 0 },
  { label: 'Limb', category: 'limb', index: 0 },
  { label: 'Limb', category: 'limb', index: 1 },
  { label: 'Special', category: 'special', index: 0 },
  { label: 'Special', category: 'special', index: 1 },
];

let identity = {};
/** Slot index (0–5) → object id or null. Order: body, head, limb×2, special×2 */
let pieceSlots = [null, null, null, null, null, null];

let draggingEl = null;
let dragOffX = 0;
let dragOffY = 0;
let selectedPlacedId = null;

/** Prevents removeFeature / piece-slot return during save (and stray clicks after folder picker). */
let builderSaveLockedUntil = 0;

/** Per placed object: scale (0.5–2× base), rotate (deg), flip flags */
const placedTransforms = {};

const PLACED_SCALE_MIN = 0.5;
const PLACED_SCALE_MAX = 2;
const PLACED_ROTATE_STEP = 45;
const PLACED_WHEEL_SCALE_STEP = 0.05;

let resizeModeActive = false;

function $(id) {
  return document.getElementById(id);
}

function zFor(id) {
  const d = DATA[id];
  return d ? Z_BY_CATEGORY[d.category] : 1;
}

function builderSizeFor(id) {
  return DATA[id]?.builderSize ?? 48;
}

function positionPlaced(el, builder) {
  const bw = builder.offsetWidth;
  const bh = builder.offsetHeight;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  el.style.left = Math.round(bw / 2 - w / 2 + (Math.random() - 0.5) * 50) + 'px';
  el.style.top = Math.round(bh / 2 - h / 2 + (Math.random() - 0.5) * 50) + 'px';
}

function clearPlacedSelection() {
  if (!selectedPlacedId) return;
  const el = $('placed-' + selectedPlacedId);
  if (el) el.classList.remove('is-selected');
  selectedPlacedId = null;
  setResizeMode(false);
}

function defaultPlacedTransform() {
  return { scale: 1, rotate: 0, flipH: false, flipV: false };
}

function getPlacedTransform(id) {
  if (!placedTransforms[id]) placedTransforms[id] = defaultPlacedTransform();
  return placedTransforms[id];
}

function applyPlacedTransform(id) {
  const el = $('placed-' + id);
  if (!el) return;
  const t = getPlacedTransform(id);
  const baseSize = builderSizeFor(id);
  el.style.width = Math.round(baseSize * t.scale) + 'px';
  const img = el.querySelector('.placed-img');
  if (!img) return;
  const sx = t.flipH ? -1 : 1;
  const sy = t.flipV ? -1 : 1;
  img.style.transform = `rotate(${t.rotate}deg) scale(${sx}, ${sy})`;
  clampPlacedInBuilder(el);
}

function clampPlacedInBuilder(el) {
  const builder = $('builder');
  if (!builder || !el) return;
  const bw = builder.offsetWidth;
  const bh = builder.offsetHeight;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let x = parseFloat(el.style.left) || 0;
  let y = parseFloat(el.style.top) || 0;
  x = Math.max(0, Math.min(bw - w, x));
  y = Math.max(0, Math.min(bh - h, y));
  el.style.left = Math.round(x) + 'px';
  el.style.top = Math.round(y) + 'px';
}

function requireSelectedPlaced() {
  if (!selectedPlacedId) {
    toast('Select an object in the identity builder first');
    return null;
  }
  const el = $('placed-' + selectedPlacedId);
  if (!el) {
    selectedPlacedId = null;
    return null;
  }
  return el;
}

function setResizeMode(active) {
  resizeModeActive = active;
  const btn = $('tool-resize');
  if (btn) btn.classList.toggle('tool-btn--active', active);
  const builder = $('builder');
  if (builder) builder.classList.toggle('builder--resize-mode', active);
}

function setPlacedSelected(id) {
  if (selectedPlacedId === id) return;
  if (selectedPlacedId) {
    const prev = $('placed-' + selectedPlacedId);
    if (prev) prev.classList.remove('is-selected');
  }
  selectedPlacedId = id;
  const el = $('placed-' + id);
  if (!el) {
    selectedPlacedId = null;
    setResizeMode(false);
    return;
  }
  el.classList.add('is-selected');
}

function initBuilderSelection() {
  const builder = $('builder');
  if (!builder) return;

  builder.addEventListener('mousedown', (e) => {
    if (e.target === builder) clearPlacedSelection();
  });
}

function toast(msg, dur = 2400) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('on'), dur);
}

function keysInCategory(cat) {
  return Object.keys(identity).filter((k) => DATA[k].category === cat);
}

function categoryCapacity(cat) {
  return CAPACITY[cat] || 0;
}

function totalCount() {
  return Object.keys(identity).length;
}

function builderHasPlacedObjects() {
  if (totalCount() === 0) return false;
  const builder = $('builder');
  if (!builder) return false;
  return builder.querySelectorAll('.placed').length > 0;
}

function toastEmptyBuilderSave() {
  toast('Place at least one object on the identity builder first');
}

function lockBuilderDuringSave(ms = 1200) {
  builderSaveLockedUntil = Date.now() + ms;
}

function extendBuilderSaveLock(ms = 800) {
  builderSaveLockedUntil = Math.max(builderSaveLockedUntil, Date.now() + ms);
}

function isBuilderSaveLocked() {
  return Date.now() < builderSaveLockedUntil;
}

function pieceSlotCategory(slotIndex) {
  return PILL_ROWS[slotIndex]?.category;
}

function findEmptyPieceSlot(category) {
  for (let i = 0; i < PILL_ROWS.length; i++) {
    if (PILL_ROWS[i].category === category && !pieceSlots[i]) return i;
  }
  return -1;
}

function slotIndexForObject(id) {
  return pieceSlots.findIndex((slotId) => slotId === id);
}

function clearObjectFromAllPieceSlots(id) {
  for (let i = 0; i < pieceSlots.length; i++) {
    if (pieceSlots[i] === id) pieceSlots[i] = null;
  }
}

/** Drop stale entries and ensure every placed identity object has a category-correct slot. */
function reconcilePieceSlots() {
  const seen = new Set();

  for (let i = 0; i < pieceSlots.length; i++) {
    const id = pieceSlots[i];
    if (!id) continue;
    const rowCategory = pieceSlotCategory(i);
    const invalid =
      !identity[id] ||
      !DATA[id] ||
      DATA[id].category !== rowCategory ||
      seen.has(id);

    if (invalid) pieceSlots[i] = null;
    else seen.add(id);
  }

  for (const id of Object.keys(identity)) {
    if (!DATA[id]) continue;
    if (slotIndexForObject(id) >= 0) continue;
    assignPieceSlot(id);
  }
}

function assignPieceSlot(id, preferredSlot = -1) {
  const category = DATA[id]?.category;
  if (!category) return -1;

  clearObjectFromAllPieceSlots(id);

  if (
    preferredSlot >= 0 &&
    preferredSlot < pieceSlots.length &&
    pieceSlotCategory(preferredSlot) === category
  ) {
    pieceSlots[preferredSlot] = id;
    return preferredSlot;
  }

  const slot = findEmptyPieceSlot(category);
  if (slot >= 0) pieceSlots[slot] = id;
  return slot;
}

function clearPieceSlot(id) {
  clearObjectFromAllPieceSlots(id);
}

function renderPieceSlots() {
  reconcilePieceSlots();

  document.querySelectorAll('.piece-slot').forEach((btn) => {
    const i = Number(btn.dataset.slot);
    const objectId = pieceSlots[i];
    const meta = objectId ? DATA[objectId] : null;
    const rowCategory = pieceSlotCategory(i);
    const filled = Boolean(meta && meta.category === rowCategory);
    const frame = btn.querySelector('.piece-slot-frame');
    const thumb = btn.querySelector('.piece-slot-thumb');

    if (!filled && objectId) pieceSlots[i] = null;

    btn.hidden = false;
    btn.classList.toggle('is-filled', filled);
    btn.classList.toggle('is-empty', !filled);

    if (filled && frame && thumb) {
      frame.hidden = false;
      thumb.src = meta.img;
      thumb.alt = popupObjectTitle(meta.category);
      thumb.hidden = false;
    } else if (frame && thumb) {
      frame.hidden = true;
      thumb.src = '';
      thumb.alt = '';
      thumb.hidden = true;
    }
  });
}

function initPieceSlots() {
  document.querySelectorAll('.piece-slot').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (isBuilderSaveLocked()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const i = Number(btn.dataset.slot);
      const objectId = pieceSlots[i];
      if (objectId) removeFeature(objectId);
    });
  });
  renderPieceSlots();
}

function clickObj(id) {
  const d = DATA[id];
  if (!d) return;

  if (identity[id]) {
    toast(`${d.name} is already placed`);
    return;
  }

  const cat = d.category;
  const occ = keysInCategory(cat);
  const cap = categoryCapacity(cat);

  if (occ.length < cap && totalCount() < MAX_ITEMS) {
    showAcceptPopup(id);
    return;
  }

  if (occ.length === 1) {
    showReplacePopup(id, occ[0]);
  } else {
    showReplaceChoicePopup(id, occ);
  }
}

function popThumb(img, name) {
  return `<div class="pop-thumb"><img src="${img}" alt="" /><span class="pop-thumb-lbl">${name}</span></div>`;
}

const POPUP_BTN_IMG = {
  accept: 'images/general/accept.png',
  cancel: 'images/general/cancel.png',
  replace: 'images/general/replace.png',
};

function setPopupActions(primaryAction, onPrimary) {
  const primaryBtn = $('pop-btn-primary');
  const primaryImg = $('pop-btn-primary-img');
  const cancelBtn = $('pop-btn-secondary');

  cancelBtn.onclick = closePopup;
  cancelBtn.hidden = false;

  if (primaryAction) {
    primaryImg.src = POPUP_BTN_IMG[primaryAction];
    primaryImg.alt = primaryAction.charAt(0).toUpperCase() + primaryAction.slice(1);
    primaryBtn.onclick = onPrimary;
    primaryBtn.hidden = false;
  } else {
    primaryBtn.hidden = true;
    primaryBtn.onclick = null;
  }
}

function hidePopupActions() {
  $('pop-btn-primary').hidden = true;
  $('pop-btn-secondary').hidden = true;
}

function setPopupCategoryTag(category) {
  const tag = $('popup-category-tag');
  tag.src = CATEGORY_TAG[category] || CATEGORY_TAG.special;
  tag.alt = category;
  tag.hidden = false;
}

function showAcceptPopup(id) {
  const d = DATA[id];
  setPopupCategoryTag(d.category);
  setPopupActions('accept', () => acceptObj(id));
  $('overlay').style.display = 'flex';
  $('popup-body').innerHTML = `
    ${popThumb(d.img, popupObjectTitle(d.category))}
    <div class="pop-desc">${d.desc}</div>`;
}

function showReplacePopup(newId, oldId) {
  const nd = DATA[newId];
  const od = DATA[oldId];
  setPopupCategoryTag(nd.category);
  setPopupActions('replace', () => doReplace(newId, oldId));
  $('overlay').style.display = 'flex';
  $('popup-body').innerHTML = `
    ${popThumb(nd.img, popupObjectTitle(nd.category))}
    <div class="pop-desc">${nd.desc}</div>
    <div class="replace-label">Replaces your current ${popupObjectTitle(nd.category)}:</div>
    <div class="replace-list">
      <div class="replace-opt" role="button" tabindex="0" onclick="doReplace('${newId}','${oldId}')">
        <span class="r-thumb"><img src="${od.img}" alt="" /></span>
        <div class="r-info">
          <div class="r-name">${popupObjectTitle(od.category)}</div>
          <div class="r-slot">${popupObjectTitle(od.category)}</div>
        </div>
      </div>
    </div>`;
}

function showReplaceChoicePopup(newId, oldIds) {
  const nd = DATA[newId];
  setPopupCategoryTag(nd.category);
  setPopupActions(null);
  $('overlay').style.display = 'flex';
  const opts = oldIds
    .map((oid) => {
      const od = DATA[oid];
      return `
      <div class="replace-opt" role="button" tabindex="0" onclick="doReplace('${newId}','${oid}')">
        <span class="r-thumb"><img src="${od.img}" alt="" /></span>
        <div class="r-info">
          <div class="r-name">${popupObjectTitle(od.category)}</div>
          <div class="r-slot">${popupObjectTitle(od.category)}</div>
        </div>
      </div>`;
    })
    .join('');

  $('popup-body').innerHTML = `
    ${popThumb(nd.img, popupObjectTitle(nd.category))}
    <div class="pop-desc">${nd.desc}</div>
    <div class="replace-label">Which ${nd.category} do you want to replace?</div>
    <div class="replace-list">${opts}</div>`;
}

function acceptObj(id) {
  closePopup();
  placeFeature(id);
}

function doReplace(newId, oldId) {
  closePopup();
  const slot = slotIndexForObject(oldId);
  removeFeature(oldId, false);
  placeFeature(newId, slot);
  toast(`Replaced ${DATA[oldId].name} with ${DATA[newId].name}`);
}

function closePopup() {
  $('overlay').style.display = 'none';
  $('popup-category-tag').hidden = true;
  hidePopupActions();
}

$('overlay').addEventListener('click', function (e) {
  if (e.target === this) closePopup();
});

function placeFeature(id, preferredPieceSlot = -1) {
  const d = DATA[id];
  const builder = $('builder');
  if (!builder) return;
  const z = zFor(id);
  const size = builderSizeFor(id);

  const el = document.createElement('div');
  el.className = 'placed';
  el.id = 'placed-' + id;
  el.dataset.id = id;

  el.style.zIndex = String(z);
  el.style.width = size + 'px';

  el.innerHTML = `<img class="placed-img" src="${d.img}" alt="" draggable="false" />`;
  el.addEventListener('mousedown', startDrag);

  builder.appendChild(el);

  placedTransforms[id] = defaultPlacedTransform();
  applyPlacedTransform(id);

  const img = el.querySelector('.placed-img');
  const afterLayout = () => positionPlaced(el, builder);
  if (img.complete && img.naturalWidth) afterLayout();
  else img.addEventListener('load', afterLayout, { once: true });

  identity[id] = d;
  assignPieceSlot(id, preferredPieceSlot);
  const objEl = $('obj-' + id);
  if (objEl) objEl.classList.add('gone');

  renderPieceSlots();
  renderPills();
  setPlacedSelected(id);
  toast(`${d.name} place in the identity builder`);
}

function removeFeature(id, showMsg = true) {
  if (isBuilderSaveLocked()) return;
  if (selectedPlacedId === id) clearPlacedSelection();
  delete placedTransforms[id];
  const el = $('placed-' + id);
  if (el) el.remove();

  delete identity[id];
  clearPieceSlot(id);

  const objEl = $('obj-' + id);
  if (objEl) objEl.classList.remove('gone');

  renderPieceSlots();
  renderPills();

  if (showMsg) toast(`${DATA[id].name} returned to room`);
}

function toolImgWidthAtHeight(img, height) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) return 0;
  return height * (nw / nh);
}

function sizeToolStrip() {
  const list = document.querySelector('.tool-list');
  const panel = document.querySelector('.rpanel-layer--tools');
  if (!list || !panel) return;

  const toolImgs = [...list.querySelectorAll('.tool-btn-icon')];
  if (!toolImgs.length) return;

  const listW = list.clientWidth;
  if (!listW) return;

  toolImgs.forEach((img) => {
    const li = img.closest('li');
    if (li) li.style.flex = '0 0 auto';
  });

  const totalAt = (h) =>
    toolImgs.reduce((sum, img) => sum + toolImgWidthAtHeight(img, h), 0);

  let lo = 1;
  let hi = 256;
  while (totalAt(hi) < listW && hi < 512) hi *= 2;

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (totalAt(mid) > listW) hi = mid;
    else lo = mid;
  }

  const stripH = Math.max(1, Math.floor(lo));
  const hPx = `${stripH}px`;

  toolImgs.forEach((img) => {
    const li = img.closest('li');
    const w = Math.ceil(toolImgWidthAtHeight(img, stripH));
    if (li) li.style.flex = `0 0 ${w}px`;
  });

  list.style.height = hPx;
  panel.style.height = hPx;
}

function updateProgressNumbers() {
  const count = Math.min(totalCount(), MAX_ITEMS);
  const numEl = $('progress-number');
  const sumEl = $('progress-sum');
  const progressLayer = document.querySelector('.rpanel-layer--progress');
  const fill = document.querySelector('.rpanel-progress-fill');

  if (sumEl) sumEl.textContent = String(MAX_ITEMS);
  if (numEl) numEl.textContent = String(count);

  if (progressLayer) {
    progressLayer.style.setProperty('--rp-progress-count', String(count));
  }
  if (fill) {
    fill.hidden = count === 0;
  }
}

function updateProceed() {
  updateProgressNumbers();
  const btn = $('proceed-btn');
  const img = $('proceed-img');
  if (!img) return;
  const complete = totalCount() >= MAX_ITEMS;
  img.src = complete
    ? 'images/general/proceed_active.png'
    : 'images/general/proceed_lock.png';
  if (btn) btn.disabled = !complete;
  if (img.complete) sizeToolStrip();
  else img.addEventListener('load', sizeToolStrip, { once: true });
}

function renderPills() {
  const list = $('pills');
  const count = totalCount();

  const progBar = $('prog-bar');
  if (progBar) progBar.style.width = (count / MAX_ITEMS) * 100 + '%';

  const progLbl = $('prog-lbl');
  if (progLbl) progLbl.textContent = count + ' / ' + MAX_ITEMS;

  if (!list) {
    updateProceed();
    return;
  }

  list.innerHTML = '';

  PILL_ROWS.forEach((row, slotIndex) => {
    const key = pieceSlots[slotIndex];

    if (key && identity[key]) {
      const d = DATA[key];
      const p = document.createElement('div');
      p.className = 'pill';
      p.title = 'Click to return to room';
      p.innerHTML = `
        <span class="p-thumb"><img src="${d.img}" alt="" /></span>
        <span class="p-name">${d.name}</span>
        <span class="p-slot">${row.label}</span>
        <span class="p-z">z:${zFor(key)}</span>`;
      p.onclick = () => removeFeature(key);
      list.appendChild(p);
    } else {
      const p = document.createElement('div');
      p.className = 'pill-empty';
      p.innerHTML = `<span class="dot"></span><span>${row.label} (empty)</span>`;
      list.appendChild(p);
    }
  });

  updateProceed();
}

function startDrag(e) {
  e.preventDefault();
  e.stopPropagation();
  draggingEl = e.currentTarget;
  setPlacedSelected(draggingEl.dataset.id);

  const er = draggingEl.getBoundingClientRect();

  dragOffX = e.clientX - er.left;
  dragOffY = e.clientY - er.top;

  draggingEl.style.cursor = 'grabbing';
  draggingEl.style.transition = 'none';

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
  if (!draggingEl) return;

  const builder = $('builder');
  const br = builder.getBoundingClientRect();
  const elW = draggingEl.offsetWidth || 48;
  const elH = draggingEl.offsetHeight || 48;

  let x = e.clientX - br.left - dragOffX;
  let y = e.clientY - br.top - dragOffY;

  x = Math.max(0, Math.min(br.width - elW, x));
  y = Math.max(0, Math.min(br.height - elH, y));

  draggingEl.style.left = Math.round(x) + 'px';
  draggingEl.style.top = Math.round(y) + 'px';
}

function stopDrag() {
  if (draggingEl) {
    draggingEl.style.cursor = 'grab';
    draggingEl.style.transition = 'filter 0.1s ease';
    draggingEl = null;
  }
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

function initIdentityTools() {
  const builder = $('builder');
  const flipH = $('tool-flip-h');
  const flipV = $('tool-flip-v');
  const rotateBtn = $('tool-rotate');
  const resizeBtn = $('tool-resize');
  if (!builder || !flipH || !flipV || !rotateBtn || !resizeBtn) return;

  flipH.addEventListener('click', () => {
    if (!requireSelectedPlaced()) return;
    const t = getPlacedTransform(selectedPlacedId);
    t.flipH = !t.flipH;
    applyPlacedTransform(selectedPlacedId);
  });

  flipV.addEventListener('click', () => {
    if (!requireSelectedPlaced()) return;
    const t = getPlacedTransform(selectedPlacedId);
    t.flipV = !t.flipV;
    applyPlacedTransform(selectedPlacedId);
  });

  rotateBtn.addEventListener('click', () => {
    if (!requireSelectedPlaced()) return;
    const t = getPlacedTransform(selectedPlacedId);
    t.rotate = (t.rotate + PLACED_ROTATE_STEP) % 360;
    applyPlacedTransform(selectedPlacedId);
  });

  resizeBtn.addEventListener('click', () => {
    if (!requireSelectedPlaced()) return;
    setResizeMode(!resizeModeActive);
    if (resizeModeActive) {
      toast('Scroll over the builder to resize');
    }
  });

  builder.addEventListener(
    'wheel',
    (e) => {
      if (!resizeModeActive || !selectedPlacedId) return;
      e.preventDefault();
      const t = getPlacedTransform(selectedPlacedId);
      const delta = e.deltaY > 0 ? -PLACED_WHEEL_SCALE_STEP : PLACED_WHEEL_SCALE_STEP;
      t.scale = Math.min(PLACED_SCALE_MAX, Math.max(PLACED_SCALE_MIN, t.scale + delta));
      applyPlacedTransform(selectedPlacedId);
    },
    { passive: false }
  );

  const saveBtn = $('tool-save');
  if (saveBtn) {
    saveBtn.setAttribute('type', 'button');
    const runSave = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!builderHasPlacedObjects()) {
        toastEmptyBuilderSave();
        return;
      }
      lockBuilderDuringSave();
      saveIdentityCollage()
        .catch(() => toast('Could not save identity'))
        .finally(() => extendBuilderSaveLock());
    };
    saveBtn.addEventListener('mousedown', (e) => e.preventDefault());
    saveBtn.addEventListener('click', runSave);
  }
}

function initToolStrip() {
  const imgs = document.querySelectorAll('.tool-list .tool-btn-icon');
  let pending = imgs.length;
  if (!pending) {
    sizeToolStrip();
    return;
  }
  const done = () => {
    pending -= 1;
    if (pending <= 0) sizeToolStrip();
  };
  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });
}

function hideSceneOverlay(overlay) {
  if (!overlay) return;
  overlay.hidden = true;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

function showSceneOverlay(overlay) {
  if (!overlay) return;
  overlay.hidden = false;
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
}

function closeOtherSceneModals(exceptOverlayId) {
  ['heart-overlay', 'about-overlay', 'help-overlay', 'identities-overlay'].forEach((id) => {
    if (id === exceptOverlayId) return;
    hideSceneOverlay($(id));
  });
}

function initHeartModal() {
  const heartBtn = $('menubar-heart');
  const overlay = $('heart-overlay');
  const modal = $('heart-modal');
  const heartPanel = $('heart-panel');
  const daggerBtn = $('heart-dagger');
  const pins = $('heart-pins');
  if (!heartBtn || !overlay || !modal || !heartPanel || !daggerBtn || !pins) return;

  let heartVisible = false;
  let heartPanelOpen = false;

  function setHeartPanelOpen(open) {
    heartPanelOpen = open;
    heartPanel.classList.toggle('is-open', heartPanelOpen);
    pins.setAttribute('aria-hidden', heartPanelOpen ? 'false' : 'true');
  }

  function setHeartVisible(visible) {
    heartVisible = visible;
    if (visible) {
      closeOtherSceneModals('heart-overlay');
      showSceneOverlay(overlay);
    } else {
      hideSceneOverlay(overlay);
      setHeartPanelOpen(false);
    }
  }

  setHeartVisible(false);
  setHeartPanelOpen(false);

  heartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setHeartVisible(!heartVisible);
  });
  heartBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setHeartVisible(!heartVisible);
    }
  });

  modal.addEventListener('click', (e) => e.stopPropagation());

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) setHeartVisible(false);
  });

  daggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setHeartPanelOpen(!heartPanelOpen);
  });

  document.addEventListener('click', (e) => {
    if (!heartVisible) return;
    if (heartBtn.contains(e.target)) return;
    if (modal.contains(e.target)) return;
    setHeartVisible(false);
  });
}

function initAboutModal() {
  const aboutBtn = $('menubar-about');
  const overlay = $('about-overlay');
  const modal = $('about-modal');
  if (!aboutBtn || !overlay || !modal) return;

  let aboutVisible = false;

  function setAboutVisible(visible) {
    aboutVisible = visible;
    if (visible) {
      closeOtherSceneModals('about-overlay');
      showSceneOverlay(overlay);
    } else {
      hideSceneOverlay(overlay);
    }
  }

  setAboutVisible(false);

  aboutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setAboutVisible(!aboutVisible);
  });
  aboutBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setAboutVisible(!aboutVisible);
    }
  });

  modal.addEventListener('click', (e) => e.stopPropagation());

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) setAboutVisible(false);
  });

  document.addEventListener('click', (e) => {
    if (!aboutVisible) return;
    if (aboutBtn.contains(e.target)) return;
    if (modal.contains(e.target)) return;
    setAboutVisible(false);
  });
}

function initHelpModal() {
  const helpBtn = $('menubar-help');
  const overlay = $('help-overlay');
  const modal = $('help-modal');
  if (!helpBtn || !overlay || !modal) return;

  let helpVisible = false;

  function setHelpVisible(visible) {
    helpVisible = visible;
    if (visible) {
      closeOtherSceneModals('help-overlay');
      showSceneOverlay(overlay);
    } else {
      hideSceneOverlay(overlay);
    }
  }

  setHelpVisible(false);

  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setHelpVisible(!helpVisible);
  });
  helpBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setHelpVisible(!helpVisible);
    }
  });

  modal.addEventListener('click', (e) => e.stopPropagation());

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) setHelpVisible(false);
  });

  document.addEventListener('click', (e) => {
    if (!helpVisible) return;
    if (helpBtn.contains(e.target)) return;
    if (modal.contains(e.target)) return;
    setHelpVisible(false);
  });
}

/* ── Saved identities (Identities/ folder + gallery metadata) ── */

const IDENTITIES_STORAGE_KEY = 'blue-room-identities';
const IDENTITIES_FOLDER = 'Identities';
const IDENTITY_EXPORT_SCALE = 2;

let selectedIdentityViewId = null;
let setIdentitiesVisible = null;

function identityFileName(number) {
  return `identity-${number}.png`;
}

function identityImageSrc(entry) {
  if (entry?.fileName && entry.fileSaved !== false) {
    return `${IDENTITIES_FOLDER}/${entry.fileName}`;
  }
  return entry?.thumbDataUrl || '';
}

function loadIdentities() {
  try {
    const raw = localStorage.getItem(IDENTITIES_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persistIdentities(list) {
  localStorage.setItem(IDENTITIES_STORAGE_KEY, JSON.stringify(list));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('blob failed'))),
      type,
      quality
    );
  });
}

/** Save PNG into project Identities/ via local dev server (npm start). */
async function writeIdentityPngToFolder(blob, fileName) {
  const res = await fetch(
    `/api/identities/save?file=${encodeURIComponent(fileName)}`,
    {
      method: 'POST',
      body: blob,
      headers: { 'Content-Type': 'image/png' },
    }
  );
  if (!res.ok) throw new Error('save-failed');
}

function createThumbnailDataUrl(canvas, maxDim = 200) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(1, maxDim / Math.max(w, h, 1));
  if (scale >= 1) return canvas.toDataURL('image/png');

  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.round(w * scale));
  thumb.height = Math.max(1, Math.round(h * scale));
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/png');
}

function addSavedIdentity(fileName, thumbDataUrl, fileSaved = true) {
  const list = loadIdentities();
  const number = list.length + 1;
  const entry = {
    id: `identity-${Date.now()}-${number}`,
    number,
    savedAt: new Date().toISOString(),
    fileName,
    thumbDataUrl: thumbDataUrl || null,
    fileSaved: Boolean(fileSaved),
  };
  list.push(entry);
  persistIdentities(list);
  return entry;
}

function formatIdentityDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

function getPlacedElementsSorted(builder) {
  return [...builder.querySelectorAll('.placed')].sort((a, b) => {
    const za = parseInt(a.style.zIndex, 10) || 0;
    const zb = parseInt(b.style.zIndex, 10) || 0;
    return za - zb;
  });
}

async function waitForPlacedImage(imgEl) {
  if (imgEl.complete && imgEl.naturalWidth) return;
  await new Promise((resolve, reject) => {
    imgEl.addEventListener('load', resolve, { once: true });
    imgEl.addEventListener('error', () => reject(new Error('image load failed')), {
      once: true,
    });
  });
}

async function drawPlacedOnCanvas(ctx, el) {
  const id = el.dataset.id;
  const t = getPlacedTransform(id);
  const imgEl = el.querySelector('.placed-img');
  if (!imgEl?.src) return;

  await waitForPlacedImage(imgEl);
  const image = imgEl;
  const x = parseFloat(el.style.left) || 0;
  const y = parseFloat(el.style.top) || 0;
  const w = el.offsetWidth;
  const h = el.offsetHeight;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((t.rotate * Math.PI) / 180);
  const sx = t.flipH ? -1 : 1;
  const sy = t.flipV ? -1 : 1;
  ctx.scale(sx, sy);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

async function captureBuilderCollage(builder) {
  const placed = getPlacedElementsSorted(builder);
  const w = builder.clientWidth;
  const h = builder.clientHeight;
  if (!w || !h) throw new Error('empty builder');

  const scale = IDENTITY_EXPORT_SCALE;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  for (const el of placed) {
    await drawPlacedOnCanvas(ctx, el);
  }

  return canvas;
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function saveIdentityCollage() {
  lockBuilderDuringSave();

  const builder = $('builder');
  if (!builder || !builderHasPlacedObjects()) {
    toastEmptyBuilderSave();
    return;
  }

  const placed = getPlacedElementsSorted(builder);
  if (!placed.length) {
    toastEmptyBuilderSave();
    return;
  }

  try {
    const canvas = await captureBuilderCollage(builder);
    const number = loadIdentities().length + 1;
    const fileName = identityFileName(number);
    const blob = await canvasToBlob(canvas, 'image/png');
    const thumbDataUrl = createThumbnailDataUrl(canvas);

    let fileSaved = false;
    try {
      await writeIdentityPngToFolder(blob, fileName);
      fileSaved = true;
    } catch {
      toast('Start the app with npm start, then open http://localhost:8080');
    }

    const entry = addSavedIdentity(fileName, thumbDataUrl, fileSaved);
    if (fileSaved) {
      toast(`Identity #${entry.number} saved to ${IDENTITIES_FOLDER}/${fileName}`);
    } else {
      toast(`Identity #${entry.number} added to Identities gallery`);
    }

    renderIdentitiesGallery();
  } finally {
    extendBuilderSaveLock();
  }
}

function renderIdentitiesPreview(entry) {
  const empty = $('identities-preview-empty');
  const img = $('identities-preview-img');
  const meta = $('identities-preview-meta');
  const dateEl = $('identities-preview-date');
  const numEl = $('identities-preview-number');

  if (!entry) {
    if (empty) empty.hidden = false;
    if (img) img.hidden = true;
    if (meta) meta.hidden = true;
    return;
  }

  if (empty) empty.hidden = true;
  if (img) {
    img.src = identityImageSrc(entry);
    img.alt = `Identity ${entry.number}`;
    img.hidden = false;
  }
  if (meta) meta.hidden = false;
  if (dateEl) dateEl.textContent = formatIdentityDate(entry.savedAt);
  if (numEl) numEl.textContent = `#${entry.number}`;
}

function selectIdentityView(id) {
  selectedIdentityViewId = id;
  const list = loadIdentities();
  const entry = id ? list.find((item) => item.id === id) || null : null;
  renderIdentitiesPreview(entry);

  document.querySelectorAll('.identity-thumb').forEach((btn) => {
    btn.classList.toggle('is-selected', btn.dataset.id === id);
  });
}

function renderIdentitiesGallery() {
  const listEl = $('identities-gallery-list');
  const emptyMsg = $('identities-gallery-empty');
  if (!listEl) return;

  const list = loadIdentities().sort((a, b) => a.number - b.number);
  listEl.innerHTML = '';

  if (emptyMsg) emptyMsg.hidden = list.length > 0;

  if (!list.length) {
    selectIdentityView(null);
    return;
  }

  list.forEach((entry) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'identity-thumb';
    btn.dataset.id = entry.id;
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `Identity ${entry.number}`);
    if (entry.id === selectedIdentityViewId) btn.classList.add('is-selected');

    btn.innerHTML = `
      <span class="identity-thumb-frame">
        <img src="${identityImageSrc(entry)}" alt="" decoding="async" />
      </span>
      <span class="identity-thumb-num">#${entry.number}</span>`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectIdentityView(entry.id);
    });

    listEl.appendChild(btn);
  });

  const stillExists = list.some((item) => item.id === selectedIdentityViewId);
  if (!stillExists) {
    selectIdentityView(list[list.length - 1].id);
  } else {
    selectIdentityView(selectedIdentityViewId);
  }
}

function initIdentitiesModal() {
  const identitiesBtn = $('menubar-identities');
  const overlay = $('identities-overlay');
  const modal = $('identities-modal');
  if (!identitiesBtn || !overlay || !modal) return;

  let identitiesVisible = false;

  setIdentitiesVisible = function setIdentitiesVisibleFn(visible) {
    identitiesVisible = visible;
    if (visible) {
      closeOtherSceneModals('identities-overlay');
      showSceneOverlay(overlay);
      renderIdentitiesGallery();
    } else {
      hideSceneOverlay(overlay);
    }
  };

  setIdentitiesVisible(false);

  identitiesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setIdentitiesVisible(!identitiesVisible);
  });
  identitiesBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setIdentitiesVisible(!identitiesVisible);
    }
  });

  modal.addEventListener('click', (e) => e.stopPropagation());

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) setIdentitiesVisible(false);
  });

  document.addEventListener('click', (e) => {
    if (!identitiesVisible) return;
    if (identitiesBtn.contains(e.target)) return;
    if (modal.contains(e.target)) return;
    setIdentitiesVisible(false);
  });
}

function syncNpcPortraitToDialogue() {
  const dialogue = document.querySelector('.left-dialogue');
  const scene = document.querySelector('.gameplay-scene');
  const anchor = document.querySelector('.npc-portrait-anchor');
  if (!dialogue || !scene || !anchor) return;

  const d = dialogue.getBoundingClientRect();
  const s = scene.getBoundingClientRect();
  if (s.width <= 0 || s.height <= 0) return;

  const left = ((d.left - s.left) / s.width) * 100;
  const top = ((d.top - s.top) / s.height) * 100;
  const width = (d.width / s.width) * 100;
  const height = (d.height / s.height) * 100;

  anchor.style.left = `${left}%`;
  anchor.style.top = `${top}%`;
  anchor.style.width = `${width}%`;
  anchor.style.height = `${height}%`;
  anchor.style.right = 'auto';
  anchor.style.bottom = 'auto';
}

function initNpcPortraitAnchorSync() {
  const dialogue = document.querySelector('.left-dialogue');
  const scene = document.querySelector('.gameplay-scene');
  const dialogueImg = dialogue?.querySelector('.dialogue-img');
  const run = () => syncNpcPortraitToDialogue();

  run();
  if (dialogueImg && !dialogueImg.complete) {
    dialogueImg.addEventListener('load', run, { once: true });
  }
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(run);
    if (dialogue) ro.observe(dialogue);
    if (scene) ro.observe(scene);
    const host = document.querySelector('.scene-host');
    if (host) ro.observe(host);
  }
  window.addEventListener('resize', run);
}

function initNpcInteraction() {
  const clickBtn = $('npc-click');
  const portrait = $('npc-portrait');
  if (!clickBtn || !portrait) return;

  let npcRevealed = false;

  function revealNpc() {
    if (npcRevealed) return;
    npcRevealed = true;
    syncNpcPortraitToDialogue();
    portrait.hidden = false;
    portrait.setAttribute('aria-hidden', 'false');
  }

  clickBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    revealNpc();
  });

  clickBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      revealNpc();
    }
  });
}

renderPills();
initNpcPortraitAnchorSync();
initNpcInteraction();
initToolStrip();
initIdentityTools();
initPieceSlots();
initBuilderSelection();
initHeartModal();
initAboutModal();
initHelpModal();
initIdentitiesModal();
renderIdentitiesGallery();
window.addEventListener('resize', sizeToolStrip);

