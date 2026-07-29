import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, updateSheetData, clearSheetData } from '@/lib/google-sheets';
import { kv, MemoryLock } from '@/lib/cache';

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing Google Sheets access' }, { status: 401 });
    }
    const email = session.user.email.toLowerCase();
    const accessToken = session.accessToken;
    const payload = await request.json();
    const { manualProducts, info } = payload;
    const targetSheet = payload.targetSheet ? payload.targetSheet.replace(/\s+/g, '') : '';
    
    if (targetSheet === "NoSave") {
        return NextResponse.json({ success: true, maHD: "HD-" + new Date().getTime().toString().slice(-6) });
    }

    const invoiceId = await kv.get<string>(`user_${email}_invoiceId`);
    if (!invoiceId) throw new Error("⛔ Chưa có ID Liên kết. Vui lòng F5 tải lại Web.");

    const lockKey = `lock_invoice_${invoiceId}_${targetSheet}`;
    await MemoryLock.waitLock(lockKey, 10000);
    
    let maHD = "";
    
    try {
      await clearSheetData(accessToken, invoiceId, [`${targetSheet}!B2:B9`, `${targetSheet}!B10:B11`, `${targetSheet}!C2:D100`]);
      await updateSheetData(accessToken, invoiceId, `${targetSheet}!B2:B9`, [
        [info.cusName || ""],
        [info.phone || ""],
        [info.address || ""],
        [info.discount || ""],
        [info.extraDiscount ? String(info.extraDiscount) : ""],
        [info.deposit ? String(info.deposit) : ""],
        [info.depositMethod || ""],
        [info.extraFee ? String(info.extraFee) : ""]
      ]);
      await updateSheetData(accessToken, invoiceId, `${targetSheet}!B10:B11`, [
        [info.saleName || ""],
        [info.note || ""]
      ]);
      
      if (manualProducts.length > 0) {
        let cdData = manualProducts.map((x: any) => [x.name, x.qty]);
        await updateSheetData(accessToken, invoiceId, `${targetSheet}!C2:D${1 + cdData.length}`, cdData);
      }
      
      for (let loop = 0; loop < 4; loop++) {
        await new Promise(res => setTimeout(res, 500));
        const targetSheetNumMatch = targetSheet.match(/\d+/);
        const targetNum = targetSheetNumMatch ? targetSheetNumMatch[0] : "1";
        const checkSheets = [`hoadon${targetNum}`];
        for (let sName of checkSheets) {
          try {
            let dataRange = await getSheetData(accessToken, invoiceId, `${sName}!H1:I12`);
            for (let row = 0; row < dataRange.length; row++) {
              for (let col = 0; col < 2; col++) {
                let rawVal = dataRange[row][col];
                let val = String(rawVal).trim();
                let valLower = val.toLowerCase();        
                if (val !== "" && val.length > 3 && !val.includes("#") && !val.includes("Loading") && !val.includes("Đang tải") && !valLower.includes("hóa đơn bán hàng")) {
                  maHD = val; break;
                }
              }
              if (maHD) break;
            }
          } catch(e) {}
          if (maHD) break;
        }
        
        if (!maHD) {
          const fallbackSheets = ["Data1", "Data2"];
          for (let fsName of fallbackSheets) {
            try {
              let range = await getSheetData(accessToken, invoiceId, `${fsName}!A900:A900`);
              let val = String(range[0]?.[0] || "").trim();
              if (val !== "" && val.length > 3 && !val.includes("#") && !val.includes("Loading") && !val.includes("Đang tải")) {
                maHD = val; break;
              }
            } catch(e) {}
          }
        }
        if (maHD) break;
      }
    } finally {
      MemoryLock.releaseLock(lockKey);
    }
    
    if (!maHD) maHD = "HD-" + new Date().getTime().toString().slice(-6);
    return NextResponse.json({ success: true, maHD: maHD });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
