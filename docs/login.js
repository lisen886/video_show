(() => {
  const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || '').replace(/\/$/, '');

  const elements = {
    loginForm: document.querySelector('#login-form'),
    usernameInput: document.querySelector('#username'),
    passwordInput: document.querySelector('#password'),
    loginButton: document.querySelector('#login-button'),
    errorMessage: document.querySelector('#error-message'),
  };

  function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.hidden = false;
  }

  function hideError() {
    elements.errorMessage.hidden = true;
  }

  function setLoading(loading) {
    elements.loginButton.disabled = loading;
    elements.loginButton.textContent = loading ? '登录中...' : '登录';
  }

  async function handleLogin(event) {
    event.preventDefault();
    hideError();

    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value;

    if (!username || !password) {
      showError('请输入用户名和密码');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || '登录失败，请重试');
        return;
      }

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', data.username);

      window.location.href = 'index.html';
    } catch (error) {
      showError('网络错误，请检查后端服务是否运行');
      console.error('登录错误:', error);
    } finally {
      setLoading(false);
    }
  }

  elements.loginForm.addEventListener('submit', handleLogin);

  const token = localStorage.getItem('adminToken');
  if (token) {
    window.location.href = 'index.html';
  }
})();

