import { fetchWithRetry } from "./http";
export async function driveFindOrCreateSpreadsheet(accessToken:string,title:string){
  const list=await fetchWithRetry(`https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(title)}'+and+mimeType='application/vnd.google-apps.spreadsheet'+and+trashed=false&fields=files(id,name)`,{headers:{Authorization:`Bearer ${accessToken}`}});
  const lj=await list.json(); if(!list.ok) throw new Error(lj.error?.message||"Drive list error"); if(lj.files&&lj.files[0]) return lj.files[0].id;
  const create=await fetchWithRetry("https://sheets.googleapis.com/v4/spreadsheets",{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify({properties:{title}})});
  const cj=await create.json(); if(!create.ok) throw new Error(cj.error?.message||"Sheet create error"); return cj.spreadsheetId;
}
export async function sheetsAppend(accessToken:string, spreadsheetId:string, sheetTitle:string, values:any[][]){
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetTitle)}!A1:append?valueInputOption=RAW`;
  const r=await fetchWithRetry(url,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify({values})});
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"Append failed"); return j;
}
export async function sheetsGet(accessToken:string, spreadsheetId:string, rangeA1:string){
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(rangeA1)}`;
  const r=await fetchWithRetry(url,{headers:{Authorization:`Bearer ${accessToken}`}}); const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"Get failed"); return j;
}
export async function gaListProperties(accessToken:string){
  const r=await fetchWithRetry("https://analyticsadmin.googleapis.com/v1beta/accountSummaries",{headers:{Authorization:`Bearer ${accessToken}`}});
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"Admin API error");
  return (j.accountSummaries||[]).flatMap((a:any)=>(a.propertySummaries||[]).map((p:any)=>({property:p.property,displayName:p.displayName})));
}
export async function gaRunReport(accessToken:string, propertyId:string, payload:any){
  const prop=propertyId.startsWith("properties/")?propertyId:`properties/${propertyId}`; const url=`https://analyticsdata.googleapis.com/v1beta/${prop}:runReport`;
  const r=await fetchWithRetry(url,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"GA4 API error"); return j;
}
export async function gscListSites(accessToken:string){
  const r=await fetchWithRetry("https://www.googleapis.com/webmasters/v3/sites",{headers:{Authorization:`Bearer ${accessToken}`}});
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"GSC sites error"); return (j.siteEntry||[]).map((s:any)=>s.siteUrl);
}
export async function gscQuery(accessToken:string, siteUrl:string, body:any){
  const url=`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const r=await fetchWithRetry(url,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"GSC query error"); return j;
}
