"use strict";
document.addEventListener("DOMContentLoaded",function(){
 const $=function(id){return document.getElementById(id);};
 const cfg=window.APP_CONFIG||{};
 function status(message,error){$("status").textContent=message;$("status").style.color=error?"#ff8888":"#aaff00";}
 function load(){
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseKey){status("Supabase non configurato.",true);return;}
  status("Caricamento dati…");
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  db.from("simulation_runs").select("id,level,year,retained_heat,scenario,created_at").order("created_at",{ascending:false}).limit(500).then(function(result){
   if(result.error){status("Dati non disponibili: "+result.error.message,true);$("levelChart").innerHTML='<p class="empty">Verifica le autorizzazioni di lettura del database.</p>';return;}
   const rows=result.data||[],count=rows.length;
   const avg=count?rows.reduce((sum,row)=>sum+Number(row.retained_heat||0),0)/count:0;
   const max=count?Math.max.apply(null,rows.map(row=>Number(row.retained_heat||0))):0;
   const level=count?rows.reduce((sum,row)=>sum+Number(row.level||0),0)/count:0;
   $("total").textContent=count;$("averageHeat").textContent=count?avg.toFixed(1)+"%":"—";$("maxHeat").textContent=count?max.toFixed(1)+"%":"—";$("averageLevel").textContent=count?level.toFixed(1)+"/4":"—";
   const levels=[0,0,0,0,0];rows.forEach(row=>{const n=Math.max(0,Math.min(4,Number(row.level)||0));levels[n]++;});
   const peak=Math.max(1,...levels);
   $("levelChart").innerHTML=levels.map((n,i)=>'<div class="bar-row"><span>Livello '+i+'</span><div class="bar-track"><i style="width:'+(n/peak*100)+'%"></i></div><strong>'+n+'</strong></div>').join("");
   $("recentRows").innerHTML=rows.slice(0,12).map(row=>'<tr><td>'+row.level+'/4</td><td>'+Number(row.retained_heat||0).toFixed(1)+'%</td><td>'+row.year+'</td><td>'+String(row.scenario||"—").replace(/[<>]/g,"")+'</td><td>'+new Date(row.created_at).toLocaleString("it-IT")+'</td></tr>').join("")||'<tr><td colspan="5" class="empty">Nessuna simulazione salvata.</td></tr>';
   status("Dati aggiornati · "+count+" simulazioni · "+new Date().toLocaleTimeString("it-IT"));
  });
 }
 $("refreshBtn").addEventListener("click",load);load();
});