const fs = require('fs');
let html = fs.readFileSync('public/app.html', 'utf8');

html = html.replace(
    /if \(syncRes\.success === false\) {\s*alert\("LỖI ĐỒNG BỘ: " \+ syncRes\.error\);\s*btn\.innerText = '❌ LỖI ĐỒNG BỘ'; btn\.style\.background = 'var\(--danger\)';\s*setTimeout\(\(\) => { btn\.innerText = 'LƯU CẤU HÌNH KẾT NỐI'; btn\.style\.background = 'var\(--success\)'; btn\.style\.pointerEvents = 'auto'; }, 2000\);\s*return;\s*}/g,
    `if (syncRes.success === false) {
                if (syncRes.error === "RefreshAccessTokenError" || (syncRes.error && syncRes.error.includes("authentication credentials"))) {
                    alert("Phiên đăng nhập đã hết hạn. Hệ thống sẽ tự động đăng xuất để bạn đăng nhập lại.");
                    window.location.href = '/api/auth/signout?callbackUrl=/';
                    return;
                }
                alert("LỖI ĐỒNG BỘ: " + syncRes.error);
                btn.innerText = '❌ LỖI ĐỒNG BỘ'; btn.style.background = 'var(--danger)';
                setTimeout(() => { btn.innerText = 'LƯU CẤU HÌNH KẾT NỐI'; btn.style.background = 'var(--success)'; btn.style.pointerEvents = 'auto'; }, 2000);
                return;
            }`
);

fs.writeFileSync('public/app.html', html);
console.log('App.html updated for force sync');
