(() => {
    const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || '').replace(/\/$/, '');

    const elements = {
        registerForm: document.querySelector('#register-form'),
        usernameInput: document.querySelector('#username'),
        passwordInput: document.querySelector('#password'),
        nameInput: document.querySelector('#name'),
        gradeSelect: document.querySelector('#grade'),
        registerButton: document.querySelector('#register-button'),
        errorMessage: document.querySelector('#error-message'),
        successMessage: document.querySelector('#success-message'),
    };

    let allowedGrades = [];

    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = 'block';
        elements.successMessage.style.display = 'none';
    }

    function hideError() {
        elements.errorMessage.style.display = 'none';
    }

    function showSuccess(message) {
        elements.successMessage.textContent = message;
        elements.successMessage.style.display = 'block';
        elements.errorMessage.style.display = 'none';
    }

    async function loadConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`);
            if (!response.ok) {
                throw new Error('配置加载失败');
            }
            const data = await response.json();
            if (Array.isArray(data.allowedGrades) && data.allowedGrades.length) {
                allowedGrades = data.allowedGrades;
                populateGradeOptions();
            }
        } catch (error) {
            console.warn('加载配置失败:', error);
        }
    }

    function populateGradeOptions() {
        elements.gradeSelect.innerHTML = '<option value="">不指定</option>';
        allowedGrades.forEach((grade) => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            elements.gradeSelect.appendChild(option);
        });
    }

    elements.registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideError();
        elements.registerButton.disabled = true;
        elements.registerButton.textContent = '注册中...';

        const username = elements.usernameInput.value.trim();
        const password = elements.passwordInput.value;
        const name = elements.nameInput.value.trim();
        const grade = elements.gradeSelect.value;

        if (!username || !password) {
            showError('请输入用户名和密码');
            elements.registerButton.disabled = false;
            elements.registerButton.textContent = '注册';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/students/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, name, grade: grade || null }),
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.message || '注册失败，请重试');
                elements.registerButton.disabled = false;
                elements.registerButton.textContent = '注册';
                return;
            }

            showSuccess('注册成功！请等待老师审批，审批通过后即可登录。');
            elements.registerForm.reset();
            setTimeout(() => {
                window.location.href = 'student-login.html';
            }, 3000);
        } catch (error) {
            showError('网络错误，请检查连接后重试');
            elements.registerButton.disabled = false;
            elements.registerButton.textContent = '注册';
        }
    });

    loadConfig();
})();

