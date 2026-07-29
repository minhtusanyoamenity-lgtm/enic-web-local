import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, updateSheetData, clearSheetData } from '@/lib/google-sheets';
import { kv, MemoryLock } from '@/lib/cache';

const pad = (n: number) => n < 10 ? "0" + n : n;
const fD = (d: any) => {
  if (d instanceof Date) return d.toLocaleDateString('en-GB');
  if (typeof d === 'string' && d.includes('/')) return d;
  return "";
};
const cln = (s: string) => String(s||"").replace(/^O ĐÀ NẴNG/i, "KHO ĐÀ NẴNG").replace(/^O HCM/i, "KHO HCM").replace(/^O HN/i, "KHO HN");
const getL = (s: string) => { const u = s.toUpperCase(); return u.includes("ĐN")||u.includes("ĐÀ NẴNG") ? "ĐN" : (u.includes("HCM")||u.includes("HỒ CHÍ MINH") ? "HCM" : (u.includes("HN")||u.includes("HÀ NỘI") ? "HN" : null)); };

function calc(d: any[][], i: number, rq: number, n: string, pK: string) {
  const l: string[] = [];
  const e: any = { ĐN: Number(d[i][4])||0, HCM: Number(d[i][2])||0, HN: Number(d[i][3])||0 };
  const ord = pK === "HCM" ? ["HCM","HN","ĐN"] : (pK === "HN" ? ["HN","HCM","ĐN"] : ["ĐN","HCM","HN"]);
  const [p, o1, o2] = ord;
  const sh: any[] = [];
  const td = new Date().setHours(0,0,0,0);
  
  for (let j = 6; j < d[i].length; j++) {
    let q = Number(d[i][j])||0;
    if (q > 0) {
      let loc = cln(d[1][j]), dst = getL(loc), rD = d[0][j];
      let dt = rD instanceof Date ? rD : (typeof rD === "string" && rD.includes("/") ? new Date(Number(rD.split("/")[2]), Number(rD.split("/")[1])-1, Number(rD.split("/")[0])) : null);
      let diff = dt ? Math.ceil((dt.getTime() - td)/864e5) : -1;
      sh.push({ q, d: dt, loc, dst, f: dt && diff >= 0 && diff < 10, rD });
    }
  }

  ["ĐN", "HCM", "HN"].forEach(k => {
    if (e[k] < 0) {
      let db = -e[k];
      sh.filter(s => s.f && s.dst === k && s.q > 0).forEach(s => { let py = Math.min(db, s.q); db -= py; s.q -= py; e[k] += py; });
    }
  });
  let gD = 0; ["ĐN", "HCM", "HN"].forEach(k => { if (e[k] < 0) gD += -e[k]; });
  if (gD > 0) {
    (pK === "ĐN" ? ["HCM","HN","ĐN"] : (pK === "HN" ? ["HCM","ĐN","HN"] : ["HCM","HN","ĐN"])).forEach(k => {
      if (e[k] > 0 && gD > 0) { let py = Math.min(gD, e[k]); e[k] -= py; gD -= py; }
    });
  }

  let rm = rq; 
  const ad = (t: number, s: string, r: string) => l.push(`- ${pad(t)} ${n}, ${s}${r}`);
  if (rm > 0 && e[p] > 0) { let t = Math.min(rm, e[p]); rm -= t; e[p] -= t; ad(t, p, e[p]>0 ? " còn "+e[p] : " Hết"); }
  if (rm > 0 || gD > 0) sh.filter(s => s.f && s.dst === p && s.q > 0).forEach(s => {
    if (gD > 0) { let py = Math.min(gD, s.q); gD -= py; s.q -= py; }
    if (rm > 0 && s.q > 0) { let t = Math.min(rm, s.q); rm -= t; s.q -= t; ad(t, `Dự kiến ngày ${fD(s.rD)} về ${s.loc}`, s.q>0 ? " còn "+s.q : " Hết"); }
  });
  [o1, o2].forEach(k => { if (rm > 0 && e[k] > 0) { let t = Math.min(rm, e[k]); rm -= t; e[k] -= t; ad(t, k, e[k]>0 ? " còn "+e[k] : " Hết"); } });
  if (rm > 0 || gD > 0) sh.filter(s => s.q > 0).forEach(s => {
    if (gD > 0) { let py = Math.min(gD, s.q); gD -= py; s.q -= py; }
    if (rm > 0 && s.q > 0) { let t = Math.min(rm, s.q); rm -= t; s.q -= t; ad(t, `Dự kiến ngày ${fD(s.rD)} về ${s.loc}`, s.q>0 ? " còn "+s.q : " Hết"); }
  });
  if (rm > 0) ad(rm, "CHƯA CÓ LỊCH VỀ", "");
  return l;
}

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing Google Sheets access' }, { status: 401 });
    }
    const email = session.user.email.toLowerCase();
    const accessToken = session.accessToken;
    const payload = await request.json();
    const { manualProducts, priorityKho, info } = payload;
    const sourceSheet = payload.sourceSheet ? payload.sourceSheet.replace(/\s+/g, '') : '';
    const targetSheet = payload.targetSheet ? payload.targetSheet.replace(/\s+/g, '') : '';
    
    const invoiceId = await kv.get<string>(`user_${email}_invoiceId`);
    const inventoryId = await kv.get<string>(`user_${email}_inventoryId`);
    
    if (!invoiceId || !inventoryId) throw new Error("⛔ Chưa có ID Liên kết. Vui lòng F5 tải lại Web.");

    const aggMap = new Map();
    const productsToSave: {name: string, qty: number}[] = [];
    manualProducts.forEach((p: any) => { 
      let name = String(p[0] || "").trim(); 
      if (name) aggMap.set(name, (aggMap.get(name) || 0) + (Number(p[1]) || 0)); 
    });
    aggMap.forEach((qty, name) => { productsToSave.push({ name, qty }); });

    if (targetSheet !== "NoSave" && invoiceId) {
      const lockKey = `lock_invoice_${invoiceId}_${targetSheet}`;
      await MemoryLock.waitLock(lockKey, 10000);
      try {
        await clearSheetData(accessToken, invoiceId, [`${targetSheet}!B2:B5`, `${targetSheet}!B10:B11`, `${targetSheet}!C2:D100`]);
        await updateSheetData(accessToken, invoiceId, `${targetSheet}!B2:B5`, [[info.cusName || ""], [info.phone || ""], [info.address || ""], [info.discount || ""]]);
        await updateSheetData(accessToken, invoiceId, `${targetSheet}!B10:B11`, [[info.saleName || ""], [info.note || ""]]);
        
        if (productsToSave.length > 0) {
          let cdData = productsToSave.map(x => [x.name, x.qty]);
          await updateSheetData(accessToken, invoiceId, `${targetSheet}!C2:D${1 + cdData.length}`, cdData);
        }
      } finally {
        MemoryLock.releaseLock(lockKey);
      }
    }

    const stockLockKey = `lock_stock_${inventoryId}`;
    await MemoryLock.waitLock(stockLockKey, 20000);
    let sD: any[][] = [], isSyncSuccess = false;
    try {
      if (sourceSheet === "custom") {
         await updateSheetData(accessToken, inventoryId, `TONG!E1:E1`, [[productsToSave.map(p => p.name).join(", ")]]);
      }
      await updateSheetData(accessToken, inventoryId, `TONG!E2:E2`, [[sourceSheet]]);
      
      for (let i = 0; i < 15; i++) {
        await new Promise(res => setTimeout(res, 1000));
        sD = await getSheetData(accessToken, inventoryId, 'TONG!E3:Z100');
        let anchorCell = sD[1] ? sD[1][0] : ""; 
        if (sD.length >= 3 && String(anchorCell).trim() !== "" && !/Đang tải|#N\/A|#REF|#ERROR/.test(String(anchorCell))) {
          isSyncSuccess = true; break;
        }
      }
    } finally {
      MemoryLock.releaseLock(stockLockKey);
    }

    if (!isSyncSuccess) throw new Error("TỒN KHO LAG VÀ CHƯA KỊP TÍNH TOÁN.");
    
    const cache: any = {};
    ["ĐN", "HCM", "HN"].forEach(kho => {
      const comboGroup: string[] = [], normalGroup: string[] = [], outOfStockGroup: string[] = [], notFoundGroup: string[] = [];
      productsToSave.forEach(p => {
        const fi = sD.findIndex((x, i) => i >= 2 && String(x[0]||"").trim() === p.name);
        if (fi !== -1) {
          if (p.qty === 0) outOfStockGroup.push(`- 00 ${p.name}, `);
          else {
            let calcResult = calc(sD, fi, p.qty, p.name, kho);
            /Full bộ|Combo/i.test(p.name) ? comboGroup.push(...calcResult) : normalGroup.push(...calcResult);
          }
        } else { notFoundGroup.push(`- ${pad(p.qty)} ${p.name}, `); }
      });
      let shortName = info.saleName ? `@${info.saleName.trim().split(/\s+/).slice(-2).join(" ")} ` : "";
      let zaloMsg = `${info.phone || ""} ${shortName}Dạ em xin:\n` + [comboGroup.join("\n"), normalGroup.join("\n"), outOfStockGroup.join("\n")].filter(Boolean).join("\n");
      if (notFoundGroup.length > 0) zaloMsg += "\n\n" + notFoundGroup.join("\n");
      
      let components: any[] = [];
      const kIdx: any = { "ĐN": 4, "HCM": 2, "HN": 3 };
      for (let i = 2; i < sD.length; i++) {
        let cName = String(sD[i][0] || "").trim(); if (!cName) continue;
        let cResult = calc(sD, i, 1, cName, kho);
        cResult.forEach(line => {
          let status = "CHƯA CÓ LỊCH", displayLine = "";
          let cleanLine = line.replace(/^- 0\d\s/, "");
          let realQty = cleanLine.includes("Hết") ? 1 : (parseInt(cleanLine.match(/còn\s+(\d+)/)?.[1] || "0") + 1);
          let statusStr = cleanLine.substring(cleanLine.indexOf(',') + 1).trim();
          if (statusStr.includes("Dự kiến")) {
            status = "DỰ KIẾN VỀ";
            displayLine = statusStr.replace(/còn\s+\d+|Hết/, "số lượng " + realQty);
          } else if (statusStr.includes("CHƯA CÓ LỊCH")) {
            status = "CHƯA CÓ LỊCH";
            let rawInStock = Number(sD[i][kIdx[kho]]) || 0;
            displayLine = `Chưa có lịch về ${rawInStock}`;
          } else {
            status = "SẴN KHO";
            displayLine = statusStr.replace(/(.+?)\s+(còn\s+\d+|Hết)/, "sẵn $1 số lượng " + realQty);
          }
          components.push({ name: cName, status: status, qty: displayLine });
        });
      }
      cache[kho] = { zalo: zaloMsg.trim(), components: components };
    });
    
    let rawData: any[] = [];
    for (let fi = 2; fi < sD.length; fi++) {
      let pName = String(sD[fi][0] || "").trim();
      if (pName) {
        let e = { ĐN: Number(sD[fi][4])||0, HCM: Number(sD[fi][2])||0, HN: Number(sD[fi][3])||0 };
        let shArray: any[] = [];
        for (let j = 6; j < sD[fi].length; j++) {
          let qRaw = Number(sD[fi][j])||0;
          if (qRaw > 0) {
            let locRaw = cln(sD[1][j]), dstRaw = getL(locRaw), rDRaw = sD[0][j];
            let dtVal = 0;
            let dateStr = "";
            if (rDRaw instanceof Date) {
              dtVal = rDRaw.getTime();
              dateStr = rDRaw.toLocaleDateString('en-GB');
            } else if (typeof rDRaw === 'string' && rDRaw.includes('/')) {
              let pts = rDRaw.split('/');
              dtVal = new Date(Number(pts[2]), Number(pts[1])-1, Number(pts[0])).getTime();
              dateStr = rDRaw.substring(0,5);
            }
            if (dtVal > 0) shArray.push({ q: qRaw, loc: locRaw, dst: dstRaw, dateStr, ts: dtVal });
          }
        }
        shArray.sort((a,b) => a.ts - b.ts);
        rawData.push({ name: pName, stock: e, expected: shArray });
      }
    }
    
    return NextResponse.json({ success: true, zalo: cache[priorityKho].zalo, cache, rawStock: rawData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
