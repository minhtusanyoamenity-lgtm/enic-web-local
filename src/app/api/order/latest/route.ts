import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData } from '@/lib/google-sheets';
import { kv } from '@/lib/cache';

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing Google Sheets access' }, { status: 401 });
    }
    const email = session.user.email.toLowerCase();
    const accessToken = session.accessToken;
    const payload = await request.json();
    const requestedNameRaw = typeof payload === 'string' ? payload : (payload.requestedName || payload.source);
    const requestedName = requestedNameRaw ? requestedNameRaw.replace(/\s+/g, '') : '';

    const invoiceId = await kv.get<string>(`user_${email}_invoiceId`);
    if (!invoiceId) throw new Error("⛔ Chưa có ID Hóa đơn. Vui lòng F5 tải lại Web.");

    try {
      const cusName = await getSheetData(accessToken, invoiceId, `${requestedName}!B2:B2`);
      const phone = await getSheetData(accessToken, invoiceId, `${requestedName}!B3:B3`);
      const address = await getSheetData(accessToken, invoiceId, `${requestedName}!B4:B4`);
      const saleName = await getSheetData(accessToken, invoiceId, `${requestedName}!B10:B10`);
      const note = await getSheetData(accessToken, invoiceId, `${requestedName}!B11:B11`);
      
      const spData = await getSheetData(accessToken, invoiceId, `${requestedName}!C6:D100`);
      
      const products: any[] = [];
      if (spData && spData.length > 0) {
        for (let row of spData) {
          if (row[0]) products.push({ n: String(row[0]).trim(), q: parseInt(row[1]) || 1 });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          cusName: cusName[0]?.[0] || "",
          phone: phone[0]?.[0] || "",
          address: address[0]?.[0] || "",
          saleName: saleName[0]?.[0] || "",
          note: note[0]?.[0] || "",
          products: products
        }
      });
    } catch(e: any) {
      return NextResponse.json({ success: false, message: "Không tìm thấy Tab hoặc lỗi: " + e.message });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
