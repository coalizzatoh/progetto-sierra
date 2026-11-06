"use strict";
document.addEventListener("DOMContentLoaded",function(){
 const $=id=>document.getElementById(id),cfg=window.APP_CONFIG||{};
 let db=null,currentUser=null,loading=false,lastRows=[];
 function status(message,error=false){$("status").textContent=message;$("status").style.color=error?"#ff8888":"#aaff00";}
 function empty(message){$("levelChart").innerHTML='<p class="empty">'+message+'</p>';$("recentRows").innerHTML='<tr><td colspan="5" class="empty">'+message+'</td></tr>';}
 function clear(){lastRows=[];$("exportBtn").disabled=true;["total","averageHeat","maxHeat","averageLevel"].forEach(id=>$(id).textContent="—");empty("Accedi dal simulatore per visualizzare le tue simulazioni private.");}
 function render(rows){
  lastRows=rows;$("exportBtn").disabled=!rows.length;
  const count=rows.length,avg=count?rows.reduce((sum,row)=>sum+Number(row.retained_heat||0),0)/count:0,max=count?Math.max(...rows.map(row=>Number(row.retained_heat||0))):0,level=count?rows.reduce((sum,row)=>sum+Number(row.level||0),0)/count:0;
  $("total").textContent=count;$("averageHeat").textContent=count?avg.toFixed(1)+"%":"—";$("maxHeat").textContent=count?max.toFixed(1)+"%":"—";$("averageLevel").textContent=count?level.toFixed(1)+"/4":"—";
  const levels=[0,0,0,0,0];rows.forEach(row=>{const n=Math.max(0,Math.min(4,Math.round(Number(row.level)||0)));levels[n]++;});
  const peak=Math.max(1,...levels);
  $("levelChart").innerHTML=levels.map((n,i)=>'<div class="bar-row"><span>Livello '+i+'</span><div class="bar-track"><i style="width:'+(n/peak*100)+'%"></i></div><strong>'+n+'</strong></div>').join("");
  $("recentRows").innerHTML=rows.slice(0,12).map(row=>'<tr><td>'+Number(row.level)+'/4</td><td>'+Number(row.retained_heat||0).toFixed(1)+'%</td><td>'+Number(row.year||0)+'</td><td>'+String(row.scenario||"—").replace(/[&<>"]/g,"")+'</td><td>'+new Date(row.created_at).toLocaleString("it-IT")+'</td></tr>').join("")||'<tr><td colspan="5" class="empty">Non hai ancora salvato simulazioni.</td></tr>';
  status("I tuoi dati sono aggiornati · "+count+" simulazioni · "+new Date().toLocaleTimeString("it-IT"));
 }
 async function load(){
  if(loading||!db)return;loading=true;
  try{
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError)throw sessionError;
   currentUser=session?.user||null;
   if(!currentUser){clear();status("Accedi dal simulatore per vedere i tuoi dati.",true);return;}
   status("Caricamento delle tue simulazioni…");
   const {data,error}=await db.from("simulation_runs").select("id,user_id,level,year,co2_ppm,retained_heat,scenario,created_at").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(500);
   if(error)throw error;
   render(data||[]);
  }catch(error){status("Impossibile caricare i dati: "+(error.message||"errore sconosciuto"),true);empty("Controlla la connessione e riprova.");}
  finally{loading=false;}
 }
 function exportCsv(){
  if(!lastRows.length)return;
  const columns=["created_at","year","level","co2_ppm","retained_heat","scenario"];
  const quote=value=>'"'+String(value??"").replaceAll('"','""')+'"';
  const csv=[columns.join(","),...lastRows.map(row=>columns.map(key=>quote(row[key])).join(","))].join("\r\n");
  const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="greenhouse-lab-simulazioni.csv";link.click();URL.revokeObjectURL(url);
 }
 if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseKey){status("Configurazione Supabase mancante.",true);return;}
 db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
 $("refreshBtn").addEventListener("click",load);$("exportBtn").addEventListener("click",exportCsv);
 db.auth.onAuthStateChange(()=>{setTimeout(load,0);});load();
});