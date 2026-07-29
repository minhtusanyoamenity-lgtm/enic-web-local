import { getSheetData } from '@/lib/google-sheets';
import { kv } from '@/lib/cache';

export async function performGlobalSync(accessToken: string) {
  const DATABASE_WEB_ID = process.env.DATABASE_WEB_ID || '';
  if (!DATABASE_WEB_ID) throw new Error("DATABASE_WEB_ID is not configured");

  const [tongHop, lenDon, baoDon, caiDat, linkCheckData] = await Promise.all([
    getSheetData(accessToken, DATABASE_WEB_ID, 'TỔNG HỢP!A1:Z'),
    getSheetData(accessToken, DATABASE_WEB_ID, 'LÊN ĐƠN!A1:Z'),
    getSheetData(accessToken, DATABASE_WEB_ID, 'BÁO ĐƠN!A1:Z'),
    getSheetData(accessToken, DATABASE_WEB_ID, 'CÀI ĐẶT!A1:Z'),
    getSheetData(accessToken, DATABASE_WEB_ID, 'LINK CHECK TIME!A1:Z').catch(() => [])
  ]);

  let mailData: Record<string, string> = {};
  let linkData: Record<string, { invoiceId: string, inventoryId: string }> = {};
  let adminList: string[] = [];

  for (let i = 2; i < tongHop.length; i++) {
    let mail = String(tongHop[i][9] || '').trim().toLowerCase();
    let access = String(tongHop[i][10] || '').trim().toUpperCase();
    let syncRole = String(tongHop[i][11] || '').trim().toUpperCase();
    let tUser = String(tongHop[i][8] || '').trim();
    
    if (mail !== "" && access === "YES" && tUser !== "") {
      mailData[mail] = tUser;
      if (!linkData[tUser]) linkData[tUser] = { invoiceId: "", inventoryId: "" };
      if (syncRole === 'ADMIN') {
        adminList.push(mail);
      }
    }
  }

  for (let i = 2; i < tongHop.length; i++) {
    let link = String(tongHop[i][2] || '').trim();
    let status = String(tongHop[i][3] || '').trim();
    let type = String(tongHop[i][4] || '').trim().toUpperCase();
    let u1 = String(tongHop[i][5] || '').trim();
    let u2 = String(tongHop[i][6] || '').trim();

    if (status === "Link" && link !== "") {
      let idMatch = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
      let extractedId = idMatch ? idMatch[1] : link;

      Object.keys(linkData).forEach(userName => {
        let matchU1 = u1 !== "" && (u1.includes(userName) || userName.includes(u1));
        let matchU2 = u2 !== "" && (u2.includes(userName) || userName.includes(u2));
        if (matchU1 || matchU2) {
          if (type.includes("HÓA ĐƠN")) linkData[userName].invoiceId = extractedId;
          if (type.includes("TỒN KHO")) linkData[userName].inventoryId = extractedId;
        }
      });
    }
  }

  await kv.set('rbac_mailData', JSON.stringify(mailData));
  await kv.set('rbac_linkData', JSON.stringify(linkData));
  await kv.set('rbac_adminList', JSON.stringify(adminList));

  let stoppedProducts: Record<string, boolean> = {};
  for (let i = 1; i < linkCheckData.length; i++) {
    let key = String(linkCheckData[i][0] || '').trim();
    let status = String(linkCheckData[i][4] || '').trim();
    if (key !== "" && status.toLowerCase() === "ngưng") stoppedProducts[key] = true;
  }

  let notes: any = {}, tags: any[] = [], showrooms: any[] = [], sources: any[] = [], projects: any[] = [], deposits: any[] = [], ratings: any[] = [], requests: any[] = [];
  let colorThemes: any = {}, seasonalThemes: any = {};

  for (let i = 2; i < lenDon.length; i++) {
    if (String(lenDon[i][1] || '').trim()) notes[String(lenDon[i][1]).trim()] = String(lenDon[i][2]).trim();
  }

  for (let i = 2; i < baoDon.length; i++) {
    if (String(baoDon[i][2] || '').trim()) tags.push(String(baoDon[i][2]).trim());
    if (String(baoDon[i][4] || '').trim()) showrooms.push(String(baoDon[i][4]).trim());
    if (String(baoDon[i][6] || '').trim()) sources.push(String(baoDon[i][6]).trim());
    if (String(baoDon[i][8] || '').trim()) projects.push(String(baoDon[i][8]).trim());
    if (String(baoDon[i][10] || '').trim()) deposits.push(String(baoDon[i][10]).trim());
    if (String(baoDon[i][12] || '').trim()) ratings.push(String(baoDon[i][12]).trim());
    if (String(baoDon[i][14] || '').trim()) requests.push(String(baoDon[i][14]).trim());
  }

  for (let i = 2; i < caiDat.length; i++) {
    if (String(caiDat[i][1] || '').trim()) colorThemes[String(caiDat[i][1]).trim()] = String(caiDat[i][2]).trim();
    if (String(caiDat[i][4] || '').trim()) seasonalThemes[String(caiDat[i][4]).trim()] = String(caiDat[i][5]).trim();
  }

  let bdConfigData = { tags, showrooms, sources, projects, deposits, ratings, requests };
  let caiDatData = { colorThemes, seasonalThemes };
  let lenDonData = { notes, stoppedProducts };

  await kv.set('enic_bdConfig', JSON.stringify(bdConfigData));
  await kv.set('enic_caiDat', JSON.stringify(caiDatData));
  await kv.set('enic_lenDon', JSON.stringify(lenDonData));

  const syncTime = new Date().getTime();
  await kv.set('globalSyncTime', syncTime.toString());

  return {
    mailData,
    linkData,
    adminList,
    bdConfigData,
    caiDatData,
    lenDonData
  };
}
