document.addEventListener('DOMContentLoaded', function() {
    // 创建全局加载提示
    window.showLoading = function(message = '加载中...') {
        // 移除已存在的加载提示
        const existingLoading = document.getElementById('global-loading');
        if (existingLoading) {
            existingLoading.remove();
        }
        
        // 创建加载提示元素
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'global-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        const loadingContent = document.createElement('div');
        loadingContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        loadingContent.innerHTML = `
            <div style="margin-bottom: 15px;">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            </div>
            <div style="color: #333; font-size: 16px;">${message}</div>
        `;
        
        // 添加旋转动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        loadingDiv.appendChild(loadingContent);
        document.body.appendChild(loadingDiv);
    };
    
    window.hideLoading = function() {
        const loadingDiv = document.getElementById('global-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    };

    // 获取或生成用户ID
    window.getUserId = function() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            // 首次访问时，等待服务器分配ID
            return null;
        }
        return userId;
    }

    // 改进的用户ID管理函数
    window.ensureUserId = async function() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            // 如果没有用户ID，先尝试从服务器获取或创建
            try {
                const response = await fetch('https://user-experiment.onrender.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: JSON.stringify({ action: 'init_user' }),
                        page: 'user_init'
                    })
                });
                
                const result = await response.json();
                if (result.status === 'success' && result.user_id) {
                    userId = result.user_id;
                    localStorage.setItem('userId', userId);
                    // console.log('新用户ID已保存:', userId);
                }
            } catch (error) {
                // console.error('获取用户ID失败:', error);
                // 如果网络失败，生成临时ID
                userId = 'temp_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('userId', userId);
            }
        }
        return userId;
    }

    // 通用提交函数
    window.submitToServer = async function(data, pageName) {
        try {
            // 显示加载提示
            if (window.showLoading) {
                window.showLoading('正在提交数据，请稍候...');
            }
            
            // 确保有用户ID
            const userId = await window.ensureUserId();
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
                case 'end.html':
                    table = 'question_ans';
                    type = 'survey';
                    break;
                case 'content-page2':
                    table = 'question_ans';
                    type = 'understanding_rating';
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
                    // console.error('提交失败：image_name 不能为空');
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

                // console.log('准备发送的标注数据:', {
                //     image: data.image_name,
                //     annotations: {
                //         feedback: data.feedback,
                //         rectangles: (data.rectangles || []).length + '个标注区域'
                //     }
                // });
            } else if (pageName === 'tool-verify.html') {
                // 工具验证页面特殊处理
                submitData = {
                    content: JSON.stringify({
                        image: data.image,
                        answers: data.answers,
                        timeSpentSeconds: data.timeSpentSeconds,
                        timestamp: new Date().toISOString()
                    }),
                    page: pageName
                };
                
            } else if (pageName === 'end.html') {
                // 问卷页面特殊处理
                submitData = {
                    content: JSON.stringify({
                        answers1: data.answers1,
                        answers2: data.answers2,
                        answers3: data.answers3,
                        answers4: data.answers4,
                        timestamp: new Date().toISOString()
                    }),
                    page: pageName
                };
                
            } else if (pageName === 'content-page2') {
                // 了解程度评分特殊处理
                submitData = {
                    content: JSON.stringify({
                        answers5: data.answers5,
                        timestamp: new Date().toISOString()
                    }),
                    page: pageName
                };
                
            } else {
                // 其他页面的通用处理
                submitData = {
                    content: JSON.stringify(data),
                    page: pageName
                };
            }

            // 设置超时时间（30秒）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch('https://user-experiment.onrender.com/submit', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(submitData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // console.log('服务器响应状态:', response.status);
            const result = await response.json();
            // console.log('服务器响应:', result);

            if (result.status === 'success') {
                // 如果是新用户，保存服务器分配的ID
                if (result.user_id && !userId) {
                    localStorage.setItem('userId', result.user_id);
                }
                
                // 隐藏加载提示
                if (window.hideLoading) {
                    window.hideLoading();
                }
                
                return true;
            } else {
                // console.error('提交失败:', result.message);
                // 隐藏加载提示
                if (window.hideLoading) {
                    window.hideLoading();
                }
                return false;
            }
        } catch (error) {
            // console.error('提交错误：', error);
            
            // 隐藏加载提示
            if (window.hideLoading) {
                window.hideLoading();
            }
            
            // 如果是超时错误，显示特殊提示
            if (error.name === 'AbortError') {
                alert('提交超时，请检查网络连接后重试。如果问题持续，请刷新页面。');
            }
            
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

        // 第2页：Dark Pattern简介 + 了解程度评分
        window.submitPage2 = async function() {
            // 获取用户选择的了解程度评分
            const understandingRating = document.querySelector('input[name="understanding"]:checked');
            
            if (!understandingRating) {
                alert('请选择您对暗黑模式的了解程度');
                return;
            }
            
            const rating = parseInt(understandingRating.value);
            
            // 先保存了解程度评分到question_ans表
            const ratingSuccess = await submitToServer({
                answers5: rating,
                timestamp: new Date().toISOString()
            }, 'content-page2');
            
            if (!ratingSuccess) {
                alert('评分提交失败，请重试');
                return;
            }
            
            // 再记录用户已阅读Dark Pattern简介
            const readSuccess = await submitToServer({
                action: 'read_intro',
                page: 'page2',
                timestamp: new Date().toISOString()
            }, 'content.html');

            if (readSuccess) {
                localStorage.setItem('page2_completed', 'true');
                showPage('page3');
            } else {
                alert('提交失败，请重试');
            }
        };

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