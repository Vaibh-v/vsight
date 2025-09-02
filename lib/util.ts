export const iso = (d: Date) => d.toISOString().slice(0,10);
export function lastNDays(n: number){const e=new Date();const s=new Date();s.setDate(e.getDate()-(n-1));return{startDate:iso(s),endDate:iso(e)};}
export function toCSV(rows:any[], headers:string[]){const esc=(v:any)=>('"'+String(v??"").replaceAll('"','""')+'"');return[headers.join(','),...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\n');}
