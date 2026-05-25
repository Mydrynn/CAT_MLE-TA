const state = {
  currentScreen: 'reach',
  mleStep: 1,
  assignStep: 1,
  mleApplied: true,
  reviewersAssigned: false,
  activeModal: null,
  activeReviewerLang: null,
  reviewerDecision: null,
  reviewerComment: '',
  selectedLanguages: ['frCA', 'esLA'],
  languages: {
    frCA: {
      key: 'frCA',
      name: 'French (Canada)',
      shortName: 'French (CA)',
      catalogId: 'CMP224-a92frCA',
      reviewer: 'Marie Dubois',
      reviewerRole: 'Legal Reviewer',
      status: 'Not assigned',
      taChanges: 1,
      approved: 0,
      rejected: 0,
      comments: 0,
      suggestion: 'Nouveau texte ici',
      title: 'VOUS êtes un INITIÉ dans notre entreprise!'
    },
    esLA: {
      key: 'esLA',
      name: 'Spanish (Latin America)',
      shortName: 'Spanish (LA)',
      catalogId: 'CMP224-a92esLA',
      reviewer: 'Carlos Rivera',
      reviewerRole: 'Regional SME',
      status: 'Not assigned',
      taChanges: 1,
      approved: 0,
      rejected: 0,
      comments: 0,
      suggestion: 'Nuevo texto aquí',
      title: 'USTED es una PERSONA CON INFORMACIÓN PRIVILEGIADA en nuestra empresa!'
    }
  }
};

const reviewerOptions = {
  frCA: ['Marie Dubois - Legal Reviewer', 'Jean Tremblay - Regional SME', 'Sophie Martin - Compliance Reviewer'],
  esLA: ['Carlos Rivera - Regional SME', 'Ana Morales - Legal Reviewer', 'Lucia Fernandez - Compliance Reviewer']
};

const app = document.getElementById('app');
const toastRoot = document.getElementById('toast-root');

function h(strings, ...values) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
}

function render() {
  const screen = state.currentScreen === 'design' ? renderDesign() :
                 state.currentScreen === 'reviewer' ? renderReviewer() : renderReach();
  app.innerHTML = screen + renderDemoBar() + '<div class="chat">?</div>' + renderModal();
  bindEvents();
}

function renderTopbar(type = 'reach') {
  if (type === 'design') {
    return h`
      <div class="topbar">
        <div class="brand"><div class="logo-square design-logo">D</div><span>Design</span></div>
        <div class="design-tabs">
          ${['Getting Started','Customize Your Course','Adaptive','Knowledge Check','Disclosure','Gamification','Features'].map((t,i)=>`<div class="design-tab ${i===1?'active':''}">${t}</div>`).join('')}
        </div>
        <div class="top-actions">
          <button class="btn ghost">Preview Course</button>
          <button class="btn ghost">Import/Export XML</button>
          <button class="btn purple" data-action="go-reach">Save & Exit</button>
          <span>Ed.Hickey</span>
        </div>
      </div>`;
  }
  return h`
    <div class="topbar">
      <div class="brand"><div class="logo-square">R</div><span>Reach</span></div>
      <div class="top-actions">
        <span>Content Customizations</span><span>⚙</span><span>Help</span><strong>Ed Hickey (Super User)</strong>
      </div>
    </div>`;
}

function renderSidebar() {
  return h`<aside class="sidebar">
    ${['⌂','▦','◉','✎','☁','⚙'].map((i,idx)=>`<div class="side-icon ${idx===1?'active':''}">${i}</div>`).join('')}
  </aside>`;
}

function badgeFor(lang) {
  const cls = lang.status === 'Approved' ? 'approved' : lang.status === 'In Review' ? 'review' : lang.status === 'Changes Requested' ? 'locked' : 'draft';
  const label = lang.status === 'Not assigned' ? 'Reviewer: Not assigned' : lang.status === 'Approved' ? 'Review Approved' : lang.status;
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderReach() {
  return h`<div class="app-shell">
    ${renderTopbar('reach')}
    <div class="layout">
      ${renderSidebar()}
      <main class="content">
        <div class="back">← Back to Content Manager</div>
        <section class="card course-hero">
          <div class="hero-img"></div>
          <div>
            <div class="kicker">Market Conduct | CMP224 | Course</div>
            <h1>Insider Trading</h1>
            <div class="meta"><span>~25 mins</span><span>38 Pages</span></div>
            <p class="desc">This course summarizes the laws prohibiting insider trading and the key components of an effective insider trading policy. It provides guidelines to help all employees avoid the serious penalties that can result from trading, or helping others trade, based on “inside” information.</p>
          </div>
        </section>
        <section class="card stats">
          <div class="stat"><div class="stat-num">52</div><div class="stat-label">Available Languages</div></div>
          <div class="stat"><div class="stat-num">3</div><div class="stat-label">Language in Use</div></div>
          <div class="stat"><div class="stat-num">3</div><div class="stat-label">Draft</div></div>
          <div class="stat"><div class="stat-num">0</div><div class="stat-label">Published</div></div>
        </section>
        ${allApproved() ? '<div class="notice success">All reviews approved. Language drafts are ready for final admin review and publishing.</div>' : state.reviewersAssigned ? '<div class="notice info">Publishing is locked until all assigned translation reviews are approved.</div>' : '<div class="notice warn">There is 1 AI translation to be verified. Click here to view</div>'}
        <div class="section-title">Language Versions</div>
        <div class="language-list">
          ${renderEnglishRow()}
          ${Object.values(state.languages).map(renderLanguageRow).join('')}
        </div>
      </main>
    </div>
  </div>`;
}

function renderEnglishRow() {
  return h`<section class="lang-row">
    <div class="lang-head">
      <div class="chev">⌄</div>
      <div><div class="lang-name">English</div><div class="lang-sub">CMP224-a92en</div></div>
      <div class="badges"><span class="badge draft">Draft</span>${state.reviewersAssigned ? '<span class="badge locked">Publishing locked</span>' : ''}</div>
      <div class="row-menu">⋯</div>
    </div>
    <div class="lang-detail">
      <div>
        <div class="detail-title">Library Version CMP224-a92en</div>
        <div class="detail-meta">Insider Trading<br/>Published by LRN on Apr 28, 2025</div>
      </div>
      <div class="icon-actions">
        <button class="icon-btn" title="Preview">👁</button>
        <button class="icon-btn" title="Edit" data-action="open-edit">✎</button>
        <button class="icon-btn" title="Upload">☁</button>
        <button class="icon-btn" title="Download">⇩</button>
        <button class="btn primary" data-action="open-assign">Assign Reviewers</button>
        ${state.reviewersAssigned ? '<button class="btn" data-action="open-progress">View Review Progress</button>' : ''}
      </div>
    </div>
  </section>`;
}

function renderLanguageRow(lang) {
  return h`<section class="lang-row">
    <div class="lang-head">
      <div class="chev">›</div>
      <div><div class="lang-name">${lang.name}</div><div class="lang-sub">${lang.catalogId}</div></div>
      <div class="badges"><span class="badge draft">Draft</span>${badgeFor(lang)}</div>
      <div class="row-menu">⋯</div>
    </div>
  </section>`;
}

function renderDesign() {
  return h`<div class="app-shell">
    ${renderTopbar('design')}
    <div class="design-content">
      <main class="editor-card">
        <h1 class="editor-title">Course Information</h1>
        <div class="form-row"><label class="label">Course Name</label><input class="input" value="Insider Trading" /></div>
        <div class="form-row"><label class="label">Get Started Page</label><textarea class="textarea">This course summarizes the laws prohibiting insider trading and the key components of an effective insider trading policy.</textarea></div>
        <div class="form-row"><label class="label">Long Course Description</label><textarea class="textarea">This course provides guidelines to help all employees avoid the serious penalties that can result from trading, or helping others trade, based on inside information.</textarea></div>
        <div class="two-col">
          <div class="form-row"><label class="label">Course Duration</label><input class="input" value="25" /></div>
          <div class="form-row"><label class="label">Video</label><select><option>YES</option><option>NO</option></select></div>
        </div>
        <div class="form-row"><label class="label">Audio</label><select><option>YES</option><option>NO</option></select></div>
      </main>
      <aside class="side-panel">
        <div class="panel-title">Multilingual Editing</div>
        <p class="panel-copy">Do you want to simultaneously edit the localized version of this course</p>
        <div class="toggle-row"><strong>Yes</strong><div class="toggle"></div></div>
        <button class="btn" data-action="open-mle">View MLE Result</button>
        <div class="notice warn">There are 2 languages which don't have a draft.<br/>Create drafts to enable full multilingual editing.</div>
        <div class="panel-divider"></div>
        <div class="panel-title">AI-Powered Translation Assist</div>
        <p class="panel-copy">Do you want textual changes to be automatically translated by AI?</p>
        <div class="toggle-row"><strong>Yes</strong><div class="toggle"></div></div>
        <p class="panel-copy">Translation assist available for languages below.<br/><strong>2 languages are available for Translation Assist</strong></p>
        <div class="language-toggle"><span>CA - French</span><div class="toggle"></div></div>
        <div class="language-toggle"><span>LA - Spanish</span><div class="toggle"></div></div>
        <div class="panel-divider"></div>
        <div class="status-grid"><div>Status <b>Draft</b></div><div>System ID <b>75477</b></div><div>Catalog ID <b>CMP224-a92en</b></div></div>
        <div class="notice info"><strong>There are 2 language drafts with TA changes awaiting review.</strong><br/><br/><button class="btn primary" data-action="open-assign">Assign reviewers</button></div>
        ${state.reviewersAssigned ? '<button class="btn" data-action="open-progress">View Review Progress</button>' : ''}
      </aside>
    </div>
  </div>`;
}

function renderModal() {
  if (!state.activeModal) return '';
  if (state.activeModal === 'edit') return renderEditModal();
  if (state.activeModal === 'mle') return renderMleModal();
  if (state.activeModal === 'assign') return renderAssignModal();
  if (state.activeModal === 'progress') return renderProgressModal();
  if (state.activeModal === 'submitted') return renderSubmittedModal();
  return '';
}

function renderEditModal() {
  return h`<div class="modal-backdrop"><div class="modal small">
    <div class="modal-head"><div class="modal-title">Edit Course</div><button class="close" data-action="close-modal">×</button></div>
    <div class="modal-body"><p>You will be directed to Catalyst Design to edit this course.</p></div>
    <div class="modal-foot"><button class="btn ghost" data-action="close-modal">No Thanks</button><button class="btn primary" data-action="go-design">Continue to Catalyst Design</button></div>
  </div></div>`;
}

function stepper(labels, active) {
  return `<div class="stepper">${labels.map((l,i)=>`<div class="step ${i+1===active?'active':i+1<active?'done':''}"><span class="step-num">${i+1<active?'✓':i+1}</span><span>${l}</span></div>`).join('')}</div>`;
}

function renderMleModal() {
  const step = state.mleStep;
  let body = '';
  if (step === 1) body = '<div class="notice success">No structural changes detected.</div>';
  if (step === 2) body = h`<h3>Review Textual Changes (1 changes)</h3><div class="split"><div><input class="input" placeholder="Search"/><div class="tree"><div class="tree-item">What Is Insider Trading?</div><div class="tree-item active">YOU are an INSIDER at our company!</div></div></div><div class="review-pane"><div class="field-chip">Content &gt; Description</div><div class="new-text">New text here</div></div></div>`;
  if (step === 3) body = h`<div class="assign-grid"><div class="option-card"><h3>Structural Changes</h3><p class="small-text">Applies to 0 languages</p><div class="notice">No languages found</div></div><div class="option-card"><h3>Textual Changes</h3><p class="small-text">Applies to 2 languages</p><div class="badge review">French (CA)</div> <div class="badge review">Spanish (LA)</div></div></div><div class="notice warn">Once proceed, textual changes will be saved as Drafts in all compatible languages. Open each draft, review and save to publish.</div>`;
  if (step === 4) body = h`<div class="notice success"><strong>All Changes Applied Successfully!</strong> Language translations are now in Draft state. Navigate to each language draft, review and save to publish.</div><div class="assign-grid"><div class="option-card"><h3>Structural Changes</h3><p class="small-text">Saved 0 languages</p><div class="notice">No languages found</div></div><div class="option-card"><h3>Textual Changes</h3><p class="small-text">Applied to 2 languages</p><div class="badge review">French (CA)</div> <div class="badge review">Spanish (LA)</div></div></div>`;
  return h`<div class="modal-backdrop"><div class="modal large"><div class="modal-head"><div class="modal-title">Multilingual Editing Review</div><button class="close" data-action="close-modal">×</button></div><div class="modal-body">${stepper(['Structural Edits','Textual Edits','Confirm Languages','Apply'], step)}${body}</div><div class="modal-foot">${step>1?'<button class="btn ghost" data-action="mle-back">Back</button>':''}${step<4?'<button class="btn primary" data-action="mle-next">Continue</button>':'<button class="btn ghost" data-action="close-modal">Cancel</button><button class="btn primary" data-action="mle-done">Done</button>'}</div></div></div>`;
}

function renderAssignModal() {
  const step = state.assignStep;
  let body = '';
  if (step === 1) body = h`<div class="notice info"><strong>Insider Trading</strong><br/>CMP224-a92en<br/>2 languages have Translation Assist changes awaiting review.</div><div class="lang-cards">${Object.values(state.languages).map(lang=>`<div class="lang-card selected"><h3>${lang.name}</h3><p class="small-text">Catalog ID: ${lang.catalogId}<br/>TA changes: ${lang.taChanges}<br/>Status: Draft<br/>Reviewer status: ${lang.status}</p></div>`).join('')}</div>`;
  if (step === 2) body = h`<div class="assign-grid">${Object.values(state.languages).map(lang=>`<div class="option-card"><h3>${lang.name}</h3><label class="label">Reviewer</label><select data-reviewer="${lang.key}">${reviewerOptions[lang.key].map(opt=>`<option ${opt.startsWith(lang.reviewer)?'selected':''}>${opt}</option>`).join('')}</select></div>`).join('')}</div><div class="option-card"><label class="check-row"><input type="checkbox" checked/> Allow reviewers to comment and request changes</label><label class="check-row"><input type="checkbox" checked/> Restrict reviewers to assigned language drafts only</label><label class="check-row"><input type="checkbox" checked/> Prevent publishing until all assigned reviews are approved</label></div>`;
  if (step === 3) body = h`<div class="form-row"><label class="label">Due date</label><input type="date" class="input" /></div><div class="form-row"><label class="label">Instructions to reviewers</label><textarea class="textarea">Please review the Translation Assist suggestions for accuracy, tone, terminology, and local compliance. Approve each field if acceptable. Reject or comment where changes are required.</textarea></div><div class="option-card"><label class="check-row"><input type="checkbox" checked/> Send email notification</label><label class="check-row"><input type="checkbox" checked/> Include direct link to assigned language draft</label><label class="check-row"><input type="checkbox" checked/> Notify me when all reviews are complete</label></div>`;
  if (step === 4) body = h`<div class="notice info">You are assigning translation review tasks for <strong>Insider Trading</strong>.</div><div class="assign-grid">${Object.values(state.languages).map(lang=>`<div class="option-card"><h3>${lang.name}</h3><p class="small-text">Reviewer: <strong>${lang.reviewer}</strong><br/>Scope: 1 TA change<br/>Access: Assigned language draft only</p></div>`).join('')}</div><div class="notice warn">Publishing lock: Enabled until reviews are approved<br/>Notifications: Email reviewers and notify admin on completion</div>`;
  return h`<div class="modal-backdrop"><div class="modal large"><div class="modal-head"><div class="modal-title">Assign Translation Reviewers</div><button class="close" data-action="close-modal">×</button></div><div class="modal-body">${stepper(['Select Languages','Assign Reviewers','Review Instructions','Confirm'], step)}${body}</div><div class="modal-foot"><button class="btn ghost" data-action="${step===1?'close-modal':'assign-back'}">${step===1?'Cancel':'Back'}</button><button class="btn primary" data-action="${step<4?'assign-next':'assign-done'}">${step<4?'Continue':'Assign Reviewers'}</button></div></div></div>`;
}

function renderProgressModal() {
  return h`<div class="modal-backdrop"><div class="modal large"><div class="modal-head"><div class="modal-title">Translation Review Progress</div><button class="close" data-action="close-modal">×</button></div><div class="modal-body">${allApproved()?'<div class="notice success">All reviews approved. Language drafts are ready for final admin review and publishing.</div>':''}<table><thead><tr><th>Language</th><th>Reviewer</th><th>TA Changes</th><th>Approved</th><th>Rejected</th><th>Comments</th><th>Status</th></tr></thead><tbody>${Object.values(state.languages).map(lang=>`<tr><td>${lang.name}</td><td>${lang.reviewer}</td><td>${lang.taChanges}</td><td>${lang.approved}</td><td>${lang.rejected}</td><td>${lang.comments}</td><td><span class="badge ${lang.status==='Approved'?'approved':'review'}">${lang.status}</span></td></tr>`).join('')}</tbody></table></div><div class="modal-foot"><button class="btn" data-review-open="frCA">Open French Reviewer View</button><button class="btn" data-review-open="esLA">Open Spanish Reviewer View</button><button class="btn ghost" data-action="toast-reminder">Send Reminder</button>${allApproved()?'<button class="btn primary" data-action="go-reach">Open Language Drafts</button>':''}<button class="btn ghost" data-action="close-modal">Close</button></div></div></div>`;
}

function renderSubmittedModal() {
  return h`<div class="modal-backdrop"><div class="modal small"><div class="modal-head"><div class="modal-title">Review submitted</div></div><div class="modal-body"><div class="notice success">Review submitted successfully. The administrator has been notified.</div></div><div class="modal-foot"><button class="btn primary" data-action="open-progress">Return to Progress</button></div></div></div>`;
}

function renderReviewer() {
  const lang = state.languages[state.activeReviewerLang || 'frCA'];
  const reviewed = lang.approved + lang.rejected;
  const complete = reviewed >= lang.taChanges;
  return h`<div class="app-shell">
    ${renderTopbar('design')}
    <div class="review-banner"><span>Translation Review Mode</span><span>Reviewer: ${lang.reviewer} · Language: ${lang.name} · Course: Insider Trading</span></div>
    <div class="reviewer-layout">
      <aside class="lesson-tree"><div class="lesson-heading">Insider Trading</div>${['Launch Course...','What Is Insider...','1. YOU are an IN...','2. Dinner Conver...','3. Remember...','4. Broker Dilemma','5. Remember...','6. Keep It Betwe...','7. Thanks for hel...'].map((x,i)=>`<div class="lesson-node ${i===2?'active':''}">${x}</div>`).join('')}</aside>
      <main class="review-main"><div class="translation-card ${lang.approved?'approved':lang.rejected?'rejected':''}"><div class="form-row"><label class="label">Title</label><input class="input" value="${lang.title}" /></div><div class="form-row"><label class="label">Description</label><div class="empty-field"></div></div><div class="form-row"><label class="label">Description Translation</label><div class="suggestion"><div><div class="small-text">Original English:</div><strong>New text here</strong><br/><br/><div class="small-text">TA suggestion:</div><strong>${lang.suggestion}</strong></div><div><button class="round ok" data-action="approve-review">✓</button><button class="round no" data-action="reject-review" style="margin-left:8px">×</button></div></div></div></div></main>
      <aside class="review-side"><div class="panel-title">Review task</div><p class="small-text">Language: <strong>${lang.name}</strong><br/>Assigned to: <strong>${lang.reviewer}</strong><br/>TA changes: ${lang.taChanges}<br/>Reviewed: ${reviewed} of ${lang.taChanges}</p><div class="progress-meter"><span style="width:${complete?'100':'0'}%"></span></div><div class="panel-divider"></div><div class="label">Original English:</div><div class="notice">New text here</div><div class="label">TA suggestion:</div><div class="notice info">${lang.suggestion}</div><div class="form-row"><label class="label">Decision:</label><button class="btn primary" data-action="approve-review">Approve</button> <button class="btn danger" data-action="reject-review">Reject</button></div><div class="form-row"><label class="label">Comment:</label><textarea class="textarea" data-comment>${state.reviewerComment}</textarea></div><button class="btn primary" data-action="submit-review" ${!complete?'disabled':''}>Submit Review</button> <button class="btn ghost" data-action="open-progress">Back to Progress</button></aside>
    </div>
  </div>`;
}

function renderDemoBar() {
  return h`<div class="demo-bar"><button class="btn ghost" data-action="reset">Reset Demo</button><button class="btn ghost" data-action="go-reach">Jump to Admin</button><button class="btn ghost" data-review-open="frCA">Jump to Reviewer</button><button class="btn ghost" data-action="complete-all">Complete All Reviews</button></div>`;
}

function bindEvents() {
  document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', handleAction));
  document.querySelectorAll('[data-review-open]').forEach(el => el.addEventListener('click', () => {
    state.activeReviewerLang = el.dataset.reviewOpen;
    state.activeModal = null;
    state.currentScreen = 'reviewer';
    render();
  }));
  document.querySelectorAll('[data-reviewer]').forEach(sel => sel.addEventListener('change', e => {
    const lang = state.languages[e.target.dataset.reviewer];
    const [name, role] = e.target.value.split(' - ');
    lang.reviewer = name;
    lang.reviewerRole = role;
  }));
  const comment = document.querySelector('[data-comment]');
  if (comment) comment.addEventListener('input', e => state.reviewerComment = e.target.value);
}

function handleAction(e) {
  const action = e.currentTarget.dataset.action;
  if (action === 'close-modal') state.activeModal = null;
  if (action === 'open-edit') state.activeModal = 'edit';
  if (action === 'go-design') { state.currentScreen = 'design'; state.activeModal = null; }
  if (action === 'go-reach') { state.currentScreen = 'reach'; state.activeModal = null; }
  if (action === 'open-mle') { state.mleStep = 1; state.activeModal = 'mle'; }
  if (action === 'mle-next') state.mleStep = Math.min(4, state.mleStep + 1);
  if (action === 'mle-back') state.mleStep = Math.max(1, state.mleStep - 1);
  if (action === 'mle-done') { state.mleApplied = true; state.activeModal = null; showToast('Translation Assist changes applied. Language drafts are ready for reviewer assignment.'); }
  if (action === 'open-assign') { state.assignStep = 1; state.activeModal = 'assign'; }
  if (action === 'assign-next') state.assignStep = Math.min(4, state.assignStep + 1);
  if (action === 'assign-back') state.assignStep = Math.max(1, state.assignStep - 1);
  if (action === 'assign-done') assignReviewers();
  if (action === 'open-progress') { state.currentScreen = 'reach'; state.activeModal = 'progress'; }
  if (action === 'toast-reminder') showToast('Reminder sent to assigned reviewers.');
  if (action === 'approve-review') approveCurrent();
  if (action === 'reject-review') rejectCurrent();
  if (action === 'submit-review') submitReview();
  if (action === 'reset') resetState();
  if (action === 'complete-all') completeAll();
  render();
}

function assignReviewers() {
  state.reviewersAssigned = true;
  Object.values(state.languages).forEach(lang => {
    if (lang.status === 'Not assigned') lang.status = 'In Review';
  });
  state.activeModal = null;
  showToast('Reviewers assigned successfully. French and Spanish are now In Review.');
}

function approveCurrent() {
  const lang = state.languages[state.activeReviewerLang];
  lang.approved = 1; lang.rejected = 0; lang.comments = 0; lang.status = 'Approved';
  state.reviewerDecision = 'approved';
}

function rejectCurrent() {
  const lang = state.languages[state.activeReviewerLang];
  lang.approved = 0; lang.rejected = 1; lang.comments = state.reviewerComment.trim() ? 1 : 0; lang.status = 'Changes Requested';
  state.reviewerDecision = 'rejected';
  if (!state.reviewerComment.trim()) showToast('Add a comment before submitting a rejected review.');
}

function submitReview() {
  const lang = state.languages[state.activeReviewerLang];
  if (lang.rejected && !state.reviewerComment.trim()) { showToast('Comment required for rejection.'); return; }
  state.activeModal = 'submitted';
  state.currentScreen = 'reach';
  state.reviewerComment = '';
  showToast(allApproved() ? 'All reviews approved.' : 'Review submitted successfully.');
}

function allApproved() {
  return Object.values(state.languages).every(l => l.status === 'Approved');
}

function completeAll() {
  state.reviewersAssigned = true;
  Object.values(state.languages).forEach(l => { l.status = 'Approved'; l.approved = 1; l.rejected = 0; l.comments = 0; });
  showToast('All reviews approved.');
}

function resetState() {
  state.currentScreen = 'reach'; state.mleStep = 1; state.assignStep = 1; state.reviewersAssigned = false; state.activeModal = null; state.activeReviewerLang = null; state.reviewerDecision = null; state.reviewerComment = '';
  state.languages.frCA.status = 'Not assigned'; state.languages.frCA.approved = 0; state.languages.frCA.rejected = 0; state.languages.frCA.comments = 0; state.languages.frCA.reviewer = 'Marie Dubois'; state.languages.frCA.reviewerRole = 'Legal Reviewer';
  state.languages.esLA.status = 'Not assigned'; state.languages.esLA.approved = 0; state.languages.esLA.rejected = 0; state.languages.esLA.comments = 0; state.languages.esLA.reviewer = 'Carlos Rivera'; state.languages.esLA.reviewerRole = 'Regional SME';
  showToast('Demo reset.');
}

function showToast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  toastRoot.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

render();
