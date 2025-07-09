document.addEventListener('DOMContentLoaded', function() {
    // 获取或生成用户ID
    window.getUserId = function() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            // 首次访问时，等待服务器分配ID
            return null;
        }
        return userId;
    }

    // 通用提交函数
    window.submitToServer = async function(data, pageName) {
        try {
            const userId = getUserId();
            const headers = {
                'Content-Type': 'application/json'
            };
            if (userId) {
                headers['X-User-ID'] = userId;
            }

            // 根据页面名称设置对应的表名和数据类型
            let table = '';
            let type = '';
            switch(pageName) {
                case 'index.html':
                    table = 'consent_records';
                    type = 'consent';
                    break;
                case 'content.html':
                    table = 'user_basic_info';
                    type = 'basic_info';
                    break;
                case 'main-demo.html':
                case 'main-task.html':
                    table = 'submissions';
                    type = 'completion';
                    break;
                case 'main-annotate.html':
                case 'main-annotate-complete':
                    table = 'annotation_data';
                    type = 'annotation';
                    break;
                case 'tool-verify.html':
                    table = 'tool_verify_answers';
                    type = 'verification';
                    break;
                default:
                    table = 'submissions';
                    type = 'other';
            }

            // 准备提交数据
            let submitData;
            if (pageName === 'main-annotate.html' || pageName === 'main-annotate-complete') {
                // 验证image_name是否存在
                if (!data.image_name) {
                    console.error('提交失败：image_name 不能为空');
                    return false;
                }

                // 标注数据特殊处理
                submitData = {
                    content: JSON.stringify({
                        image: data.image_name,
                        annotations: {
                            feedback: data.feedback,
                            rectangles: data.rectangles || []
                        }
                    }),
                    page: pageName
                };

                console.log('准备发送的标注数据:', {
                    image: data.image_name,
                    annotations: {
                        feedback: data.feedback,
                        rectangles: (data.rectangles || []).length + '个标注区域'
                    }
                });
            } else if (pageName === 'tool-verify.html') {
                // 工具验证页面特殊处理
                submitData = {
                    content: JSON.stringify({
                        image: data.image,
                        answers: data.answers,
                        timestamp: new Date().toISOString()
                    }),
                    page: pageName
                };
                
                // 如果提交失败，保存到本地
                const backupData = {
                    image: data.image,
                    answers: data.answers,
                    timestamp: new Date().toISOString()
                };
                
                try {
                    let savedAnswers = JSON.parse(localStorage.getItem('toolVerifyAnswers') || '[]');
                    savedAnswers.push(backupData);
                    localStorage.setItem('toolVerifyAnswers', JSON.stringify(savedAnswers));
                } catch (e) {
                    console.error('备份数据保存失败:', e);
                }
            } else {
                submitData = {
                    content: JSON.stringify(data),
                    table: table,
                    type: type,
                    page: pageName,
                    timestamp: new Date().toISOString()
                };
            }

            // 调试模式：只打印不提交
            if (localStorage.getItem('debugMode') === 'true') {
                console.log('调试模式 - 提交数据:', {
                    url: 'http://10.178.195.192:5000/submit',
                    method: 'POST',
                    headers: headers,
                    data: submitData,
                    page: pageName
                });
                return true;
            }

            const response = await fetch('http://10.178.195.192:5000/submit', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(submitData)
            });

            console.log('服务器响应状态:', response.status);
            const result = await response.json();
            console.log('服务器响应:', result);

            if (result.status === 'success') {
                // 如果是新用户，保存服务器分配的ID
                if (result.user_id && !userId) {
                    localStorage.setItem('userId', result.user_id);
                }
                return true;
            } else {
                console.error('提交失败:', result.message);
                return false;
            }
        } catch (error) {
            console.error('提交错误：', error);
            return false;
        }
    }

    // 知情同意页面逻辑
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
                const success = await submitToServer({
                    action: 'consent',
                    status: 'agreed',
                    timestamp: new Date().toISOString()
                }, 'index.html');
                
                if (success) {
                    // 重置页面状态，确保从第一页开始
                    localStorage.removeItem('page1_completed');
                    localStorage.removeItem('page2_completed');
                    localStorage.removeItem('page3_completed');
                    // 跳转到内容页面
                    window.location.href = 'content.html';
                } else {
                    alert('提交失败，请重试');
                }
            }
        });
    }

    // content.html 多页面逻辑
    const page1Form = document.getElementById('page1');
    const page2 = document.getElementById('page2');
    const page3 = document.getElementById('page3');

    if (page1Form && page2 && page3) {
        // 第1页：基本信息提交
        page1Form.addEventListener('submit', async function(event) {
            event.preventDefault();
            const age = document.querySelector('select[name="age"]').value;
            const gender = document.querySelector('select[name="gender"]').value;
            const major = document.querySelector('input[name="major"]').value;
            
            if (!age || !gender || !major) {
                alert('请填写所有必填项');
                return;
            }
            
            // 收集表单数据
            const formData = {
                age: age,
                gender: gender,
                major: major,
                page: 'page1',
                timestamp: new Date().toISOString()
            };
            
            // 保存到localStorage
            localStorage.setItem('basicSurvey', JSON.stringify(formData));
            
            // 提交到服务器
            const success = await submitToServer(formData, 'content.html');
            if (success) {
                // 提交成功后记录已完成状态
                localStorage.setItem('page1_completed', 'true');
                showPage('page2');
            } else {
                alert('提交失败，请重试');
            }
        });

        // 第2页：Dark Pattern简介
        const toPage3Button = document.querySelector('#page2 button');
        if (toPage3Button) {
            toPage3Button.addEventListener('click', async function() {
                // 记录用户已阅读Dark Pattern简介
                const success = await submitToServer({
                    action: 'read_intro',
                    page: 'page2',
                    timestamp: new Date().toISOString()
                }, 'content.html');

                if (success) {
                    localStorage.setItem('page2_completed', 'true');
                    showPage('page3');
                } else {
                    alert('提交失败，请重试');
                }
            });
        }

        // 第3页：Dark Pattern分类描述
        const toMainTaskButton = document.querySelector('#page3 button');
        if (toMainTaskButton) {
            toMainTaskButton.addEventListener('click', async function() {
                // 记录用户已阅读Dark Pattern分类
                const success = await submitToServer({
                    action: 'read_categories',
                    page: 'page3',
                    timestamp: new Date().toISOString()
                }, 'content.html');

                if (success) {
                    localStorage.setItem('page3_completed', 'true');
                    window.location.href = 'main-task.html';
                } else {
                    alert('提交失败，请重试');
                }
            });
        }

        // 检查页面加载时应该显示哪个页面
        if (localStorage.getItem('page2_completed')) {
            showPage('page3');
        } else if (localStorage.getItem('page1_completed')) {
            showPage('page2');
        } else {
            // 默认显示第一页
            showPage('page1');
        }
    }

    // 多页问卷逻辑
    const toCategory = document.getElementById('toCategory');
    const toMainSurvey = document.getElementById('toMainSurvey');

    if (toCategory && toMainSurvey) {
        // 检查是否已经同意
        if (!localStorage.getItem('consentGiven')) {
            window.location.href = 'consent.html';
        }
        // 第1页提交
        toCategory.addEventListener('click', async function() {
            // 可以保存第2页的状态（如果有表单）
            const page2Data = {}; // 收集第2页数据
            await submitToServer(page2Data, 'page2');
            showPage('page2');
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

// 页面切换函数
window.showPage = function(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.survey-page').forEach(page => {
        page.style.display = 'none';
    });
    
    // 显示目标页面
    document.getElementById(pageId).style.display = 'block';
    
    // 滚动到顶部
    window.scrollTo(0, 0);
}; 