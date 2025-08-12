// 禁用浏览器后退功能
(function() {
    // 禁用后退按钮
    history.pushState(null, null, location.href);
    window.onpopstate = function() {
        history.go(1);
    };
    
    // 禁用右键菜单
    document.oncontextmenu = function() {
        return false;
    };
    
    // 禁用F5刷新
    document.onkeydown = function(e) {
        if (e.keyCode === 116) { // F5键
            return false;
        }
    };
    
    // 禁用Ctrl+R刷新
    document.onkeydown = function(e) {
        if (e.ctrlKey && e.keyCode === 82) { // Ctrl+R
            return false;
        }
    };
})();
