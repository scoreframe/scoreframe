// AgentSee content: stages, process checklists, the meeting questionnaire,
// priorities, message templates, palettes and the sample book.
(function (G) {
  'use strict';
  const AG = G.AG;

  // p = rough chance the side closes from this stage (weights the pipeline)
  AG.STAGES = {
    buy: [
      { id: 'lead', name: 'New lead', short: 'Lead', p: 0.1 },
      { id: 'consult', name: 'Consultation', short: 'Consult', p: 0.2 },
      { id: 'search', name: 'Touring homes', short: 'Touring', p: 0.35 },
      { id: 'offer', name: 'Making offers', short: 'Offers', p: 0.5 },
      { id: 'contract', name: 'Under contract', short: 'Contract', p: 0.85 },
      { id: 'closed', name: 'Closed', short: 'Closed', p: 1 },
    ],
    sell: [
      { id: 'lead', name: 'New lead', short: 'Lead', p: 0.1 },
      { id: 'appt', name: 'Listing appointment', short: 'Appt', p: 0.25 },
      { id: 'prep', name: 'Getting ready to list', short: 'Prep', p: 0.5 },
      { id: 'active', name: 'Active listing', short: 'Active', p: 0.6 },
      { id: 'contract', name: 'Under contract', short: 'Contract', p: 0.85 },
      { id: 'closed', name: 'Closed', short: 'Closed', p: 1 },
    ],
  };

  // [id, text, {tip}] — ids are unique across both sides (b_ / s_)
  AG.CHECK = {
    buy: {
      lead: [['b_call', 'First conversation'], ['b_sched', 'Buyer consultation booked']],
      consult: [
        ['b_consult', 'Buyer consultation held'],
        ['b_needs', 'Needs, wants & priorities captured'],
        ['b_agency', 'Agency relationship disclosed & signed', { tip: 'e.g. Buyer’s Limited Agent — your brokerage disclosure form.' }],
        ['b_process', 'Explained compensation is negotiable and not set by law'],
        ['b_bra', 'Buyer agreement signed', { tip: 'Required before touring (NAR practice change, Aug 2024).' }],
        ['b_lender', 'Lender intro / pre-approval started'],
        ['b_preap', 'Pre-approval letter in hand'],
        ['b_search', 'Listing alerts set up'],
      ],
      search: [
        ['b_tour1', 'First showing tour'],
        ['b_feedback', 'Showing feedback recorded'],
        ['b_areas', 'Neighborhoods & schools reviewed'],
        ['b_refresh', 'Pre-approval still current'],
      ],
      offer: [
        ['b_cma', 'Comps / CMA on the target home'],
        ['b_strategy', 'Offer price & terms agreed'],
        ['b_letter', 'Pre-approval letter for this price'],
        ['b_worksheet', 'Went over their estimated expenses', { tip: 'Itemized costs and the total they’ll bring to closing.', worksheet: true }],
        ['b_emd', 'Earnest money ready'],
        ['b_submit', 'Offer submitted'],
        ['b_accept', 'Offer accepted 🎉'],
      ],
      contract: [
        ['b_rules', 'Went over the Top 10 Buyer Rules', { tip: 'How they stay out of trouble between contract and closing.', rules: true }],
        ['b_emd_dep', 'Earnest money deposited'],
        ['b_insp_sched', 'Inspection scheduled'],
        ['b_insp', 'Inspection done'],
        ['b_repair', 'Repair request negotiated'],
        ['b_appr', 'Appraisal ordered'],
        ['b_appr_in', 'Appraisal came in at value'],
        ['b_hoa', 'HOA documents reviewed'],
        ['b_title', 'Title commitment reviewed'],
        ['b_ins', 'Homeowners insurance bound'],
        ['b_ctc', 'Clear to close'],
        ['b_cd', 'Closing Disclosure reviewed (3 days out)'],
        ['b_wire', 'Wire instructions verified by phone', { tip: 'Wire fraud: always confirm by calling a number you already trust.' }],
        ['b_utils', 'Utilities & move checklist sent'],
        ['b_walk', 'Final walkthrough'],
      ],
      closed: [
        ['b_closed', 'Closed — keys handed over'],
        ['b_gift', 'Closing gift'],
        ['b_review', 'Asked for a review'],
        ['b_anniv', 'Home anniversary reminder set'],
        ['b_ref', 'Asked for referrals'],
      ],
    },
    sell: {
      lead: [['s_call', 'First conversation'], ['s_sched', 'Listing appointment booked']],
      appt: [
        ['s_cma', 'CMA prepared'],
        ['s_present', 'Listing presentation'],
        ['s_agency', 'Agency relationship disclosed & signed', { tip: 'e.g. Seller’s Limited Agent — your brokerage disclosure form.' }],
        ['s_neg', 'Explained commissions are negotiable and not set by law'],
        ['s_bcomp', 'Buyer-agent compensation: seller’s decision — written approval with the amount, before any offer', { tip: 'NAR settlement ¶58 viii.' }],
        ['s_q', 'Seller questionnaire done'],
        ['s_net', 'Net sheet reviewed'],
        ['s_la', 'Listing agreement signed'],
        ['s_disc', 'Seller disclosures started'],
        ['s_lead', 'Lead-paint disclosure (built before 1978)'],
      ],
      prep: [
        ['s_walk', 'Walkthrough & prep list'],
        ['s_repairs', 'Repairs & touch-ups done'],
        ['s_stage', 'Staging'],
        ['s_photos', 'Professional photos'],
        ['s_media', 'Floor plan / video / 3D tour'],
        ['s_sign', 'Sign & lockbox installed'],
        ['s_showing', 'Showing instructions set'],
        ['s_mls', 'MLS listing approved by seller'],
      ],
      active: [
        ['s_live', 'Listing live — syndication checked'],
        ['s_oh', 'Open house scheduled'],
        ['s_update', 'Weekly seller update'],
        ['s_feedback', 'Showing feedback shared'],
        ['s_price', 'Price review (14–21 days)'],
      ],
      contract: [
        ['s_offers', 'Offers reviewed with net sheets'],
        ['s_accept', 'Offer accepted 🎉'],
        ['s_emd', 'Buyer earnest money confirmed'],
        ['s_insp', 'Buyer inspection'],
        ['s_repair', 'Repair request negotiated'],
        ['s_appr', 'Appraisal'],
        ['s_fin', 'Buyer financing approved'],
        ['s_title', 'Title & payoff ordered'],
        ['s_hoa', 'HOA resale documents'],
        ['s_move', 'Move-out plan & utilities'],
        ['s_walk', 'Final walkthrough'],
      ],
      closed: [
        ['s_closed', 'Closed — keys & remotes handed over'],
        ['s_remove', 'Sign & lockbox removed'],
        ['s_gift', 'Thank-you gift'],
        ['s_review', 'Asked for a review'],
        ['s_anniv', 'Home anniversary reminder set'],
        ['s_ref', 'Asked for referrals'],
      ],
    },
  };

  // Buyer's estimated expenses: sections and lines in the order of the association worksheet
  // Eric uses (Kansas City Regional Association of REALTORS® "Buyer's Estimated Expense Worksheet",
  // 2026-10-20) so the numbers carry straight onto the official form. Our own wording — the form
  // itself is copyrighted and member-only. [key, label, {calc: from other inputs, pct: % of the loan unless
  // an amount is typed, loan: zero on a cash sale, other: free-text label}]
  AG.WS_SECTIONS = [
    ['A', 'Origination charges', [['origination', 'Origination fee', { loan: 1, pct: 1 }], ['points', 'Loan discount fee (points)', { loan: 1, pct: 1 }], ['lenderFees', 'Lender fees', { loan: 1 }]]],
    ['B', 'Lender coordinated services', [['creditReport', 'Credit report', { loan: 1 }], ['appraisal', 'Appraisal', { loan: 1 }], ['floodCert', 'Flood certificate', { loan: 1 }], ['taxService', 'Tax service fee', { loan: 1 }]]],
    ['C', 'Services and fees', [['survey', 'Survey (if required)', { survey: 1 }], ['titleFee', 'Title / escrow closing fee'], ['mortgageeTitle', 'Mortgagee’s title policy', { loan: 1, pct: 1 }], ['recording', 'Recording fees']]],
    ['D', 'Prepaid expenses', [['prepaidInterest', 'Prepaid interest', { calc: 'prepaid', loan: 1 }], ['insPremium', 'Homeowner’s insurance premium (12 months)', { calc: 'ins' }], ['insEscrow', 'Homeowner’s insurance', { calc: 'ins', loan: 1 }], ['taxEscrow', 'Property taxes', { calc: 'tax', loan: 1 }]]],
    ['E', 'Other costs', [['hoaProration', 'Home association prorations', { calc: 'hoa' }], ['hoaTransfer', 'HOA transfer fee'], ['warranty', 'Home warranty fee'], ['brokerComm', 'Broker’s commission'], ['otherComm', 'Other commission'], ['other1', 'Other', { other: 1 }], ['other2', 'Other', { other: 1 }]]],
    ['F', 'Inspection costs', [['inspWhole', 'Whole house'], ['inspWDI', 'Wood destroying insects'], ['insp1', 'Other', { other: 1 }], ['insp2', 'Other', { other: 1 }]]],
  ];
  AG.WS_LOANS = ['Conventional', 'FHA', 'VA', 'USDA', 'Jumbo', 'Cash'];

  // Follow-up plans (ROADMAP #5 "drip sequences"): a series of reminders you start on a client in one tap.
  // d = days from today, h = hour; {nm} = their first names. side limits a step to buyers / sellers.
  AG.PLANS = [
    { id: 'newlead', name: 'New lead — first 2 weeks', sub: 'Six touches while they’re hot', steps: [
      { d: 0, h: 18, kind: 'text', title: 'Intro text to {nm}', tpl: 'intro' },
      { d: 1, h: 10, kind: 'call', title: 'Call {nm}' },
      { d: 3, h: 10, kind: 'email', title: 'Send {nm} a few homes', tpl: 'listings', side: 'buy' },
      { d: 3, h: 10, kind: 'email', title: 'Send {nm} a home value snapshot', tpl: 'market', side: 'sell' },
      { d: 7, h: 12, kind: 'text', title: 'Check in with {nm}', tpl: 'checkin' },
      { d: 10, h: 17, kind: 'call', title: 'Call {nm} again' },
      { d: 14, h: 10, kind: 'email', title: 'Market update for {nm}', tpl: 'market' },
    ] },
    { id: 'notready', name: 'Not ready yet — 6 months', sub: 'Stay in touch until they are', steps: [
      { d: 7, h: 10, kind: 'email', title: 'Market update for {nm}', tpl: 'market' },
      { d: 30, h: 12, kind: 'text', title: 'Check in with {nm}', tpl: 'checkin' },
      { d: 60, h: 10, kind: 'email', title: 'Market update for {nm}', tpl: 'market' },
      { d: 90, h: 17, kind: 'call', title: 'Call {nm} — how are plans?' },
      { d: 120, h: 10, kind: 'email', title: 'Market update for {nm}', tpl: 'market' },
      { d: 180, h: 12, kind: 'text', title: 'Ready to start, {nm}?', tpl: 'ready' },
    ] },
    { id: 'aftershow', name: 'After showings', sub: 'Feedback while it’s fresh', side: 'buy', steps: [
      { d: 0, h: 19, kind: 'text', title: 'How did the homes feel, {nm}?', tpl: 'showfb' },
      { d: 2, h: 10, kind: 'email', title: 'Send {nm} new homes like the favorite', tpl: 'listings' },
      { d: 5, h: 17, kind: 'call', title: 'Call {nm} — next showings?' },
    ] },
    { id: 'listing', name: 'Listing — weekly seller updates', sub: 'Showings, feedback and the market, every week for 8 weeks', side: 'sell', steps: [7, 14, 21, 28, 35, 42, 49, 56].map((d) => ({ d, h: 10, kind: 'email', title: 'Weekly listing update for {nm}', tpl: 'market' })) },
    { id: 'pastclient', name: 'Past client — year of touches', sub: 'Birthdays and anniversaries are already automatic', steps: [
      { d: 90, h: 12, kind: 'text', title: 'Check in with {nm}', tpl: 'checkin' },
      { d: 180, h: 10, kind: 'email', title: 'Home value update for {nm}', tpl: 'market' },
      { d: 270, h: 12, kind: 'text', title: 'Check in with {nm}', tpl: 'checkin' },
      { d: 365, h: 17, kind: 'call', title: 'Yearly call with {nm} — referrals?' },
    ] },
  ];

  // Top 10 Buyer Rules — how the buyer stays out of trouble between contract and closing
  // (from Eric's course workbook, 2026-10-20). `why` is the talking point under each rule.
  AG.BUYER_RULES = [
    ['Don’t quit or change your job.', 'Your lender checks your job again right before closing.',
      'Lenders usually call your employer within days of closing to confirm you still work there. A new job, a move from salary to commission or self-employment, or even a short gap can mean your loan gets re-underwritten — which delays closing or can end in a denial. If a change can’t wait, talk to your lender before you accept it.'],
    ['Don’t incur new debt.', 'New payments can push you past what you were approved for.',
      'Your approval is built on debt-to-income: your monthly debts compared with your monthly income. A new loan, financed furniture, co-signing for someone or a bigger card balance adds a payment and can push that ratio over the limit. Many lenders check credit or watch for new accounts again right before closing.'],
    ['Don’t go out and buy “big ticket” items — new cars, big screen TVs, etc.', 'You may be living in your new car.',
      'A car loan or a financed purchase adds debt, and paying cash drains the money your lender counted on for closing and reserves. Either can cost you the house — the classic story is the buyer who bought a new car the week before closing. Shop for the furniture after you have the keys.'],
    ['Be prepared to write an earnest money check.', 'It’s due within days of your offer being accepted.',
      'Your contract sets a short deadline for the earnest money deposit, and missing it can put you in default and let the seller cancel. Keep the money where you can send it quickly, know who holds it (usually the title company or the broker), and confirm how to deliver it safely.'],
    ['Review the basic sales contract form.', 'Know the deadlines and contingencies before you sign.',
      'The contract sets every deadline — inspection, appraisal, financing, closing — and says what happens if one is missed. Understanding your contingencies protects your earnest money and means no surprises mid-deal. We’ll walk through it before you write an offer, not after.'],
    ['Prepare for closing costs.', 'Closing costs come on top of your down payment.',
      'Lender fees, title insurance, recording fees and prepaid taxes and insurance often add 2–5% of the price. Your Closing Disclosure with the final number arrives at least three business days before closing. Plan early so the money is ready.'],
    ['Don’t have your credit pulled by anyone.', 'New inquiries can lower the score your loan depends on.',
      'Applying for a credit card, store financing, a car (dealers pull credit) or another lender creates hard inquiries. Each can drop your score a few points, and your lender may ask you to explain every one in writing. A lower score can change your rate or your approval.'],
    ['Hold on to your cash, sanity — maintain status quo.', 'Keep everything the way your lender saw it.',
      'Underwriters read your bank statements: large deposits or withdrawals need a paper trail, and moving money between accounts means more documents and delays. Keep your finances boring — same accounts, same job, same habits, no big transfers unless your lender says it’s fine. And stay calm: bumps like appraisal or repair questions are normal and usually solvable.'],
    ['Gift money must be seasoned and verified.', 'Gifts need a paper trail your lender can document.',
      'Your lender has to show where every dollar came from. A gift usually needs a signed gift letter saying it isn’t a loan, plus records of the transfer from the giver’s account, and the rules differ by loan type. Money that has sat in your own account for a while (“seasoned” — often two months of statements) needs less explaining. Talk to your lender before any gift moves.'],
    ['Bring only certified funds to closing.', 'A cashier’s check or a wire — never a personal check or cash.',
      'The title company needs guaranteed funds, so personal checks and cash aren’t accepted for the closing amount. Wire fraud is common: criminals email fake wire instructions that look real. Always call the title company at a number you already know to confirm the instructions before you send money — and never trust an email that changes them.'],
  ];

  const WHEN = ['ASAP', '1–3 months', '3–6 months', '6–12 months', '12+ months', 'Just exploring'];
  AG.FEATURES = ['Garage', 'Yard', 'Fenced yard', 'Basement', 'Office', 'Primary on main', 'Single level', 'Open floor plan', 'Updated kitchen',
    'Pool', 'Big lot', 'Good schools', 'Walkable', 'Quiet street', 'Pet friendly', 'Guest suite', 'Workshop', 'EV charging'];
  AG.FLAGS = ['Busy road', 'HOA', 'Pool', 'Major repairs', 'Shared walls', 'Steep driveway', 'Flood zone', 'Long commute', 'Stairs', 'Septic', 'Power lines'];
  /** What a buyer can rank. Names match the factors AG.match scores. */
  AG.RANK = ['Location', 'Schools', 'Price', 'Size & bedrooms', 'Commute', 'Yard & lot', 'Move-in ready', 'Garage', 'Quiet & safe', 'Low HOA', 'Layout', 'Character & style'];
  const notCash = (q) => q.payWith !== 'Cash';

  // Meeting questionnaire. side: only for that side; show: only when it applies.
  // t: text tel email num money date area one many yn scale rank
  // Agency relationships, as on the Missouri brokerage disclosure form (Eric, 2026-10-20).
  AG.AGENCY = ['Buyer’s Limited Agent', 'Seller’s Limited Agent', 'Tenant’s Limited Agent', 'Landlord’s Limited Agent', 'Sub-Agent', 'Disclosed Dual Agent', 'Designated Agent', 'Transaction Broker', 'Other agency relationship'];
  const BUY_AGENCY = ['Buyer’s Limited Agent', 'Transaction Broker', 'Designated Agent', 'Disclosed Dual Agent', 'Sub-Agent', 'Other agency relationship'];
  const LA_TYPES = ['Exclusive right to sell', 'Exclusive agency', 'Open listing'];
  const SELL_AGENCY = ['Seller’s Limited Agent', 'Transaction Broker', 'Designated Agent', 'Disclosed Dual Agent', 'Sub-Agent', 'Other agency relationship'];

  // Meeting questionnaire. Eric 2026-10-20: drop the RESUMA framing and keep it short — "just make sure
  // we're capturing the right info". Contact first, the agreement last, then a review page.
  // side: only for that side. show(q, c): only when it applies.
  // A buyer who owns a home gives its value and mortgage on the buying side (the same keys the selling
  // side uses), so the money picture can count what selling it frees up — and whether that money only
  // arrives after their sale closes (a sale-contingent purchase).
  const TITLE_HOW = ['In their names', 'A trust', 'An LLC / company', 'An estate'];
  // Eric 2026-10-20: when the home is in a trust, the proceeds are paid to the trust — the seller may need a bank
  // account in the trust's name to deposit them, and that's worth knowing at the listing, not at the closing table.
  const inTrust = (q) => q.titleHow === 'A trust';
  const TRUST_QS = [
    { k: 'trustName', t: 'text', label: 'Trust’s exact name', ph: 'The Smith Family Trust dated 3/4/2015', cap: 1, show: inTrust, sellerLabel: 'The trust’s exact name' },
    { k: 'trustee', t: 'text', label: 'Trustee(s) who will sign', cap: 1, show: inTrust, sellerLabel: 'Trustee(s) who will sign', tip: 'Title will ask for the trust papers (or a certificate of trust) showing who can sign.' },
    { k: 'trustBank', t: 'one', label: 'Bank account in the trust’s name?', opts: ['Has one', 'Will open one', 'Not sure'], show: inTrust,
      tip: 'The sale money is paid to the owner on the deed — the trust — so the check (or wire) is made out to the trust. They’ll likely need an account in the trust’s name to deposit it. Banks ask for the trust papers, so start early.',
      sellerLabel: 'Do you have a bank account in the trust’s name?',
      sellerTip: 'At closing, your sale money is paid to the trust (the owner on the deed), so the check or wire is made out to the trust. You’ll likely need an account in the trust’s name to deposit it. Banks ask for the trust papers, so it’s worth starting early.' },
  ];
  const LOOKING = ['Just starting', 'A few weeks', '1–3 months', '3–6 months', '6+ months'];
  const owns = (q, c) => q.living === 'Own a home' || !!(c && c.sides.includes('sell'));
  const ownsNotListing = (q, c) => q.living === 'Own a home' && !(c && c.sides.includes('sell'));
  AG.INTAKE = [
    { id: 'who', title: 'Contact', icon: 'users', qs: [
      { k: 'first', t: 'text', label: 'First name', half: 1, cap: 1 },
      { k: 'last', t: 'text', label: 'Last name', half: 1, cap: 1 },
      { k: 'phone', t: 'tel', label: 'Mobile', half: 1 },
      { k: 'email', t: 'email', label: 'Email', half: 1 },
      { k: 'partner', t: 'text', label: 'Partner / co-buyer', ph: 'Anyone else on the deal', cap: 1 },
      { k: 'partnerPhone', t: 'tel', label: 'Partner’s mobile', half: 1, show: (q) => !!q.partner },
      { k: 'partnerEmail', t: 'email', label: 'Partner’s email', half: 1, show: (q) => !!q.partner },
      { k: 'pref', t: 'one', label: 'Best way to reach them', opts: ['Text', 'Call', 'Email'] },
      { k: 'source', t: 'one', label: 'How did they find you?', opts: ['Referral', 'Past client', 'Friend / family', 'Open house', 'Online lead', 'Sign call', 'Social media', 'Other'] },
      { k: 'referredBy', t: 'text', label: 'Referred by', show: (q) => /Referral|Past client|Friend/.test(q.source || ''), tip: 'Remember to thank them.' },
      { k: 'birthday', t: 'md', label: 'Birthday', half: 1, tip: 'Yearly reminder + card.' },
      { k: 'mailAddr', t: 'text', label: 'Mailing address', half: 1, ph: 'For cards', cap: 1, ac: 'line' },
      { k: 'mailNew', t: 'check', label: 'Switch cards to the home they buy', show: (q, c) => !!c && AG.has(c, 'buy'), tip: 'Once they buy, cards go to their new home instead.' },
    ] },

    // ----- selling -----
    { id: 'sreq', side: 'sell', title: 'Their property', icon: 'house', qs: [
      { k: 'addr', t: 'text', label: 'Street address', cap: 1, ac: { city: 'city', zip: 'zip', st: 'sSt' } },
      { k: 'city', t: 'text', label: 'City', half: 1, cap: 1 },
      { k: 'zip', t: 'text', label: 'ZIP', half: 1, im: 'numeric' },
      { k: 'sSt', t: 'sel', label: 'State', opts: AG.STATES.map((x) => x[1]), tip: 'Any state. Kansas and Missouri contract rules are built in so far.' },
      { k: 'sType', t: 'one', label: 'Type', opts: ['Single family', 'Townhome', 'Condo', 'Multi-family', 'Land', 'Manufactured'] },
      { k: 'sBeds', t: 'num', label: 'Beds', third: 1 },
      { k: 'sBaths', t: 'num', label: 'Baths', third: 1 },
      { k: 'sSqft', t: 'num', label: 'Sq ft', third: 1 },
      { k: 'sYear', t: 'num', label: 'Year built', half: 1 },
      { k: 'boughtYear', t: 'num', label: 'They bought it in', half: 1 },
      { k: 'sLot', t: 'text', label: 'Lot size', ph: '0.25 ac', half: 1 },
      { k: 'acreage', t: 'yn', label: 'Acreage / land with it?', half: 1, tip: 'Adds the land disclosure addendum.' },
      { k: 'hoaFee', t: 'money', label: 'HOA / month', half: 1 },
      { k: 'loveHome', t: 'area', label: 'What they love about it', rows: 2, tip: 'These become the listing’s highlights.' },
    ] },
    { id: 'sstatus', side: 'sell', title: 'Condition & showings', icon: 'check', qs: [
      { k: 'cond', t: 'one', label: 'Condition', opts: ['Move-in ready', 'Needs a little work', 'Needs major work', 'Tear-down / land value'] },
      { k: 'updates', t: 'many', label: 'Recent updates', opts: ['Roof', 'HVAC', 'Water heater', 'Windows', 'Kitchen', 'Bathrooms', 'Flooring', 'Paint', 'Electrical', 'Plumbing', 'Siding', 'Deck / patio', 'Landscaping'] },
      { k: 'updatesNote', t: 'text', label: 'Years / details', ph: 'Roof 2019, HVAC 2021…' },
      { k: 'issues', t: 'area', label: 'Known issues (for disclosures)', ph: 'Leaks, foundation, past claims…', rows: 2 },
      { k: 'inspReports', t: 'yn', label: 'Any inspection reports?', tip: 'They’ll be given to buyers with the disclosure.' },
      { k: 'smart', t: 'many', label: 'Smart-home devices (reset at closing)', opts: ['Thermostat', 'Door locks', 'Doorbell / cameras', 'Garage opener', 'Security system', 'Lights / switches', 'Sprinklers', 'Other'] },
      { k: 'occupancy', t: 'one', label: 'Lived in by', opts: ['Owner', 'Tenant', 'Vacant'] },
      { k: 'tenantEnd', t: 'date', label: 'Tenant lease ends', show: (q) => q.occupancy === 'Tenant' },
      { k: 'showings', t: 'one', label: 'Showings', opts: ['Anytime with notice', '24 hours’ notice', 'Limited times', 'By appointment only'] },
      { k: 'lockbox', t: 'yn', label: 'Lockbox OK?' },
      { k: 'pets', t: 'yn', label: 'Pets in the home?' },
      { k: 'prep', t: 'many', label: 'Prep to plan', opts: ['Deep clean', 'Declutter', 'Repairs', 'Paint', 'Staging', 'Pre-inspection', 'Landscaping', 'Pro photos', 'Video / 3D tour'] },
    ] },
    { id: 'smoney', side: 'sell', title: 'Money & timing', icon: 'dollar', qs: [
      { k: 'expect', t: 'money', label: 'What they think it’s worth', half: 1 },
      { k: 'minNet', t: 'money', label: 'Net they need to walk away with', half: 1 },
      { k: 'payoff', t: 'money', label: 'Mortgage balance', half: 1 },
      { k: 'payoff2', t: 'money', label: '2nd mortgage / HELOC', half: 1 },
      { k: 'lender1', t: 'text', label: 'Mortgage company', half: 1, show: (q) => +q.payoff > 0 },
      { k: 'lender2', t: 'text', label: '2nd / HELOC lender', half: 1, show: (q) => +q.payoff2 > 0 },
      { k: 'liens', t: 'yn', label: 'Any liens, judgments or back taxes?' },
      { k: 'onTitle', t: 'text', label: 'Everyone on title', ph: 'Names exactly as on the deed', half: 1 },
      { k: 'allAgree', t: 'yn', label: 'All on board?', half: 1 },
      { k: 'titleHow', t: 'one', label: 'Title is held — is it in a trust?', opts: TITLE_HOW },
      ...TRUST_QS,
      { k: 'marital', t: 'one', label: 'Marital status', opts: ['Married', 'Single', 'Divorced', 'Widowed'], tip: 'Goes next to the seller names on the listing contract.' },
      { k: 'insurer', t: 'text', label: 'Homeowner’s insurance company', half: 1 },
      { k: 'foreign', t: 'yn', label: 'Any owner a foreign person (tax)?', half: 1, tip: 'FIRPTA — they should talk to an attorney or accountant before signing.' },
      { k: 'special', t: 'many', label: 'Anything special?', opts: ['Probate', 'Divorce', 'Short sale', 'Relocation company', 'Tenant in place', '1031 exchange', 'Selling as-is'] },
      { k: 'sellBy', t: 'one', label: 'When do they want to be sold?', opts: WHEN },
      { k: 'sellDate', t: 'date', label: 'Need to be out by', half: 1 },
      { k: 'sMotivation', t: 'scale', label: 'How serious are they? (1–10)' },
      { k: 'sellWhy', t: 'many', label: 'Why sell?', opts: ['Need more space', 'Want a nicer / newer home', 'Downsizing', 'Relocating', 'Divorce', 'Estate / inherited', 'Financial', 'Retiring', 'Cashing out', 'Life change', 'Other'] },
      { k: 'next', t: 'one', label: 'Where are they going next?', opts: ['Buying with me', 'Buying elsewhere', 'Renting', 'With family', 'Not sure'] },
      { k: 'sNeeds', t: 'many', label: 'What they need from the sale', opts: ['Top dollar', 'Quick sale', 'Close by a date', 'Rent-back', 'Sell as-is', 'Contingent on buying', 'Few showings', 'Off-market / private'] },
    ] },

    { id: 'stogether', side: 'sell', title: 'The listing', icon: 'flag', qs: [
      { k: 'otherAgents', t: 'one', label: 'Interviewing other agents?', opts: ['No', 'Yes', 'Not sure'] },
      { k: 'sAgency', t: 'one', label: 'Your relationship to them', opts: SELL_AGENCY, tip: 'From your brokerage relationship disclosure.' },
      { k: 'sAgencyDate', t: 'date', label: 'Disclosure signed', half: 1 },
      // Eric 2026-10-20 asked for "exclusive" here — on the Missouri form that's the agreement type, not the relationship.
      { k: 'laType', t: 'one', label: 'Listing agreement type', opts: LA_TYPES,
        tip: 'Exclusive right to sell: you’re paid whoever finds the buyer (the KCRAR listing contract). Exclusive agency: you’re their only agent, but no fee if they find the buyer themselves. Open: any agent can sell it; only the one who does is paid.' },
      { k: 'sNegotiable', t: 'yn', label: 'Told them commissions are negotiable and not set by law?', tip: 'The listing agreement has to say so in plain, conspicuous language.' },
      { k: 'offerBuyerComp', t: 'one', label: 'Offer compensation to buyer’s agents?', opts: ['Yes', 'No', 'Decide per offer'], tip: 'Their choice — nothing requires it. Offers can’t go in the MLS, and buyers must be told about any offer early.' },
      { k: 'buyerCompPct', t: 'num', label: 'Offered %', half: 1, show: (q) => q.offerBuyerComp === 'Yes' },
      { k: 'buyerCompFlat', t: 'money', label: 'or flat amount', half: 1, show: (q) => q.offerBuyerComp === 'Yes' },
      { k: 'buyerCompApproved', t: 'date', label: 'Seller approved it in writing on', show: (q) => q.offerBuyerComp === 'Yes', tip: 'Required in advance of any offer or payment to a buyer’s agent, with the amount or rate (NAR settlement ¶58 viii).' },
      { k: 'la', t: 'one', label: 'Listing agreement', opts: ['Signed today', 'Signing soon', 'Not yet'] },
      { k: 'listPrice', t: 'money', label: 'List price', half: 1 },
      { k: 'listPct', t: 'num', label: 'Your commission %', half: 1 },
      { k: 'listDate', t: 'date', label: 'Go-live date', half: 1 },
      { k: 'listExpires', t: 'date', label: 'Agreement ends', half: 1 },
      { k: 'sCadence', t: 'one', label: 'How often do they want updates?', opts: ['Twice a week', 'Weekly', 'Every 2 weeks', 'After every showing'] },
    ] },
    // The terms of the KCRAR Exclusive Right to Sell Contract (July 2024), in its order. Not part of the
    // first meeting (meet: false) — filled in at the listing appointment from the Listing tab.
    { id: 'scontract', side: 'sell', meet: false, title: 'Listing contract', icon: 'sign', qs: [
      { k: 'legal', t: 'area', label: 'Legal description', rows: 2, ph: 'From the deed or county records', tip: 'Or attach the Legal Description Addendum.' },
      { k: 'propKind', t: 'one', label: 'This contract is for', opts: ['Residential resale', 'New construction', 'Land'] },
      { k: 'mlsStatus', t: 'one', label: 'MLS', opts: ['Active within 1 business day', 'No showings until a date'] },
      { k: 'mlsActive', t: 'date', label: 'Showings start (MLS active date)', show: (q) => q.mlsStatus === 'No showings until a date' },
      { k: 'inetOptOut', t: 'yn', label: 'Opt out of internet advertising?', half: 1, tip: 'Needs the separate Opt-Out form.' },
      { k: 'sign', t: 'yn', label: 'Yard sign OK?', half: 1 },
      { k: 'emdPct', t: 'num', label: 'Your share if a buyer forfeits earnest money (%)', half: 1, ph: '0', tip: '0 if left blank — never more than your compensation would have been.' },
      { k: 'backups', t: 'yn', label: 'Keep showing for backup offers?', half: 1 },
      { k: 'discloseWhy', t: 'one', label: 'You may tell buyers why they’re selling', opts: ['No', 'Yes'] },
      { k: 'discloseWhyText', t: 'text', label: 'What you may say', show: (q) => q.discloseWhy === 'Yes', ph: 'Relocating for work' },
      { k: 'otherOffers', t: 'one', label: 'Other offers — you may disclose', opts: ['Nothing', 'That they exist', 'That they exist and their terms'] },
      { k: 'cSeller', t: 'yn', label: 'Consents to seller agency', half: 1 },
      { k: 'cTB', t: 'yn', label: 'Consents to a transaction broker', half: 1 },
      { k: 'cSub', t: 'yn', label: 'Consents to subagency', half: 1 },
      { k: 'cDual', t: 'yn', label: 'Consents to disclosed dual agency', half: 1, show: (q) => q.sSt !== 'Kansas', tip: 'Missouri allows it with consent; Kansas doesn’t.' },
      { k: 'cDesSeller', t: 'yn', label: 'Designated agent for them', half: 1 },
      { k: 'cDesBuyer', t: 'yn', label: 'Designated agent for a buyer of their home', half: 1 },
      { k: 'listFlat', t: 'money', label: 'Or a flat fee instead of %', half: 1, tip: 'Your compensation % is on The listing step. No standard rates — fully negotiable and not set by law.' },
      { k: 'otherComp', t: 'text', label: 'Other compensation', half: 1 },
      { k: 'compDisclose', t: 'one', label: 'You may tell buyers’ agents they’re willing to pay', opts: ['Yes', 'No'], show: (q) => q.offerBuyerComp === 'Yes' },
      { k: 'protection', t: 'num', label: 'Protection period (days)', half: 1, ph: '90' },
      { k: 'titleCo', t: 'text', label: 'Title company', half: 1 },
      { k: 'warranty', t: 'one', label: 'Home warranty', opts: ['Buying one', 'Not buying'] },
      { k: 'warrantyMax', t: 'money', label: 'Up to', half: 1, show: (q) => q.warranty === 'Buying one' },
      { k: 'warrantyCo', t: 'text', label: 'From (company)', half: 1, show: (q) => q.warranty === 'Buying one' },
      { k: 'addlTerms', t: 'area', label: 'Additional terms', rows: 2 },
    ] },

    // ----- buying -----
    { id: 'current', side: 'buy', title: 'Where they live now', icon: 'house', qs: [
      { k: 'living', t: 'one', label: 'Current home', opts: ['Renting', 'Own a home', 'With family', 'Other'], show: (q, c) => !(c && c.sides.includes('sell')) },
      { k: 'leaseEnd', t: 'date', label: 'Lease ends', show: (q) => q.living === 'Renting', tip: 'You’ll get a check-in reminder 90 days before.' },
      { k: 'needSell', t: 'one', label: 'Their current home', opts: ['Must sell first', 'Can buy first', 'Keeping it'], show: owns,
        tip: '“Must sell first” makes their offer contingent on that sale — the money from it arrives only when it closes.' },
      { k: 'expect', t: 'money', label: 'What it’s worth (about)', half: 1, show: ownsNotListing },
      { k: 'payoff', t: 'money', label: 'Mortgage balance', half: 1, show: ownsNotListing },
      { k: 'payoff2', t: 'money', label: '2nd mortgage / HELOC', half: 1, show: ownsNotListing },
      { k: 'curPayment', t: 'money', label: 'Their payment today', half: 1, show: owns, tip: 'Matters if they’d carry two payments for a while.' },
      { k: 'firstTime', t: 'yn', label: 'First-time buyer?', show: (q, c) => !owns(q, c) },
      { k: 'firstNeed', t: 'area', label: 'What has to happen first — or quickly?', ph: 'Lease ending, job start, baby due…', rows: 2 },
      { k: 'likeCurrent', t: 'area', label: 'What they like — and want to change — about where they live now', rows: 2 },
    ] },
    { id: 'money', side: 'buy', title: 'Money', icon: 'dollar', qs: [
      { k: 'payWith', t: 'one', label: 'Paying with', opts: ['Mortgage', 'Cash'] },
      { k: 'preapproved', t: 'one', label: 'Pre-approved?', opts: ['Yes', 'In progress', 'Not yet'], show: notCash, tip: 'No letter yet? Offer a lender intro — sellers expect one with every offer.' },
      { k: 'preAmount', t: 'money', label: 'Pre-approved for', half: 1, show: (q) => notCash(q) && q.preapproved && q.preapproved !== 'Not yet' },
      { k: 'preExpires', t: 'date', label: 'Letter expires', half: 1, show: (q) => notCash(q) && q.preapproved === 'Yes' },
      { k: 'lender', t: 'lender', label: 'Lender', show: notCash },
      { k: 'loanType', t: 'one', label: 'Loan type', opts: ['Conventional', 'FHA', 'VA', 'USDA', 'Jumbo', 'Not sure'], show: notCash },
      { k: 'budgetMin', t: 'money', label: 'Price range — from', half: 1 },
      { k: 'budgetMax', t: 'money', label: 'up to', half: 1 },
      { k: 'downAs', t: 'one', label: 'Down payment as', opts: ['Set amount', '% of price'], show: notCash, tip: 'A % follows whichever home they find.' },
      { k: 'down', t: 'money', label: 'Down payment they plan', half: 1, show: (q) => notCash(q) && q.downAs !== '% of price', tip: 'Total, including earnest money.' },
      { k: 'downPct', t: 'num', label: 'Down payment %', ph: 'e.g. 10', half: 1, show: (q) => notCash(q) && q.downAs === '% of price', tip: 'Of the price, including earnest money.' },
      { k: 'monthly', t: 'money', label: 'Comfortable monthly', half: 1, show: notCash },
      { k: 'savings', t: 'money', label: 'Cash on hand for this', half: 1, tip: 'Savings they’ll put toward the purchase.' },
      { k: 'gift', t: 'money', label: 'Gifts / help', half: 1 },
      { k: 'moneyNote', t: 'area', label: 'Money notes', ph: 'Down-payment help, selling stock, credit to fix…', rows: 2 },
    ] },
    { id: 'req', side: 'buy', title: 'The home they want', icon: 'search', qs: [
      { k: 'searchArea', t: 'text', label: 'Main search area', ph: 'City, ST or ZIP — e.g. Springfield, MO', tip: 'Separate several with “;”.' },
      { k: 'areas', t: 'area', label: 'Neighborhoods & school districts', rows: 2 },
      { k: 'propType', t: 'many', label: 'Property type', opts: ['Single family', 'Townhome', 'Condo', 'Multi-family', 'Land', 'New construction'] },
      { k: 'beds', t: 'one', label: 'Bedrooms (at least)', opts: ['1', '2', '3', '4', '5+'] },
      { k: 'baths', t: 'one', label: 'Bathrooms (at least)', opts: ['1', '1.5', '2', '2.5', '3+'] },
      { k: 'sqft', t: 'num', label: 'Sq ft (at least)', half: 1 },
      { k: 'garage', t: 'one', label: 'Garage', opts: ['None ok', '1 car', '2 car', '3+ car'] },
      { k: 'must', t: 'many', label: 'Must-haves', opts: AG.FEATURES },
      { k: 'dealbreakers', t: 'many', label: 'Deal-breakers', opts: AG.FLAGS },
      { k: 'rank', t: 'rank', label: 'What matters most — tap in order', opts: AG.RANK, tip: 'Top priorities count most in each home’s fit score.' },
      { k: 'commute', t: 'text', label: 'Work / commute address', ph: 'For drive-time checks' },
    ] },
    { id: 'timing', side: 'buy', title: 'Timing', icon: 'clock', qs: [
      { k: 'moveBy', t: 'one', label: 'When do they want to move?', opts: WHEN },
      { k: 'moveDate', t: 'date', label: 'Hard deadline (if any)', half: 1 },
      { k: 'lookingFor', t: 'one', label: 'Looking for how long?', opts: LOOKING },
      { k: 'whyLong', t: 'text', label: 'Why so long?', show: (q) => /1–3|3–6|6\+/.test(q.lookingFor || ''), ph: 'Nothing fits, outbid, waiting on money…' },
      { k: 'motivation', t: 'scale', label: 'How serious are they? (1–10)' },
      { k: 'why', t: 'many', label: 'Why are they moving?', opts: ['More space', 'Nicer / newer home', 'Downsizing', 'New job / relocating', 'First home', 'Schools', 'Closer to family', 'Investment', 'Second home', 'Life change', 'Other'] },
      { k: 'deciders', t: 'text', label: 'Who else has to say yes?', ph: 'Parents, partner out of town…' },
      { k: 'tourAvail', t: 'many', label: 'When can they tour?', opts: ['Weekday mornings', 'Weekday evenings', 'Saturdays', 'Sundays', 'Flexible'] },
    ] },
    // ----- agreements -----
    { id: 'together', side: 'buy', title: 'Working together', icon: 'check', qs: [
      { k: 'otherAgent', t: 'one', label: 'Working with another agent?', opts: ['No', 'Talking to others', 'Signed with another agent'], tip: 'If they’ve signed with another agent, stop here.' },
      { k: 'agency', t: 'one', label: 'Your relationship to them', opts: BUY_AGENCY, tip: 'From your brokerage relationship disclosure.' },
      { k: 'agencyDate', t: 'date', label: 'Disclosure signed', half: 1 },
      { k: 'bra', t: 'one', label: 'Written buyer agreement', opts: ['Signed today', 'Before first showing', 'Needs discussion'], tip: 'Required before touring any home with them, in person or live virtual (NAR rules since Aug 17, 2024).' },
      { k: 'braType', t: 'one', label: 'Agreement type', opts: ['Exclusive', 'Non-exclusive', 'Touring only'] },
      { k: 'braCompType', t: 'one', label: 'Your compensation', opts: ['% of price', 'Flat fee', 'Hourly', 'Other'], tip: 'It must be a set amount or rate — not open-ended like “whatever the seller offers”.' },
      { k: 'braPct', t: 'num', label: 'Rate %', half: 1, show: (q) => q.braCompType === '% of price' },
      { k: 'braFlat', t: 'money', label: 'Flat fee', half: 1, show: (q) => q.braCompType === 'Flat fee' },
      { k: 'braComp', t: 'text', label: 'Terms', ph: 'e.g. $150/hr, min $3,000', half: 1, show: (q) => /Hourly|Other/.test(q.braCompType || '') },
      { k: 'braStart', t: 'date', label: 'Agreement starts', half: 1 },
      { k: 'braExpires', t: 'date', label: 'Agreement ends', half: 1 },
      { k: 'braNegotiable', t: 'yn', label: 'Told them compensation is negotiable and not set by law?', tip: 'The agreement has to say so in plain, conspicuous language.' },
      { k: 'braCap', t: 'yn', label: 'Explained you can’t be paid more than the agreed amount from any source?' },
      { k: 'gapPlan', t: 'one', label: 'If a seller offers less than your fee, they’ll…', opts: ['Ask for it in the offer', 'Pay the difference', 'Decide home by home'] },
      { k: 'cadence', t: 'one', label: 'How often do they want updates?', opts: ['Every few days', 'Weekly', 'Every 2 weeks', 'Monthly', 'When something new comes up'] },
      { k: 'alerts', t: 'yn', label: 'Set up listing alerts?' },
    ] },
  ];
  // The questionnaire a seller fills in themselves — before you meet (a link) or on your tablet.
  // Their words ("you"), the same keys as your meeting questions, so answers drop straight into
  // their client record. Nothing agent-only here (how serious, source, agency, commission).
  AG.SELLER_FORM = [
    { id: 'you', title: 'About you', qs: [
      { k: 'first', t: 'text', label: 'First name', half: 1, cap: 1 },
      { k: 'last', t: 'text', label: 'Last name', half: 1, cap: 1 },
      { k: 'phone', t: 'tel', label: 'Mobile', half: 1 },
      { k: 'email', t: 'email', label: 'Email', half: 1 },
      { k: 'partner', t: 'text', label: 'Anyone else selling with you?', ph: 'Spouse / co-owner — full name', cap: 1 },
      { k: 'partnerPhone', t: 'tel', label: 'Their mobile', half: 1, show: (q) => !!q.partner },
      { k: 'partnerEmail', t: 'email', label: 'Their email', half: 1, show: (q) => !!q.partner },
      { k: 'marital', t: 'one', label: 'Marital status', opts: ['Married', 'Single', 'Divorced', 'Widowed'], tip: 'The listing contract asks for it.' },
      { k: 'pref', t: 'one', label: 'Best way to reach you', opts: ['Text', 'Call', 'Email'] },
    ] },
    { id: 'home', title: 'Your home', qs: [
      { k: 'addr', t: 'text', label: 'Street address', cap: 1, ac: { city: 'city', zip: 'zip', st: 'sSt' } },
      { k: 'city', t: 'text', label: 'City', half: 1, cap: 1 },
      { k: 'zip', t: 'text', label: 'ZIP', half: 1, im: 'numeric' },
      { k: 'sSt', t: 'sel', label: 'State', opts: AG.STATES.map((x) => x[1]) },
      { k: 'sType', t: 'one', label: 'Type of home', opts: ['Single family', 'Townhome', 'Condo', 'Multi-family', 'Land', 'Manufactured'] },
      { k: 'sBeds', t: 'num', label: 'Bedrooms', third: 1 },
      { k: 'sBaths', t: 'num', label: 'Bathrooms', third: 1 },
      { k: 'sSqft', t: 'num', label: 'Square feet', third: 1 },
      { k: 'sYear', t: 'num', label: 'Year built', half: 1, tip: 'Before 1978 needs a lead-based paint disclosure.' },
      { k: 'boughtYear', t: 'num', label: 'Year you bought it', half: 1 },
      { k: 'sLot', t: 'text', label: 'Lot size', ph: '0.25 acre', half: 1 },
      { k: 'acreage', t: 'yn', label: 'Does it include acreage / land?', half: 1 },
      { k: 'hoaFee', t: 'money', label: 'HOA dues / month', half: 1, ph: '$0 if none' },
      { k: 'loveHome', t: 'area', label: 'What do you love most about it?', rows: 2, tip: 'We’ll use this in the listing.' },
    ] },
    { id: 'cond', title: 'Condition', qs: [
      { k: 'cond', t: 'one', label: 'How would you describe it?', opts: ['Move-in ready', 'Needs a little work', 'Needs major work', 'Tear-down / land value'] },
      { k: 'updates', t: 'many', label: 'Updated in the last 10 years', opts: ['Roof', 'HVAC', 'Water heater', 'Windows', 'Kitchen', 'Bathrooms', 'Flooring', 'Paint', 'Electrical', 'Plumbing', 'Siding', 'Deck / patio', 'Landscaping'] },
      { k: 'updatesNote', t: 'text', label: 'Years / details', ph: 'Roof 2019, HVAC 2021…' },
      { k: 'issues', t: 'area', label: 'Anything a buyer should know?', ph: 'Leaks, foundation, past insurance claims…', rows: 2, tip: 'Sellers have to disclose known defects — better to plan for them now.' },
      { k: 'inspReports', t: 'yn', label: 'Do you have any inspection reports?' },
      { k: 'smart', t: 'many', label: 'Smart-home devices', opts: ['Thermostat', 'Door locks', 'Doorbell / cameras', 'Garage opener', 'Security system', 'Lights / switches', 'Sprinklers', 'Other'], tip: 'They get reset for the buyer at closing.' },
      { k: 'occupancy', t: 'one', label: 'Who lives there now?', opts: ['Owner', 'Tenant', 'Vacant'] },
      { k: 'tenantEnd', t: 'date', label: 'Tenant’s lease ends', show: (q) => q.occupancy === 'Tenant' },
      { k: 'pets', t: 'yn', label: 'Pets in the home?', half: 1 },
      { k: 'lockbox', t: 'yn', label: 'OK with a lockbox for showings?', half: 1 },
      { k: 'showings', t: 'one', label: 'Showings', opts: ['Anytime with notice', '24 hours’ notice', 'Limited times', 'By appointment only'] },
    ] },
    { id: 'own', title: 'Ownership & loans', qs: [
      { k: 'onTitle', t: 'text', label: 'Everyone on the deed', ph: 'Names exactly as on the deed', tip: 'Everyone on title has to sign.' },
      { k: 'titleHow', t: 'one', label: 'Is the home in your own names, or held in a trust?', opts: TITLE_HOW },
      ...TRUST_QS.map((q) => ({ ...q, label: q.sellerLabel || q.label, tip: q.sellerTip || q.tip })),
      { k: 'payoff', t: 'money', label: 'Mortgage balance (about)', half: 1, ph: '$0 if paid off' },
      { k: 'lender1', t: 'text', label: 'Mortgage company', half: 1 },
      { k: 'payoff2', t: 'money', label: '2nd mortgage / HELOC (about)', half: 1, ph: '$0 if none' },
      { k: 'lender2', t: 'text', label: 'Its lender', half: 1, show: (q) => +q.payoff2 > 0 },
      { k: 'liens', t: 'yn', label: 'Any liens, judgments or back taxes?' },
      { k: 'insurer', t: 'text', label: 'Homeowner’s insurance company' },
      { k: 'foreign', t: 'yn', label: 'Is any owner a foreign person for US tax purposes?', tip: 'If yes, talk to an attorney or accountant before listing (FIRPTA).' },
    ] },
    { id: 'plans', title: 'Timing & plans', qs: [
      { k: 'sellBy', t: 'one', label: 'When would you like to be sold?', opts: WHEN },
      { k: 'sellDate', t: 'date', label: 'Need to be out by', half: 1 },
      { k: 'sellWhy', t: 'many', label: 'What’s behind the move?', opts: ['Need more space', 'Want a nicer / newer home', 'Downsizing', 'Relocating', 'Divorce', 'Estate / inherited', 'Financial', 'Retiring', 'Cashing out', 'Life change', 'Other'] },
      { k: 'next', t: 'one', label: 'Where are you going next?', opts: ['Buying with me', 'Buying elsewhere', 'Renting', 'With family', 'Not sure'] },
      { k: 'sNeeds', t: 'many', label: 'What matters most in the sale?', opts: ['Top dollar', 'Quick sale', 'Close by a date', 'Rent-back', 'Sell as-is', 'Contingent on buying', 'Few showings', 'Off-market / private'] },
      { k: 'expect', t: 'money', label: 'What do you think it’s worth?', half: 1 },
      { k: 'preQs', t: 'area', label: 'Questions for me?', rows: 2 },
    ] },
  ];

  /** The questionnaire sections for this client; all = include the ones not asked at the first meeting. */
  AG.intakeSections = (c, all) => AG.INTAKE.filter((s) => (!s.side || c.sides.includes(s.side)) && (all || s.meet !== false));
  /** The questions of a section that apply to this client right now. */
  AG.visibleQs = (sec, c) => sec.qs.filter((q) => !q.show || q.show(c.q, c));

  // Seller "property ready" list, room by room. Checked items are keyed by text.
  AG.READY = [
    ['Curb appeal', ['Mow, edge & weed', 'Trim bushes & trees', 'Fresh mulch / flowers by the door', 'Power-wash walks, siding & driveway', 'Clean or paint the front door', 'House numbers & porch light working', 'New doormat', 'Clear the gutters']],
    ['Everywhere inside', ['Declutter every surface (pack a third of it)', 'Put away personal photos & collections', 'Deep clean — windows, baseboards, vents', 'Neutral paint touch-ups', 'Replace burnt-out bulbs (same color)', 'Fix squeaky doors, loose handles, sticky drawers', 'Air it out — no strong scents or pet smells']],
    ['Kitchen', ['Counters down to three things', 'Appliances clean inside & out', 'Tidy pantry & under the sink', 'Fix drips, re-caulk the sink']],
    ['Bathrooms', ['Fresh caulk, clean grout', 'New white towels', 'Clear the counters', 'Fix running toilets & drips']],
    ['Bedrooms & closets', ['Beds made with neutral bedding', 'Closets half empty', 'Kids’ rooms tidy, toys in bins']],
    ['Systems, basement & garage', ['HVAC serviced, new filter', 'Smoke & CO detectors tested', 'Garage cleared so a car fits', 'No leaks, damp or odors', 'Breaker panel labeled']],
    ['Paperwork', ['Deed — everyone’s names exactly as on title', 'Trust, LLC or estate papers (if one owns the home)', 'Latest statement for each mortgage / HELOC', 'Inspection reports you already have', '12 months of utility bills', 'HOA documents, rules & fees', 'Warranties & manuals', 'Permits & receipts for updates', 'Survey & title papers', 'Smart-home devices & passwords (reset at closing)', 'Keys, garage remotes & codes']],
    ['Photo day', ['Every light on, blinds open', 'Cars out of the driveway', 'Pets & pet bowls out of sight', 'Toilet seats down, towels straight', 'Trash cans, hoses & cords hidden']],
    ['Showing-ready (every day)', ['Quick tidy, beds made', 'Valuables & medications locked away', 'Lights on, thermostat comfortable', 'Out 15 minutes early, pets too']],
  ];

  AG.HOME_STATUS = {
    buy: [['saved', 'Saved'], ['favorite', 'Favorite'], ['tour', 'To tour'], ['toured', 'Toured'], ['offer', 'Offer out'], ['contract', 'Under contract'], ['bought', 'Bought'], ['pass', 'Passed']],
    list: [['coming', 'Coming soon'], ['active', 'Active'], ['pending', 'Pending'], ['sold', 'Sold'], ['off', 'Off market']],
  };
  AG.homeStatus = (h) => (AG.HOME_STATUS[h.listing ? 'list' : 'buy'].find((s) => s[0] === h.status) || AG.HOME_STATUS[h.listing ? 'list' : 'buy'][0]);

  AG.PARTNER_ROLES = ['Lender', 'Inspector', 'Title / escrow', 'Attorney', 'Insurance', 'Stager', 'Photographer', 'Contractor', 'Mover', 'Other'];

  AG.CARD_SERVICES = [
    ['handwrytten', 'Handwrytten', 'https://www.handwrytten.com/'],
    ['thanksio', 'Thanks.io', 'https://www.thanks.io/'],
    ['postable', 'Postable', 'https://www.postable.com/'],
    ['sendoutcards', 'SendOutCards', 'https://www.sendoutcards.com/'],
  ];

  AG.DEFAULT_TEMPLATES = [
    { id: 'thanks', name: 'Thanks for meeting', kind: 'text', body: 'Hi {first}, thanks for meeting with me today! I’m excited to help you {goal}. I’ll be in touch soon with next steps. — {agent}' },
    { id: 'listings', name: 'New listings for you', kind: 'email', subject: 'Homes I picked out for you', body: 'Hi {first},\n\nHere are a few homes that fit what you’re looking for:\n\n{list}\n\nWant to see any of them this week?\n\n{agent}\n{agentPhone}' },
    { id: 'listing1', name: 'Send one home', kind: 'text', body: 'Hi {first}! This one just caught my eye — {address}. {link}\nWant to take a look?\n{comp}' },
    { id: 'askcomp', name: 'Ask listing agent about compensation', kind: 'text', body: 'Hi, this is {agent} with {brokerage}. I have a buyer interested in {address}. Is the seller offering any compensation to buyer’s agents, or open to it as part of an offer? Thanks!' },
    { id: 'buyerrules', name: 'Top 10 Buyer Rules', kind: 'email', subject: 'Before closing: 10 rules to keep your loan on track', body: 'Hi {first},\n\nCongratulations on getting under contract! Between now and closing your lender can re-check your job, credit and bank accounts, so please keep to these — and why each one matters:\n\n{list}\n\nCheck with me or your lender before any big financial move — even small changes can delay closing.\n\n{agent}' },
    { id: 'worksheet', name: 'Estimated expenses', kind: 'email', subject: 'Your estimated costs{forAddress}', body: 'Hi {first},\n\nHere’s the estimate we went over:\n\n{list}\n\nYour lender’s Loan Estimate and Closing Disclosure will have the final numbers — I’ll compare them with this so there are no surprises.\n\n{agent}' },
    { id: 'sellerForm', name: 'Seller questionnaire (link)', kind: 'text', subject: 'A few questions before we meet', body: 'Hi {first}! Before we meet, here are a few quick questions about your home — about 10 minutes, skip anything you’re not sure of: {link}\n\n{agent}' },
    { id: 'sellerQs', name: 'Seller questions (email)', kind: 'email', subject: 'A few questions before we meet', body: 'Hi {first},\n\nSo I can come prepared, would you reply with what you know? Skip anything you’re not sure of — we’ll fill in the rest together.\n\n{list}\n\nThank you!\n{agent}' },
    { id: 'contractNeeds', name: 'Listing paperwork needed', kind: 'email', subject: 'What we’ll need for your listing{forAddress}', body: 'Hi {first},\n\nTo get your listing agreement ready, here’s what I still need from you:\n\n{list}\n\nNo rush on anything you need to look up — send what you have and we’ll sort out the rest.\n\n{agent}' },
    { id: 'intro', name: 'Nice to meet you', kind: 'text', body: 'Hi {first}, it’s {agent} — great to connect! What’s the best time for a quick call this week to talk about your plans?' },
    { id: 'market', name: 'Market update', kind: 'email', subject: 'What the market’s doing right now', body: 'Hi {first},\n\nA quick look at the market near you: [new listings / what sold / price trend].\n\nWhenever you’re ready to talk next steps, I’m here — no pressure.\n\n{agent}\n{agentPhone}' },
    { id: 'showfb', name: 'After the showings', kind: 'text', body: 'Hi {first}, thanks for touring today! Which one is still on your mind? Anything you’d change about what we’re looking for?' },
    { id: 'ready', name: 'Ready to start?', kind: 'text', body: 'Hi {first}, it’s been a little while — are you still thinking about a move this year? Happy to put together an update for you.' },
    { id: 'checkin', name: 'Checking in', kind: 'text', body: 'Hi {first}, just checking in — how is everything going? Anything I can help with?' },
    { id: 'lender', name: 'Lender intro', kind: 'text', body: 'Hi {first}, here’s the lender I mentioned: {lender}. They’re great to work with and can get you pre-approved quickly.' },
    { id: 'showing', name: 'Showing confirmed', kind: 'text', body: 'Hi {first}, you’re all set to see {address} {date}. See you there!' },
    { id: 'tour', name: 'Tour plan', kind: 'text', body: 'Hi {first}! Here’s our tour {date}:\n{list}\nSee you at the first one!' },
    { id: 'offer', name: 'Offer accepted', kind: 'text', body: 'Congratulations {first}! 🎉 Your offer on {address} was accepted. Next up are inspection and appraisal — I’ll send the timeline today.' },
    { id: 'seller_update', name: 'Weekly seller update', kind: 'email', subject: 'This week at {address}', body: 'Hi {first},\n\nHere’s this week’s update on {address}:\n\n• Showings: \n• Feedback: \n• Online views: \n• Market notes: \n\nHappy to talk through any of it.\n\n{agent}' },
    { id: 'net', name: 'Net sheet', kind: 'email', subject: 'Your estimated net proceeds', body: 'Hi {first},\n\nHere’s the estimate we talked about:\n\n{list}\n\nThese are estimates — title and lender payoff figures will firm them up.\n\n{agent}' },
    { id: 'prep', name: 'Prep list for sellers', kind: 'email', subject: 'Getting {address} ready to list', body: 'Hi {first},\n\nHere’s the prep list we talked about for {address}. Anything you can knock out before photo day makes a real difference:\n\n{list}\n\nHappy to recommend help for any of it.\n\n{agent}' },
    { id: 'birthday', name: 'Happy birthday', kind: 'text', body: 'Happy birthday, {first}! 🎉 Hope you have a great day.' },
    { id: 'anniv', name: 'Home anniversary', kind: 'text', body: 'Happy home anniversary, {first}! 🏡 Hard to believe it’s been a year at {address}. Hope you’re loving it.' },
    { id: 'review', name: 'Ask for a review', kind: 'text', body: 'Hi {first}, it was a pleasure helping you! If you have a minute, a quick review would mean a lot: {reviewLink}' },
    { id: 'congrats', name: 'Congrats on closing', kind: 'text', body: 'Congratulations, {first}! 🔑 Welcome home. It was a joy working with you — I’m always here if you need anything.' },
    { id: 'card_congrats', name: 'Closing congratulations card', kind: 'card', body: 'Congratulations on your new home! Wishing you many happy years at {address}. Thank you for trusting me. — {agent}' },
    { id: 'card_bday', name: 'Birthday card', kind: 'card', body: 'Happy birthday, {first}! Wishing you a wonderful year ahead. — {agent}' },
    { id: 'card_anniv', name: 'Home anniversary card', kind: 'card', body: 'Happy home anniversary! It was such a joy helping you find your home. Here’s to many more years there. — {agent}' },
  ];

  // Me → Connections & resources. cat orders the groups; the MLS rows are the
  // agent's own (filled in Settings), the rest are common agent-only sites.
  AG.LINK_CATS = ['MLS', 'Forms & e-sign', 'Showings & lockbox', 'Research', 'Association & license', 'My links'];
  AG.DEFAULT_LINKS = [
    { id: 'l_rpr', cat: 'Research', name: 'RPR — Realtors Property Resource', url: 'https://www.narrpr.com/' },
    { id: 'l_zip', cat: 'Forms & e-sign', name: 'zipForm / Lone Wolf', url: 'https://www.lwolf.com/' },
    { id: 'l_dotloop', cat: 'Forms & e-sign', name: 'dotloop', url: 'https://www.dotloop.com/' },
    { id: 'l_docusign', cat: 'Forms & e-sign', name: 'DocuSign', url: 'https://app.docusign.com/' },
    { id: 'l_skyslope', cat: 'Forms & e-sign', name: 'SkySlope', url: 'https://skyslope.com/' },
    { id: 'l_showingtime', cat: 'Showings & lockbox', name: 'ShowingTime', url: 'https://www.showingtime.com/' },
    { id: 'l_sentrilock', cat: 'Showings & lockbox', name: 'SentriLock', url: 'https://sentrilock.com/' },
    { id: 'l_supra', cat: 'Showings & lockbox', name: 'Supra eKEY', url: 'https://www.supraekey.com/' },
    { id: 'l_nar', cat: 'Association & license', name: 'NAR (realtor.org)', url: 'https://www.nar.realtor/' },
    { id: 'l_flood', cat: 'Research', name: 'FEMA flood maps', url: 'https://msc.fema.gov/portal/home' },
    { id: 'l_schools', cat: 'Research', name: 'GreatSchools', url: 'https://www.greatschools.org/' },
    { id: 'l_rates', cat: 'Research', name: 'Mortgage rates (Freddie Mac)', url: 'https://www.freddiemac.com/pmms' },
  ];
  // My numbers (Me). d = a date that becomes a renewal reminder.
  AG.ME_FIELDS = [
    ['License', [['license', 'License #'], ['licenseState', 'State'], ['licenseExp', 'License expires', 'd'], ['ceDone', 'CE hours done', 'n'], ['ceReq', 'CE hours required', 'n'], ['ceDue', 'CE due by', 'd']]],
    ['REALTOR® / NAR', [['nrds', 'NRDS ID'], ['narStatus', 'Membership', 'o', ['REALTOR® member', 'REALTOR-ASSOCIATE®', 'Not a member']], ['association', 'Primary association'], ['stateAssoc', 'State association'], ['narSince', 'Member since', 'n'], ['duesPaidThru', 'Dues paid through', 'd'], ['ethicsDone', 'Code of Ethics training done', 'd'], ['ethicsDue', 'Ethics training due by', 'd']]],
    ['MLS', [['mlsId', 'MLS agent ID'], ['mlsOffice', 'MLS office ID'], ['mlsDuesDue', 'MLS dues due', 'd']]],
    ['Brokerage', [['brokerage', 'Brokerage'], ['office', 'Office address'], ['officePhone', 'Office phone', 't'], ['broker', 'Managing broker'], ['brokerPhone', 'Broker phone', 't'], ['brokerLicense', 'Brokerage license #'], ['authorized', 'Relationships your brokerage authorizes', 'm', AG.AGENCY]]],
    ['Insurance & dues', [['eoPolicy', 'E&O policy #'], ['eoCarrier', 'E&O carrier'], ['eoExp', 'E&O renews', 'd'], ['duesDue', 'Association dues due', 'd']]],
    ['Keys & access', [['lockboxId', 'Lockbox key / serial'], ['lockboxExp', 'Key renewal', 'd'], ['showingId', 'Showing service ID']]],
  ];

  // ScoreFrame's token set (bg/s1/s2/ln/tx/mu are per theme; these are the accents)
  AG.PALETTES = {
    harbor: { name: 'Harbor', light: { ac: '#0F8A74', on: '#FFFFFF', acs: '#D5F0E9', act: '#0B6B5A' }, dark: { ac: '#3CC7A8', on: '#04211B', acs: '#173A33', act: '#7FE0C9' } },
    sunset: { name: 'Sunset', light: { ac: '#FF9640', on: '#1A1004', acs: '#FFDCC2', act: '#8B5000' }, dark: { ac: '#FF9640', on: '#1A1004', acs: '#3A2A1A', act: '#FFB477' } },
    trailhead: { name: 'Trailhead', light: { ac: '#4E5A21', on: '#FFFFFF', acs: '#E3E7CF', act: '#4E5A21' }, dark: { ac: '#A9B86A', on: '#1A1F08', acs: '#2F3520', act: '#C8D58F' } },
    navy: { name: 'Navy', light: { ac: '#1F4E8C', on: '#FFFFFF', acs: '#DCE6F5', act: '#1F4E8C' }, dark: { ac: '#7FA8E8', on: '#0A1830', acs: '#1F2A40', act: '#A9C4F0' } },
    brick: { name: 'Brick', light: { ac: '#B5462F', on: '#FFFFFF', acs: '#F6DDD6', act: '#9A3A26' }, dark: { ac: '#F08A6E', on: '#2A0E07', acs: '#3D241E', act: '#F5AC97' } },
  };

  // ---------- sample book (everything tagged demo:true so it can be removed) ----------
  AG.sampleBook = (now = Date.now()) => {
    const d0 = AG.day0(now);
    const at = (d, h = 9, m = 0) => AG.at(AG.addDays(d0, d), h, m);
    const day = (d) => AG.addDays(d0, d);
    const ymd = (d) => AG.ymd(day(d));
    const id = () => AG.uid();
    const clients = [], homes = [], items = [], partners = [];
    const P = (o) => { const p = { id: id(), demo: true, ...o }; partners.push(p); return p; };
    const lender = P({ name: 'Sarah Kim', company: 'Summit Home Loans', role: 'Lender', phone: '4175550147', email: 'sarah@example.com', notes: 'Fast pre-approvals, great with first-time buyers.' });
    P({ name: 'Mike Alvarez', company: 'Keystone Inspections', role: 'Inspector', phone: '4175550163', email: 'mike@example.com' });
    P({ name: 'Dana Brooks', company: 'Lakeside Title', role: 'Title / escrow', phone: '4175550118', email: 'closings@example.com' });
    P({ name: 'Jen Ortiz', company: 'Ortiz Staging Co.', role: 'Stager', phone: '4175550189', email: 'jen@example.com' });

    const C = (sides, q, extra = {}) => {
      const c = { ...AG.newClient(sides), q, demo: true, ...extra };
      clients.push(c);
      return c;
    };
    const log = (c, d, kind, text, h = 10) => c.log.push({ id: id(), ts: at(d, h), kind, text });
    const done = (c, ids, d = -3) => ids.forEach((x) => (c.done[x] = at(d)));
    const I = (o) => { const i = { id: id(), demo: true, kind: 'task', allDay: false, created: now, ...o }; items.push(i); return i; };
    const H = (o) => { const h = { id: id(), demo: true, state: 'MO', clientIds: [], feedback: {}, features: [], flags: [], prices: [], created: now, ...o }; homes.push(h); return h; };

    const maya = C(['buy'], {
      first: 'Maya', last: 'Patel', partner: 'Jordan Patel', phone: '4175550142', email: 'maya.patel@example.com', pref: 'Text', bestTime: ['Evenings'],
      source: 'Referral', referredBy: 'Marcus Lee (past client)', birthday: '03-14', mailAddr: '620 W Monroe St Apt 4, Springfield, MO 65804',
      living: 'Renting', leaseEnd: ymd(75), firstTime: 'Yes', why: ['More space', 'Schools'], whyNote: 'Baby on the way; want a yard and a real office.',
      moveBy: '1–3 months', motivation: 8, tourAvail: ['Weekday evenings', 'Saturdays'],
      payWith: 'Mortgage', preapproved: 'Yes', preAmount: 485000, preExpires: ymd(40), lender: 'Sarah Kim — Summit Home Loans', lenderId: lender.id, loanType: 'Conventional',
      budgetMin: 380000, budgetMax: 460000, down: 46000, monthly: 3000, emdReady: 'Yes', savings: 52000, gift: 10000,
      searchArea: 'Springfield, MO; Nixa, MO', areas: 'Southern Hills, Lake Ridge, Nixa — Springfield R-12 or Nixa schools', propType: ['Single family'],
      beds: '3', baths: '2', sqft: 1800, garage: '2 car', must: ['Garage', 'Fenced yard', 'Office', 'Good schools'], dealbreakers: ['Busy road', 'HOA'],
      rank: ['Schools', 'Location', 'Price', 'Size & bedrooms', 'Yard & lot', 'Commute'], top3: 'Great schools, fenced yard, home office',
      otherAgent: 'No', agency: 'Buyer’s Limited Agent', agencyDate: ymd(-9), bra: 'Signed today', braType: 'Exclusive', braCompType: '% of price', braPct: 2.5, braStart: ymd(-9), braExpires: ymd(171), braNegotiable: 'Yes', braCap: 'Yes', gapPlan: 'Ask for it in the offer', cadence: 'Every few days', alerts: 'Yes',
      notes: 'Jordan works from home — office with a door matters. Dog named Pepper.',
      boughtBefore: 'No', otherSearch: 'Homes in Southern Hills go in a weekend; they lost one on Zillow before calling an agent.', likeCurrent: 'Walk to coffee and the park', changeCurrent: 'No yard, no office, street parking',
      firstNeed: 'Need to be in before the baby (due in March)', lookingFor: '1–3 months', whyLong: 'Were waiting on the pre-approval', stayCost: 'Two more months in a one-bedroom with a newborn', deciders: 'Jordan’s parents help with the down payment — want to see the finalists',
    });
    maya.buy.stage = 'search';
    done(maya, AG.CHECK.buy.lead.map((x) => x[0]).concat(['b_consult', 'b_needs', 'b_agency', 'b_bra', 'b_lender', 'b_preap', 'b_search', 'b_tour1']), -9);
    log(maya, -9, 'meet', 'Buyer consultation — questionnaire done');
    log(maya, -3, 'showing', 'Toured 309 S Pasfield and 1820 Westview');
    log(maya, -1, 'text', 'Sent 2 new listings in Lake Ridge');

    const robert = C(['sell'], {
      first: 'Robert', last: 'Chen', phone: '4175550173', email: 'rchen@example.com', pref: 'Email', source: 'Sign call', mailAddr: '4512 Oak Ridge Dr, Springfield, MO 65804',
      addr: '4512 Oak Ridge Dr', city: 'Springfield', zip: '65804', sType: 'Single family', sBeds: 4, sBaths: 3, sSqft: 2650, sYear: 1998, boughtYear: 2011,
      sellWhy: ['Relocating'], sellBy: '1–3 months', next: 'Buying elsewhere', sMotivation: 9,
      expect: 640000, minNet: 380000, payoff: 212000, allAgree: 'Yes', cond: 'Move-in ready', updates: ['Roof', 'Kitchen', 'HVAC'], updatesNote: 'Roof 2020, kitchen 2018, HVAC 2022',
      occupancy: 'Owner', showings: '24 hours’ notice', lockbox: 'Yes', sAgency: 'Seller’s Limited Agent', sAgencyDate: ymd(-20), laType: 'Exclusive right to sell', sNegotiable: 'Yes', offerBuyerComp: 'Yes', buyerCompPct: 2, buyerCompApproved: ymd(-20), la: 'Signed today', sNeeds: ['Top dollar', 'Close by a date'], soldBefore: 'Yes', sExpDisliked: 'Last agent never shared showing feedback', loveHome: 'Huge kitchen island, wooded backyard, finished basement theater', listPrice: 625000, listPct: 2.75, listDate: ymd(-12), listExpires: ymd(170), sCadence: 'Weekly',
    });
    robert.sell.stage = 'active';
    robert.sell.deal = { price: 625000, pct: 2.75 };
    done(robert, ['s_call', 's_sched', 's_cma', 's_present', 's_q', 's_net', 's_la', 's_disc', 's_walk', 's_repairs', 's_stage', 's_photos', 's_media', 's_sign', 's_showing', 's_mls', 's_live'], -14);
    log(robert, -20, 'meet', 'Listing appointment — signed at $625k');
    log(robert, -12, 'note', 'Listing went live');
    log(robert, -5, 'email', 'Weekly update: 7 showings, 2 second looks');

    const alyssa = C(['buy'], {
      first: 'Alyssa', last: 'Moreno', phone: '4175550125', email: 'alyssa.m@example.com', pref: 'Text', source: 'Open house',
      savings: 42000, gift: 8000,
      moveBy: 'ASAP', motivation: 10, payWith: 'Mortgage', preapproved: 'Yes', preAmount: 390000, loanType: 'FHA', budgetMax: 380000, beds: '3', baths: '2', bra: 'Signed today',
    });
    alyssa.buy.stage = 'contract';
    alyssa.buy.deal = { price: 372000, contract: ymd(-9), close: ymd(25) };
    done(alyssa, [...AG.CHECK.buy.lead, ...AG.CHECK.buy.consult, ...AG.CHECK.buy.search, ...AG.CHECK.buy.offer].map((x) => x[0]).concat(['b_emd_dep', 'b_insp_sched']), -10);
    log(alyssa, -9, 'note', 'Offer accepted on 88 Willow Ln at $372,000');

    const hend = C(['sell', 'buy'], {
      first: 'Tom', last: 'Henderson', partner: 'Lisa Henderson', phone: '4175550191', email: 'hendersons@example.com', pref: 'Call', source: 'Past client',
      addr: '2201 Maple Ave', city: 'Springfield', zip: '65802', sType: 'Single family', sBeds: 3, sBaths: 2, sSqft: 1720, sYear: 1972,
      sellBy: '3–6 months', next: 'Buying with me', expect: 395000, payoff: 96000, la: 'Signed today', listPrice: 389000, listDate: ymd(18), cond: 'Needs a little work',
      living: 'Own a home', needSell: 'Must sell first', moveBy: '3–6 months', payWith: 'Mortgage', preapproved: 'In progress', budgetMax: 520000, down: 104000, savings: 30000, curPayment: 1450, beds: '4', must: ['Single level', 'Big lot'],
      searchArea: 'Nixa, MO', rank: ['Location', 'Size & bedrooms', 'Yard & lot', 'Move-in ready', 'Price'],
    });
    hend.sell.stage = 'prep';
    hend.buy.stage = 'consult';
    done(hend, ['s_call', 's_sched', 's_cma', 's_present', 's_q', 's_net', 's_la', 's_walk', 'b_call', 'b_sched', 'b_consult', 'b_needs'], -6);
    log(hend, -6, 'meet', 'Listing appointment + buyer consult at their kitchen table');

    const devon = C(['buy'], {
      first: 'Devon', last: 'Brooks', phone: '4175550108', email: 'devonb@example.com', pref: 'Text', source: 'Online lead',
      living: 'Renting', moveBy: '6–12 months', motivation: 4, payWith: 'Mortgage', preapproved: 'Not yet', budgetMax: 275000, beds: '2', bra: 'Needs discussion',
    });
    devon.buy.stage = 'lead';
    log(devon, -16, 'call', 'Intro call from Zillow lead');

    const priya = C(['sell'], { first: 'Priya', last: 'Shah', phone: '4175550156', email: 'priya.shah@example.com', pref: 'Call', source: 'Friend / family', addr: '908 Chestnut Ct', city: 'Nixa', zip: '65714', expect: 455000, sellBy: '1–3 months' });
    priya.sell.stage = 'appt';
    done(priya, ['s_call', 's_sched'], -2);

    const marcus = C(['buy'], { first: 'Marcus', last: 'Lee', phone: '4175550133', email: 'marcus.lee@example.com', source: 'Referral', mailAddr: '1127 Glenwood Ave, Springfield, MO 65804' }, { status: 'closed' });
    marcus.buy.stage = 'closed';
    marcus.buy.closedAt = at(-335);
    marcus.buy.deal = { price: 298000, close: ymd(-335) };
    done(marcus, Object.values(AG.CHECK.buy).flat().map((x) => x[0]), -330);

    const elena = C(['buy'], { first: 'Elena', last: 'Garcia', phone: '4175550177', email: 'elena.g@example.com', pref: 'Text', source: 'Social media', moveBy: '1–3 months', motivation: 7, payWith: 'Cash', budgetMax: 330000, beds: '2', baths: '2', propType: ['Condo', 'Townhome'], bra: 'Signed today' });
    elena.buy.stage = 'offer';
    elena.buy.deal = { price: 312000 };
    done(elena, [...AG.CHECK.buy.lead, ...AG.CHECK.buy.consult, ...AG.CHECK.buy.search].map((x) => x[0]).concat(['b_cma', 'b_strategy', 'b_letter', 'b_emd', 'b_submit']), -4);

    const walsh = C(['buy'], { first: 'Grace', last: 'Walsh', partner: 'Henry Walsh', phone: '4175550122', email: 'gwalsh@example.com', birthday: AG.ymd(day(6)).slice(5), mailAddr: '45 Sunset Ter, Nixa, MO 65714' }, { status: 'closed' });
    walsh.buy.stage = 'closed';
    walsh.buy.closedAt = at(-1015);
    walsh.buy.deal = { price: 264000, close: ymd(-1015) };

    // closed sides earlier this year, so the Pipeline tab has a year to show
    const ytd = new Date(now).getFullYear();
    const early = (m, d) => new Date(ytd, m, d).getTime();
    [['Nina', 'Ward', 'buy', 342000, early(2, 21)], ['Paul', 'Okafor', 'sell', 418000, early(5, 9)], ['Lena', 'Fischer', 'buy', 279000, early(7, 15)]].forEach(([f, l, side, price, t]) => {
      if (t > now) return;
      const c = C([side], { first: f, last: l, source: side === 'buy' ? 'Referral' : 'Past client' }, { status: 'closed' });
      c[side].stage = 'closed';
      c[side].closedAt = t;
      c[side].deal = { price, close: AG.ymd(t) };
    });

    // homes
    const westview = H({ address: '1820 Westview Ln', city: 'Springfield', zip: '65804', area: 'Southern Hills', price: 449000, beds: 4, baths: 2.5, sqft: 2140, year: 2004, type: 'Single family', garage: 2, hoa: 0,
      features: ['Garage', 'Fenced yard', 'Office', 'Good schools', 'Updated kitchen', 'Open floor plan'], school: 8, commute: 18, condition: 'Move-in ready', status: 'favorite', mls: '25-104882', comp: 'Offered', compPct: 2,
      url: 'https://www.zillow.com/homedetails/1820-Westview-Ln-Springfield-MO-65804/0_zpid/', clientIds: [maya.id], feedback: { [maya.id]: { stars: 5, note: 'Loved the kitchen and the backyard for Pepper.' } } });
    const lakeridge = H({ address: '77 Lake Ridge Ct', city: 'Springfield', zip: '65810', area: 'Lake Ridge', price: 435000, beds: 3, baths: 2, sqft: 1960, year: 2011, type: 'Single family', garage: 2, hoa: 95,
      features: ['Garage', 'Yard', 'Good schools', 'Quiet street'], flags: ['HOA'], school: 9, commute: 24, condition: 'Move-in ready', status: 'tour', mls: '25-105310', comp: 'None offered', clientIds: [maya.id] });
    H({ address: '309 S Pasfield St', city: 'Springfield', zip: '65804', price: 412000, beds: 3, baths: 1.5, sqft: 1880, year: 1928, type: 'Single family', garage: 1, hoa: 0,
      features: ['Garage', 'Yard', 'Walkable'], flags: ['Busy road'], school: 6, commute: 9, condition: 'Needs updates', status: 'toured', mls: '25-103997', clientIds: [maya.id],
      feedback: { [maya.id]: { stars: 2, note: 'Too much traffic noise in the bedrooms.' } } });
    H({ address: '14 Pheasant Run', city: 'Nixa', zip: '65714', area: 'Nixa', price: 469900, beds: 4, baths: 3, sqft: 2480, year: 2016, type: 'Single family', garage: 3, hoa: 0,
      features: ['Garage', 'Fenced yard', 'Basement', 'Office', 'Good schools'], school: 9, commute: 27, condition: 'Move-in ready', status: 'saved', mls: '25-105502', clientIds: [] });
    const willow = H({ address: '88 Willow Ln', city: 'Springfield', zip: '65807', price: 372000, beds: 3, baths: 2, sqft: 1640, year: 1996, type: 'Single family', garage: 2, status: 'contract', clientIds: [alyssa.id], features: ['Garage', 'Yard'] });
    const oak = H({ address: '4512 Oak Ridge Dr', city: 'Springfield', zip: '65804', price: 625000, beds: 4, baths: 3, sqft: 2650, year: 1998, type: 'Single family', garage: 3, listing: true, status: 'active', mls: '25-104120',
      clientIds: [robert.id], comp: 'Offered', compPct: 2, features: ['Garage', 'Basement', 'Updated kitchen', 'Big lot'], prices: [{ at: at(-12), price: 625000, note: 'Listed' }] });
    const birch = H({ address: '15 Birch Ct #2B', city: 'Springfield', zip: '65806', price: 318000, beds: 2, baths: 2, sqft: 1240, year: 2008, type: 'Condo', garage: 1, hoa: 240, flags: ['HOA', 'Shared walls'], status: 'offer', clientIds: [elena.id] });
    const maple = H({ address: '2201 Maple Ave', city: 'Springfield', zip: '65802', price: 389000, beds: 3, baths: 2, sqft: 1720, year: 1972, type: 'Single family', garage: 2, listing: true, status: 'coming', clientIds: [hend.id] });
    alyssa.buy.deal.homeId = willow.id;
    elena.buy.deal.homeId = birch.id;
    robert.sell.deal.homeId = oak.id;
    hend.sell.deal = { homeId: maple.id, price: 389000 };

    // schedule
    I({ clientId: maya.id, kind: 'email', title: 'Send Maya & Jordan new listings', at: at(0, 14), tpl: 'listings', auto: 'listings' });
    I({ clientId: maya.id, kind: 'showing', title: 'Showing — 77 Lake Ridge Ct', at: at(((6 - new Date(d0).getDay() + 7) % 7) || 7, 10), homeId: lakeridge.id });
    I({ clientId: maya.id, kind: 'date', title: 'Maya & Jordan’s pre-approval expires', at: day(40), allDay: true, warn: 14, auto: 'preexp' });
    I({ clientId: maya.id, kind: 'date', title: 'Maya & Jordan’s lease ends', at: day(75), allDay: true, auto: 'lease' });
    I({ clientId: robert.id, kind: 'email', title: 'Weekly seller update — 4512 Oak Ridge', at: at(1, 9), repeat: 'week', tpl: 'seller_update' });
    I({ clientId: robert.id, kind: 'showing', title: 'Open house — 4512 Oak Ridge Dr', at: at(((7 - new Date(d0).getDay()) % 7) || 7, 13), homeId: oak.id });
    I({ clientId: robert.id, kind: 'task', title: 'Price review with Robert (day 21)', at: at(9, 10) });
    I({ clientId: devon.id, kind: 'call', title: 'Call Devon about a lender intro', at: at(-2, 10), tpl: 'lender' });
    I({ clientId: priya.id, kind: 'meet', title: 'Listing appointment — 908 Chestnut Ct', at: at(1, 18) });
    I({ clientId: priya.id, kind: 'task', title: 'CMA for 908 Chestnut Ct', at: at(0, 12) });
    I({ clientId: elena.id, kind: 'call', title: 'Check on Elena’s offer — 15 Birch Ct', at: at(0, 16), homeId: birch.id });
    I({ clientId: hend.id, kind: 'task', title: 'Book photographer — 2201 Maple Ave', at: at(0, 9) });
    I({ clientId: hend.id, kind: 'call', title: 'Lender intro for Tom & Lisa', at: at(2, 11), tpl: 'lender' });
    I({ clientId: marcus.id, kind: 'date', title: '🏡 Marcus’s home anniversary', at: AG.addMonths(AG.day0(marcus.buy.closedAt), 12), allDay: true, repeat: 'year', tpl: 'anniv', card: 'card_anniv', auto: 'buy_anniv' });
    I({ clientId: walsh.id, kind: 'date', title: '🎂 Grace’s birthday', at: day(6), allDay: true, repeat: 'year', tpl: 'birthday', card: 'card_bday', auto: 'bday' });
    I({ clientId: walsh.id, kind: 'date', title: '🏡 Grace & Henry’s home anniversary', at: AG.addMonths(AG.day0(walsh.buy.closedAt), 36), allDay: true, repeat: 'year', tpl: 'anniv', card: 'card_anniv', auto: 'buy_anniv' });
    // Alyssa's contract deadlines, the same way the app builds them
    const dl = AG.settingsDeadlines || { emd: 3, insp: 10, appr: 21, fin: 30 };
    const base = AG.fromYmd(alyssa.buy.deal.contract), close = AG.fromYmd(alyssa.buy.deal.close);
    [['emd', 'Earnest money due', AG.addDays(base, dl.emd), 1, true], ['insp', 'Inspection deadline', AG.addDays(base, dl.insp), 2], ['appr', 'Appraisal deadline', AG.addDays(base, dl.appr), 3],
      ['fin', 'Financing deadline', AG.addDays(base, dl.fin), 3], ['walk', 'Final walkthrough', AG.addDays(close, -1), 2], ['close', '🔑 Closing', close, 7]].forEach(([k, t, when, warn, isDone]) =>
      I({ clientId: alyssa.id, kind: 'deadline', title: `${t} — 88 Willow Ln`, at: when, allDay: true, warn, side: 'buy', auto: 'buy_' + k, done: isDone ? at(-6) : undefined }));
    return { clients, homes, items, partners };
  };
})(typeof window !== 'undefined' ? window : globalThis);
