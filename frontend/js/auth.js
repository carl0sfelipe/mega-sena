/**
 * Authentication handling for login page
 */

let isRegisterMode = false;

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const nameInput = document.getElementById('nameInput');
  const pixKeyInput = document.getElementById('pixKeyInput');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const errorMessage = document.getElementById('errorMessage');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const formTitle = document.getElementById('formTitle');
  const submitButtonText = document.getElementById('submitButtonText');

  // Tab switching
  loginTab.addEventListener('click', () => {
    isRegisterMode = false;
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    formTitle.textContent = 'Login';
    submitButtonText.textContent = 'Entrar';
  });

  registerTab.addEventListener('click', () => {
    isRegisterMode = true;
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    formTitle.textContent = 'Cadastro';
    submitButtonText.textContent = 'Cadastrar';
  });

  loginForm.addEventListener('submit', handleSubmit);

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
      if (isRegisterMode) {
        response = await api.register(name, pixKey);
      } else {
        response = await api.login(name, pixKey);
      }

      if (response.success && response.user) {
        console.log(`${isRegisterMode ? 'Registration' : 'Login'} successful:`, response.user);

        // Redirect based on user role
        if (response.user.isAdmin) {
          window.location.href = '/admin.html';
        } else {
          window.location.href = '/dashboard.html';
        }
      }
    } catch (error) {
      console.error(`${isRegisterMode ? 'Registration' : 'Login'} failed:`, error);
      showError(error.message || `Erro ao ${isRegisterMode ? 'cadastrar' : 'fazer login'}. Tente novamente.`);
    } finally {
      showLoading(false);
    }
  }

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
