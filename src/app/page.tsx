import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { kv } from "@/lib/cache";
import { performGlobalSync } from "@/lib/syncLogic";

export default async function Home() {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/auth/signin");
  }

  const email = session.user.email.toLowerCase();

  let mailDataStr = await kv.get<string>('rbac_mailData');
  
  // Cold start auto-sync
  if (!mailDataStr || mailDataStr === '{}') {
    if (session.accessToken) {
      try {
        const syncResult = await performGlobalSync(session.accessToken);
        mailDataStr = JSON.stringify(syncResult?.mailData || {});
      } catch (error) {
        console.error("Cold start sync failed", error);
      }
    }
  }

  // Reload after potential sync
  const mailData = mailDataStr && mailDataStr !== '{}' ? JSON.parse(mailDataStr) : null;

  if (!mailData) {
    return (
      <div style={{fontFamily: '-apple-system, sans-serif', textAlign: 'center', padding: '100px 20px', background: '#f0fdf4', minHeight: '100vh'}}>
        <div style={{background: 'white', maxWidth: '500px', margin: '0 auto', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}}>
           <div style={{fontSize: '60px', marginBottom: '20px'}}>⚙️</div>
          <h1 style={{color: '#166534', fontSize: '20px', marginBottom: '10px'}}>HỆ THỐNG CHƯA KHỞI TẠO</h1>
          <p style={{color: '#15803d', fontSize: '15px', lineHeight: 1.6}}>Bộ nhớ Database hiện đang trống hoặc bạn không có quyền truy cập vào Sheet gốc. Nếu bạn là Quản trị viên, vui lòng làm theo 2 bước sau:</p>
          <div style={{marginTop: '20px', padding: '15px', background: '#fcfdfd', borderRadius: '10px', border: '1px dashed #16a34a', textAlign: 'left', color: '#1e293b', fontSize: '14px'}}>
            <b>B1:</b> Khai báo Email <i>[{email}]</i> vào Sheet TỔNG HỢP với quyền ADMIN.<br/><br/>
            <b>B2:</b> Bấm Tải lại trang (F5) để hệ thống nạp lại Cache.
          </div>
        </div>
      </div>
    );
  }

  if (!mailData[email]) {
    return (
      <div style={{fontFamily: '-apple-system, sans-serif', textAlign: 'center', padding: '100px 20px', background: '#f8fafc', minHeight: '100vh'}}>
        <div style={{background: 'white', maxWidth: '400px', margin: '0 auto', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}}>
           <div style={{fontSize: '60px', marginBottom: '20px'}}>⛔</div>
          <h1 style={{color: '#1e293b', fontSize: '20px', marginBottom: '10px'}}>TỪ CHỐI TRUY CẬP</h1>
          <p style={{color: '#64748b', fontSize: '15px', lineHeight: 1.6}}>Email của bạn [<b>{email}</b>] không được cấp quyền.</p>
        </div>
      </div>
    );
  }

  // Nếu đăng nhập và được duyệt hợp lệ, chuyển hướng thẳng vào file gốc
  redirect("/app.html");
}
