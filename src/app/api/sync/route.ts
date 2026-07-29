import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData } from '@/lib/google-sheets';
import { kv } from '@/lib/cache';
import { performGlobalSync } from '@/lib/syncLogic';

const DATABASE_WEB_ID = process.env.DATABASE_WEB_ID || '';

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing Google Sheets access' }, { status: 401 });
    }

    const accessToken = session.accessToken;
    const currentUserEmail = session.user.email.toLowerCase();

    const adminListStr = await kv.get<string>('rbac_adminList');
    const adminList = adminListStr ? JSON.parse(adminListStr) : [];
    
    if (!adminList.includes(currentUserEmail)) {
      return NextResponse.json({ success: false, error: 'User chưa được cấp quyền ADMIN' }, { status: 403 });
    }

    // Fetch everything via helper
    await performGlobalSync(accessToken);

    return NextResponse.json({ success: true, message: "Đã cập nhật danh sách phân quyền." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
