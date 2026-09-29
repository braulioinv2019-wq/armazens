// Presentation-only helpers. No stock writes or network access.
export const TIME_ZONE = 'Africa/Luanda';
export function numberValue(value) {
  if(value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
  return Number.isFinite(n) ? n : null;
}
export function isoDay(value = new Date()) {
  const d = new Date(value);
  if(!Number.isFinite(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
}
export function dateText(value, withTime = true) {
  if(!value) return '';
  if(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y,m,d] = value.split('-'); return `${d}/${m}/${y}`;
  }
  const d = new Date(value);
  if(!Number.isFinite(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-PT', {timeZone:TIME_ZONE,day:'2-digit',month:'2-digit',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(d);
}
export function htmlText(value) {
  return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function qtyText(value) {
  const n=numberValue(value);
  return n === null ? (value ? String(value) : '—') : new Intl.NumberFormat('pt-PT',{maximumFractionDigits:6}).format(n);
}
export function expiryDays(value, now = new Date()) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const expiry=Date.parse(value+'T00:00:00Z');
  if(!Number.isFinite(expiry) || new Date(expiry).toISOString().slice(0,10)!==value) return null;
  return Math.round((expiry-Date.parse(isoDay(now)+'T00:00:00Z'))/86400000);
}
export function stockState(m) {
  const qty=numberValue(m.qty), min=numberValue(m.minStock), pe=numberValue(m.reorderPoint);
  if(qty===null) return 'Quantidade inválida';
  if(qty<=0) return 'Sem stock';
  if(min>0 && qty<=min) return 'Stock de segurança';
  if(pe>0 && qty<=pe) return 'Ponto de encomenda';
  return 'Normal';
}
export function priorities(materials, now = new Date()) {
  return materials.map(m=>{
    const state=stockState(m), days=expiryDays(m.expiryDate,now);
    const reasons=state==='Normal'?[]:[state];
    if(days!==null && days<=30) reasons.push(days<0?'Validade expirada':'Validade em '+days+' dias');
    const rank=state==='Quantidade inválida'?0:state==='Sem stock'?1:days!==null&&days<0?2:state==='Stock de segurança'?3:state==='Ponto de encomenda'?4:5;
    return {...m,reasons,rank};
  }).filter(m=>m.reasons.length).sort((a,b)=>a.rank-b.rank||String(a.name).localeCompare(String(b.name),'pt'));
}
export const STOCK_HEADERS=['Armazém','Localização','Código','Material','Quantidade','Unidade','Stock de segurança','Ponto de encomenda','Estado do stock','Crítico marcado','Lote','Validade','Estado da validade','Fornecedor / Origem','Guia de entrada','Referência','Chegada'];
export function stockRows(items, now = new Date()) {
  return items.map(m=>{
    const days=expiryDays(m.expiryDate,now);
    return [m.warehouse||'',m.locFull||m.location||'',String(m.code??''),m.name||'',numberValue(m.qty)??String(m.qty??''),m.unit||'',numberValue(m.minStock),numberValue(m.reorderPoint),stockState(m),m.critical?'Sim':'Não',String(m.lot??''),dateText(m.expiryDate,false),!m.expiryDate?'Sem validade':days===null?'Data inválida':days<0?'Expirada':days<=30?'A expirar':'Dentro da validade',m.supplier||'',m.geNum||'',m.ref||'',dateText(m.arrivedAt)];
  });
}
export function unitSummary(items) {
  const totals=new Map();
  for(const m of items) {
    const unit=String(m.unit||'Sem unidade');
    const key=JSON.stringify([m.warehouse||'',unit]);
    if(!totals.has(key)) totals.set(key,[m.warehouse||'',unit,0,0,0]);
    const row=totals.get(key);row[2]++;
    const n=numberValue(m.qty); if(n===null)row[4]++;else row[3]+=n;
  }
  return [...totals.values()].map(r=>[r[0],r[1],r[2],Number(r[3].toFixed(6)),r[4]]);
}
export function stockSheets(items, name='Stock') {
  return [{name,headers:STOCK_HEADERS,rows:stockRows(items)},
    {name:'Totais por unidade',headers:['Armazém','Unidade','Registos','Quantidade total','Quantidades inválidas'],rows:unitSummary(items)}];
}
export function matchesHistory(h, filters={}) {
  const wh=h.warehouse||h.wh||'';
  return (!filters.type||h.type===filters.type)&&(!filters.warehouse||wh===filters.warehouse)&&
    (!filters.search||[h.material,h.location,h.user].join(' ').toLowerCase().includes(filters.search.toLowerCase()));
}
export function historySheet(records) {
  return {name:'Movimentos',headers:['Data/Hora (Luanda)','Tipo','Código','Material','Localização','Armazém','Quantidade','Unidade','Utilizador','Corrigido','Corrigido por','ID do registo'],
    rows:records.map(h=>[dateText(h.ts),h.type||'',String(h.code??''),h.material||'',h.location||'',h.warehouse||h.wh||'',numberValue(h.qty)??String(h.qty??''),h.unit||'',h.user||'',h.corrected?'Sim':'Não',h.correctedBy||'',h.id||''])};
}
export function auditSheet(records) {
  return {name:'Alterações',headers:['Data/Hora (Luanda)','Material','Localização','Armazém','Utilizador','Campo alterado','Valor anterior','Valor novo','ID do registo'],
    rows:records.flatMap(a=>(a.changes?.length?a.changes:[{}]).map(c=>[dateText(a.ts),a.material||'',a.location||'',a.wh||a.warehouse||'',a.user||'',c.label||c.field||'',c.before??'',c.after??'',a.id||'']))};
}
export function countRows(counts) {
  return counts.flatMap(c=>(c.items?.length?c.items:(c.differences||[])).map(m=>{
    const system=numberValue(m.systemQty), counted=numberValue(m.countedQty);
    return [c.number||'',c.location||'',String(m.code??''),m.name||'',system,counted,system!==null&&counted!==null?Number((counted-system).toFixed(6)):null,m.unit||'',counted===null?'Não contado':'Contado',m.obs||''];
  }));
}
export function inventorySheets(counts) {
  const detail=countRows(counts);
  const states={pending:'Pendente',scheduled:'Agendada',in_progress:'Em curso',completed:'Concluída'};
  const headers=['Contagem','Localização','Código','Material','Qtd. sistema','Qtd. contada','Diferença (contada − sistema)','Unidade','Estado da linha','Observações'];
  return [
    {name:'Resumo',headers:['Número','Localização','Data','Responsável','Estado','Linhas','Por contar','Diferenças','Ajustado','Concluído por','Observações'],rows:counts.map(c=>{
      const rows=countRows([c]);return [c.number||'',c.location||'',dateText(c.date||c.scheduledFor,false),c.responsible||'',states[c.status]||c.status||'',rows.length,rows.filter(r=>r[5]===null).length,rows.filter(r=>r[6]!==null&&r[6]!==0).length,c.adjusted?'Sim':'Não',c.completedBy||'',c.obs||''];
    })},
    {name:'Todas as linhas',headers,rows:detail},
    {name:'Diferenças',headers,rows:detail.filter(r=>r[6]!==null&&r[6]!==0)}
  ];
}
export function makeWorkbook(XLSX, {title,author='',scope='',notes=[],sheets,now=new Date()}) {
  const wb=XLSX.utils.book_new();
  wb.Props={Title:title,Author:author,Subject:'LUELE WMS',CreatedDate:new Date(now)};
  const metadata=[['Relatório',title],['Gerado em (Africa/Luanda)',dateText(now)],['Gerado por',author],['Âmbito',scope],
    ['Leitura','Cada linha de stock corresponde a um material numa localização.'],
    ['Quantidades','Valores numéricos; totais separados por armazém e unidade. Campos vazios não equivalem a zero.'],...notes.map(n=>['Nota',n]),...sheets.map(s=>['Linhas — '+s.name,s.rows.length])];
  const cover=XLSX.utils.aoa_to_sheet([['LUELE WMS','Informação do relatório'],...metadata]);
  cover['!cols']=[{wch:34},{wch:100}]; cover['!rows']=Array.from({length:metadata.length+1},()=>({hpt:32}));
  const headerStyle={font:{name:'Calibri',sz:11,bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1A6B2F'}},alignment:{wrapText:true,vertical:'center'}};
  for(const [address,cell] of Object.entries(cover))if(!address.startsWith('!')){
    const pos=XLSX.utils.decode_cell(address);
    cell.s=pos.r===0?headerStyle:{font:{name:'Calibri',sz:11,bold:pos.c===0,color:{rgb:'243B2E'}},fill:{fgColor:{rgb:pos.r%2?'F0F6F2':'FFFFFF'}},alignment:{wrapText:true,vertical:'center'}};
  }
  XLSX.utils.book_append_sheet(wb,cover,'Informação');
  for(const sheet of sheets) {
    const data=[sheet.headers,...sheet.rows];
    const ws=XLSX.utils.aoa_to_sheet(data);
    ws['!cols']=sheet.headers.map((header,i)=>({wch:Math.min(/Material|Observa|Localiza|Referência|Valor/.test(header)?48:30,data.reduce((width,r)=>Math.max(width,String(r[i]??'').length+2),12))}));
    ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(0,data.length-1),c:sheet.headers.length-1}})};
    ws['!rows']=data.map((row,r)=>({hpt:r===0?42:Math.max(26,Math.max(...row.map((v,c)=>Math.ceil(String(v??'').length/Math.max(8,ws['!cols'][c].wch-2))))*15+8)}));
    ws['!margins']={left:0.3,right:0.3,top:0.5,bottom:0.5,header:0.2,footer:0.2};
    for(const [address,cell] of Object.entries(ws)) if(!address.startsWith('!')){
      const pos=XLSX.utils.decode_cell(address);
      const negative=cell.t==='n'&&cell.v<0;
      cell.s=pos.r===0?headerStyle:{font:{name:'Calibri',sz:11,color:{rgb:negative?'B42318':'243B2E'}},fill:{fgColor:{rgb:pos.r%2?'FFFFFF':'F0F6F2'}},alignment:{wrapText:true,vertical:'center',horizontal:cell.t==='n'?'right':'left'},border:{bottom:{style:'hair',color:{rgb:'DDE7E0'}}}};
      if(cell.t==='n') {cell.z='#,##0.######;[Red]-#,##0.######;0';cell.s.numFmt=cell.z;}
    }
    XLSX.utils.book_append_sheet(wb,ws,sheet.name.slice(0,31));
  }
  return wb;
}
export function tableHtml(headers, rows) {
  const weights=headers.map(h=>h==='#'?4:/Material/.test(h)?30:/Observa/.test(h)?20:/Quantidade|Qtd.|Diferença/.test(h)?12:10);
  const total=weights.reduce((a,b)=>a+b,0);
  return '<table><colgroup>'+weights.map(w=>'<col style="width:'+Math.round(w/total*100)+'%">').join('')+'</colgroup><thead><tr>'+headers.map(h=>'<th>'+htmlText(h)+'</th>').join('')+'</tr></thead><tbody>'+
    (rows.length?rows.map(row=>'<tr>'+row.map(v=>'<td>'+htmlText(v??'—')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'">Sem registos neste âmbito.</td></tr>')+'</tbody></table>';
}
export function printDocument({title,number='',date=new Date(),fields=[],headers=[],rows=[],notes='',signatures=[],summary='',landscape=false}) {
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${htmlText(number||title)}</title><style>
    @page{size:A4 ${landscape?'landscape':'portrait'};margin:14mm 12mm 16mm;@bottom-right{content:'Página ' counter(page) ' / ' counter(pages);font:9px Arial;color:#52645a}}
    *{box-sizing:border-box}body{margin:0;padding:24px;font:12px Arial,sans-serif;color:#182a22;background:white;line-height:1.45}
    header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #1a6b2f;padding-bottom:16px;margin-bottom:18px}header strong{font-size:25px;letter-spacing:3px;color:#1a6b2f}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px}small{color:#52645a}section{margin-bottom:18px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.field{background:#f1f6f3;border:1px solid #d4e2da;padding:9px 12px;break-inside:avoid}.field small{display:block}.field div{font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}
    table{width:100%;border-collapse:collapse;table-layout:fixed;margin:14px 0}th{background:#e6f0e9;color:#174c2c;text-align:left;font-size:10px}td,th{border:1px solid #cfdad3;padding:8px 7px;overflow-wrap:anywhere;white-space:pre-wrap;vertical-align:top}td{font-size:11px}tbody tr:nth-child(even){background:#f8faf9}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.notes{white-space:pre-wrap;overflow-wrap:anywhere;border-left:3px solid #1a6b2f;padding:8px 12px;background:#f4f7f5}.signatures{display:flex;gap:25px;margin-top:34px;break-inside:avoid}.signature{flex:1;border-top:1px solid #80968a;padding-top:8px;text-align:center;white-space:pre-wrap}footer{margin-top:20px;border-top:1px solid #d4e2da;padding-top:8px;font-size:9px;color:#52645a;break-inside:avoid}.toolbar{padding:12px;background:#e6f0e9;margin-bottom:18px}.toolbar button{padding:10px 18px;background:#1a6b2f;color:white;border:0;border-radius:5px;cursor:pointer}.summary{font-weight:600;margin-top:12px}
    @media print{body{padding:0}.toolbar{display:none}th,.field{-webkit-print-color-adjust:exact;print-color-adjust:exact}header{break-inside:avoid}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / Guardar PDF</button> <small>Escolha A4 no diálogo de impressão.</small></div>
    <header><div><strong>LUELE</strong><br><small>Gestão de armazéns · WMS</small></div><div><h1>${htmlText(title)}</h1><b>${htmlText(number)}</b><br><small>${htmlText(dateText(date))} · Luanda</small></div></header>
    <section class="fields">${fields.map(([label,value])=>'<div class="field"><small>'+htmlText(label)+'</small><div>'+htmlText(value??'—')+'</div></div>').join('')}</section>
    ${tableHtml(headers,rows)}${summary?'<div class="summary">'+htmlText(summary)+'</div>':''}
    ${notes?'<h2>Observações</h2><section class="notes">'+htmlText(notes)+'</section>':''}
    <section class="signatures">${signatures.map(s=>'<div class="signature">'+htmlText(s)+'</div>').join('')}</section>
    <footer>LUELE WMS · ${htmlText(number)} · Documento gerado em ${htmlText(dateText(new Date()))} (Luanda). Quantidades expressas na unidade de cada linha.</footer></body></html>`;
}
export function movementDocument({kind='entry',number,items,destination='',supplier='',reference='',notes='',lot='',expiryDate='',author='',date=new Date()}) {
  const entry=kind==='entry';
  const fields=[['Destino / Requisitante',destination||'—'],[entry?'Processado por':'Emitido por',author||'—']];
  if(entry)fields.push(['Fornecedor / Origem',supplier||'—'],['Guia do fornecedor / Referência',reference||'—']);
  if(lot)fields.push(['Lote',lot]);if(expiryDate)fields.push(['Validade',dateText(expiryDate,false)]);
  const headers=['#','Código','Material',...(entry?[]:['Origem']),'Quantidade','Unidade'];
  const rows=items.map((m,i)=>[i+1,m.code||'—',m.name||'',...(entry?[]:[m.locFull||m.location||'—']),qtyText(m.qty),m.unit||'—']);
  return printDocument({title:entry?'Guia de entrada':'Guia de saída',number,date,fields,headers,rows,notes,summary:items.length+' linha(s) de material',signatures:[author+'\n'+(entry?'Processado por':'Emitido por'),entry?'Conferido por':'Recebido por']});
}
export function countDocument(count, items, completed) {
  const rows=countRows([{...count,items}]);
  const differences=rows.filter(r=>r[6]!==null&&r[6]!==0).length;
  const uncounted=rows.filter(r=>r[5]===null).length;
  return printDocument({title:completed?'Relatório de inventário':'Folha de contagem',number:count.number,date:count.completedAt||count.createdAt||new Date(),landscape:true,
    fields:[['Localização',count.location],['Responsável',count.responsible],['Data da contagem',dateText(count.date||count.scheduledFor,false)||'—'],['Estado',completed?(count.adjusted?'Concluída · stock ajustado':'Concluída · sem ajuste de stock'):'Contagem física']],
    headers:['#','Código','Material','Unidade','Qtd. sistema','Qtd. contada','Diferença','Observações'],
    rows:rows.map((r,i)=>[i+1,r[2],r[3],r[7],qtyText(r[4]),completed?(r[5]===null?'Não contado':qtyText(r[5])):'________',completed?(r[6]===null?'—':qtyText(r[6])):'________',r[9]]),
    summary:rows.length+' linha(s)'+(completed?' · '+differences+' diferença(s) · '+uncounted+' por contar':''),notes:count.obs||'',signatures:[(count.responsible||'')+'\nResponsável',(count.completedBy||'')+'\nVerificado por']});
}
