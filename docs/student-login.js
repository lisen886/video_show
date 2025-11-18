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
        elements.errorMessage.style.display = 'block';
    }

    function hideError() {
        elements.errorMessage.style.display = 'none';
    }

    elements.loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideError();
        elements.loginButton.disabled = true;
        elements.loginButton.textContent = '登录中...';

        const username = elements.usernameInput.value.trim();
        const password = elements.passwordInput.value;

        if (!username || !password) {
            showError('请输入用户名和密码');
            elements.loginButton.disabled = false;
            elements.loginButton.textContent = '登录';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/students/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.message || '登录失败，请重试');
                elements.loginButton.disabled = false;
                elements.loginButton.textContent = '登录';
                return;
            }

            localStorage.setItem('studentToken', data.token);
            localStorage.setItem('studentInfo', JSON.stringify(data.student));
            window.location.href = 'student.html';
        } catch (error) {
            showError('网络错误，请检查连接后重试');
            elements.loginButton.disabled = false;
            elements.loginButton.textContent = '登录';
        }
    });
})();

