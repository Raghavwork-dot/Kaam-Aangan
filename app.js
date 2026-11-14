const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const AV = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23E2D8BF'/%3E%3Ccircle cx='30' cy='23' r='11' fill='%23fffdf8'/%3E%3Crect x='11' y='38' width='38' height='22' rx='11' fill='%23fffdf8'/%3E%3C/svg%3E";
const P = {Sculptor:'<path d="M14 4l6 6-9 9-5 1 1-5z"/><path d="M12 6l6 6"/>',Tailor:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.6L20 18M8.6 16.4L20 6"/>',Carpenter:'<path d="M14 5l5 5-3 3-5-5z"/><path d="M13 11L4 20"/>',Artisan:'<path d="M9 3h6M10 3v3c-4 2-5 5-5 8a7 7 0 0014 0c0-3-1-6-5-8V3"/>','Beauty and Care':'<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>'};
const GEN = '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>';
const icon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n] || GEN}</svg>`;
let me = null, cats = [];
const tops = () => cats.filter(c => !c.parent_id);
const subs = id => cats.filter(c => c.parent_id === id);
const opts = (list, sel, ph) => `<option value="">${ph}</option>` + list.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3500); };
const stars = (r, n) => `<span class="star">★ ${Number(r || 0).toFixed(1)}</span><span class="muted">${n || 0} review${n == 1 ? '' : 's'}</span>`;
const norm = s => String(s || '').trim().toLowerCase();
const go = h => { location.hash = h; };
const when = d => new Date(d).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'});

async function setUser(session) {
  if (!session) { me = null; return; }
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  me = { ...session.user, ...(data || {}) };
}
async function init() {
  $('.foot').innerHTML = footerHtml();
  $('#menuBtn').onclick = () => { const n = $('#nav'); const o = n.classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded', o); };
  const { data: { session } } = await sb.auth.getSession();
  await setUser(session);
  sb.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(async () => { await setUser(s); route(); }, 0); });
  cats = (await sb.from('categories').select('*').order('name')).data || [];
  route();
}
function renderNav() {
  const a = (h, t) => `<a href="#/${h}">${t}</a>`;
  $('#nav').innerHTML = a('', 'Home') + a('explore', 'Explore Services') + a('how', 'How It Works') + a('about', 'About Us') +
    (me ? a(me.role === 'admin' ? 'admin' : 'dash', 'My Dashboard') + `<a href="#/" id="out">Log out</a>` : a('login', 'Login') + `<a class="btn sm" href="#/signup">Sign Up</a>`);
  $('#nav').classList.remove('open');
  const o = $('#out'); if (o) o.onclick = async e => { e.preventDefault(); await sb.auth.signOut(); go('#/'); };
}
const routes = {};
async function route() {
  const [path, qs] = location.hash.slice(2).split('?'); const [name, arg] = path.split('/');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  renderNav(); app.innerHTML = '<p class="muted pad">Loading…</p>'; window.scrollTo(0, 0);
  try { await (routes[name] || routes['']) (arg, q); }
  catch (e) { app.innerHTML = `<div class="wrap"><p class="err">Something went wrong: ${esc(e.message)}. Check config.js and that the database setup was run.</p></div>`; }
}
window.addEventListener('hashchange', route);

/* ---------- Home and static pages ---------- */
function searchBox(v = {}) {
  return `<form class="search" id="sf"><div><label for="sc">Service</label><select id="sc" required>${opts(tops(), v.cat, 'Select a service')}</select></div>
  <div><label for="ss">Type (optional)</label><select id="ss">${opts(subs(v.cat), v.sub, 'Any')}</select></div>
  <div><label for="sci">City</label><input id="sci" required placeholder="e.g. Delhi" value="${esc(v.city || '')}"></div>
  <div><label for="sl">Area or locality</label><input id="sl" required placeholder="e.g. Rohini" value="${esc(v.loc || '')}"></div>
  <button class="btn">Search</button></form>`;
}
function wireSearch() {
  $('#sc').onchange = e => { $('#ss').innerHTML = opts(subs(e.target.value), '', 'Any'); };
  $('#sf').onsubmit = e => { e.preventDefault(); const p = new URLSearchParams({ cat: $('#sc').value, sub: $('#ss').value, city: $('#sci').value, loc: $('#sl').value }); go('#/results?' + p); };
}
const catTiles = () => `<div class="cats">${tops().map((c, i) => `<a class="cat c${i % 5}" href="#/${me ? 'dash' : 'signup-customer'}"><span class="ic">${icon(c.name)}</span>${esc(c.name)}</a>`).join('')}</div>`;
const steps = () => `<div class="two"><div class="box"><h3>For customers</h3><ol><li>Sign up or log in.</li><li>Select a service.</li><li>Choose your location.</li><li>Explore available service providers.</li><li>Pay ₹29 to get contact details or request a connection.</li></ol></div>
<div class="box"><h3>For service providers</h3><ol><li>Register as a service provider.</li><li>Select your profession.</li><li>Create your profile.</li><li>Upload photographs of your work.</li><li>Select your service locations.</li><li>Start receiving customer enquiries.</li></ol></div></div>`;
const tIdx = id => Math.max(0, tops().findIndex(c => c.id === id)) % 5;
const listCard = (p, img) => `<article class="lc"><div class="lc-img t${tIdx(p.category_id)}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : icon(p.category_name)}<span class="chip">${esc(p.category_name || 'Service')}</span></div>
<div class="lc-body"><div class="lc-top"><h3>${esc(p.full_name)}</h3><span class="star">★ ${Number(p.avg_rating || 0).toFixed(1)} <span class="muted">(${p.review_count || 0})</span></span></div>
<p class="muted lc-loc">${esc([p.locality, p.city].filter(Boolean).join(', '))}</p>
<p class="lc-desc">${esc((p.description || '').slice(0, 120))}${(p.description || '').length > 120 ? '…' : ''}</p>
<div class="lc-foot"><b>${p.starting_price ? 'From ₹' + esc(p.starting_price) : 'Price on request'}</b><a class="btn sm" href="#/p/${p.id}">View Profile</a></div></div></article>`;
async function loadListings(catId) {
  const box = $('#lg'); if (!box) return;
  let q = sb.from('provider_cards').select('*').eq('status', 'approved').eq('available', true).order('avg_rating', { ascending: false }).limit(9);
  if (catId) q = q.eq('category_id', catId);
  const list = (await q).data || [];
  const ph = list.length ? (await sb.from('work_photos').select('provider_id,url').in('provider_id', list.map(p => p.id))).data || [] : [];
  box.innerHTML = list.length ? `<div class="grid">${list.map(p => listCard(p, (ph.find(x => x.provider_id === p.id) || {}).url || p.photo_url)).join('')}</div>`
    : `<div class="box empty"><h3>Profiles will appear here</h3><p class="muted">Approved service providers are listed on this page. Are you a skilled worker?</p><a class="btn" href="#/signup-provider">Join as a provider</a></div>`;
}
function footerHtml() {
  return `<div class="fgrid"><div><span class="flogo">KAAM AANGAN</span><p>Har kaam, har hunar, ek jagah.</p></div>
  <div><h4>Explore</h4><a href="#/explore">Explore Services</a><a href="#/how">How It Works</a><a href="#/about">About Us</a><a href="#/contact">Contact Us</a><a href="#/terms">Terms and Privacy</a></div>
  <div><h4>For customers</h4><ol><li>Sign up or log in.</li><li>Select a service.</li><li>Choose your location.</li><li>Explore available service providers.</li><li>Pay ₹29 to access contact details or request a connection.</li></ol></div>
  <div><h4>For service providers</h4><ol><li>Register as a service provider.</li><li>Select your profession.</li><li>Create your profile.</li><li>Upload photographs of your work.</li><li>Select your service locations.</li><li>Start receiving customer enquiries.</li></ol></div></div>
  <p class="copy">© ${new Date().getFullYear()} KAAM AANGAN. All rights reserved.</p>`;
}
routes[''] = async () => {
  app.innerHTML = `<section class="hero"><div class="in"><h1>Find the right people for every skill and service.</h1><p>Discover talented local professionals and service providers near you, all in one place.</p></div></section>
  ${searchBox()}<div class="wrap"><h2>Choose a service</h2>${catTiles()}</div>
  <section class="band"><div class="wrap"><div class="sec-head"><div><p class="eyebrow">Meet your neighbourhood talent</p><h2>People who make it happen.</h2><p class="muted" style="margin:0">Browse profiles, compare ratings and connect directly.</p></div><a class="btn ghost" href="#/signup-provider">I'm a worker – join free</a></div>
  <div class="pills"><button class="pill on" data-cat="">All</button>${tops().map(c => `<button class="pill" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}</div><div id="lg"><p class="muted">Loading…</p></div></div></section>
  <section class="steps"><div class="wrap"><p class="eyebrow">Simple for everyone</p><h2>A few steps. A meaningful connection.</h2><p class="muted">KAAM AANGAN makes it easier for people to find each other and get work done.</p>
  <div class="three"><div class="step"><span class="n">01</span><h3>Search or explore</h3><p>Choose a service and add your area to discover relevant local profiles.</p></div>
  <div class="step"><span class="n">02</span><h3>Compare with confidence</h3><p>Check photos, starting prices, ratings and reviews before you reach out.</p></div>
  <div class="step"><span class="n">03</span><h3>Connect directly</h3><p>Pay ₹29 to get contact details, or ask us to connect you, and discuss the work, timeline and price.</p></div></div></div></section>
  <section class="biz"><div class="wrap biz-in"><div><p class="eyebrow">For shops, owners and businesses</p><h2>Need people or products for your business?</h2>
  <p>Find skilled workers to hire, local makers for bulk orders, and suppliers who can help your business grow. Post an opportunity and reach people beyond your usual network.</p>
  <div class="row"><a class="btn alt" href="mailto:${esc(CFG.CONTACT_EMAIL)}?subject=Register%20my%20business">Register your business</a><a class="btn ghost" href="mailto:${esc(CFG.CONTACT_EMAIL)}?subject=Post%20an%20opportunity">Post an opportunity</a></div></div>
  <div class="biz-tiles"><div><h3>Hire</h3><p>Find workers for regular or project-based work</p></div><div><h3>Source</h3><p>Discover makers and local suppliers</p></div><div><h3>Grow</h3><p>Reach more customers and business partners</p></div></div></div></section>`;
  wireSearch();
  document.querySelectorAll('.pill').forEach(b => b.onclick = () => { document.querySelectorAll('.pill').forEach(x => x.classList.remove('on')); b.classList.add('on'); loadListings(b.dataset.cat); });
  loadListings('');
};
routes.explore = async () => { app.innerHTML = `<div class="wrap"><h2>Explore Services</h2>${catTiles()}<h3 style="margin-top:2rem">Search near you</h3></div>${searchBox()}<div style="height:2rem"></div>`; wireSearch(); };
routes.how = async () => { app.innerHTML = `<div class="wrap"><h2>How it works</h2>${steps()}<p class="muted">Browsing profiles, photos, ratings and reviews is free. Contact details cost ₹29 per provider.</p></div>`; };
routes.about = async () => { app.innerHTML = `<div class="wrap"><h2>About Us</h2><p>KAAM AANGAN connects customers with local skilled workers, artisans and service providers, especially people in the unorganised and informal sector who have great skills but few ways to be found.</p><p>Providers get more customers and a place to show their work. Customers get trusted local professionals, with photos, ratings and reviews to compare.</p></div>`; };
routes.contact = async () => { app.innerHTML = `<div class="wrap"><h2>Contact Us</h2><p>Write to us at <a href="mailto:${esc(CFG.CONTACT_EMAIL)}">${esc(CFG.CONTACT_EMAIL)}</a>.</p></div>`; };
routes.terms = async () => { app.innerHTML = `<div class="wrap"><h2>Terms and Privacy</h2><p><b>Payments.</b> Customers pay ₹29 once per provider to unlock that provider's contact details, or ₹29 to send a connection request through KAAM AANGAN. Failed payments unlock nothing.</p><p><b>Privacy.</b> Provider phone numbers and addresses are never shown publicly. We store account details, uploaded photos, reviews and payment records to run the service.</p><p><b>Reviews.</b> Only customers who paid for contact access or a connection can review. Fake or abusive reviews are removed by the administrator.</p><p class="muted">Have this text checked by a lawyer before launch.</p></div>`; };

/* ---------- Login and signup ---------- */
routes.login = async () => {
  app.innerHTML = `<div class="wrap"><h2>Login</h2><form class="form" id="lf"><div><label for="e">Email</label><input id="e" type="email" required autocomplete="email"></div><div><label for="p">Password</label><input id="p" type="password" required autocomplete="current-password"></div><p class="err" id="m"></p><button class="btn">Log in</button><p>New here? <a href="#/signup">Create an account</a></p></form></div>`;
  $('#lf').onsubmit = async e => { e.preventDefault(); const { error } = await sb.auth.signInWithPassword({ email: $('#e').value, password: $('#p').value }); if (error) $('#m').textContent = error.message; else go('#/dash'); };
};
routes.signup = async () => { app.innerHTML = `<div class="wrap"><h2>Sign up</h2><div class="two"><div class="box"><h3>Continue as a Customer</h3><p>Find and contact local professionals.</p><a class="btn" href="#/signup-customer">Customer sign up</a></div><div class="box"><h3>Continue as a Service Provider</h3><p>Show your work and get customers.</p><a class="btn alt" href="#/signup-provider">Provider sign up</a></div></div></div>`; };
async function doSignup(role, meta, email, password, msg) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { role, ...meta } } });
  if (error) return (msg.textContent = error.message);
  if (data.session) go('#/dash'); else { msg.className = 'ok'; msg.textContent = 'Account created. Check your email to confirm, then log in.'; }
}
routes['signup-customer'] = async () => {
  app.innerHTML = `<div class="wrap"><h2>Customer sign up</h2><form class="form" id="sf2"><div><label for="n">Full name</label><input id="n" required></div><div><label for="e">Email address</label><input id="e" type="email" required></div><div><label for="mo">Mobile number</label><input id="mo" type="tel" required pattern="[0-9+ ]{10,14}"></div><div><label for="p">Password (min 6 characters)</label><input id="p" type="password" minlength="6" required></div><p class="err" id="m"></p><button class="btn">Create account</button></form></div>`;
  $('#sf2').onsubmit = e => { e.preventDefault(); doSignup('customer', { full_name: $('#n').value.trim(), mobile: $('#mo').value.trim() }, $('#e').value, $('#p').value, $('#m')); };
};
routes['signup-provider'] = async () => {
  app.innerHTML = `<div class="wrap"><h2>Service provider sign up</h2><form class="form" id="sf2"><div><label for="n">Full name</label><input id="n" required></div><div><label for="mo">Mobile number</label><input id="mo" type="tel" required pattern="[0-9+ ]{10,14}"></div><div><label for="e">Email address</label><input id="e" type="email" required></div><div><label for="p">Password (min 6 characters)</label><input id="p" type="password" minlength="6" required></div>
  <div><label for="c">Profession</label><select id="c" required>${opts(tops(), '', 'Select')}</select></div><div><label for="s">Type of work</label><select id="s">${opts([], '', 'Select profession first')}</select></div>
  <div><label for="d">Short description of your work</label><textarea id="d" required></textarea></div><div><label for="x">Experience (optional)</label><input id="x" placeholder="e.g. 8 years"></div>
  <div><label for="ci">City</label><input id="ci" required></div><div><label for="lo">Your locality</label><input id="lo" required></div><div><label for="ar">Areas where you work (separate with commas)</label><input id="ar" placeholder="Rohini, Pitampura, Shalimar Bagh" required></div>
  <p class="muted">After signing up you can add your photo and pictures of your work. Your profile goes live once approved.</p><p class="err" id="m"></p><button class="btn">Create provider account</button></form></div>`;
  $('#c').onchange = e => { $('#s').innerHTML = opts(subs(e.target.value), '', 'Select'); };
  $('#sf2').onsubmit = e => { e.preventDefault(); const areas = [...new Set([$('#lo').value, ...$('#ar').value.split(',')].map(norm).filter(Boolean))].join(',');
    doSignup('provider', { full_name: $('#n').value.trim(), mobile: $('#mo').value.trim(), category_id: $('#c').value, subcategory_id: $('#s').value, description: $('#d').value, experience: $('#x').value, city: $('#ci').value.trim(), locality: $('#lo').value.trim(), areas }, $('#e').value, $('#p').value, $('#m')); };
};

/* ---------- Search results and provider profile ---------- */
const card = (p, ph = []) => `<article class="card"><div class="ch"><img class="av" src="${esc(p.photo_url || AV)}" alt=""><div><h3>${esc(p.full_name)}</h3><span class="muted">${esc(p.subcategory_name || p.category_name || '')}</span></div></div>
<p style="margin:0">${esc((p.description || '').slice(0, 110))}${(p.description || '').length > 110 ? '…' : ''}</p>
${ph.length ? `<div class="thumbs">${ph.slice(0, 3).map(u => `<img src="${esc(u)}" alt="Work sample" loading="lazy">`).join('')}</div>` : ''}
<p class="meta">${stars(p.avg_rating, p.review_count)}${p.experience ? `<span>Experience: ${esc(p.experience)}</span>` : ''}${p.starting_price ? `<span>From ₹${esc(p.starting_price)}</span>` : ''}</p>
<p class="muted meta"><span>Serves: ${esc((p.areas || []).slice(0, 4).join(', '))}</span></p><a class="btn" href="#/p/${p.id}">View Profile</a></article>`;
routes.results = async (_, q) => {
  let req = sb.from('provider_cards').select('*').eq('status', 'approved').eq('available', true).ilike('city', q.city || '').contains('areas', [norm(q.loc)]);
  if (q.sub) req = req.eq('subcategory_id', q.sub); else if (q.cat) req = req.eq('category_id', q.cat);
  const list = (await req.order('avg_rating', { ascending: false })).data || [];
  const ph = list.length ? (await sb.from('work_photos').select('provider_id,url').in('provider_id', list.map(p => p.id))).data || [] : [];
  app.innerHTML = `${searchBox(q)}<div class="wrap"><h2>${list.length} provider${list.length == 1 ? '' : 's'} found</h2>${list.length ? `<div class="grid">${list.map(p => card(p, ph.filter(x => x.provider_id === p.id).map(x => x.url))).join('')}</div>` : '<p>No providers serve this area yet. Try a nearby locality or another service.</p>'}</div>`;
  wireSearch();
};
routes.p = async id => {
  const p = (await sb.from('provider_cards').select('*').eq('id', id).maybeSingle()).data;
  if (!p) return (app.innerHTML = '<div class="wrap"><p>This profile is not available.</p></div>');
  const [ph, rv] = await Promise.all([sb.from('work_photos').select('*').eq('provider_id', id), sb.from('reviews').select('*').eq('provider_id', id).order('created_at', { ascending: false })]);
  const contact = (await sb.from('provider_contacts').select('*').eq('provider_id', id).maybeSingle()).data;
  const isCust = me && me.role === 'customer';
  let canReview = false;
  if (isCust) {
    const u = await sb.from('unlocks').select('provider_id').eq('provider_id', id).eq('customer_id', me.id);
    const en = await sb.from('enquiries').select('id').eq('provider_id', id).eq('customer_id', me.id);
    const done = (rv.data || []).some(r => r.customer_id === me.id);
    canReview = ((u.data || []).length + (en.data || []).length) > 0 && !done;
  }
  const own = me && me.id === id;
  const action = contact && (contact.phone || own) ? `<div class="box"><h3>Contact details</h3><p><b>Phone:</b> <a href="tel:${esc(contact.phone)}">${esc(contact.phone)}</a></p>${contact.address ? `<p><b>Address:</b> ${esc(contact.address)}</p>` : ''}</div>`
    : !me ? `<div class="lock"><p>Log in as a customer to get contact details.</p><a class="btn" href="#/login">Log in</a> <a class="btn ghost" href="#/signup-customer">Sign up</a></div>`
    : !isCust ? '' : `<div class="lock"><h3>Contact ${esc(p.full_name)}</h3><p>Pay ₹29 once to see the phone number and address, or let us connect you.</p><div class="row"><button class="btn" data-pay="contact">Get Contact Details – ₹29</button><button class="btn alt" data-pay="connect">Connect Through KAAM AANGAN – ₹29</button></div></div>`;
  app.innerHTML = `<div class="wrap"><div class="ch" style="margin-bottom:1rem"><img class="av" style="width:96px;height:96px" src="${esc(p.photo_url || AV)}" alt=""><div><h2 style="margin:0">${esc(p.full_name)}</h2><span class="tag">${esc(p.category_name || '')}${p.subcategory_name ? ' – ' + esc(p.subcategory_name) : ''}</span></div></div>
  <p class="meta">${stars(p.avg_rating, p.review_count)}${p.experience ? `<span>Experience: ${esc(p.experience)}</span>` : ''}${p.starting_price ? `<span>Starting price: ₹${esc(p.starting_price)}</span>` : ''}</p>
  <p>${esc(p.description)}</p><p><b>Works in:</b> ${esc(p.city)}: ${esc((p.areas || []).join(', '))}</p>
  ${(ph.data || []).length ? `<h3>Work samples</h3><div class="photos">${ph.data.map(x => `<img src="${esc(x.url)}" alt="Work sample" loading="lazy">`).join('')}</div>` : ''}
  <div style="margin:1.5rem 0">${action}</div>
  <h3>Reviews</h3>${canReview ? `<form class="form box" id="rf"><div><label for="rt">Your rating</label><select id="rt"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div><div><label for="rc">Your review</label><textarea id="rc" required></textarea></div><button class="btn">Submit review</button></form>` : ''}
  ${(rv.data || []).filter(r => !r.hidden).map(r => `<div class="box" style="margin:.6rem 0"><span class="star">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span> <b>${esc(r.display_name)}</b> <span class="muted">${when(r.created_at)}</span><p style="margin:.3rem 0 0">${esc(r.comment)}</p></div>`).join('') || '<p class="muted">No reviews yet.</p>'}</div>`;
  document.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => pay(b.dataset.pay, id));
  const rf = $('#rf'); if (rf) rf.onsubmit = async e => { e.preventDefault(); const n = (me.full_name || 'Customer').split(' '); const dn = n[0] + (n[1] ? ' ' + n[1][0] + '.' : '');
    const { error } = await sb.from('reviews').insert({ provider_id: id, customer_id: me.id, rating: +$('#rt').value, comment: $('#rc').value, display_name: dn }); if (error) toast(error.message); else { toast('Review submitted'); route(); } };
};
async function pay(type, pid) {
  const message = type === 'connect' ? (prompt('Tell the provider what you need (optional):') || '') : '';
  const { data, error } = await sb.functions.invoke('create-order', { body: { provider_id: pid, type } });
  if (error || !data || data.error) return toast((data && data.error) || 'Payment could not start. Please try again.');
  new Razorpay({ key: data.key, amount: data.amount, currency: 'INR', order_id: data.order_id, name: 'KAAM AANGAN', description: type === 'contact' ? 'Contact details' : 'Connection request', theme: { color: '#1E4A38' }, prefill: { name: me.full_name, email: me.email, contact: me.mobile },
    handler: async r => { const v = await sb.functions.invoke('verify-payment', { body: { ...r, provider_id: pid, type, message } }); if (v.error || (v.data && v.data.error)) toast('Payment could not be verified. If money was deducted, contact us.'); else { toast(type === 'contact' ? 'Payment successful. Contact details unlocked.' : 'Payment successful. We will connect you.'); route(); } } }).open();
}

/* ---------- Dashboards ---------- */
routes.dash = async () => {
  if (!me) return go('#/login');
  if (me.role === 'admin') return go('#/admin');
  if (me.role === 'provider') return providerDash();
  const [pays, enq] = await Promise.all([sb.from('payments').select('*').eq('customer_id', me.id).order('created_at', { ascending: false }), sb.from('enquiries').select('*').eq('customer_id', me.id).order('created_at', { ascending: false })]);
  const un = (await sb.from('unlocks').select('provider_id').eq('customer_id', me.id)).data || [];
  app.innerHTML = `<section class="hero"><div class="in"><h1>Hello, ${esc((me.full_name || '').split(' ')[0])}</h1><p>What service do you need today?</p></div></section>${searchBox()}<div class="wrap"><h2>Services</h2>${catTiles()}
  <h2 style="margin-top:2rem">Payment history</h2>${(pays.data || []).length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Date</th><th>For</th><th>Amount</th><th>Provider</th></tr>${pays.data.map(x => `<tr><td>${when(x.created_at)}</td><td>${x.type === 'contact' ? 'Contact details' : 'Connection request'}</td><td>₹${x.amount / 100}</td><td><a href="#/p/${x.provider_id}">View</a></td></tr>`).join('')}</table></div>` : '<p class="muted">No payments yet.</p>'}
  <p class="muted">${un.length} provider contact${un.length == 1 ? '' : 's'} unlocked. ${(enq.data || []).length} connection request${(enq.data || []).length == 1 ? '' : 's'} sent.</p></div>`;
  wireSearch();
};
async function upload(file, folder) {
  const path = `${me.id}/${folder}-${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`;
  const { error } = await sb.storage.from('media').upload(path, file); if (error) throw error;
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
}
async function providerDash() {
  const [pr, ct, ph, en, rv] = await Promise.all([sb.from('provider_cards').select('*').eq('id', me.id).maybeSingle(), sb.from('provider_contacts').select('*').eq('provider_id', me.id).maybeSingle(),
    sb.from('work_photos').select('*').eq('provider_id', me.id), sb.from('enquiries').select('*').eq('provider_id', me.id).order('created_at', { ascending: false }), sb.from('reviews').select('*').eq('provider_id', me.id).order('created_at', { ascending: false })]);
  const p = pr.data, c = ct.data || {};
  const msg = { pending: 'Waiting for approval. Customers cannot see your profile yet.', approved: 'Your profile is live.', rejected: 'Your profile was not approved. Update it and contact us.', suspended: 'Your profile is suspended. Contact us.' }[p.status];
  app.innerHTML = `<div class="wrap"><h2>My dashboard</h2><p><span class="tag">${esc(p.status)}</span> ${msg} <a href="#/p/${p.id}">View public profile</a></p>
  <div class="two"><form class="form" id="pf"><h3>Profile</h3><div class="row"><img class="av" id="av" src="${esc(p.photo_url || AV)}" alt="Your photo"><div><label for="pp">Profile photo</label><input id="pp" type="file" accept="image/*"></div></div>
  <div><label for="n">Full name</label><input id="n" value="${esc(p.full_name)}" required></div><div><label for="c">Profession</label><select id="c">${opts(tops(), p.category_id, 'Select')}</select></div><div><label for="s">Type of work</label><select id="s">${opts(subs(p.category_id), p.subcategory_id, 'Select')}</select></div>
  <div><label for="d">Description</label><textarea id="d">${esc(p.description)}</textarea></div><div><label for="x">Experience</label><input id="x" value="${esc(p.experience)}"></div><div><label for="pr">Starting price in ₹ (optional)</label><input id="pr" type="number" min="0" value="${esc(p.starting_price)}"></div>
  <div><label for="ci">City</label><input id="ci" value="${esc(p.city)}"></div><div><label for="lo">Your locality</label><input id="lo" value="${esc(p.locality)}"></div><div><label for="ar">Areas you serve (commas)</label><input id="ar" value="${esc((p.areas || []).join(', '))}"></div>
  <div><label for="ph">Phone (shown only after payment)</label><input id="ph" value="${esc(c.phone)}"></div><div><label for="ad">Address or meeting place (optional, shown after payment)</label><input id="ad" value="${esc(c.address)}"></div>
  <div><label for="av2">Availability</label><select id="av2"><option value="true" ${p.available ? 'selected' : ''}>Available for work</option><option value="false" ${p.available ? '' : 'selected'}>Not available now</option></select></div><button class="btn">Save changes</button></form>
  <div><h3>Photos of my work</h3><div class="photos">${(ph.data || []).map(x => `<div><img src="${esc(x.url)}" alt="Work sample"><button class="btn bad sm" data-delph="${x.id}">Remove</button></div>`).join('')}</div><p><label for="wp">Add photos</label><input id="wp" type="file" accept="image/*" multiple></p>
  <h3>Enquiries</h3>${(en.data || []).map(x => `<div class="box" style="margin:.5rem 0"><b>${esc(x.customer_name)}</b> <a href="tel:${esc(x.customer_mobile)}">${esc(x.customer_mobile)}</a> <span class="muted">${when(x.created_at)}</span><p style="margin:.2rem 0 0">${esc(x.message || 'No message')}</p></div>`).join('') || '<p class="muted">No enquiries yet.</p>'}
  <h3>Ratings and reviews</h3><p class="meta">${stars(p.avg_rating, p.review_count)}</p>${(rv.data || []).filter(r => !r.hidden).map(r => `<p><span class="star">${'★'.repeat(r.rating)}</span> ${esc(r.comment)} <span class="muted">– ${esc(r.display_name)}</span></p>`).join('')}</div></div></div>`;
  $('#c').onchange = e => { $('#s').innerHTML = opts(subs(e.target.value), '', 'Select'); };
  $('#pp').onchange = async e => { try { const u = await upload(e.target.files[0], 'avatar'); await sb.from('providers').update({ photo_url: u }).eq('id', me.id); $('#av').src = u; toast('Photo updated'); } catch (x) { toast(x.message); } };
  $('#wp').onchange = async e => { try { for (const f of e.target.files) { const u = await upload(f, 'work'); await sb.from('work_photos').insert({ provider_id: me.id, url: u }); } toast('Photos added'); route(); } catch (x) { toast(x.message); } };
  document.querySelectorAll('[data-delph]').forEach(b => b.onclick = async () => { await sb.from('work_photos').delete().eq('id', b.dataset.delph); route(); });
  $('#pf').onsubmit = async e => { e.preventDefault(); const areas = [...new Set([$('#lo').value, ...$('#ar').value.split(',')].map(norm).filter(Boolean))];
    const a = await sb.from('providers').update({ full_name: $('#n').value, category_id: $('#c').value || null, subcategory_id: $('#s').value || null, description: $('#d').value, experience: $('#x').value, starting_price: $('#pr').value || null, city: $('#ci').value.trim(), locality: $('#lo').value.trim(), areas, available: $('#av2').value === 'true' }).eq('id', me.id);
    const b = await sb.from('provider_contacts').upsert({ provider_id: me.id, phone: $('#ph').value, address: $('#ad').value });
    toast(a.error || b.error ? (a.error || b.error).message : 'Saved'); };
}

/* ---------- Admin ---------- */
routes.admin = async () => {
  if (!me || me.role !== 'admin') return (app.innerHTML = '<div class="wrap"><p class="err">Admin access only.</p></div>');
  const cnt = async (t, f) => { let q = sb.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); return (await q).count || 0; };
  const [nc, np, nw, ne, provs, custs, revs, pays] = await Promise.all([cnt('profiles', q => q.eq('role', 'customer')), cnt('providers'), cnt('providers', q => q.eq('status', 'pending')), cnt('enquiries'),
    sb.from('provider_cards').select('*').order('created_at', { ascending: false }), sb.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }).limit(50),
    sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(40), sb.from('payments').select('*').order('created_at', { ascending: false }).limit(40)]);
  app.innerHTML = `<div class="wrap"><h2>Admin dashboard</h2><p class="meta"><span><b>${nc}</b> customers</span><span><b>${np}</b> providers</span><span><b>${nw}</b> awaiting approval</span><span><b>${ne}</b> enquiries</span></p>
  <h3>Service providers</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Name</th><th>Service</th><th>City</th><th>Status</th><th>Actions</th></tr>${(provs.data || []).map(p => `<tr><td><a href="#/p/${p.id}">${esc(p.full_name)}</a></td><td>${esc(p.category_name || '')}</td><td>${esc(p.city || '')}</td><td>${esc(p.status)}</td><td class="row">${['approved', 'rejected', 'suspended'].map(s => `<button class="btn sm ${s == 'approved' ? '' : 'ghost'}" data-act="status" data-id="${p.id}" data-v="${s}">${s == 'approved' ? 'Approve' : s == 'rejected' ? 'Reject' : 'Suspend'}</button>`).join('')}</td></tr>`).join('')}</table></div>
  <h3 style="margin-top:2rem">Categories</h3><form class="row" id="cf"><input id="cn" placeholder="New category name" required style="max-width:240px"><select id="cp" style="max-width:240px">${opts(tops(), '', 'Main category')}</select><button class="btn">Add</button></form>
  <div class="tbl-wrap"><table class="tbl">${tops().map(t => `<tr><td><b>${esc(t.name)}</b></td><td>${subs(t.id).map(s => `${esc(s.name)} <button class="btn sm bad" data-act="delcat" data-id="${s.id}" aria-label="Delete ${esc(s.name)}">x</button>`).join(' &nbsp; ')}</td><td class="row"><button class="btn sm ghost" data-act="rename" data-id="${t.id}">Rename</button><button class="btn sm bad" data-act="delcat" data-id="${t.id}">Delete</button></td></tr>`).join('')}</table></div>
  <h3 style="margin-top:2rem">Recent reviews</h3><div class="tbl-wrap"><table class="tbl">${(revs.data || []).map(r => `<tr><td>${'★'.repeat(r.rating)}</td><td>${esc(r.display_name)}: ${esc(r.comment)}</td><td>${r.hidden ? 'Hidden' : ''}</td><td><button class="btn sm ${r.hidden ? '' : 'bad'}" data-act="hide" data-id="${r.id}" data-v="${r.hidden ? 'false' : 'true'}">${r.hidden ? 'Show' : 'Remove'}</button></td></tr>`).join('')}</table></div>
  <h3 style="margin-top:2rem">Successful payments</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Date</th><th>Type</th><th>Amount</th><th>Payment ID</th></tr>${(pays.data || []).map(x => `<tr><td>${when(x.created_at)}</td><td>${esc(x.type)}</td><td>₹${x.amount / 100}</td><td>${esc(x.razorpay_payment_id)}</td></tr>`).join('')}</table></div>
  <h3 style="margin-top:2rem">Customers</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Name</th><th>Mobile</th><th>Joined</th></tr>${(custs.data || []).map(c => `<tr><td>${esc(c.full_name)}</td><td>${esc(c.mobile)}</td><td>${when(c.created_at)}</td></tr>`).join('')}</table></div></div>`;
  $('#cf').onsubmit = async e => { e.preventDefault(); const { error } = await sb.from('categories').insert({ name: $('#cn').value.trim(), parent_id: $('#cp').value || null }); if (error) return toast(error.message); cats = (await sb.from('categories').select('*').order('name')).data; route(); };
};
app.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const { act, id, v } = b.dataset; let r;
  if (act === 'status') r = await sb.from('providers').update({ status: v }).eq('id', id);
  if (act === 'hide') r = await sb.from('reviews').update({ hidden: v === 'true' }).eq('id', id);
  if (act === 'rename') { const n = prompt('New name:'); if (!n) return; r = await sb.from('categories').update({ name: n.trim() }).eq('id', id); }
  if (act === 'delcat') { if (!confirm('Delete this category?')) return; r = await sb.from('categories').delete().eq('id', id); }
  if (r && r.error) return toast(r.error.message);
  if (act === 'rename' || act === 'delcat') cats = (await sb.from('categories').select('*').order('name')).data;
  route();
});
init();
