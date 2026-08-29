'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const aiWorkforce = require('../lib/ai-workforce');
const core = require('../lib/core');

test('AI Workforce: semantic embeddings and cosine similarity', () => {
  const v1 = aiWorkforce.generateEmbedding('I want blue-cut computer glasses for screen work');
  const v2 = aiWorkforce.generateEmbedding('Looking to buy anti-glare glasses for laptop');
  const v3 = aiWorkforce.generateEmbedding('How to cancel my dental appointment');

  assert.equal(v1.length, aiWorkforce.EMBEDDING_DIM);
  assert.equal(v2.length, aiWorkforce.EMBEDDING_DIM);

  const simRelated = aiWorkforce.cosineSimilarity(v1, v2);
  const simUnrelated = aiWorkforce.cosineSimilarity(v1, v3);

  assert.ok(simRelated > simUnrelated, `Related (${simRelated}) should exceed unrelated (${simUnrelated})`);
});

test('AI Workforce: multilingual Indian language detection', () => {
  assert.equal(aiWorkforce.detectLanguage('Hello, I need to order computer glasses'), 'en');
  assert.equal(aiWorkforce.detectLanguage('मुझे चश्मा खरीदना है'), 'hi');
  assert.equal(aiWorkforce.detectLanguage('Mujhe computer glasses chahiye kal sham ko'), 'hinglish');
  assert.equal(aiWorkforce.detectLanguage('मला चष्मा खरेदी करायचा आहे'), 'mr');
});

test('AI Workforce: intent detection and sentiment / frustration monitoring', () => {
  assert.equal(aiWorkforce.detectIntent('Can I book an eye check-up appointment tomorrow?'), 'appointment_booking');
  assert.equal(aiWorkforce.detectIntent('Where is my delivery? Order is late.'), 'complaint');
  assert.equal(aiWorkforce.detectIntent('I want to speak with a human agent or manager immediately'), 'human_assistance');
  assert.equal(aiWorkforce.detectIntent('What is the price of titanium frames?'), 'pricing_inquiry');

  const angry = aiWorkforce.detectSentiment('This service is terrible and worst experience! Manager se baat karao');
  assert.equal(angry.state, 'Angry');
  assert.equal(angry.isFrustrated, true);

  const positive = aiWorkforce.detectSentiment('Thank you so much, bahut badiya service!');
  assert.equal(positive.state, 'Positive');
  assert.equal(positive.isFrustrated, false);
});

test('AI Workforce: objection battlecards and lead scoring', () => {
  const objPrice = aiWorkforce.evaluateObjection('Your frames are too expensive, bohot zyada mehenga hai');
  assert.ok(objPrice);
  assert.equal(objPrice.key, 'too_expensive');
  assert.ok(objPrice.suggestedCopilotPhrase.includes('warranty'));

  const objComp = aiWorkforce.evaluateObjection('Lenskart is cheaper than your store');
  assert.ok(objComp);
  assert.equal(objComp.key, 'competitor_cheaper');

  const leadHigh = aiWorkforce.calculateLeadScore({
    transcript: 'Customer wants blue-cut computer glasses tomorrow, budget confirmed ready to pay online',
    intent: 'product_inquiry',
    sentiment: 'Positive',
    appointmentBooked: true,
  });
  assert.ok(leadHigh.score >= 80, `High score expected, got ${leadHigh.score}`);
  assert.equal(leadHigh.interestLevel, 'High');
});

test('AI Workforce: post-call memory extraction engine', () => {
  const transcript = 'Customer: Mujhe computer glasses chahiye kal evening 6 PM mein appointment ke sath.\nAgent: Sure Rahul ji, aapka eye check-up kal 6:00 PM confirm kar diya hai.';
  const intel = aiWorkforce.extractCallIntelligence(transcript, { name: 'Rahul Sharma', callCount: 2 });

  assert.ok(intel.summary.length > 10);
  assert.equal(intel.intent, 'appointment_booking');
  assert.ok(intel.memoriesToStore.length >= 1);
  assert.ok(intel.followUp.required);
  assert.equal(intel.followUp.channel, 'whatsapp');
});

test('AI Workforce: tool execution registry', async () => {
  const testTenant = 't_test_workforce_tools';

  // Seed demo data
  await aiWorkforce.seedLensCraftDemo(testTenant);

  // Tool 1: Check Customer
  const custRes = await aiWorkforce.executeTool(testTenant, 'check_customer', { phone: '98201 23456' });
  assert.equal(custRes.found, true);
  assert.ok(custRes.customer.name.includes('Rajesh') || custRes.customer.name.includes('Rahul'));

  // Tool 2: Book Appointment
  const bookRes = await aiWorkforce.executeTool(testTenant, 'book_appointment', {
    customerId: custRes.customer.id,
    date: '2026-08-25',
    time: '18:30',
    service: 'Enterprise Voice AI Live Demo',
  }, { customerName: custRes.customer.name, customerPhone: '+91 98201 23456' });
  assert.equal(bookRes.success, true);
  assert.ok(bookRes.appointmentId);

  // Tool 3: Send WhatsApp
  const waRes = await aiWorkforce.executeTool(testTenant, 'send_whatsapp', {
    phone: '+91 98201 23456',
    messageType: 'appointment_confirmation',
  }, { customerPhone: '+91 98201 23456' });
  assert.equal(waRes.success, true);
  assert.equal(waRes.status, 'delivered');

  // Tool 4: Search Knowledge
  const kbRes = await aiWorkforce.executeTool(testTenant, 'search_knowledge', { query: 'pricing latency' });
  assert.ok(kbRes.results.length >= 1);
});

test('AI Workforce: AI Sales Copilot and Natural Language Search', async () => {
  const testTenant = 't_test_copilot';
  await aiWorkforce.seedLensCraftDemo(testTenant);

  const customerId = 'cust_' + testTenant + '_rajesh';
  const assist = aiWorkforce.getCopilotAssistance(testTenant, customerId, 'Your competitor is offering 20% discount');
  assert.ok(assist.battlecard);
  assert.equal(assist.battlecard.title, 'Competitor Comparison');
  assert.ok(assist.suggestedWhisper.length > 10);

  const searchResults = aiWorkforce.searchCallsNaturalLanguage(testTenant, 'interested in computer glasses appointment');
  assert.ok(searchResults.length >= 1);
});
