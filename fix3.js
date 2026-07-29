const fs = require('fs');
let html = fs.readFileSync('public/app.html', 'utf8');

html = html.replace(
    /if \(res && res\.success === false\) {\s*\$\('sync_countdown_info'\)\.innerText = "LỖI: " \+ \(res\.error \|\| "Không thể tải dữ liệu Khởi tạo"\);\s*\$\('sync_countdown_info'\)\.style\.color = "red";\s*alert\("LỖI KHỞI TẠO: " \+ \(res\.error \|\| "Lỗi không xác định"\)\);\s*return;\s*}/g,
    `if (res && res.success === false) {
            if (res.error === "RefreshAccessTokenError" || (res.error && res.error.includes("authentication credentials"))) {
                alert("Phiên đăng nhập đã hết hạn. Hệ thống sẽ tự động đăng xuất để bạn đăng nhập lại.");
                window.location.href = '/api/auth/signout?callbackUrl=/';
                return;
            }
            $('sync_countdown_info').innerText = "LỖI: " + (res.error || "Không thể tải dữ liệu Khởi tạo");
            $('sync_countdown_info').style.color = "red";
            alert("LỖI KHỞI TẠO: " + (res.error || "Lỗi không xác định"));
            return;
        }`
);

fs.writeFileSync('public/app.html', html);
console.log('App.html updated for token refresh logic');
