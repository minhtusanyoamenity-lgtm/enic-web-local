import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kv } from '@/lib/cache';

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserEmail = session.user.email.toLowerCase();

    const adminListStr = await kv.get<string>('rbac_adminList');
    const adminList = adminListStr ? JSON.parse(adminListStr) : [];
    
    if (!adminList.includes(currentUserEmail)) {
      return NextResponse.json({ success: false, error: 'User chưa được cấp quyền ADMIN' }, { status: 403 });
    }

    // Clear RBAC and data mapping from KV
    await kv.del('rbac_adminList');
    await kv.del('rbac_userConfigs');

    return NextResponse.json({ success: true, message: "Đã xóa sạch dữ liệu đồng bộ." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
