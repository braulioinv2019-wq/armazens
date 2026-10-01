const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const source=html.slice(html.indexOf('function isZeroStock('),html.indexOf('async function openSFSModal('));
const clone=x=>JSON.parse(JSON.stringify(x));
async function check(type,qty,options={}){
 const mat={id:7,name:'Teste',qty:0,zone:'B'},other={id:8,name:'Outro',qty:4};
 const data={logistica:[{id:10,materials:[{...mat,qty},other]}],vini:[{...mat,qty},other],emas:[{...mat,qty},other],patio:[{...mat,qty},other]};
 if(options.legacy)data.emas={B:[{...mat,qty},other]};
 const before=clone(data),writes=[],toasts=[];let sfs=0,txs=0;
 const c=vm.createContext({appData:clone(data),currentUser:{name:'Teste'},db:{},confirm:()=>!options.cancel,doc:(...x)=>x,collection:(...x)=>x,serverTimestamp:()=>0,showToast:x=>toasts.push(x),openSFSModal:()=>sfs++,runTransaction:async(db,fn)=>{txs++;if(options.fail)throw Error('Sem permissão');await fn({get:async()=>({exists:()=>true,data:()=>clone(data)}),set:(ref,value)=>writes.push({ref,value})});}});
 vm.runInContext(source,c);
 if(options.dispatch){await c.removeMat(type,'0',7);return {sfs,writes};}
 await c.removeZeroStock(type,'0',7,mat,'Local','Armazém');
 if(options.cancel||options.fail||qty!==0){assert.equal(writes.length,0);if(options.cancel)assert.equal(txs,0);}
 else {assert.equal(writes.length,2);const after=writes[0].value;const list=type==='log'?after.logistica[0].materials:options.legacy?after.emas.B:after[type];assert.equal(list.length,1);assert.equal(list[0].id,8);for(const key of Object.keys(before)){if(key!==(type==='log'?'logistica':type))assert.equal(JSON.stringify(after[key]),JSON.stringify(before[key]));}assert.equal(writes[1].value.removedMaterial.id,7);assert.equal(sfs,0);}
 assert.equal(JSON.stringify(data),JSON.stringify(before));
 return {sfs,writes};
}
(async()=>{
 const c=vm.createContext({});vm.runInContext(source,c);
 for(const q of [0,'0','0.00'])assert.equal(c.isZeroStock(q),true);
 for(const q of [null,undefined,'',' ',false,-1,1,'0x','NaN',Infinity])assert.equal(c.isZeroStock(q),false);
 for(const type of ['log','vini','emas','patio'])await check(type,0);
 await check('emas',0,{legacy:true});
 for(const qty of [3,-1,'',null,'bad'])await check('vini',qty);
 await check('vini',0,{cancel:true});await check('vini',0,{fail:true});
 assert.equal((await check('vini',3,{dispatch:true})).sfs,1);
 assert.equal((await check('vini',0,{dispatch:true})).sfs,0);
 console.log('PASS: zero detection, all locations, legacy Emas, concurrent balance change, cancellation, failed write, SFS routing, audit and preservation of other locations. No live data modified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
