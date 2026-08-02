(() => {
  'use strict';

  const CONFIG = {
    version: '1.2.8',
    leadEndpoint: 'https://formsubmit.co/ajax/empresasa187@gmail.com',
    whatsappNumber: '5551980554326',
    whatsappGroupUrl: '',
    consultantName: 'Eric Furquin'
  };

  const MODEL = {
    residentialRentRate: 0.005,
    highYieldRentRate: 0.01,
    shortStayMinRentRate: 0.01,
    shortStayMaxRentRate: 0.025,
    saleLowRate: 0.20,
    saleHighRate: 0.40,
    administrationRate: 0.242,
    termMonths: 220,
    creditStep: 10000,
    minimumCredit: 100000
  };

  const $ = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
  const wholeMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const state = {
    lead: null,
    lastResult: null
  };

  function parseMoney(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }

  function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
  }

  function formatMoneyInput(input) {
    const value = parseMoney(input.value);
    input.value = value ? new Intl.NumberFormat('pt-BR').format(value) : '';
  }

  function formatPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validPhone(value) {
    const digits = onlyDigits(value);
    return digits.length === 10 || digits.length === 11;
  }

  function loadLead() {
    try {
      const stored = JSON.parse(localStorage.getItem('calc_alavancagem_lead') || 'null');
      if (stored?.name && stored?.email && stored?.whatsapp && stored?.city) return stored;
    } catch (_) {}
    return null;
  }

  function saveLead(lead) {
    try {
      localStorage.setItem('calc_alavancagem_lead', JSON.stringify(lead));
    } catch (_) {}
  }

  function clearLead() {
    try {
      localStorage.removeItem('calc_alavancagem_lead');
    } catch (_) {}
  }

  function unlockCalculator(lead) {
    state.lead = lead;
    $('leadGate').hidden = true;
    $('app').hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function sendLead(lead) {
    if (!CONFIG.leadEndpoint) return { ok: false, skipped: true };
    const payload = {
      nome: lead.name,
      whatsapp: lead.whatsapp,
      email: lead.email,
      cidade: lead.city,
      origem: 'Calculadora de Alavancagem Patrimonial',
      versao: CONFIG.version,
      data: new Date().toLocaleString('pt-BR'),
      _subject: `Novo lead — Calculadora de Alavancagem — ${lead.name}`,
      _template: 'table',
      _captcha: 'false'
    };
    try {
      const response = await fetch(CONFIG.leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      return { ok: response.ok };
    } catch (_) {
      return { ok: false };
    }
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function calculateInitialInstallment(credit) {
    const reducedCommonFund = (credit / 2) / MODEL.termMonths;
    const administrationFee = (credit * MODEL.administrationRate) / MODEL.termMonths;
    return reducedCommonFund + administrationFee;
  }

  function calculateCreditForBudget(budget) {
    const maximumCredit = (budget * MODEL.termMonths) / (0.5 + MODEL.administrationRate);
    const roundedCredit = Math.floor(maximumCredit / MODEL.creditStep) * MODEL.creditStep;
    return Math.max(0, roundedCredit);
  }

  function applyIncomeBars(residential, commercial, shortStayMaximum) {
    const maximum = Math.max(shortStayMaximum, commercial, residential, 1);
    $('traditionalBar').style.width = `${Math.max((residential / maximum) * 100, 4)}%`;
    $('commercialBar').style.width = `${Math.max((commercial / maximum) * 100, 4)}%`;
    $('shortStayBar').style.width = `${Math.max((shortStayMaximum / maximum) * 100, 4)}%`;
  }

  function calculate() {
    const budget = parseMoney($('monthlyBudget').value);
    const capital = parseMoney($('availableCapital').value);

    const credit = calculateCreditForBudget(budget);
    if (credit < MODEL.minimumCredit) {
      const minimumInstallment = calculateInitialInstallment(MODEL.minimumCredit);
      $('calculatorError').textContent = `Para iniciar a simulação com crédito de ${wholeMoney.format(MODEL.minimumCredit)}, o aporte de referência é ${money.format(minimumInstallment)} por mês.`;
      $('results').hidden = true;
      return;
    }

    $('calculatorError').textContent = '';

    const term = MODEL.termMonths;
    const initialInstallment = calculateInitialInstallment(credit);
    const budgetGap = Math.max(0, budget - initialInstallment);
    const residentialRent = credit * MODEL.residentialRentRate;
    const commercialRent = credit * MODEL.highYieldRentRate;
    const shortStayRentMin = credit * MODEL.shortStayMinRentRate;
    const shortStayRentMax = credit * MODEL.shortStayMaxRentRate;
    const saleLow = credit * MODEL.saleLowRate;
    const saleHigh = credit * MODEL.saleHighRate;


    state.lastResult = {
      budget,
      capital,
      credit,
      initialInstallment,
      residentialRent,
      commercialRent,
      shortStayRentMin,
      shortStayRentMax,
      saleLow,
      saleHigh,
      term,
      budgetGap
    };

    const firstName = (state.lead?.name || '').trim().split(/\s+/)[0];
    setText('resultGreeting', firstName ? `${firstName}, veja o que seu aporte pode movimentar` : 'Veja o que seu aporte pode movimentar');
    setText('budgetBadge', `${wholeMoney.format(budget)}/mês`);
    setText('resultCreditHero', wholeMoney.format(credit));
    setText('resultCredit', money.format(credit));
    setText('resultInstallment', money.format(initialInstallment));
    setText('resultTerm', `${term} meses`);
    setText('resultCreditNote', 'Crédito estimado em faixas de R$ 10 mil');
    setText('resultInstallmentNote', budgetGap > 0 ? `${money.format(budgetGap)} abaixo do limite informado` : 'Dentro do limite informado');

    if (capital > 0) {
      $('capitalNotice').hidden = false;
      setText('capitalNoticeValue', money.format(capital));
    } else {
      $('capitalNotice').hidden = true;
    }

    setText('rentReferenceMonthly', `${money.format(commercialRent)}/mês`);
    setText('rentReferenceAnnual', `${money.format(commercialRent * 12)}/ano`);

    setText('homeValue', money.format(credit));
    setText('traditionalRent', `${money.format(residentialRent)}/mês`);
    setText('traditionalRentAnnual', `${money.format(residentialRent * 12)} por ano em receita bruta ilustrativa de 0,50% ao mês.`);
    setText('commercialRent', `${money.format(commercialRent)}/mês`);
    setText('commercialRentAnnual', `${money.format(commercialRent * 12)} por ano em receita bruta ilustrativa de 1% ao mês.`);
    setText('shortStayRent', `${money.format(shortStayRentMin)} a ${money.format(shortStayRentMax)}/mês`);
    setText('shortStayRentAnnual', `${money.format(shortStayRentMin * 12)} a ${money.format(shortStayRentMax * 12)} por ano em receita bruta ilustrativa de 1% a 2,5% ao mês, dependendo da região e da operação.`);
    setText('saleRange', `${wholeMoney.format(saleLow)} a ${wholeMoney.format(saleHigh)}`);
    setText('businessValue', money.format(credit));

    setText('traditionalBarValue', money.format(residentialRent));
    setText('commercialBarValue', money.format(commercialRent));
    setText('shortStayBarValue', `${money.format(shortStayRentMin)} a ${money.format(shortStayRentMax)}`);
    applyIncomeBars(residentialRent, commercialRent, shortStayRentMax);

    $('results').hidden = false;
    requestAnimationFrame(() => $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function resultMessage() {
    const r = state.lastResult;
    if (!r) return 'Olá! Quero conhecer a Calculadora de Alavancagem Patrimonial.';
    const lines = [
      'Olá! Fiz a Calculadora de Alavancagem Patrimonial.',
      `Nome: ${state.lead?.name || 'Não informado'}`,
      `WhatsApp cadastrado: ${state.lead?.whatsapp || 'Não informado'}`,
      `Cidade: ${state.lead?.city || 'Não informada'}`,
      `Aporte mensal: ${money.format(r.budget)}`,
      `Crédito imobiliário estimado: ${money.format(r.credit)}`,
      `Parcela inicial até a contemplação: ${money.format(r.initialInstallment)}`,
      `Renda bruta ilustrativa de 1%: ${money.format(r.commercialRent)}/mês`,
      `Short Stay / Airbnb (1% a 2,5%): ${money.format(r.shortStayRentMin)} a ${money.format(r.shortStayRentMax)}/mês`
    ];
    if (r.capital > 0) lines.push(`Recurso próprio disponível: ${money.format(r.capital)}`);
    lines.push('Quero receber uma consultoria e um planejamento gratuitos com base no meu objetivo.');
    return lines.join('\n');
  }

  function openWhatsApp(message) {
    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  }

  function initEvents() {
    ['monthlyBudget', 'availableCapital'].forEach((id) => {
      $(id).addEventListener('input', (event) => formatMoneyInput(event.target));
      $(id).addEventListener('focus', (event) => event.target.select());
    });

    $('leadWhatsapp').addEventListener('input', (event) => {
      event.target.value = formatPhone(event.target.value);
    });

    $('leadForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const lead = {
        name: $('leadName').value.trim(),
        whatsapp: $('leadWhatsapp').value.trim(),
        email: $('leadEmail').value.trim(),
        city: $('leadCity').value.trim(),
        createdAt: new Date().toISOString()
      };

      if (lead.name.length < 2) {
        $('leadStatus').textContent = 'Digite seu nome para continuar.';
        return;
      }
      if (!validPhone(lead.whatsapp)) {
        $('leadStatus').textContent = 'Digite um número de WhatsApp válido com DDD.';
        return;
      }
      if (!validEmail(lead.email)) {
        $('leadStatus').textContent = 'Digite um e-mail válido para continuar.';
        return;
      }
      if (lead.city.length < 2) {
        $('leadStatus').textContent = 'Digite sua cidade para continuar.';
        return;
      }
      if (!$('leadConsent').checked) {
        $('leadStatus').textContent = 'Confirme a autorização para continuar.';
        return;
      }

      const button = $('leadSubmit');
      button.disabled = true;
      button.textContent = 'Liberando acesso...';
      $('leadStatus').textContent = '';
      saveLead(lead);
      unlockCalculator(lead);
      sendLead(lead).then((result) => {
        if (!result.ok && !result.skipped) showToast('Acesso liberado. O contato poderá ser confirmado pela equipe.');
      });
      button.disabled = false;
      button.textContent = 'Acessar calculadora';
    });

    $('calculatorForm').addEventListener('submit', (event) => {
      event.preventDefault();
      calculate();
    });

    $('changeLeadBtn').addEventListener('click', () => {
      clearLead();
      location.reload();
    });

    const advisoryHandler = () => openWhatsApp(resultMessage());
    const groupHandler = () => {
      if (CONFIG.whatsappGroupUrl) {
        window.open(CONFIG.whatsappGroupUrl, '_blank', 'noopener');
      } else {
        openWhatsApp('Olá! Fiz a Calculadora de Alavancagem e quero entrar no grupo do WhatsApp.');
      }
    };

    ['advisoryBtn', 'advisoryBtnBottom'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('click', advisoryHandler);
    });

    ['groupBtn', 'groupBtnBottom'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('click', groupHandler);
    });
  }

  function init() {
    initEvents();
    const storedLead = loadLead();
    if (storedLead) unlockCalculator(storedLead);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js?v=128').catch(() => {}));
    }
  }

  init();
})();
