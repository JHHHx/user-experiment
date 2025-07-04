document.addEventListener('DOMContentLoaded', function() {
    // 获取或生成用户ID
    function getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            // 首次访问时，等待服务器分配ID
            return null;
        }
        return userId;
    }

    // 通用提交函数
    async function submitToServer(data, pageName) {
        try {
            const userId = getUserId();
            const headers = {
                'Content-Type': 'application/json'
            };
            if (userId) {
                headers['X-User-ID'] = userId;
            }

            const response = await fetch('http://61.185.212.148:5000/submit', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    content: JSON.stringify(data),
                    page: pageName || window.location.pathname
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                // 如果是新用户，保存服务器分配的ID
                if (result.user_id && !userId) {
                    localStorage.setItem('userId', result.user_id);
                }
                return true;
            } else {
                console.error('提交失败');
                return false;
            }
        } catch (error) {
            console.error('提交错误：', error);
            return false;
        }
    }

    // 知情同意页面逻辑 (consent.html)
    const consentCheck = document.getElementById('consent-check');
    const consentButton = document.getElementById('consent-button');
    
    if (consentCheck && consentButton) {
        // 监听复选框变化
        consentCheck.addEventListener('change', function() {
            consentButton.disabled = !this.checked;
        });

        // 监听确定按钮点击
        consentButton.addEventListener('click', async function() {
            if (consentCheck.checked) {
                // 将同意状态保存到 localStorage
                localStorage.setItem('consentGiven', 'true');
                // 保存同意记录到服务器
                await submitToServer({
                    action: 'consent',
                    timestamp: new Date().toISOString()
                }, 'consent.html');
                // 跳转到内容页面
                window.location.href = 'content.html';
            }
        });
    }

    // 多页问卷逻辑
    const page1 = document.getElementById('page1');
    const page2 = document.getElementById('page2');
    const page3 = document.getElementById('page3');
    const toCategory = document.getElementById('toCategory');
    const toMainSurvey = document.getElementById('toMainSurvey');

    if (page1 && page2 && page3) {
        // 检查是否已经同意
        if (!localStorage.getItem('consentGiven')) {
            window.location.href = 'consent.html';
        }
        // 第1页提交
        page1.addEventListener('submit', async function(e) {
            e.preventDefault();
            // 收集第一页数据
            const formData = new FormData(page1);
            const basicData = {};
            for (let [key, value] of formData.entries()) {
                basicData[key] = value;
            }
            // 保存到localStorage，供后续问卷使用
            localStorage.setItem('basicSurvey', JSON.stringify(basicData));
            // 保存到服务器
            await submitToServer(basicData, 'page1');
            // 切换到第2页
            page1.style.display = 'none';
            page2.style.display = '';
            page3.style.display = 'none';
        });

        // 第2页到第3页
        toCategory.addEventListener('click', async function() {
            // 可以保存第2页的状态（如果有表单）
            const page2Data = {}; // 收集第2页数据
            await submitToServer(page2Data, 'page2');
            page1.style.display = 'none';
            page2.style.display = 'none';
            page3.style.display = '';
        });

        // 进入正式问卷
        toMainSurvey.addEventListener('click', async function() {
            // 可以保存第3页的状态（如果有表单）
            const page3Data = {}; // 收集第3页数据
            await submitToServer(page3Data, 'page3');
            window.location.href = 'main.html';
        });
    }

    // 工具展示页面逻辑 (main-demo.html)
    const demoNext = document.getElementById('demo-next');
    if (demoNext) {
        demoNext.addEventListener('click', async function() {
            await submitToServer({
                action: 'demo_completed',
                timestamp: new Date().toISOString()
            }, 'main-demo.html');
            window.location.href = 'main-annotate.html';
        });
    }

    // 任务说明页面逻辑 (main-task.html)
    const startEval = document.getElementById('start-eval');
    if (startEval) {
        startEval.addEventListener('click', async function() {
            await submitToServer({
                action: 'task_instruction_read',
                timestamp: new Date().toISOString()
            }, 'main-task.html');
            window.location.href = 'main.html';
        });
    }

    // 旧问卷页面逻辑（main.html）
    const surveyForm = document.getElementById('survey-form');
    if (surveyForm) {
        if (!localStorage.getItem('consentGiven')) {
            window.location.href = 'consent.html';
        }
        surveyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(surveyForm);
            const surveyData = {};
            for (let [key, value] of formData.entries()) {
                surveyData[key] = value;
            }
            // 合并基本信息
            const basicData = JSON.parse(localStorage.getItem('basicSurvey') || '{}');
            Object.assign(surveyData, basicData);
            surveyData.timestamp = new Date().toISOString();
            
            // 保存到服务器
            if (await submitToServer(surveyData, 'main.html')) {
                // 本地存储作为备份
                let savedSurveys = JSON.parse(localStorage.getItem('surveyResults') || '[]');
                savedSurveys.push(surveyData);
                localStorage.setItem('surveyResults', JSON.stringify(savedSurveys));
                alert('问卷提交成功！感谢您的参与！');
                surveyForm.reset();
            }
        });
    }
}); 