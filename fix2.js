const fs = require('fs');
let text = fs.readFileSync('public/app.html', 'utf8');

text = text.replace(
    "/* google.script.run is disabled */ (()=>{",
    "fetch('/api/order/process', {method: 'POST', body: JSON.stringify({ manualProducts: ps, sourceSheet: 'Web', targetSheet: 'NoSave', priorityKho: document.getElementById('priorityKho').value, info: {} })}).then(r=>r.json()).then(res => {"
);
text = text.replace(
    "}).processAndSaveOrder({ manualProducts: ps, sourceSheet: 'Web', targetSheet: 'NoSave', priorityKho: document.getElementById('priorityKho').value, info: {} });",
    "}).catch(e => { btn.classList.remove('spinning'); setTimeout(() => { isRefreshingKho = false; }, 3000); });"
);

fs.writeFileSync('public/app.html', text);
console.log('Fixed btnRefreshKho');
