/**
 * Dashboard Logic
 * - Conteúdo SEMPRE visível
 * - Ações bloqueadas se pagamento não confirmado
 */

let currentUser = null;
let paymentStatus = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await init();

  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('joinBolaoBtn')?.addEventListener('click', handleJoinBolao);
  document.getElementById('alreadyPaidBtn')?.addEventListener('click', handleAlreadyPaid);

  // Copiar PIX
  const copyBtn = document.getElementById('copyPixBtn');
  const pixKeyEl = document.getElementById('pixKeyValue');

  if (copyBtn && pixKeyEl) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pixKeyEl.textContent.trim());
        showToast('✅ Chave PIX copiada!', 'success');
      } catch {
        showToast('❌ Erro ao copiar PIX', 'error');
      }
    });
  }

  document.getElementById('quotaQuantity')?.addEventListener('input', updateTotalAmount);

  refreshInterval = setInterval(refreshData, 30000);
});

/* ================= INIT ================= */

async function init() {
  try {
    showLoading(true);

    const auth = await api.getCurrentUser();
    if (!auth?.success) {
      window.location.href = '/';
      return;
    }

    currentUser = auth.user;

    document.getElementById('userName').textContent = `Olá, ${currentUser.name}!`;

    if (currentUser.isAdmin) {
      document.getElementById('adminPanelBtn')?.style.setProperty('display', 'inline-block');
    }

    // ⚠️ SEÇÃO DE NÚMEROS SEMPRE VISÍVEL
    document.getElementById('selectionSection').style.display = 'block';

    await loadPaymentStatus();
    await loadBolaoInfo();

  } catch (err) {
    console.error(err);
    showToast('Erro ao carregar dashboard', 'error');
  } finally {
    showLoading(false);
  }
}

/* ================= PAYMENT ================= */

async function loadPaymentStatus() {
  const res = await api.getPaymentStatus();
  paymentStatus = res.status;

  document.getElementById('quotaUnitValue').textContent =
    `R$ ${res.quotaValue.toFixed(2).replace('.', ',')}`;

  updateTotalAmount();

  // Pagamento
  if (paymentStatus === 'not_joined') {
    showPaymentSection('join');
  } else if (paymentStatus === 'pending' || paymentStatus === 'claimed') {
    showPaymentSection('pending');
  } else if (paymentStatus === 'confirmed') {
    document.getElementById('paymentSection').style.display = 'none';
    document.getElementById('waitingSection').style.display = 'none';
  }

  // 🔐 Controle de permissão
  toggleSelectionPermissions(paymentStatus === 'confirmed');
}

function showPaymentSection(state) {
  document.getElementById('paymentSection').style.display = 'block';
  document.getElementById('waitingSection').style.display = 'none';

  document.getElementById('joinBolaoBtn').style.display =
    state === 'join' ? 'inline-block' : 'none';

  document.getElementById('alreadyPaidBtn').style.display =
    state === 'pending' ? 'inline-block' : 'none';

  document.getElementById('paymentStatus').innerHTML =
    state === 'pending'
      ? '<p>⏳ Após pagar, clique em "Já paguei"</p>'
      : '';
}

/* ================= PERMISSIONS ================= */

function toggleSelectionPermissions(canSelect) {
  const section = document.getElementById('selectionSection');
  const controls = section.querySelectorAll('button, input');

  controls.forEach(el => {
    el.disabled = !canSelect;
  });

  const noticeId = 'paymentNotice';
  let notice = document.getElementById(noticeId);

  if (!canSelect) {
    if (!notice) {
      notice = document.createElement('div');
      notice.id = noticeId;
      notice.className = 'warning-box';
      notice.textContent =
        '👁️ Você pode visualizar tudo, mas só pode escolher números após o pagamento ser confirmado.';
      section.prepend(notice);
    }
  } else {
    notice?.remove();
  }
}

/* ================= ACTIONS ================= */

async function handleJoinBolao() {
  try {
    showLoading(true);
    const qty = parseInt(document.getElementById('quotaQuantity').value) || 1;
    await api.joinBolao(qty);
    showToast('Agora realize o pagamento via PIX', 'success');
    await loadPaymentStatus();
  } finally {
    showLoading(false);
  }
}

async function handleAlreadyPaid() {
  try {
    showLoading(true);
    await api.claimPaid();
    showToast('Pagamento registrado!', 'success');
    await loadPaymentStatus();
  } finally {
    showLoading(false);
  }
}

async function handleLogout() {
  await api.logout();
  window.location.href = '/';
}

/* ================= DATA ================= */

async function loadBolaoInfo() {
  try {
    await api.getBolaoInfo();
  } catch {}
}

async function refreshData() {
  await loadPaymentStatus();
}

/* ================= UTILS ================= */

function updateTotalAmount() {
  const qty = parseInt(document.getElementById('quotaQuantity').value) || 1;
  const unit = 10;
  document.getElementById('totalAmount').textContent =
    (qty * unit).toFixed(2).replace('.', ',');
}

function showLoading(show) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.style.display = 'block';
  setTimeout(() => (toast.style.display = 'none'), 3000);
}

window.addEventListener('beforeunload', () => {
  if (refreshInterval) clearInterval(refreshInterval);
});
