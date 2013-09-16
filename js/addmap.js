var submiturl = 'php/addmap.php';
var httpRequest;

function mapSubmitted() {
    'use strict';
    if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
            var testarea = document.getElementById('debugarea');
            testarea.innerHTML = httpRequest.responseText;
        }
    }
}

function submitMap(url, num, x, y) {
    'use strict';
    if (window.XMLHttpRequest) { // Mozilla, Safari, ...
        httpRequest = new XMLHttpRequest();
    } else if (window.ActiveXObject) { // IE
        try {
            httpRequest = new window.ActiveXObject('Msxml2.XMLHTTP');
        } catch (e) {
            try {
                httpRequest = new window.ActiveXObject('Microsoft.XMLHTTP');
            } catch (e2) {
                window.alert('Giving up :( Cannot create an XMLHTTP instance');
                return false;
            }
        }
    }
    httpRequest.onreadystatechange = mapSubmitted;
    httpRequest.open('POST', submiturl);
    httpRequest.setRequestHeader('Content-Type',
        'application/x-www-form-urlencoded');
    var reqData = ['mapurl=' + encodeURIComponent(url) + '&',
        'mapnum=' + encodeURIComponent(num) + '&',
        'mapx=' + encodeURIComponent(x) + '&',
        'mapy=' + encodeURIComponent(y)]
        .join('');
    window.alert(reqData);
    httpRequest.send(reqData);
}

document.getElementById('submitmapinfo').onclick = function () {
    'use strict';
    var m_url = document.getElementById('mapurl').value,
        m_num = document.getElementById('mapnum').value,
        m_x = document.getElementById('mapx').value,
        m_y = document.getElementById('mapy').value;
    submitMap(m_url, m_num, m_x, m_y);
};
