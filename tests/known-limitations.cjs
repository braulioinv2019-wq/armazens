// Diagnósticos de problemas conhecidos ainda NÃO corrigidos. Não usam rede.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||__dirname+'/../index.html','utf8');
function fn(name){const m=new RegExp('^(?:async )?function '+name+'\\(','m').exec(html),rest=html.slice(m.index+m[0].length),n=/^(?:async )?function /m.exec(rest);let s=html.slice(m.index,m.index+m[0].length+n.index);if(name==='loadUsersFromFirebase')s=s.split('let currentUser =')[0];return s;}
(async()=>{
let persisted;const base={console:{log(){},error(){},warn(){}},refreshAll(){},document:{getElementById:()=>null},doc:()=>'',db:{},setTimeout(){},showToast(){},setDoc:async(r,d)=>{persisted=structuredClone(d);}};
const a=vm.createContext({...base}),b=vm.createContext({...base});vm.runInContext(fn('saveStock'),a);vm.runInContext(fn('saveStock'),b);
// Ambos leram 10. Cada operador retira 3. Resultado correcto seria 4.
await a.saveStock({qty:7});await b.saveStock({qty:7});assert.equal(persisted.qty,7);
console.log('CONFIRMADO: duas cópias de saldo 10, duas saídas de 3, ficam 7 em vez de 4 (gravação total sem transacção).');
const c=vm.createContext({});vm.runInContext(fn('findExistingMatSync'),c);
const old={code:'A',name:'Filtro',unit:'un',lot:'L1'},incoming={code:'B',name:'Filtro',unit:'cx',lot:'L2'};
assert.equal(c.findExistingMatSync([old],incoming),old);
console.log('CONFIRMADO: procura de artigo funde nomes iguais mesmo com códigos, unidades e lotes diferentes.');
const d=vm.createContext({USERS:{'teste@example.invalid':{role:'admin'}},db:{},doc:()=>'',getDoc:async()=>({exists:()=>true,data:()=>({})}),console:{warn(){}},saveUsers:async()=>{}});vm.runInContext(fn('loadUsersFromFirebase'),d);await d.loadUsersFromFirebase();assert.equal(d.USERS['teste@example.invalid'].role,'admin');
console.log('CONFIRMADO: recarregar perfis vazios não remove perfil já presente em memória. Não prova permissões efectivas do servidor.');
})();
