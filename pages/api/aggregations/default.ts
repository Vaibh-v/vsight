import type { NextApiRequest, NextApiResponse } from "next";import { getToken } from "next-auth/jwt";import { gaRunReport, gscQuery } from "../../../lib/google";
export default async function handler(req:NextApiRequest,res:NextApiResponse){const token=await getToken({req,secret:process.env.NEXTAUTH_SECRET});if(!token?.access_token) return res.status(401).json({error:"Not authenticated"});
const { propertyId, siteUrl, startDate, endDate } = (req.query||{}) as any; if(!propertyId||!siteUrl||!startDate||!endDate) return res.status(400).json({error:"Missing params"});
try{const ga=await gaRunReport(token.access_token as string, String(propertyId), { dimensions:[{name:"date"}], metrics:[{name:"sessions"}], dateRanges:[{startDate,endDate}] }); const gsc=await gscQuery(token.access_token as string, String(siteUrl), { startDate,endDate,dimensions:["date"],rowLimit:25000,type:"web"});
const sessionsByDate:Record<string,number>={}; for(const row of ga.rows||[]){const d=row.dimensionValues?.[0]?.value; const v=Number(row.metricValues?.[0]?.value||0); if(d) sessionsByDate[d]=v;}
const clicksByDate:Record<string,number>={}, impressionsByDate:Record<string,number>={}, positionByDate:Record<string,number>={};
for(const row of gsc.rows||[]){const d=row.keys?.[0]; if(!d) continue; clicksByDate[d]=(clicksByDate[d]||0)+Number(row.clicks||0); impressionsByDate[d]=(impressionsByDate[d]||0)+Number(row.impressions||0); positionByDate[d]=Number(row.position||0);}
const dates=Array.from(new Set([...Object.keys(sessionsByDate),...Object.keys(clicksByDate)])).sort();
const series=dates.map(d=>({date:d,sessions:sessionsByDate[d]||0,clicks:clicksByDate[d]||0,impressions:impressionsByDate[d]||0,ctr:impressionsByDate[d]? (clicksByDate[d]||0)/impressionsByDate[d]:0,position:positionByDate[d]||0}));
res.status(200).json({series});}catch(e:any){res.status(500).json({error:e.message||"Unexpected error"});}}
