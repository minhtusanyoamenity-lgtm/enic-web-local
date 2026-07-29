const fs = require('fs');

let html = fs.readFileSync('public/app.html', 'utf8');

// 1. btnSubmit -> processAndSaveOrder
html = html.replace(/google\.script\.run\.withSuccessHandler\(res => {\s*if\(res\.success\)\s*{\s*windowOrderCache = res\.cache; windowRawStock = res\.rawStock; renderRes\(\$\('priorityKho'\)\.value\); toggle\(true, "✅ THÀNH CÔNG!"\);\s*localStorage\.removeItem\('enic_draft_order'\);\s*\/\/ XÓA NHÁP KHI LƯU THÀNH CÔNG\s*setTimeout\(\(\) => { toggle\(false\); handleAction\(2, 1\); }, 1500\);\s*}\s*else { toggle\(false\); silentAlert\(\$\('btnSubmit'\), '❌ LỖI TỒN KHO'\); }\s*}\)\.processAndSaveOrder\((.*?)\);/gs, 
"fetch('/api/order/process', {method: 'POST', body: JSON.stringify($1)}).then(r=>r.json()).then(res => {\n          if(res.success) { \n              windowOrderCache = res.cache; windowRawStock = res.rawStock; renderRes($('priorityKho').value); toggle(true, \"✅ THÀNH CÔNG!\"); \n              localStorage.removeItem('enic_draft_order'); // XÓA NHÁP KHI LƯU THÀNH CÔNG\n              setTimeout(() => { toggle(false); handleAction(2, 1); }, 1500); \n          } \n          else { toggle(false); silentAlert($('btnSubmit'), '❌ LỖI TỒN KHO'); } \n      });");

// 2. btnPrintInvoice -> saveInvoiceDataOnly
html = html.replace(/google\.script\.run\.withSuccessHandler\(res => {\s*if\(res\.success\) {\s*togglePrintUi\(true, '✅ LƯU THÀNH CÔNG'\);\s*invoiceData\.soHoaDon = res\.maHD;\s*\$\('printIframe'\)\.srcdoc = generateInvoiceHTML_Client\(invoiceData\);\s*\$\('printModalOverlay'\)\.style\.display = 'flex';\s*setTimeout\(\(\) => togglePrintUi\(false\), 1500\);\s*} else {\s*togglePrintUi\(true, '❌ LỖI GHI SHEET'\);\s*setTimeout\(\(\) => togglePrintUi\(false\), 1500\);\s*}\s*}\)\.saveInvoiceDataOnly\((.*?)\);/gs,
"fetch('/api/order/invoice-only', {method: 'POST', body: JSON.stringify($1)}).then(r=>r.json()).then(res => {\n         if(res.success) {\n             togglePrintUi(true, '✅ LƯU THÀNH CÔNG');\n             invoiceData.soHoaDon = res.maHD;\n             $('printIframe').srcdoc = generateInvoiceHTML_Client(invoiceData);\n             $('printModalOverlay').style.display = 'flex';\n             setTimeout(() => togglePrintUi(false), 1500);\n         } else {\n             togglePrintUi(true, '❌ LỖI GHI SHEET');\n             setTimeout(() => togglePrintUi(false), 1500);\n         }\n      });");

// 3. syncFormToCloud
html = html.replace(/google\.script\.run\.withSuccessHandler\(function\(res\) {\s*if\(res\.status === 'success'\) {\s*window\.lastSyncTimestamp = res\.timestamp; \/\/ Chốt mốc.*\s*btn\.innerText = "THÀNH CÔNG ✓";\s*btn\.style\.background = "#10b981";\s*setTimeout\(\(\) => {\s*btn\.classList\.remove\('show-sync'\);\s*setTimeout\(\(\) => {\s*btn\.innerText = "Đồng bộ";\s*btn\.style\.background = "var\(--enic-blue-light\)";\s*btn\.style\.pointerEvents = 'auto';\s*}, 400\);\s*}, 1500\);\s*}\s*}\)\.syncFormToCloud\(currentDraft\);/gs,
"/* Cloud Sync Disabled */ btn.innerText = 'THÀNH CÔNG ✓'; btn.style.background = '#10b981'; setTimeout(() => { btn.classList.remove('show-sync'); setTimeout(() => { btn.innerText = 'Đồng bộ'; btn.style.background = 'var(--enic-blue-light)'; btn.style.pointerEvents = 'auto'; }, 400); }, 1500);");

// 4. getCloudSyncData
html = html.replace(/google\.script\.run\.withSuccessHandler\(function\(res\) {\s*if\(res\.hasNew && parseInt\(res\.timestamp\) > parseInt\(window\.lastSyncTimestamp\)\) {\s*window\.pendingSyncData = res\.data;\s*window\.lastSyncTimestamp = res\.timestamp;\s*document\.getElementById\('syncPopup'\)\.style\.display = 'flex'; \/\/ Chỉ hiển thị.*\s*}\s*}\)\.getCloudSyncData\(window\.lastSyncTimestamp\);/gs,
"/* Cloud Sync Disabled */");

// 5. getCloudSyncData(0)
html = html.replace(/google\.script\.run\.withSuccessHandler\(function\(res\) {\s*if\(res\.hasNew\) {\s*window\.lastSyncTimestamp = res\.timestamp; \/\/ Ghi nhận.*\s*}\s*setInterval\(checkCloudSync, 3000\); \/\/ Sau đó.*\s*}\)\.getCloudSyncData\(0\);/gs,
"/* Cloud Sync Disabled */");

// 6. checkToanDien
html = html.replace(/google\.script\.run\.withSuccessHandler\(res => {\s*if\(res\.success\)\s*{\s*applyDataToTab\('bd'.*?\}\s*else setLoadBtnState\(btn, 'error'\);\s*}\)\.checkToanDien\((.*?)\);/gs,
"fetch('/api/order/latest', {method: 'POST', body: JSON.stringify($1)}).then(r=>r.json()).then(res => { if(res.success) { applyDataToTab('bd', res.data.cusName, res.data.phone, res.data.address, res.data.note, res.data.products); setLoadBtnState(btn, 'success'); } else setLoadBtnState(btn, 'error'); });");

// 7. Any other remaining google.script.run
html = html.replace(/google\.script\.run/g, "console.log('google.script.run is disabled:' ");

fs.writeFileSync('public/app.html', html);
console.log('Replaced successfully.');
