function loadCSS(href) {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

function loadPhoneHome() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'phone_home.html', true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            document.getElementById('userAppSection').innerHTML = xhr.responseText;
            // phone_home.html에 필요한 CSS를 불러옴
            loadCSS('phone_home.css');
        }
    };
    xhr.send();
}

window.onload = function() {
    loadPhoneHome();
};
