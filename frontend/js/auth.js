/**
 * Authentication handling for login page
 * Estratégia robusta:
 * - Sempre tenta LOGIN primeiro
 * - Se falhar, tenta CADASTRO
 * - Evita bug de estado (register vs login)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Carregar valor da cota do config
  if (window.APP_CONFIG?.QUOTA_VALUE) {
    const quotaDisplay = document.getElementById('quotaValueDisplay');
    if (quotaDisplay) {
      quotaDisplay.textContent = `R$ ${window.APP_CONFIG.QUOTA_VALUE.toFixed(2).replace('.', ',')}`;
    }
  }

  const loginForm = document.getElementById('loginForm');
  const nameInput = document.getElementById('nameInput');
  const pixKeyInput = document.getElementById('pixKeyInput');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const errorMessage = document.getElementById('errorMessage');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const formTitle = document.getElementById('formTitle');
  const submitButtonText = document.getElementById('submitButtonText');

  // Estado apenas VISUAL (não decide API)
  let visualMode = 'login';

  // ===== UI TABS =====

  loginTab.addEventListener('click', () => {
    visualMode = 'login';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    formTitle.textContent = 'Login';
    submitButtonText.textContent = 'Entrar';
  });

  registerTab.addEventListener('click', () => {
    visualMode = 'register';
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    formTitle.textContent = 'Cadastro';
    submitButtonText.textContent = 'Cadastrar';
  });

  loginForm.addEventListener('submit', handleSubmit);

  // ===== SUBMIT =====

  async function handleSubmit(event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const pixKey = pixKeyInput.value.trim();

    if (!name) {
      showError('Por favor, digite seu nome');
      return;
    }

    if (!pixKey) {
      showError('Por favor, digite sua chave PIX');
      return;
    }

    if (pixKey.length < 5) {
      showError('Chave PIX deve ter no mínimo 5 caracteres');
      return;
    }

    try {
      showLoading(true);
      hideError();

      let response;

      try {
        // 🔑 SEMPRE tenta login primeiro
        response = await api.login(name, pixKey);
        console.log('Login realizado com sucesso');
      } catch (loginError) {
        // Se login falhar, tenta cadastro
        console.warn('Login falhou, tentando cadastro...', loginError.message);
        response = await api.register(name, pixKey);
        console.log('Cadastro realizado com sucesso');
      }

      if (response && response.success && response.user) {
        console.log('Auth success:', response.user);

        // Redirect based on user role
        if (response.user.isAdmin) {
          window.location.href = '/admin.html';
        } else {
          window.location.href = '/dashboard.html';
        }
      } else {
        showError('Erro inesperado. Tente novamente.');
      }
    } catch (error) {
      console.error('Auth failed:', error);
      showError(error.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      showLoading(false);
    }
  }

  // ===== HELPERS =====

  function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }
});
