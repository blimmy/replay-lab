import { colours, drawRoom, drawToy } from './pixel.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE = 'replay-lab-v1';
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = value => JSON.parse(JSON.stringify(value));
const money = value => `฿${Number(value).toLocaleString('en-US')}`;
const now = () => new Date().toISOString();

const defaultData = { designs: [], bag: [], orders: [], votes: [], draft: null, responses: [] };
function readData() {
  try { const parsed = JSON.parse(localStorage.getItem(STORAGE) || '{}'); return { ...cleanNotebook({version:1,...parsed}), responses: Array.isArray(parsed.responses) ? parsed.responses.filter(r => r && r.answers && typeof r.answers === 'object') : [] }; }
  catch { return clone(defaultData); }
}
let store;
function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(store)); } catch { toast('Browser storage unavailable or full. Export a backup before leaving.'); } updateBagCount(); }

const defaults = {
  type: 'squishy', shape: 'peach', size: 'small', color: colours[0], accent: colours[4],
  pattern: 'plain', texture: 'slow-rise', scent: 'none', sound: 'quiet', face: 'blush',
  garnish: 'none', name: 'Peachy little days', memory: '', sleeve: false
};
const designOptions = {
  type: ['squishy','slime'], shape: ['peach','bear','cloud','gamepad','milk','star','heart','bubble','jar'],
  size: ['small','medium','large'], pattern: ['plain','split','stripes','dots'],
  texture: ['slow-rise','marshmallow','firm','cloud','clear','crunchy','butter'],
  scent: ['none','vanilla','peach','paper'], sound: ['quiet','soft-pops','crackle'],
  face: ['blush','sleepy','simple','none'], garnish: ['none','stars','hearts','sprinkles']
};
function cleanDesign(raw, shared = false) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid design');
  const result = clone(defaults);
  for (const key of Object.keys(defaults)) {
    if (!(key in raw)) continue;
    const value = raw[key];
    if (designOptions[key] && !designOptions[key].includes(value)) throw new Error('Invalid option');
    if (['color','accent'].includes(key) && (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value))) throw new Error('Invalid colour');
    if (['name','memory'].includes(key) && (typeof value !== 'string' || value.length > (key === 'name' ? 40 : 240))) throw new Error('Invalid text');
    if (key === 'sleeve' && typeof value !== 'boolean') throw new Error('Invalid sleeve');
    result[key] = value;
  }
  if (shared) result.memory = '';
  else if (typeof raw.id === 'string' && raw.id.length <= 100) result.id = raw.id;
  if (typeof raw.savedAt === 'string') result.savedAt = raw.savedAt;
  return result;
}
function cleanNotebook(parsed) {
  if (!parsed || parsed.version !== 1) throw new Error('Invalid notebook version');
  const result = clone(defaultData);
  for (const key of ['designs','bag','orders','votes']) {
    if (parsed[key] !== undefined && (!Array.isArray(parsed[key]) || parsed[key].length > 2000)) throw new Error('Invalid notebook');
  }
  result.designs = (parsed.designs || []).map(raw => { const d = cleanDesign(raw); d.id ||= uid(); return d; });
  const bagItem = raw => {
    const d = cleanDesign(raw); if (!Number.isInteger(raw.qty) || raw.qty < 1 || raw.qty > 999) throw new Error('Invalid quantity');
    return {...d, id:d.id || uid(), qty:raw.qty, unitPrice:priceFor(d)};
  };
  result.bag = (parsed.bag || []).map(bagItem);
  result.orders = (parsed.orders || []).map(raw => {
    if (!raw || !Array.isArray(raw.items) || raw.items.length > 2000 || !Number.isFinite(Date.parse(raw.createdAt))) throw new Error('Invalid reservation');
    const items = raw.items.map(bagItem);
    return {id: typeof raw.id === 'string' ? raw.id.slice(0,100) : uid(), createdAt:raw.createdAt, status:'SIMULATED — NOT AN ORDER', items, total:items.reduce((n,i)=>n+i.qty*i.unitPrice,0)};
  });
  result.votes = [...new Set((parsed.votes || []).filter(x => ['after-school','saturday-save','corner-shop'].includes(x)))];
  result.draft = parsed.draft ? cleanDesign(parsed.draft) : null;
  return result;
}
store = readData();
let design = { ...defaults, ...(store.draft || {}) };
let activeTab = 'shape';
let history = [clone(design)];
let historyIndex = 0;
let squishAmount = 0;

const collections = [
  { id: 'after-school', title: 'After School Pocket', subtitle: 'Pencil case squishy', type: 'squishy', shape: 'milk', color: '#f9e6a6', accent: '#c4e3f4', pattern: 'split', face: 'blush', garnish: 'stars', texture: 'slow-rise', scent: 'paper', sound: 'quiet', memory: 'Trading stickers and drawing in the last page of a notebook.', price: 369 },
  { id: 'saturday-save', title: 'Saturday Save Point', subtitle: 'Gamepad squishy', type: 'squishy', shape: 'gamepad', color: '#d5c6f3', accent: '#f5bccf', pattern: 'plain', face: 'none', garnish: 'none', texture: 'slow-rise', scent: 'none', sound: 'quiet', memory: 'One more level before dinner.', price: 349 },
  { id: 'corner-shop', title: 'Corner Shop Clouds', subtitle: 'Cloud slime', type: 'slime', shape: 'jar', color: '#c4e3f4', accent: '#f9e6a6', pattern: 'plain', face: 'sleepy', garnish: 'sprinkles', texture: 'cloud', scent: 'vanilla', sound: 'soft-pops', memory: 'A cold sweet after school and coins in your pocket.', price: 319 }
];

function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('visible'), 2300);
}
function showMessage(title, content, actions = []) {
  $('#message-title').textContent = title;
  const body = $('#message-body'); body.replaceChildren();
  if (typeof content === 'string') { const p = document.createElement('p'); p.textContent = content; body.append(p); }
  else body.append(content);
  const actionRoot = $('#message-actions'); actionRoot.replaceChildren();
  for (const action of actions) {
    const button = document.createElement('button'); button.className = action.primary ? 'button primary' : 'button';
    button.textContent = action.label; button.addEventListener('click', () => action.onClick($('#message-dialog'))); actionRoot.append(button);
  }
  $('#message-dialog').showModal();
}
$$('[data-close]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));

function route() {
  const name = location.hash.slice(1).split('?')[0] || 'home';
  if (name === 'main') { $('#main').focus(); return; }
  $('.site-header').classList.remove('menu-open'); $('#menu-toggle').setAttribute('aria-expanded','false');
  const page = $(`[data-page="${CSS.escape(name)}"]`) || $('[data-page="home"]');
  $$('.page').forEach(item => { item.hidden = item !== page; });
  $$('video').forEach(video => { if (video.closest('.page')?.hidden) video.pause(); });
  $$('[data-nav]').forEach(link => { const active=link.dataset.nav === page.dataset.page; link.classList.toggle('active',active); if(active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  const names={home:'Good memories. Made tangible.',studio:'Design studio',collections:'The memory edit',notebook:'My notebook',research:'Research notebook'};
  document.title=`REPLAY LAB — ${names[page.dataset.page]}`;
  if (page.dataset.page === 'studio') renderStudio();
  if (page.dataset.page === 'notebook') renderNotebook();
  if (page.dataset.page === 'research') initSurvey();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
window.addEventListener('hashchange', route);
$('#menu-toggle').addEventListener('click',()=>{const open=$('.site-header').classList.toggle('menu-open');$('#menu-toggle').setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('.site-header').classList.remove('menu-open');$('#menu-toggle').setAttribute('aria-expanded','false');}});

function updateBagCount() { $('#bag-count').textContent = store.bag.reduce((sum, item) => sum + item.qty, 0); }
function priceFor(item) {
  return (item.type === 'slime' ? 299 : 349) + ({ small: 0, medium: 50, large: 100 }[item.size] || 0) + (item.garnish !== 'none' ? 20 : 0) + (item.sleeve ? 40 : 0);
}
function describe(item) {
  const feel = item.type === 'slime' ? `${item.texture} texture` : `${item.texture} foam`;
  const scent = item.scent === 'none' ? 'unscented' : `${item.scent} scent`;
  return `${item.size} ${item.type} · ${feel} · ${scent} · ${item.sound}`;
}
function commit(patch) {
  const focused=document.activeElement;
  const restore=focused?.tagName==='BUTTON' && $('#controls').contains(focused) ? {text:focused.textContent,label:focused.getAttribute('aria-label')} : null;
  design = { ...design, ...patch };
  if (patch.id === null) delete design.id;
  history = history.slice(0, historyIndex + 1); history.push(clone(design)); historyIndex++;
  store.draft = clone(design); persist(); renderStudio();
  if(restore)$$('button',$('#controls')).find(button=>button.textContent===restore.text&&button.getAttribute('aria-label')===restore.label)?.focus({preventScroll:true});
}

function buttonGroup(label, key, options) {
  const wrap = document.createElement('div');
  const title = document.createElement('div'); title.className = 'control-label'; title.textContent = label; wrap.append(title);
  const group = document.createElement('div'); group.className = 'option-group';
  for (const [value, text] of options) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
    button.setAttribute('aria-pressed', String(design[key] === value)); button.addEventListener('click', () => commit({ [key]: value })); group.append(button);
  }
  wrap.append(group); return wrap;
}
function shapeControls() {
  const root = document.createDocumentFragment();
  const label = document.createElement('div'); label.className = 'control-label'; label.textContent = 'Choose a starting shape'; root.append(label);
  const grid = document.createElement('div'); grid.className = 'shape-grid';
  const shapes = design.type === 'slime' ? [['jar','Memory jar'],['bubble','Bubble'],['cloud','Cloud'],['heart','Heart'],['star','Star']] : [['peach','Peach'],['bear','Bear'],['cloud','Cloud'],['gamepad','Gamepad'],['milk','Pencil case'],['star','Star'],['heart','Heart']];
  for (const [value, text] of shapes) {
    const button = document.createElement('button'); button.className = 'shape-option'; button.setAttribute('aria-pressed', String(design.shape === value));
    const canvas = document.createElement('canvas'); canvas.width = 150; canvas.height = 120; button.append(canvas, document.createTextNode(text));
    button.addEventListener('click', () => commit({ shape: value })); grid.append(button);
    requestAnimationFrame(() => drawToy(canvas, { ...design, shape: value }, { background: false, mini: true }));
  }
  root.append(grid, buttonGroup('Desk size', 'size', [['small','Pocket'],['medium','Desk'],['large','Statement']])); return root;
}
function colourControls() {
  const root = document.createDocumentFragment();
  for (const [label, key] of [['Main colour','color'],['Accent colour','accent']]) {
    const title = document.createElement('div'); title.className = 'control-label'; title.textContent = label; root.append(title);
    const group = document.createElement('div'); group.className = 'swatches';
    colours.forEach(colour => { const button = document.createElement('button'); button.className = 'swatch'; button.style.background = colour; button.title = colour; button.setAttribute('aria-label', `${label}: ${colour}`); button.setAttribute('aria-pressed', String(design[key] === colour)); button.addEventListener('click', () => commit({ [key]: colour })); group.append(button); });
    const custom = document.createElement('input'); custom.type = 'color'; custom.value = design[key]; custom.title = `Custom ${label.toLowerCase()}`; custom.setAttribute('aria-label', custom.title); custom.addEventListener('change', () => commit({ [key]: custom.value })); group.append(custom); root.append(group);
  }
  root.append(buttonGroup('Pattern', 'pattern', [['plain','Plain'],['split','Half & half'],['stripes','Stripes'],['dots','Pixel dots']])); return root;
}
function feelControls() {
  const root = document.createDocumentFragment();
  root.append(buttonGroup(design.type === 'slime' ? 'Texture' : 'Foam feel', 'texture', design.type === 'slime' ? [['cloud','Cloud'],['clear','Clear'],['crunchy','Crunchy'],['butter','Butter']] : [['slow-rise','Slow rise'],['marshmallow','Marshmallow'],['firm','Firm']]));
  root.append(buttonGroup('Scent', 'scent', [['none','No scent'],['vanilla','Vanilla'],['peach','Peach'],['paper','Old notebook']]));
  root.append(buttonGroup('Sound', 'sound', [['quiet','Office quiet'],['soft-pops','Soft pops'],['crackle','Crackle']]));
  root.append(buttonGroup('Face', 'face', [['blush','Blush'],['sleepy','Sleepy'],['simple','Simple'],['none','No face']]));
  root.append(buttonGroup('Finishing touch', 'garnish', [['none','None'],['stars','Stars'],['hearts','Hearts'],['sprinkles','Sprinkles']])); return root;
}
function storyControls() {
  const root = document.createDocumentFragment();
  const nameLabel = document.createElement('label'); nameLabel.className = 'control-label'; nameLabel.textContent = 'Name your creation';
  const name = document.createElement('input'); name.id = 'design-name'; nameLabel.htmlFor = name.id; name.type = 'text'; name.maxLength = 40; name.value = design.name; name.placeholder = 'e.g. Saturday Save Point'; name.addEventListener('change', () => commit({ name: name.value.trim() || 'Untitled memory' }));
  const memoryLabel = document.createElement('label'); memoryLabel.className = 'control-label'; memoryLabel.textContent = 'The memory behind it (private)';
  const memory = document.createElement('textarea'); memory.id = 'design-memory'; memoryLabel.htmlFor = memory.id; memory.maxLength = 240; memory.value = design.memory; memory.placeholder = 'A colour, place, sound, or tiny moment you remember…'; memory.addEventListener('change', () => commit({ memory: memory.value.trim() }));
  const note = document.createElement('p'); note.className = 'control-help'; note.textContent = 'Memory text stays in this browser and is excluded from shared links.';
  const gift = document.createElement('label'); gift.className = 'check-label'; const check = document.createElement('input'); check.type = 'checkbox'; check.checked = design.sleeve; check.addEventListener('change', () => commit({ sleeve: check.checked })); gift.append(check, 'Add a pixel gift sleeve (+฿40 demo price)');
  root.append(nameLabel, name, memoryLabel, memory, note, gift); return root;
}
function renderControls() {
  const root = $('#controls'); root.replaceChildren();
  root.append({ shape: shapeControls, colour: colourControls, feel: feelControls, story: storyControls }[activeTab]());
}
function renderStudio() {
  if (!$('#design-canvas')) return;
  $$('[data-type]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === design.type)));
  $$('[data-tab]').forEach(button => {const active=button.dataset.tab === activeTab;button.id=`tab-${button.dataset.tab}`;button.setAttribute('aria-selected',String(active));button.setAttribute('aria-controls','controls');button.tabIndex=active?0:-1;});
  $('#controls').setAttribute('aria-labelledby',`tab-${activeTab}`);
  const step=['shape','colour','feel','story'].indexOf(activeTab);
  $('#step-count').textContent=`0${step+1} / 04`;$('#previous-step').disabled=step===0;
  $('#next-step').textContent=step===3?'Save design ↗':`Next: ${['shape','colour','feel','story'][step+1]} →`;
  renderRecipe();
  renderControls(); drawToy($('#design-canvas'), design, { squish: squishAmount });
  $('#preview-name').textContent = design.name; $('#preview-desc').textContent = describe(design);
  $('#design-price').textContent = money(priceFor(design)); $('#stage-label').textContent = design.type === 'slime' ? `${design.texture.toUpperCase()} SLIME` : `${design.texture.toUpperCase()} SQUISHY`;
  $('#undo').disabled = historyIndex === 0; $('#redo').disabled = historyIndex === history.length - 1;
  $('#save-status').textContent = store.designs.some(item => item.id === design.id && Object.keys(defaults).every(key => item[key] === design[key])) ? 'SAVED' : 'DRAFT';
}

$$('[data-type]').forEach(button => button.addEventListener('click', () => {
  const type = button.dataset.type; if (type === design.type) return;
  commit({ type, shape: type === 'slime' ? 'jar' : 'peach', texture: type === 'slime' ? 'cloud' : 'slow-rise' });
}));
function setStep(tab) { activeTab=tab;renderStudio(); }
const steps=['shape','colour','feel','story'];
$$('[data-tab]').forEach(button => {
  button.addEventListener('click',()=>setStep(button.dataset.tab));
  button.addEventListener('keydown',event=>{let index=steps.indexOf(activeTab);if(event.key==='ArrowRight')index=(index+1)%4;else if(event.key==='ArrowLeft')index=(index+3)%4;else if(event.key==='Home')index=0;else if(event.key==='End')index=3;else return;event.preventDefault();setStep(steps[index]);$(`[data-tab="${activeTab}"]`).focus();});
});
$('#previous-step').addEventListener('click',()=>setStep(steps[Math.max(0,steps.indexOf(activeTab)-1)]));
$('#next-step').addEventListener('click',()=>{if(activeTab==='story')$('#save-design').click();else setStep(steps[steps.indexOf(activeTab)+1]);});
function renderRecipe() {
  const rows=[['Product',`${design.size} ${design.type}`],['Feel',design.texture],['Scent',design.scent==='none'?'Unscented':design.scent],['Sound',design.sound],['Base design',money(design.type==='slime'?299:349)]];
  if(design.size!=='small')rows.push(['Size upgrade',`+${money(design.size==='medium'?50:100)}`]);
  if(design.garnish!=='none')rows.push(['Finishing touch',`+${money(20)}`]);
  if(design.sleeve)rows.push(['Gift sleeve',`+${money(40)}`]);
  rows.push(['Demo total',money(priceFor(design))]);
  const root=$('#recipe-summary');root.replaceChildren();rows.forEach(([label,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;root.append(dt,dd);});
}
$('#undo').addEventListener('click', () => { if (historyIndex > 0) { design = clone(history[--historyIndex]); store.draft = clone(design); persist(); renderStudio(); } });
$('#redo').addEventListener('click', () => { if (historyIndex < history.length - 1) { design = clone(history[++historyIndex]); store.draft = clone(design); persist(); renderStudio(); } });
$('#reset-design').addEventListener('click', () => commit({ ...clone(defaults), id: null }));
$('#random-design').addEventListener('click', () => {
  const type = Math.random() > .5 ? 'squishy' : 'slime'; const shapes = type === 'slime' ? ['jar','bubble','cloud','heart','star'] : ['peach','bear','cloud','gamepad','milk','star','heart'];
  commit({ ...defaults, id: null, type, shape: shapes[Math.floor(Math.random()*shapes.length)], texture: type === 'slime' ? ['cloud','clear','crunchy'][Math.floor(Math.random()*3)] : ['slow-rise','marshmallow','firm'][Math.floor(Math.random()*3)], color: colours[Math.floor(Math.random()*colours.length)], accent: colours[Math.floor(Math.random()*colours.length)], pattern: ['plain','split','stripes','dots'][Math.floor(Math.random()*4)], garnish: ['none','stars','hearts','sprinkles'][Math.floor(Math.random()*4)], name: ['Sticker Swap','Saturday Pocket','After-school Glow','Little Save Point'][Math.floor(Math.random()*4)] });
});
function squeeze() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return toast('A little pause for your day.');
  if (squeeze.frame) cancelAnimationFrame(squeeze.frame);
  const start = performance.now();
  const animate = time => { const elapsed = time - start; squishAmount = elapsed < 180 ? elapsed / 180 : Math.max(0, 1 - (elapsed - 180) / (design.type === 'slime' ? 700 : 1200)); drawToy($('#design-canvas'), design, { squish: squishAmount }); if (squishAmount > 0 || elapsed < 180) squeeze.frame = requestAnimationFrame(animate); };
  squeeze.frame = requestAnimationFrame(animate);
}
$('#squeeze').addEventListener('click', squeeze); $('#design-canvas').addEventListener('click', squeeze);

$('#save-design').addEventListener('click', () => {
  const saved = { ...clone(design), id: design.id || uid(), savedAt: now() }; design.id = saved.id;
  const index = store.designs.findIndex(item => item.id === saved.id); if (index >= 0) store.designs[index] = saved; else store.designs.unshift(saved);
  history[historyIndex] = clone(design); store.draft = clone(design); persist(); renderStudio(); toast('Saved to your little notebook.');
});
$('#add-to-bag').addEventListener('click', () => {
  const item = { ...clone(design), id: uid(), qty: 1, unitPrice: priceFor(design) }; store.bag.push(item); persist(); toast('Added to the demo bag.');
});
$('#download-design').addEventListener('click', () => {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 900; drawToy(canvas, design);
  const link = document.createElement('a'); link.download = `${design.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase() || 'replay-lab-design'}.png`; link.href = canvas.toDataURL('image/png'); link.click();
});
$('#share-design').addEventListener('click', async () => {
  const safe = (({ type, shape, size, color, accent, pattern, texture, scent, sound, face, garnish, name, sleeve }) => ({ type, shape, size, color, accent, pattern, texture, scent, sound, face, garnish, name, sleeve }))(design);
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(safe)))); const url = `${location.origin}${location.pathname}?design=${encodeURIComponent(encoded)}#studio`;
  try { if (navigator.share) await navigator.share({ title: design.name, text: 'My REPLAY LAB design', url }); else { await navigator.clipboard.writeText(url); toast('Share link copied. Memory text was excluded.'); } }
  catch (error) { if (error.name !== 'AbortError') showMessage('Your share link', url); }
});

function collectionCard(item) {
  const article = document.createElement('article'); article.className = 'collection-card';
  const image = document.createElement('div'); image.className = 'collection-image'; const canvas = document.createElement('canvas'); canvas.width = 500; canvas.height = 360; image.append(canvas);
  const edition=document.createElement('span');edition.className='collection-edition';edition.textContent=`MEMORY / 0${collections.indexOf(item)+1}`;
  const kind=document.createElement('span');kind.className='collection-type';kind.textContent=item.type;image.append(edition,kind);canvas.setAttribute('role','img');canvas.setAttribute('aria-label',item.title+' pixel concept');
  const body = document.createElement('div'); body.className = 'collection-body';
  const small = document.createElement('span'); small.className = 'eyebrow'; small.textContent = item.subtitle;
  const title = document.createElement('h3'); title.textContent = item.title; const copy = document.createElement('p'); copy.textContent = item.memory;
  const row = document.createElement('div'); row.className = 'button-row';
  const customise = document.createElement('button'); customise.className = 'button small'; customise.textContent = 'Remix this ↗'; customise.addEventListener('click', () => { const { id, title, subtitle, price, ...settings } = item; commit({ ...defaults, ...settings, id: null, name: title }); location.hash = 'studio'; });
  const vote = document.createElement('button'); vote.className = 'text-link'; const voted = () => store.votes.includes(item.id); const label = () => vote.textContent = voted() ? '♥ Saved as favourite' : '♡ I’d like this drop'; label(); vote.addEventListener('click', () => { store.votes = voted() ? store.votes.filter(id => id !== item.id) : [...store.votes, item.id]; persist(); renderCollections(); toast(voted() ? 'Saved as a local favourite.' : 'Favourite removed.'); });
  const meta=document.createElement('div');meta.className='collection-meta';const price=document.createElement('strong');price.textContent=money(priceFor({...defaults,...item}));const note=document.createElement('span');note.textContent='Demo concept price';meta.append(price,note);
  row.append(customise, vote); body.append(small, title, copy, meta, row); article.append(image, body);
  requestAnimationFrame(() => drawToy(canvas, item, {background:false})); return article;
}
let collectionFilter='all';
function renderCollections() {
  const filtered=collections.filter(item=>collectionFilter==='all'||item.type===collectionFilter);
  $('#home-collections').replaceChildren(...collections.map(collectionCard));
  $('#all-collections').replaceChildren(...filtered.map(collectionCard));
  $('#collection-count').textContent=`${filtered.length} concept${filtered.length===1?'':'s'}`;
  $$('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===collectionFilter)));
}
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{collectionFilter=button.dataset.filter;renderCollections();}));
function renderHero(type='squishy') {
  const settings=type==='slime'?{...defaults,type:'slime',shape:'jar',color:'#c4e3f4',accent:'#f9e6a6',texture:'cloud',garnish:'sprinkles',name:'Corner Shop Clouds'}:{...defaults};
  drawToy($('#hero-toy'),settings,{background:false});
  $('#hero-product-name').textContent=settings.name;
  $('#hero-toy').setAttribute('aria-label',`${settings.name}, a pixel ${type} concept`);
  $$('[data-hero]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hero===type)));
}
$$('[data-hero]').forEach(button=>button.addEventListener('click',()=>renderHero(button.dataset.hero)));


function renderBag() {
  const root = $('#bag-items'); root.replaceChildren();
  if (!store.bag.length) { const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'Your demo bag is empty. Make a design first.'; root.append(p); $('#checkout-form').hidden = true; }
  else { $('#checkout-form').hidden = false; store.bag.forEach(item => {
    const row = document.createElement('div'); row.className = 'bag-item'; const canvas = document.createElement('canvas'); canvas.width = 174; canvas.height = 140;
    const info = document.createElement('div'); const h = document.createElement('h3'); h.textContent = item.name; const p = document.createElement('p'); p.textContent = `${describe(item)} · ${money(item.unitPrice)} each`;
    const actions = document.createElement('div'); actions.className = 'bag-item-actions'; const quantity = document.createElement('div'); quantity.className = 'quantity';
    const minus = document.createElement('button'); minus.textContent = '−'; minus.setAttribute('aria-label','Decrease quantity'); const count = document.createElement('span'); count.textContent = item.qty; const plus = document.createElement('button'); plus.textContent = '+'; plus.setAttribute('aria-label','Increase quantity');
    minus.addEventListener('click', () => { item.qty--; if (item.qty <= 0) store.bag = store.bag.filter(x => x.id !== item.id); persist(); renderBag(); }); plus.addEventListener('click', () => { item.qty=Math.min(999,item.qty+1); persist(); renderBag(); });
    const remove = document.createElement('button'); remove.className = 'text-link danger'; remove.textContent = 'Remove'; remove.addEventListener('click', () => { store.bag = store.bag.filter(x => x.id !== item.id); persist(); renderBag(); });
    quantity.append(minus,count,plus); actions.append(quantity,remove); info.append(h,p,actions); row.append(canvas,info); root.append(row); requestAnimationFrame(() => drawToy(canvas,item,{background:false}));
  }); }
  const total = store.bag.reduce((sum,item) => sum + item.qty*item.unitPrice,0); $('#bag-total').innerHTML = store.bag.length ? `<div class="total-row"><span>Demo total</span><span>${money(total)}</span></div><p>Illustrative price only. No payment will be requested.</p>` : '';
}
$('#open-bag').addEventListener('click', () => { renderBag(); $('#bag-dialog').showModal(); });
$('#checkout-form').addEventListener('submit', event => {
  event.preventDefault(); if (!store.bag.length) return;
  store.orders.unshift({ id: uid(), createdAt: now(), status: 'SIMULATED — NOT AN ORDER', items: clone(store.bag), total: store.bag.reduce((sum,item)=>sum+item.qty*item.unitPrice,0) }); store.bag = []; persist(); event.target.reset(); $('#bag-dialog').close(); showMessage('Demo reservation saved', 'No payment was taken and nothing was ordered. You can review or export this simulation from My notebook.', [{ label:'Open notebook', primary:true, onClick: dialog => { dialog.close(); location.hash='notebook'; } }]);
});

let notebookTab = 'designs';
function emptyState(icon, title, copy, action) {
  const root = document.createElement('div'); root.className = 'empty-state'; const i = document.createElement('div'); i.className='pixel-empty'; i.textContent=icon; const h=document.createElement('h2'); h.textContent=title; const p=document.createElement('p');p.textContent=copy; const a=document.createElement('a');a.className='button primary';a.href='#studio';a.textContent=action;root.append(i,h,p,a);return root;
}
function renderNotebook() {
  $$('.notebook-tabs button').forEach(button => button.classList.toggle('active', button.dataset.notebook === notebookTab)); const root=$('#notebook-content');root.replaceChildren();
  if (notebookTab==='designs') {
    if (!store.designs.length) return root.append(emptyState('□','No saved memories yet.','Make a design and it will wait here on this device.','Open the studio →'));
    const grid=document.createElement('div');grid.className='saved-grid';store.designs.forEach(item=>{const card=document.createElement('article');card.className='saved-card';const canvas=document.createElement('canvas');canvas.width=500;canvas.height=350;const body=document.createElement('div');body.className='saved-card-content';const h=document.createElement('h3');h.textContent=item.name;const p=document.createElement('p');p.textContent=item.memory||describe(item);const row=document.createElement('div');row.className='button-row';const edit=document.createElement('button');edit.className='button small';edit.textContent='Edit';edit.addEventListener('click',()=>{design=clone(item);history=[clone(design)];historyIndex=0;store.draft=clone(design);persist();location.hash='studio';});const del=document.createElement('button');del.className='text-link danger';del.textContent='Delete';del.addEventListener('click',()=>{store.designs=store.designs.filter(x=>x.id!==item.id);persist();renderNotebook();});row.append(edit,del);body.append(h,p,row);card.append(canvas,body);grid.append(card);requestAnimationFrame(()=>drawToy(canvas,item));});root.append(grid);
  } else {
    if (!store.orders.length) return root.append(emptyState('◇','No demo reservations.','The checkout simulation never takes payment or sends an order.','Try the designer →'));
    store.orders.forEach(order=>{const card=document.createElement('article');card.className='order-card';const badge=document.createElement('span');badge.className='badge';badge.textContent=order.status;const h=document.createElement('h3');h.textContent=`Demo reservation · ${new Date(order.createdAt).toLocaleString('en-GB')}`;const list=document.createElement('ul');order.items.forEach(item=>{const li=document.createElement('li');li.textContent=`${item.qty} × ${item.name} — ${money(item.qty*item.unitPrice)}`;list.append(li);});const p=document.createElement('p');p.innerHTML=`Illustrative total: <strong>${money(order.total)}</strong>`;card.append(badge,h,list,p);root.append(card);});
  }
}
$$('.notebook-tabs button').forEach(button=>button.addEventListener('click',()=>{notebookTab=button.dataset.notebook;renderNotebook();}));
function downloadBlob(name, content, type='application/json') { const link=document.createElement('a');link.download=name;link.href=URL.createObjectURL(new Blob([content],{type}));link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000); }
$('#export-notebook').addEventListener('click',()=>downloadBlob('replay-lab-notebook.json',JSON.stringify({exportedAt:now(),version:1,designs:store.designs,bag:store.bag,orders:store.orders,votes:store.votes,draft:store.draft},null,2)));
$('#import-notebook').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 10000000) throw new Error('Notebook too large');
    const imported = cleanNotebook(JSON.parse(await file.text()));
    for (const key of ['designs','bag','orders']) {
      const existing = new Set(store[key].map(item => item.id)); store[key].push(...imported[key].filter(item => !existing.has(item.id)));
    }
    store.votes = [...new Set([...store.votes,...imported.votes])];
    if (imported.draft) { store.draft = imported.draft; design = clone(imported.draft); history = [clone(design)]; historyIndex = 0; }
    persist(); renderNotebook(); renderCollections(); toast('Notebook imported. Existing saved items were kept.');
  } catch { showMessage('Could not import','Choose a valid REPLAY LAB notebook JSON file. Existing data was kept.'); }
  event.target.value = '';
});
$('#clear-data').addEventListener('click',()=>showMessage('Clear local data?','This removes saved designs, demo reservations, favourites, draft settings and imported research responses from this browser.',[{label:'Keep it',onClick:d=>d.close()},{label:'Clear data',primary:true,onClick:d=>{store=clone(defaultData);design=clone(defaults);history=[clone(design)];historyIndex=0;surveyAnswers={};surveySection=0;surveyStarted=null;persist();d.close();renderNotebook();renderCollections();toast('Local demo data cleared.');}}]));

let survey = null, surveySection = 0, surveyAnswers = {}, surveyStarted = null;
const shownFor = (question, answers) => !question.showIf || question.showIf.values.includes(answers[question.showIf.id]);
function isShown(question) { return shownFor(question, surveyAnswers); }
function clearHidden() { survey.sections.flatMap(section => section.questions).filter(q => !isShown(q)).forEach(q => delete surveyAnswers[q.id]); }
function answerError(q, value) {
  const empty = value === undefined || value === '' || (Array.isArray(value) && !value.length);
  if (empty) return q.required ? 'Please answer this required question.' : '';
  if (q.type === 'radio') return q.options.some(o => o.value === value) ? '' : 'Choose one of the listed options.';
  if (q.type === 'checkbox') {
    if (!Array.isArray(value) || value.some(v => !q.options.some(o => o.value === v)) || new Set(value).size !== value.length) return 'Choose the listed options.';
    if (q.maxSelections && value.length > q.maxSelections) return `Choose up to ${q.maxSelections} options.`;
    if (value.length > 1 && value.some(v => q.exclusiveValues?.includes(v))) return 'This option must be selected on its own.';
  }
  if (q.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || value < q.min || value > q.max || (q.step === 1 && !Number.isInteger(value)))) return `Enter a whole number from ${q.min} to ${q.max}.`;
  if (['text','textarea'].includes(q.type) && (typeof value !== 'string' || value.length > (q.maxLength || 500))) return 'Please shorten this answer.';
  return '';
}
function endSurvey(question) {
  surveyAnswers = {}; surveyStarted = null; surveySection = 0;
  $('#survey-progress').textContent = 'ENDED';
  const p = document.createElement('p'); p.textContent = `${question.stopMessage} No response was saved or downloaded.`;
  const button = document.createElement('button'); button.className = 'button'; button.textContent = 'Start again';
  button.addEventListener('click', () => { surveyStarted = now(); renderSurvey(); });
  $('#survey-root').replaceChildren(p, button);
}
function renderQuestion(question) {
  const field = document.createElement('fieldset'); field.className = 'question'; field.dataset.question = question.id;
  const legend = document.createElement('legend'); legend.id = `label-${question.id}`; legend.textContent = question.label + (question.required ? ' *' : ''); field.append(legend);
  if (question.description || question.help) { const help = document.createElement('p'); help.id = `help-${question.id}`; help.textContent = question.description || question.help; field.append(help); }
  const update = (value, input) => {
    surveyAnswers[question.id] = value; clearHidden();
    if (question.stopIfValues?.includes(value)) { endSurvey(question); return; }
    if (survey.sections.some(section => section.questions.some(q => q.showIf?.id === question.id))) {
      const inputValue = input?.value; renderSurvey();
      $$(`[name="${question.id}"]`).find(el => el.value === inputValue)?.focus({ preventScroll: true });
    }
  };
  if (['radio','checkbox'].includes(question.type)) {
    const options = document.createElement('div'); options.className = 'survey-options';
    question.options.forEach(option => {
      const label = document.createElement('label'), input = document.createElement('input');
      input.type = question.type; input.name = question.id; input.value = option.value;
      input.checked = question.type === 'radio' ? surveyAnswers[question.id] === option.value : (surveyAnswers[question.id] || []).includes(option.value);
      input.addEventListener('change', () => {
        if (question.type === 'radio') return update(option.value, input);
        let values = $$('input', field).filter(x => x.checked).map(x => x.value);
        if (question.exclusiveValues?.includes(option.value) && input.checked) values = [option.value];
        else if (input.checked) values = values.filter(v => !question.exclusiveValues?.includes(v));
        if (question.maxSelections && values.length > question.maxSelections) { input.checked = false; toast(`Choose up to ${question.maxSelections} options.`); return; }
        $$('input', field).forEach(x => { x.checked = values.includes(x.value); }); update(values, input);
      });
      label.append(input, option.label); options.append(label);
    }); field.append(options);
  } else {
    const input = document.createElement(question.type === 'textarea' ? 'textarea' : 'input');
    if (question.type !== 'textarea') input.type = question.type === 'number' ? 'number' : 'text';
    input.name = question.id; input.setAttribute('aria-labelledby', legend.id);
    if (question.description || question.help) input.setAttribute('aria-describedby', `help-${question.id}`);
    input.placeholder = question.placeholder || ''; input.value = surveyAnswers[question.id] ?? '';
    if (question.type === 'number') { input.min = question.min; input.max = question.max; input.step = question.step || 1; }
    else input.maxLength = question.maxLength || 500;
    input.addEventListener('input', () => update(question.type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value.trim(), input)); field.append(input);
  }
  return field;
}
function validateSection(section) {
  $$('.form-error', $('#survey-root')).forEach(el => el.remove());
  const invalid = section.questions.filter(q => isShown(q) && answerError(q, surveyAnswers[q.id]));
  invalid.forEach(q => { const error = document.createElement('p'); error.className = 'form-error'; error.setAttribute('role','alert'); error.textContent = answerError(q, surveyAnswers[q.id]); $(`[data-question="${q.id}"]`)?.append(error); });
  const first = invalid.length ? $(`[data-question="${invalid[0].id}"]`) : null;
  first?.querySelector('input,textarea')?.focus();
  return invalid.length === 0;
}
function renderSurvey() {
  if (!survey) return;
  const root = $('#survey-root'); root.replaceChildren(); const section = survey.sections[surveySection];
  $('#survey-progress').textContent = `${surveySection+1} / ${survey.sections.length}`;
  const h = document.createElement('h2'); h.textContent = section.title;
  const intro = document.createElement('p'); intro.className = 'survey-intro'; intro.textContent = section.description;
  root.append(h,intro); section.questions.filter(isShown).forEach(q => root.append(renderQuestion(q)));
  const actions = document.createElement('div'); actions.className = 'survey-actions';
  const back = document.createElement('button'); back.className = 'button'; back.textContent = '← Back'; back.disabled = surveySection === 0;
  back.addEventListener('click', () => { surveySection--; renderSurvey(); });
  const next = document.createElement('button'); next.className = 'button primary'; next.textContent = surveySection === survey.sections.length-1 ? 'Finish & download' : 'Continue →';
  next.addEventListener('click', () => { if (!validateSection(section)) return; if (surveySection < survey.sections.length-1) { surveySection++; renderSurvey(); $('#survey-root').scrollIntoView({block:'start'}); } else finishSurvey(); });
  actions.append(back,next); root.append(actions);
}
function finishSurvey() {
  clearHidden();
  if (!validResearchAnswers(surveyAnswers)) return toast('Please go back and complete the required answers.');
  const response = {schemaVersion:'1.0',surveyId:survey.id,responseId:uid(),startedAt:surveyStarted||now(),completedAt:now(),answers:clone(surveyAnswers),notice:'Downloaded voluntarily from a browser-local class research demo.'};
  downloadBlob(`replay-lab-response-${response.responseId.slice(0,8)}.json`,JSON.stringify(response,null,2));
  showMessage('Response ready','Your response download was started. It was not sent anywhere. Share the JSON file with the class researcher only if you choose to.',[{label:'Start a new response',primary:true,onClick:d=>{d.close();surveyAnswers={};surveySection=0;surveyStarted=now();renderSurvey();}}]);
}
async function getSurvey() {
  if (!survey) { const response = await fetch('data/survey.json'); if (!response.ok) throw new Error('Questionnaire unavailable'); survey = await response.json(); }
  return survey;
}
async function initSurvey() {
  try { await getSurvey(); surveyStarted ||= now(); renderSurvey(); }
  catch { $('#survey-root').innerHTML = '<p class="form-error">The questionnaire could not load. Please use the downloadable PDF instead.</p>'; }
}
function validResearchAnswers(answers) {
  return answers && typeof answers === 'object' && !Array.isArray(answers) && survey.sections.every(section => section.questions.every(q => !shownFor(q,answers) || (!answerError(q,answers[q.id]) && !q.stopIfValues?.includes(answers[q.id]))));
}
function cleanResponse(response) {
  if (!response || response.schemaVersion !== '1.0' || response.surveyId !== survey.id || typeof response.responseId !== 'string' || !response.responseId || response.responseId.length > 100 || !Number.isFinite(Date.parse(response.completedAt)) || !validResearchAnswers(response.answers)) throw new Error('Invalid response');
  const answers = {};
  survey.sections.flatMap(s => s.questions).filter(q => shownFor(q,response.answers) && response.answers[q.id] !== undefined).forEach(q => { answers[q.id] = response.answers[q.id]; });
  return {schemaVersion:'1.0',surveyId:survey.id,responseId:response.responseId,completedAt:response.completedAt,answers};
}
$('#import-responses').addEventListener('change',async event => {
  let accepted = 0, rejected = 0;
  try { await getSurvey(); for (const file of event.target.files) {
    try { if (file.size > 100000) throw new Error(); const response = cleanResponse(JSON.parse(await file.text())); store.responses = store.responses.filter(x => x.responseId !== response.responseId); store.responses.push(response); accepted++; } catch { rejected++; }
  } persist(); renderResponseSummary(); toast(`${accepted} imported locally; ${rejected} invalid or ineligible files skipped.`); }
  catch { showMessage('Could not import','The questionnaire must be available to validate responses. Please try again.'); }
  event.target.value = '';
});
function renderResponseSummary() {
  const root = $('#response-summary');
  if (!store.responses.length) { root.textContent = 'No response files imported.'; return; }
  const recent = store.responses.filter(r => ['past_3_months','4_to_12_months'].includes(r.answers.purchase_recency)).length;
  root.textContent = `${store.responses.length} response files imported · ${recent} bought within 12 months. Review the exported CSV before analysis.`;
}
$('#export-responses').addEventListener('click', () => {
  if (!store.responses.length) return toast('Import response files first.');
  const keys = [...new Set(store.responses.flatMap(r => Object.keys(r.answers)))];
  const esc = value => { let text = String(Array.isArray(value) ? value.join('|') : value ?? ''); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"','""') + '"'; };
  const csv = [['response_id','completed_at',...keys].map(esc).join(','), ...store.responses.map(r => [r.responseId,r.completedAt,...keys.map(k => r.answers[k])].map(esc).join(','))].join('\n');
  downloadBlob('replay-lab-responses.csv',csv,'text/csv;charset=utf-8');
});
$('#clear-responses').addEventListener('click', () => { store.responses = []; persist(); renderResponseSummary(); toast('Imported response files cleared.'); });

$('#about-demo').addEventListener('click',()=>showMessage('About this concept demo','REPLAY LAB is a student business proposal, not an operating store. Product images are original pixel illustrations. Prices, progress, reservations and production thresholds are illustrative; no payments or orders are accepted.'));

function loadSharedDesign(){const raw=new URLSearchParams(location.search).get('design');if(!raw)return;try{if(raw.length>5000)throw new Error();const parsed=JSON.parse(decodeURIComponent(escape(atob(raw))));design=cleanDesign(parsed,true);store.draft=clone(design);persist();history=[clone(design)];historyIndex=0;}catch{toast('That shared design link could not be read.');}}
renderHero(); loadSharedDesign(); drawRoom($('#room-canvas')); renderCollections(); renderResponseSummary(); updateBagCount(); route();
