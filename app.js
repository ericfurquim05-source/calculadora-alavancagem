(() => {
  'use strict';

  const CONFIG = {
    version: '1.2.2',
    leadEndpoint: 'https://formsubmit.co/ajax/empresasa187@gmail.com',
    whatsappNumber: '5551980554326',
    whatsappGroupUrl: '',
    consultantName: 'Eric Furquin'
  };

  const MODEL = {
    residentialRentRate: 0.005,
    highYieldRentRate: 0.01,
    shortStayRentRate: 0.01,
    annualAppreciationRate: 0.0482,
    ownCapitalShare: 0.25,
    projectionMonths: 60,
    saleLowRate: 0.20,
    saleHighRate: 0.40
  };

  // Faixas reais da planilha de meia parcela S.I. Consórcios.
  // A calculadora sempre escolhe a maior parcela que cabe no limite informado.
  const PLANS = [
    { credit: 100000, installment: 341, term: 180 },
    { credit: 150000, installment: 512, term: 180 },
    { credit: 200000, installment: 615, term: 180 },
    { credit: 250000, installment: 768, term: 200 },
    { credit: 300000, installment: 922, term: 200 },
    { credit: 350000, installment: 1078, term: 200 },
    { credit: 400000, installment: 1230, term: 200 },
    { credit: 500000, installment: 1397, term: 220 },
    { credit: 600000, installment: 1676, term: 220 },
    { credit: 700000, installment: 1979, term: 220 },
    { credit: 800000, installment: 2197, term: 220 },
    { credit: 900000, installment: 2479, term: 220 },
    { credit: 1000000, installment: 2798, term: 220 },
    { credit: 1250000, installment: 3326, term: 220 },
    { credit: 1500000, installment: 3991, term: 220 },
    { credit: 1750000, installment: 4656, term: 220 },
    { credit: 2000000, installment: 5319, term: 220 }
  ];

  const $ = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
  const wholeMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

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
      if (stored?.name && stored?.email && stored?.whatsapp) return stored;
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

  function findPlanForBudget(budget) {
    let selected = null;
    for (const plan of PLANS) {
      if (plan.installment <= budget) selected = plan;
      else break;
    }
    return selected;
  }

  function calculatePostContemplationReference(initialInstallment) {
    // Referência simples para o plano de meia parcela: parcela integral = 2x a inicial.
    // A parcela contratual real depende do mês de contemplação, reajustes e recomposição do saldo.
    return initialInstallment * 2;
  }

  function applyIncomeBars(residential, commercial, shortStay) {
    const maximum = Math.max(shortStay, commercial, residential, 1);
    $('traditionalBar').style.width = `${Math.max((residential / maximum) * 100, 4)}%`;
    $('commercialBar').style.width = `${Math.max((commercial / maximum) * 100, 4)}%`;
    $('shortStayBar').style.width = `${Math.max((shortStay / maximum) * 100, 4)}%`;
  }

  function calculate() {
    const budget = parseMoney($('monthlyBudget').value);
    const capital = parseMoney($('availableCapital').value);

    const selectedPlan = findPlanForBudget(budget);
    if (!selectedPlan) {
      $('calculatorError').textContent = `A menor parcela disponível na tabela é ${money.format(PLANS[0].installment)} por mês.`;
      $('results').hidden = true;
      return;
    }

    $('calculatorError').textContent = '';

    const credit = selectedPlan.credit;
    const initialInstallment = selectedPlan.installment;
    const term = selectedPlan.term;
    const fullInstallment = calculatePostContemplationReference(initialInstallment);
    const budgetGap = Math.max(0, budget - initialInstallment);
    const residentialRent = credit * MODEL.residentialRentRate;
    const commercialRent = credit * MODEL.highYieldRentRate;
    const shortStayRent = credit * MODEL.shortStayRentRate;
    const saleLow = credit * MODEL.saleLowRate;
    const saleHigh = credit * MODEL.saleHighRate;

    const ownCapital = credit * MODEL.ownCapitalShare;
    const assetMultiple = credit / ownCapital;
    const finalProperty = credit * Math.pow(1 + MODEL.annualAppreciationRate, MODEL.projectionMonths / 12);
    const appreciationGain = finalProperty - credit;
    const grossRentSixtyMonths = commercialRent * MODEL.projectionMonths;
    const economicGenerated = appreciationGain + grossRentSixtyMonths;
    const generatedMultiple = economicGenerated / ownCapital;
    const rentDifference = commercialRent - fullInstallment;
    const rentCoverage = commercialRent / fullInstallment;

    state.lastResult = {
      budget,
      capital,
      credit,
      initialInstallment,
      fullInstallment,
      residentialRent,
      commercialRent,
      shortStayRent,
      saleLow,
      saleHigh,
      term,
      ownCapital,
      assetMultiple,
      finalProperty,
      grossRentSixtyMonths,
      economicGenerated,
      generatedMultiple,
      rentDifference,
      rentCoverage,
      budgetGap
    };

    const firstName = (state.lead?.name || '').trim().split(/\s+/)[0];
    setText('resultGreeting', firstName ? `${firstName}, veja o que seu aporte pode movimentar` : 'Veja o que seu aporte pode movimentar');
    setText('budgetBadge', `${wholeMoney.format(budget)}/mês`);
    setText('resultCreditHero', wholeMoney.format(credit));
    setText('resultCredit', money.format(credit));
    setText('resultInstallment', money.format(initialInstallment));
    setText('resultFullInstallment', money.format(fullInstallment));
    setText('resultTerm', `${term} meses`);
    setText('resultCreditNote', 'Faixa real selecionada na tabela de meia parcela');
    setText('resultInstallmentNote', budgetGap > 0 ? `${money.format(budgetGap)} abaixo do limite informado` : 'Exatamente dentro do limite informado');

    if (capital > 0) {
      $('capitalNotice').hidden = false;
      setText('capitalNoticeValue', money.format(capital));
    } else {
      $('capitalNotice').hidden = true;
    }

    setText('leverageOwnCapital', money.format(ownCapital));
    setText('leverageAsset', money.format(credit));
    setText('leverageMultiplier', `${assetMultiple.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}× o capital próprio`);
    setText('leverageFinalProperty', money.format(finalProperty));
    setText('leverageRentFiveYears', money.format(grossRentSixtyMonths));
    setText('leverageGenerated', money.format(economicGenerated));
    setText('leverageGeneratedMultiple', `${generatedMultiple.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}× o capital próprio de referência`);

    setText('rentReferenceMonthly', `${money.format(commercialRent)}/mês`);
    setText('rentFullInstallment', `${money.format(fullInstallment)}/mês`);
    setText('rentDifference', `${rentDifference >= 0 ? '+' : ''}${money.format(rentDifference)}/mês`);
    setText('rentCoverageText', `No cenário ilustrativo, o aluguel bruto representa ${percent.format(rentCoverage * 100)}% da parcela de referência após a contemplação.`);

    setText('homeValue', money.format(credit));
    setText('traditionalRent', `${money.format(residentialRent)}/mês`);
    setText('traditionalRentAnnual', `${money.format(residentialRent * 12)} por ano em receita bruta ilustrativa de 0,50% ao mês.`);
    setText('commercialRent', `${money.format(commercialRent)}/mês`);
    setText('commercialRentAnnual', `${money.format(commercialRent * 12)} por ano em receita bruta ilustrativa de 1% ao mês.`);
    setText('shortStayRent', `${money.format(shortStayRent)}/mês`);
    setText('shortStayRentAnnual', `${money.format(shortStayRent * 12)} por ano em receita bruta ilustrativa de 1% ao mês.`);
    setText('saleRange', `${wholeMoney.format(saleLow)} a ${wholeMoney.format(saleHigh)}`);
    setText('businessValue', money.format(credit));

    setText('traditionalBarValue', money.format(residentialRent));
    setText('commercialBarValue', money.format(commercialRent));
    setText('shortStayBarValue', money.format(shortStayRent));
    applyIncomeBars(residentialRent, commercialRent, shortStayRent);

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
      `Aporte mensal: ${money.format(r.budget)}`,
      `Crédito imobiliário estimado: ${money.format(r.credit)}`,
      `Parcela inicial até a contemplação: ${money.format(r.initialInstallment)}`,
      `Parcela de referência após a contemplação: ${money.format(r.fullInstallment)}`,
      `Renda bruta ilustrativa de 1%: ${money.format(r.commercialRent)}/mês`,
      `Valor estimado do imóvel após 60 meses: ${money.format(r.finalProperty)}`,
      `Valorização e aluguéis brutos em 60 meses: ${money.format(r.economicGenerated)}`
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
      button.textContent = 'Acessar gratuitamente';
    });

    $('calculatorForm').addEventListener('submit', (event) => {
      event.preventDefault();
      calculate();
    });

    $('changeLeadBtn').addEventListener('click', () => {
      clearLead();
      location.reload();
    });

    $('advisoryBtn').addEventListener('click', () => openWhatsApp(resultMessage()));
    $('groupBtn').addEventListener('click', () => {
      if (CONFIG.whatsappGroupUrl) {
        window.open(CONFIG.whatsappGroupUrl, '_blank', 'noopener');
      } else {
        openWhatsApp('Olá! Fiz a Calculadora de Alavancagem e quero entrar no grupo do WhatsApp.');
      }
    });
    $('shareBtn').addEventListener('click', async () => {
      const text = resultMessage();
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Calculadora de Alavancagem Patrimonial', text });
          return;
        } catch (_) {}
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('Resumo copiado para compartilhar.');
      } catch (_) {
        openWhatsApp(text);
      }
    });
  }

  function init() {
    initEvents();
    const storedLead = loadLead();
    if (storedLead) unlockCalculator(storedLead);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js?v=122').catch(() => {}));
    }
  }

  init();
})();
