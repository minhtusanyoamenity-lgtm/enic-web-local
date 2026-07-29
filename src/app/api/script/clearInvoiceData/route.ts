import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { clearSheetData } from '../../../../lib/googleSheets';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const invoiceId = await kv.get<string>(`user_${email}_invoiceId`);
    const accessToken = await kv.get<string>(`user_${email}_accessToken`);

    if (!invoiceId || !accessToken) {
      return NextResponse.json({ success: false, error: 'Missing configuration' }, { status: 400 });
    }

    const payload = await request.json();
    const targetSheet = payload[0]; // The body is JSON.stringify([tgt])

    if (!targetSheet || targetSheet === 'NoSave') {
      return NextResponse.json({ success: true, message: 'Nothing to clear' });
    }

    await clearSheetData(accessToken, invoiceId, [
      `${targetSheet}!B2:B9`, 
      `${targetSheet}!B10:B11`, 
      `${targetSheet}!C2:D100`
    ]);

    return NextResponse.json({ success: true, message: 'Cleared successfully' });
  } catch (error: any) {
    console.error('Error clearing data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
