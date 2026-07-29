import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData } from '@/lib/google-sheets';
import { kv } from '@/lib/cache';
import { performGlobalSync } from '@/lib/syncLogic';

export async function GET(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing Google Sheets access' }, { status: 401 });
    }
    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json({ success: false, error: 'RefreshAccessTokenError' }, { status: 401 });
    }

    const email = session.user.email.toLowerCase();
    const accessToken = session.accessToken;
    
    let mailDataStr = await kv.get<string>('rbac_mailData');
    let linkDataStr = await kv.get<string>('rbac_linkData');
    
    // Auto-sync if cache is completely empty (cold start)
    if (!mailDataStr || !linkDataStr) {
      const syncResult = await performGlobalSync(accessToken);
      mailDataStr = JSON.stringify(syncResult.mailData);
      linkDataStr = JSON.stringify(syncResult.linkData);
    }

    const globalSyncTime = await kv.get<string>('globalSyncTime') || "0";

    const mailData = mailDataStr ? JSON.parse(mailDataStr) : {};
    const linkData = linkDataStr ? JSON.parse(linkDataStr) : {};

    const userName = mailData[email];
    if (!userName) throw new Error(`⛔ Email [${email}] không có quyền vào Web! Vui lòng liên hệ Admin.`);
    
    const userLinks = linkData[userName];
    if (!userLinks) throw new Error(`⛔ LỖI CẤU HÌNH: User [${userName}] chưa được gán Link!`);
    
    const invId = userLinks.invoiceId;
    const khoId = userLinks.inventoryId;

    if (!invId) throw new Error(`⛔ LỖI CẤU HÌNH: User [${userName}] chưa được gán Link HÓA ĐƠN!`);
    if (!khoId) throw new Error(`⛔ LỖI CẤU HÌNH: User [${userName}] chưa được gán Link TỒN KHO!`);

    await kv.set(`user_${email}_invoiceId`, invId);
    await kv.set(`user_${email}_inventoryId`, khoId);
    await kv.set(`user_${email}_userName`, userName);

    let invDataStr = await kv.get<string>(`user_${email}_invData_Cache`);
    let invData = invDataStr ? JSON.parse(invDataStr) : {};
    const userLastSync = await kv.get<string>(`user_${email}_lastSyncTime`) || "0";
    const currentTime = new Date().getTime();
    const EXPIRE_PERIOD = 7 * 24 * 60 * 60 * 1000;

    if (!invData.sales || globalSyncTime > userLastSync || (currentTime - parseInt(userLastSync)) > EXPIRE_PERIOD) {
      try {
        let pData = [];
        try {
          pData = await getSheetData(accessToken, invId, 'option giá 2!A1:Z');
        } catch(e) {
          pData = await getSheetData(accessToken, invId, 'option giá 1!A1:Z');
        }
        
        if (!pData || pData.length === 0) {
          throw new Error("Không tìm thấy dữ liệu option giá");
        }

        let sales: string[] = [], dict: any = {}, catMap: any = {}, featureMap: any = {};
        
        try {
            const data2 = await getSheetData(accessToken, invId, 'Data2!B10:B20');
            sales = data2.map((row: any[]) => String(row[0]).trim()).filter(v => v !== "");
        } catch(e) {}

        for(let i = 1; i < pData.length; i++) {
          let n = String(pData[i][0] || '').trim();
          let p = Number(pData[i][1]) || 0;
          let c = String(pData[i][3] || '').trim();
          if(n) {
            dict[n] = p;
            catMap[n] = c;
          }
        }

        const headers = pData[0];
        for (let col = 9; col <= 22; col++) {
          let catName = String(headers[col] || '').trim();
          if (catName) {
            let qs = [];
            for (let row = 1; row < pData.length; row++) {
              let featureText = String(pData[row][col] || '').trim();
              if (featureText) qs.push(featureText);
            }
            featureMap[catName] = qs;
          }
        }

        invData = { sales, dict, catMap, featureMap };
        await kv.set(`user_${email}_invData_Cache`, JSON.stringify(invData));
        await kv.set(`user_${email}_lastSyncTime`, currentTime.toString());
      } catch(e) {
        throw new Error(`⛔ LỖI QUYỀN TRUY CẬP: Web không thể đọc file Hóa đơn. Đảm bảo bạn có quyền truy cập vào Sheet Hóa đơn của mình!`);
      }
    }

    const bdConfigStr = await kv.get<string>('enic_bdConfig');
    const caiDatStr = await kv.get<string>('enic_caiDat');
    const lenDonStr = await kv.get<string>('enic_lenDon');

    const bdConfig = bdConfigStr ? JSON.parse(bdConfigStr) : {};
    const caiDat = caiDatStr ? JSON.parse(caiDatStr) : {};
    const lenDon = lenDonStr ? JSON.parse(lenDonStr) : {};

    const globalConfig = {
      notes: lenDon.notes || {},
      bdConfig: Object.keys(bdConfig).length ? bdConfig : { tags:[], showrooms:[], sources:[], projects:[], deposits:[], ratings:[], requests:[] },
      colorThemes: caiDat.colorThemes || {},
      seasonalThemes: caiDat.seasonalThemes || {},
      stoppedProducts: lenDon.stoppedProducts || {}
    };

    return NextResponse.json(Object.assign({}, globalConfig, invData, { 
      userLastSyncTime: await kv.get<string>(`user_${email}_lastSyncTime`) || currentTime.toString(),
      userName: userName
    }));
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
