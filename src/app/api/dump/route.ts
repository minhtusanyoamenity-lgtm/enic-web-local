import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData } from '@/lib/google-sheets';
import { kv } from '@/lib/cache';
import fs from 'fs';

export async function GET(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email.toLowerCase();
    const accessToken = session.accessToken;
    
    const invoiceId = await kv.get<string>(`user_${email}_invoiceId`);
    if (!invoiceId) throw new Error("⛔ Chưa có ID Hóa đơn.");

    const sheets = ['Xử Lý 1', 'Data1', 'hoadon1', 'Thông Tin KH bàn giao zalo 1'];
    let dump: any = {};
    for (let s of sheets) {
        try {
            let data = await getSheetData(accessToken, invoiceId, `${s}!A1:Z50`);
            dump[s] = data;
        } catch(e: any) {
            dump[s] = e.message;
        }
    }

    fs.writeFileSync('C:/Users/Admins/.gemini/antigravity/brain/42265aee-c9f7-4b02-ac14-e13e243b1eeb/scratch/dump.json', JSON.stringify(dump, null, 2));

    return NextResponse.json({ success: true, message: "Dumped!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
