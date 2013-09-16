var fetchdataurl = 'dogtato.net/minecraft/index.php';
var fetchdatafunc = 'title=Special:Ask/';
var query = '[[Category:Maps]]
?x coord
?z coord
?image location
format=json
searchlabel=JSON output
prettyprint=yes
offset=0
sort=x coord
order=ASC';
var httpRequest;

function mapDataReceived() {
    'use strict';
    if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
            // process json object

            // filler
            var testarea = document.getElementById('debugarea');
            testarea.innerHTML = httpRequest.responseText;
        }
    }
}

function sendMapDataRequest() {
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
    httpRequest.onreadystatechange = mapDataReceived;
    httpRequest.open('POST', fetchdataurl);
    httpRequest.setRequestHeader('Content-Type',
        'application/x-www-form-urlencoded');
    var encodedQuery = encodeURIComponent(query),
    // Special:Ask uses dashes instead of percent signs to encode special chars
        reqData = fetchdatafunc + encodedQuery.replace('%', '-');
    httpRequest.send(reqData);
}