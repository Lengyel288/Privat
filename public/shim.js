// Náhrada prostredia claude.ai: databáza, prílohy, užívateľ a sťahovanie cez vlastné API (/api).
(()=>{
const clone=o=>o==null?o:JSON.parse(JSON.stringify(o)),rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
let who=null,loginP=null;const live=new Set();
async function call(b,retry=true){
 const r=await fetch('/api',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(b)});
 if(r.status===401&&retry&&b.op!=='login'&&b.op!=='me'){await login();return call(b,false)}
 let j={};try{j=await r.json()}catch(e){}
 if(!r.ok)throw Object.assign(new Error(j.error||('HTTP '+r.status)),{code:j.error||r.status});return j}
function login(){
 if(loginP)return loginP;
 loginP=new Promise(res=>{
  const o=document.createElement('div'),s='font:inherit;padding:10px;border:1px solid #ddd;border-radius:8px;width:100%;box-sizing:border-box';
  o.style.cssText='position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:rgba(15,17,21,.65);padding:16px';
  o.innerHTML=`<form style="background:#fff;color:#14171f;border-radius:14px;padding:22px;max-width:340px;width:100%;font:15px system-ui,sans-serif;display:grid;gap:10px"><b style="font-size:20px">Zákazkové <span style="color:#e5322d">listy</span></b><input name="u" placeholder="Meno" autocomplete="username" style="${s}"><input name="p" type="password" placeholder="Heslo" autocomplete="current-password" style="${s}"><div class="e" style="color:#c00;font-size:13px;min-height:16px"></div><button style="font:inherit;font-weight:600;padding:11px;border:0;border-radius:10px;background:#e5322d;color:#fff;cursor:pointer">Prihlásiť</button></form>`;
  document.body.appendChild(o);const f=o.firstChild;f.u.focus();
  f.onsubmit=async e=>{e.preventDefault();try{const r=await call({op:'login',u:f.u.value.trim(),p:f.p.value},false);who=r.id;o.remove();loginP=null;res()}
   catch(x){f.querySelector('.e').textContent=x.code==='bad_credentials'?'Nesprávne meno alebo heslo.':'Prihlásenie zlyhalo ('+x.code+').'}}});
 return loginP}
async function ensureAuth(){
 if(!who){try{who=(await call({op:'me'},false)).id}catch(e){await login()}}
 const h=document.querySelector('header .row');
 if(h&&!document.getElementById('logout')){const b=document.createElement('button');b.id='logout';b.textContent='Odhlásiť ('+who+')';
  b.onclick=async()=>{try{await call({op:'logout'},false)}catch(e){}location.reload()};h.appendChild(b)}}
function poll(fetcher,build,cb,err){
 let stop=false,last=null,t;const o={now(){clearTimeout(t);tick()}};
 async function tick(){if(stop)return;
  if(!document.hidden){try{const raw=await fetcher(),sig=JSON.stringify(raw);if(sig!==last){last=sig;cb(build(raw))}}catch(e){if(err)err(e)}}
  t=setTimeout(tick,4000)}
 live.add(o);tick();return()=>{stop=true;clearTimeout(t);live.delete(o)}}
const wrote=async p=>{const r=await p;live.forEach(o=>o.now());return r};
const snap=(path,d)=>({id:path.split('/').pop(),exists:d!=null,data:()=>clone(d)||undefined});
const doc=path=>({
 get:async()=>snap(path,(await call({op:'get',path})).data),
 set:d=>wrote(call({op:'set',path,data:d})).then(()=>{}),
 create:async d=>(await wrote(call({op:'create',path,data:d}))).created,
 update:d=>wrote(call({op:'update',path,data:d})).then(()=>{}),
 delete:()=>wrote(call({op:'delete',path})).then(()=>{}),
 collection:n=>col(path+'/'+n),
 onSnapshot:(cb,err)=>poll(async()=>(await call({op:'get',path})).data,raw=>snap(path,raw),cb,err)});
const col=path=>({
 doc:id=>doc(path+'/'+(id||rid())),
 add:async d=>{const id=rid();await wrote(call({op:'set',path:path+'/'+id,data:d}));return doc(path+'/'+id)},
 onSnapshot:(cb,err)=>poll(async()=>(await call({op:'list',path})).docs,raw=>({docs:raw.map(x=>snap(path+'/'+x.id,x.data)),size:raw.length}),cb,err)});
const db={doc,collection:col};
const assets={upload:async f=>{
 if(f.size>4e6)throw Object.assign(new Error('Súbor je väčší ako 4 MB.'),{code:'max 4 MB'});
 const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(f)});
 return call({op:'upload',name:f.name,ct:f.type||'application/octet-stream',b64})}};
const downloads={save:async({filename,data})=>{const u=URL.createObjectURL(new Blob([data],{type:'text/calendar'})),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}};
const user={id:async()=>who,profiles:async ids=>Object.fromEntries(ids.map(i=>[i,{name:i}]))};
window.claude={use:async n=>{await ensureAuth();return n==='db'?db:n==='assets'?assets:n==='downloads'?downloads:n==='user'?user:null}};
})();
