document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在知情同意页面
    const consentCheck = document.getElementById('consent-check');
    const consentButton = document.getElementById('consent-button');
    
    if (consentCheck && consentButton) {
        // 监听复选框变化
        consentCheck.addEventListener('change', function() {
            consentButton.disabled = !this.checked;
        });

        // 监听确定按钮点击
        consentButton.addEventListener('click', function() {
            if (consentCheck.checked) {
                // 将同意状态保存到 localStorage
                localStorage.setItem('consentGiven', 'true');
                // 跳转到主页面
                window.location.href = 'index.html';
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
        page1.addEventListener('submit', function(e) {
            e.preventDefault();
            // 收集第一页数据
            const formData = new FormData(page1);
            const basicData = {};
            for (let [key, value] of formData.entries()) {
                basicData[key] = value;
            }
            // 保存到localStorage，供后续问卷使用
            localStorage.setItem('basicSurvey', JSON.stringify(basicData));
            // 切换到第2页
            page1.style.display = 'none';
            page2.style.display = '';
            page3.style.display = 'none';
        });
        // 第2页到第3页
        toCategory.addEventListener('click', function() {
            page1.style.display = 'none';
            page2.style.display = 'none';
            page3.style.display = '';
        });
        // 进入正式问卷
        toMainSurvey.addEventListener('click', function() {
            window.location.href = 'main.html';
        });
    }

    // 旧问卷页面逻辑（main.html）
    const surveyForm = document.getElementById('survey-form');
    if (surveyForm) {
        if (!localStorage.getItem('consentGiven')) {
            window.location.href = 'consent.html';
        }
        surveyForm.addEventListener('submit', function(e) {
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
            let savedSurveys = JSON.parse(localStorage.getItem('surveyResults') || '[]');
            savedSurveys.push(surveyData);
            localStorage.setItem('surveyResults', JSON.stringify(savedSurveys));
            alert('问卷提交成功！感谢您的参与！');
            surveyForm.reset();
        });
    }
}); 