"use strict";
(() => {
 const cfg=window.APP_CONFIG||{};
 const $=id=>document.getElementById(id);
 const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const date=value=>value?new Date(value).toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"}):"—";
 let client=null, busy=false, timer=null;
 function showError(message){$("error").hidden=!message;$("error").textContent=message||"";}
 function rows(id,html,empty,span){$(id).innerHTML=html||'<tr><td colspan="'+span+'" class="empty">'+empty+'</td></tr>';}
 function render(data){
  $("stat-users").textContent=data.stats.users;$("stat-runs").textContent=data.stats.simulations;$("stat-feedback").textContent=data.stats.feedback;$("stat-awards").textContent=data.stats.quiz_awards;
  $("users-count").textContent=data.users.length;$("runs-count").textContent=data.simulations.length;$("feedback-count").textContent=data.feedback.length;$("board-count").textContent=data.leaderboard.length;
  rows("users-table",data.users.map(u=>'<tr><td><strong>'+escapeHTML(u.username)+'</strong></td><td>'+date(u.created_at)+'</td><td class="id">'+escapeHTML(u.id)+'</td></tr>').join(""),"Nessun utente",3);
  rows("runs-table",data.simulations.map(r=>'<tr><td>'+escapeHTML(r.username)+'</td><td>'+escapeHTML(r.year)+'</td><td>'+escapeHTML(r.co2_ppm)+'</td><td>'+escapeHTML(r.methane_ppb)+'</td><td>'+escapeHTML(r.scenario)+'</td><td>'+date(r.created_at)+'</td></tr>').join(""),"Nessuna simulazione",6);
  $("feedback-list").innerHTML=data.feedback.length?data.feedback.map(f=>'<article class="feed"><div class="feed-top"><strong>'+escapeHTML(f.username)+'</strong><span class="stars">'+("★".repeat(Math.max(0,Math.min(5,Number(f.rating)||0))))+("☆".repeat(5-Math.max(0,Math.min(5,Number(f.rating)||0))))+'</span></div><p>'+escapeHTML(f.message||"Nessun commento")+'</p><time>'+date(f.created_at)+'</time></article>').join(""):'<p class="empty">Nessun feedback ricevuto</p>';
  rows("board-table",data.leaderboard.map(b=>'<tr><td>'+escapeHTML(b.username)+'</td><td>'+escapeHTML(b.category)+'</td><td>'+escapeHTML(b.score)+'</td></tr>').join(""),"Nessun dato classifica",3);
  $("sync-state").textContent="Dati sincronizzati";$("last-update").textContent="Ultimo aggiornamento: "+date(data.generated_at);
 }
 async function refresh(){
  if(busy||!client)return;busy=true;$("sync-state").textContent="Aggiornamento…";
  try{
   const {data:{session}}=await client.auth.getSession();
   if(!session){showError("Sessione assente. Accedi dal sito Greenhouse Lab e poi apri /admin.html.");$("sync-state").textContent="Non autenticato";return;}
   const {data,error}=await client.functions.invoke("admin-dashboard-data",{body:{}});
   if(error){let message=error.message;try{const body=await error.context.clone().json();message=body.error||message;}catch{}throw new Error(message);}
   if(!data?.ok)throw new Error(data?.error||"Risposta non valida");
   $("admin-name").textContent=session.user.user_metadata?.username||"Admin";
   render(data);showError("");
  }catch(error){showError(error.message||"Errore di connessione");$("sync-state").textContent="Aggiornamento fallito";}
  finally{busy=false;}
 }
 async function init(){
  if(!cfg.supabaseUrl||!cfg.supabaseKey){showError("Configurazione Supabase non trovata.");return;}
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const {data:{session}}=await client.auth.getSession();
  if(!session){showError("Accedi prima dal sito Greenhouse Lab, poi torna qui.");$("sync-state").textContent="Non autenticato";return;}
  const role=session.user.app_metadata?.role;
  if(role!=="admin"){showError("Questo account non ha il ruolo amministratore. Esci e accedi di nuovo dopo l'assegnazione del ruolo.");$("sync-state").textContent="Accesso negato";return;}
  $("admin-name").textContent=session.user.user_metadata?.username||"Admin";
  await refresh();timer=window.setInterval(refresh,5000);
 }
 $("refresh").addEventListener("click",refresh);
 $("logout").addEventListener("click",async()=>{if(client)await client.auth.signOut();if(timer)clearInterval(timer);location.href="./";});
 init();
})();