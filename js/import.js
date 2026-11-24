// Sales OS – Import/Export: CSV, FTP, Sicherung, Datensätze löschen
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function exportDaten(){
  // Geheime Schlüssel (Live-Fernseher-Schlüssel) nie in die Sicherungsdatei schreiben
  var safeSettings=Object.assign({},settings);delete safeSettings.liveKey;
  if(safeSettings.liveConfig&&typeof safeSettings.liveConfig==='object'){safeSettings.liveConfig=Object.assign({},safeSettings.liveConfig);delete safeSettings.liveConfig.liveKey;delete safeSettings.liveConfig.key;}
  var d={exportiert:new Date().toISOString(),version:'sfp-v1',employees:employees,protocols:protocols,performance:performance,tasks:tasks,reviews:reviews,KPI_TARGETS:KPI_TARGETS,settings:safeSettings,ratingCriteria:ratingCriteria};
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));
  a.download='sfp-backup-'+today()+'.json';a.click();
}
function importDaten(file){
  if(_restoringBackup)return;
  if(!confirm('Backup wiederherstellen?\n\nDie Daten aus der Datei werden in die Datenbank zurückgeschrieben (bestehende Einträge mit gleicher ID werden überschrieben, nichts wird gelöscht).'))return;
  _restoringBackup=true;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var d=JSON.parse(e.target.result);
      restoreBackupToSupabase(d);
    }catch(ex){_restoringBackup=false;alert('Fehler beim Lesen der Datei: '+ex.message);}
  };
  reader.onerror=function(){_restoringBackup=false;alert('Datei konnte nicht gelesen werden.');};
  reader.readAsText(file);
}

function restoreBackupToSupabase(d){
  var status=function(msg){
    var el=document.getElementById('restore-status');
    if(el)el.textContent=msg;
  };
  function checkErr(res,label){
    if(res&&res.error){throw new Error(label+': '+res.error.message);}
    return res;
  }
  status('Starte Wiederherstellung…');

  var empRows=(d.employees||[]).map(function(e){
    return {id:e.id,name:e.name,role:e.role,phase:e.phase,color_index:e.color||0,
      start_date:e.startDate||null,end_date:e.endDate||null,team:e.team,contract:e.contract,
      hours:e.hours,active:e.active!==false};
  });

  var chain=Promise.resolve();

  if(empRows.length){
    chain=chain.then(function(){
      status('Mitarbeiter (' + empRows.length + ')…');
      return sb.from('employees').upsert(empRows,{onConflict:'id'}).then(function(res){return checkErr(res,'Mitarbeiter');});
    });
  }

  var empTargetRows=[];
  (d.employees||[]).forEach(function(e){
    if(!e.targets)return;
    Object.keys(e.targets).forEach(function(k){
      if(k.endsWith('Dir'))return;
      var dirKey=k+'Dir';
      empTargetRows.push({employee_id:e.id,metric_key:k,val:e.targets[k],dir:e.targets[dirKey]||'gte'});
    });
  });
  if(empTargetRows.length){
    chain=chain.then(function(){
      status('Individuelle KPI-Ziele (' + empTargetRows.length + ')…');
      return sb.from('employee_kpi_targets').upsert(empTargetRows,{onConflict:'employee_id,metric_key'}).then(function(res){return checkErr(res,'Individuelle KPI-Ziele');});
    });
  }

  var perfRows=[];
  Object.keys(d.performance||{}).forEach(function(empId){
    (d.performance[empId]||[]).forEach(function(p){
      perfRows.push({employee_id:empId,date:p.date,oem_nicht_erreicht:p.notReached||0,oem_nicht_moeglich:p.notPossible||0,
        oem_nicht_erfolgreich:p.notSuccessful||0,oem_tw:p.convTW||0,oem_yes:p.convYes||0,oem_sy:p.convSY||0,
        oem_my:p.convMY||0,ups_yes:p.ups_yes||0,wka_gesamt_yes:p.wka_gesamt_yes||0,oem_margenerhoehung:p.margeOEM||0,ups_margenerhoehung:p.margeUpsell||0,
        wka_margenerhoehung:p.margeWKA||0,oem_gesamt:p.convOEM||0,oem_aktivitaeten:p.oem_aktivitaeten||0,
        gesamt_optimierungen:p.optGesamt||0,gesamt_margenerhoehung:p.margeGesamt||0});
    });
  });
  if(perfRows.length){
    chain=chain.then(function(){
      status('Performance-Daten (' + perfRows.length + ')…');
      return sb.from('performance').upsert(perfRows,{onConflict:'employee_id,date'}).then(function(res){return checkErr(res,'Performance-Daten');});
    });
  }

  var protoRows=[];
  Object.keys(d.protocols||{}).forEach(function(empId){
    (d.protocols[empId]||[]).forEach(function(p){
      protoRows.push({id:p.id,employee_id:empId,date:p.date,uhrzeit:p.uhrzeit||null,art:p.type,
        rating:p.rating,note:p.note||p.notes||'',focus:p.focus||'',status:p.status||'abgeschlossen',
        start_note:p.start||'',stop_note:p.stop||'',continue_note:p.cont||''});
    });
  });
  if(protoRows.length){
    chain=chain.then(function(){
      status('Sessions (' + protoRows.length + ')…');
      return sb.from('protocols').upsert(protoRows,{onConflict:'id'}).then(function(res){return checkErr(res,'Sessions');});
    });
  }

  var taskRows=[];
  Object.keys(d.tasks||{}).forEach(function(empId){
    (d.tasks[empId]||[]).forEach(function(t){
      taskRows.push({id:t.id,employee_id:empId,text:t.text,description:t.description||'',
        done:!!t.done,priority:t.priority||'medium',due_date:t.dueDate||null,source:t.source||''});
    });
  });
  if(taskRows.length){
    chain=chain.then(function(){
      status('Aufgaben (' + taskRows.length + ')…');
      return sb.from('tasks').upsert(taskRows,{onConflict:'id'}).then(function(res){return checkErr(res,'Aufgaben');});
    });
  }

  var reviewRows=[],reviewKpiRows=[];
  var REVIEW_KEYS=['opener','einwand','loop','bedarf','abschluss','gespraech','zusammenfassung','produkt','motivation','coach','zuverl','team','crOEM','crTW','crSY','crMY'];
  Object.keys(d.reviews||{}).forEach(function(empId){
    (d.reviews[empId]||[]).forEach(function(r){
      if(r.einwand===undefined)return;
      reviewRows.push({id:r.id,employee_id:empId,type:'Mitarbeiterentwicklung',date:r.date,
        status:'abgeschlossen',notes:r.note||''});
      REVIEW_KEYS.forEach(function(k){
        if(r[k]!==undefined)reviewKpiRows.push({review_id:r.id,metric_key:k,value:r[k]});
      });
    });
  });
  if(reviewRows.length){
    chain=chain.then(function(){
      status('Mitarbeiterentwicklung (' + reviewRows.length + ')…');
      return sb.from('reviews').upsert(reviewRows,{onConflict:'id'}).then(function(res){return checkErr(res,'Mitarbeiterentwicklung');});
    }).then(function(){
      return sb.from('review_kpis').upsert(reviewKpiRows,{onConflict:'review_id,metric_key'}).then(function(res){return checkErr(res,'Mitarbeiterentwicklung-Werte');});
    });
  }

  var callRows=[],callScoreRows=[];
  Object.keys(d.callRatings||{}).forEach(function(empId){
    (d.callRatings[empId]||[]).forEach(function(c){
      callRows.push({id:c.id,employee_id:empId,date:c.date,auftragsnr:c.auftragsnr||'',
        bewertet_von:c.bewertetVon||'',status:c.status||'nein',b2b:c.b2b||'B2C',
        einwand:c.einwand||'',hinweis:c.hinweis||''});
      Object.keys(c.scores||{}).forEach(function(k){
        callScoreRows.push({call_rating_id:c.id,item_key:k,value:c.scores[k]});
      });
    });
  });
  if(callRows.length){
    chain=chain.then(function(){
      status('QA-Bewertungen (' + callRows.length + ')…');
      return sb.from('call_ratings').upsert(callRows,{onConflict:'id'}).then(function(res){return checkErr(res,'QA-Bewertungen');});
    }).then(function(){
      return sb.from('call_rating_scores').upsert(callScoreRows,{onConflict:'call_rating_id,item_key'}).then(function(res){return checkErr(res,'QA-Bewertungen-Scores');});
    });
  }

  if(d.KPI_TARGETS){
    var kpiRows=Object.keys(d.KPI_TARGETS).map(function(k){
      var t=d.KPI_TARGETS[k];return {metric_key:k,label:t.label,val:t.val,dir:t.dir};
    });
    chain=chain.then(function(){
      status('Globale KPI-Ziele…');
      return sb.from('kpi_targets').upsert(kpiRows,{onConflict:'metric_key'}).then(function(res){return checkErr(res,'Globale KPI-Ziele');});
    });
  }
  if(d.ratingCriteria&&d.ratingCriteria.length){
    var rcRows=d.ratingCriteria.map(function(r,i){
      return {name:r.name,category:r.cat,target:r.target,description:r.desc||'',sort_order:i};
    });
    chain=chain.then(function(){
      status('Bewertungskriterien…');
      return sb.from('rating_criteria').insert(rcRows).then(function(res){return checkErr(res,'Bewertungskriterien');});
    });
  }
  if(d.settings&&d.settings.ftpUrl!==undefined){
    chain=chain.then(function(){
      status('FTP-Einstellung…');
      return sb.from('settings').upsert({key:'ftpUrl',value:d.settings.ftpUrl},{onConflict:'key'}).then(function(res){return checkErr(res,'FTP-Einstellung');});
    });
  }

  chain.then(function(){
    status('✓ Wiederherstellung abgeschlossen. Lade neu…');
    setTimeout(function(){location.reload();},1500);
  }).catch(function(err){
    _restoringBackup=false;
    status('');
    alert('Fehler bei der Wiederherstellung: '+err.message+'\n\nEinige Tabellen wurden evtl. schon geschrieben (Reihenfolge siehe Statusanzeige), bitte Datenbank pruefen bevor du es erneut versuchst.');
  });
}

function countZeroMargeRecords(){
  var statusEl=document.getElementById('zero-marge-status');
  if(statusEl){statusEl.style.color='var(--text2)';statusEl.textContent='Zähle…';}
  sb.from('performance').select('id',{count:'exact',head:true}).eq('gesamt_margenerhoehung',0).or('gesamt_aktivitaeten.is.null,gesamt_aktivitaeten.eq.0').then(function(res){
    if(res.error){if(statusEl){statusEl.style.color='#b91c1c';statusEl.textContent='Fehler: '+res.error.message;}return;}
    var n=res.count||0;
    if(!n){if(statusEl){statusEl.style.color='var(--teal)';statusEl.textContent='✓ Keine Datensätze mit Gesamtmarge 0 € ohne Aktivitäten gefunden.';}return;}
    if(statusEl){
      statusEl.style.color='var(--text)';
      statusEl.innerHTML='';
      var txt=document.createElement('div');
      txt.textContent=n+' Datensatz(e) mit Gesamtmarge 0 € und ohne Aktivitäten gefunden.';
      txt.style.marginBottom='6px';
      statusEl.appendChild(txt);
      var btn=document.createElement('button');
      btn.className='btn btn-sm';
      btn.style.color='#b91c1c';btn.style.borderColor='#b91c1c';
      btn.innerHTML='<i class="ti ti-trash"></i> '+n+' Datensatz(e) jetzt löschen';
      btn.onclick=function(){deleteZeroMargeRecords(n);};
      statusEl.appendChild(btn);
    }
  }).catch(function(err){if(statusEl){statusEl.style.color='#b91c1c';statusEl.textContent='Unerwarteter Fehler: '+err.message;}});
}
function deleteZeroMargeRecords(expectedCount){
  if(!confirm('Wirklich '+expectedCount+' Datensatz(e) mit Gesamtmarge 0 € und ohne Aktivitäten endgültig löschen? Arbeitstage mit Aktivitäten, aber ohne Verkauf, bleiben erhalten. Das kann nicht rückgängig gemacht werden.'))return;
  var statusEl=document.getElementById('zero-marge-status');
  if(statusEl){statusEl.style.color='var(--text2)';statusEl.textContent='Lösche…';}
  sb.from('performance').delete().eq('gesamt_margenerhoehung',0).or('gesamt_aktivitaeten.is.null,gesamt_aktivitaeten.eq.0').then(function(res){
    if(res.error){if(statusEl){statusEl.style.color='#b91c1c';statusEl.textContent='Fehler beim Löschen: '+res.error.message;}return;}
    if(statusEl){statusEl.style.color='var(--teal)';statusEl.textContent='✓ Datensätze gelöscht.';}
    loadPerformanceFromSupabase().then(function(){renderTab();});
  }).catch(function(err){if(statusEl){statusEl.style.color='#b91c1c';statusEl.textContent='Unerwarteter Fehler: '+err.message;}});
}
function downloadCSVVorlage(){
  var headers=CSV_COLS.map(function(c){return c[0];});
  var exampleName=(employees[0]&&employees[0].name)||'Vorname Nachname';
  var example=[today(),exampleName,63,44,1,5,13,0,5,3,5,10,3,2.1,26,1200,300,50,1550,72,0,38,23,38];
  var csv=headers.join(',')+'\n'+example.join(',')+'\n';
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='performance-vorlage.csv';
  a.click();
}

function parseNum(v){
  if(v===undefined||v===null||v==='')return 0;
  v=String(v).trim();
  if(v.indexOf(',')>-1&&v.indexOf('.')>-1){v=v.replace(/\./g,'').replace(',','.');}
  else if(v.indexOf(',')>-1){v=v.replace(',','.');}
  var n=parseFloat(v);
  return isNaN(n)?0:n;
}
function parseIntNum(v){return Math.round(parseNum(v));}

function parseDateDE(v){
  if(!v)return v;
  v=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;   // schon ISO
  var m=v.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);   // TT.MM.JJJJ oder TT/MM/JJJJ
  if(m){
    var d=('0'+m[1]).slice(-2),mo=('0'+m[2]).slice(-2),y=m[3];
    return y+'-'+mo+'-'+d;
  }
  return v;
}
function importCSV(file){
  if(!file||_importingCSV)return;
  _importingCSV=true;
  var statusEl=document.getElementById('csv-status');
  if(statusEl){statusEl.style.color='var(--text2)';statusEl.textContent='Lese Datei…';}
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      // Excel exportiert deutsche CSVs meist in Windows-1252 (Umlaute werden sonst zu "?"/Mojibake).
      // UTF-8-BOM pruefen; falls vorhanden UTF-8 nutzen, sonst Windows-1252 dekodieren.
      var bytes=new Uint8Array(e.target.result);
      var hasBom=bytes.length>=3&&bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF;
      var text=new TextDecoder(hasBom?'utf-8':'windows-1252').decode(hasBom?bytes.subarray(3):bytes);
      var lines=text.split(/\r?\n/).filter(function(l){return l.trim();});
      if(lines.length<2){if(statusEl)statusEl.textContent='Keine Datenzeilen gefunden.';_importingCSV=false;return;}
      // Trennzeichen automatisch erkennen: deutsches Excel exportiert bei Komma-Dezimalzahlen oft mit Semikolon
      var delim=(lines[0].split(';').length>lines[0].split(',').length)?';':',';
      var rawHeader=lines[0].split(delim).map(function(h){return h.trim();});
      // deutsche Spaltennamen -> interne Feldnamen; falls jemand die alten internen Namen
      // direkt einträgt (z.B. "datum"), wird das ebenfalls akzeptiert
      var header=rawHeader.map(function(h){
        var hit=CSV_COLS.find(function(c){return c[0].toLowerCase()===h.toLowerCase();});
        return hit?hit[1]:h.toLowerCase();
      });
      var rows=lines.slice(1).map(function(line){
        var vals=line.split(delim).map(function(v){return v.trim();});
        var row={};
        header.forEach(function(h,i){row[h]=vals[i];});
        return row;
      });
      var payload=[],notFound=[],skippedZeroMarge=0;
      rows.forEach(function(row){
        var emp=employees.find(function(e){return e.name.toLowerCase()===((row.mitarbeiter_name||'').toLowerCase());});
        if(!emp){if(row.mitarbeiter_name)notFound.push(row.mitarbeiter_name);return;}
        var gesamtMarge=parseNum(row.gesamt_margenerhoehung);
        if(!gesamtMarge){skippedZeroMarge++;return;} // Einsatztag ohne Praesenz (Lead abgelehnt) - Gesamtmarge 0 EUR wird nicht importiert
        payload.push({
          employee_id:emp.id,date:parseDateDE(row.datum),
          oem_aktivitaeten:parseIntNum(row.oem_aktivitaeten),oem_nicht_erreicht:parseIntNum(row.oem_nicht_erreicht),
          oem_nicht_moeglich:parseIntNum(row.oem_nicht_moeglich),oem_nicht_erfolgreich:parseIntNum(row.oem_nicht_erfolgreich),
          oem_gesamt:parseIntNum(row.oem_gesamt),oem_tw:parseIntNum(row.oem_tw),oem_yes:parseIntNum(row.oem_yes),
          oem_sy:parseIntNum(row.oem_sy),oem_my:parseIntNum(row.oem_my),ups_yes:parseIntNum(row.ups_yes),
          wka_gesamt_yes:parseIntNum(row.wka_gesamt_yes),gesamt_optimierungen:parseIntNum(row.gesamt_optimierungen),
          oem_margenerhoehung:parseNum(row.oem_margenerhoehung),ups_margenerhoehung:parseNum(row.ups_margenerhoehung),
          wka_margenerhoehung:parseNum(row.wka_margenerhoehung),gesamt_margenerhoehung:gesamtMarge,

        });
      });
      if(!payload.length){
        if(statusEl){statusEl.style.color='#b91c1c';statusEl.textContent='Keine gültigen Zeilen. Unbekannte Mitarbeiter: '+(notFound.join(', ')||'-')+(skippedZeroMarge?' · '+skippedZeroMarge+' Zeile(n) mit Gesamtmarge 0€ übersprungen':'');}
        _importingCSV=false;
        return;
      }
      // Große Importe in 300er-Päckchen aufteilen, damit keine Zeilen an einem
      // Server-/Payload-Limit stillschweigend abgeschnitten werden.
      var CHUNK=300;
      var chunks=[];
      for(var ci=0;ci<payload.length;ci+=CHUNK)chunks.push(payload.slice(ci,ci+CHUNK));
      var imported=0,failedChunks=[];
      function importNextChunk(idx){
        if(idx>=chunks.length){
          var msg='✓ Import erfolgreich: '+imported+' von '+payload.length+' Zeile(n).';
          if(failedChunks.length)msg=' ⚠ '+imported+' von '+payload.length+' Zeile(n) importiert. Fehlgeschlagene Päckchen: '+failedChunks.join(', ');
          if(notFound.length)msg+=' · Unbekannte Mitarbeiter übersprungen: '+notFound.join(', ');
          if(skippedZeroMarge)msg+=' · '+skippedZeroMarge+' Zeile(n) mit Gesamtmarge 0€ übersprungen (kein Einsatztag)';
          if(statusEl){statusEl.style.color=failedChunks.length?'#b91c1c':'var(--teal)';statusEl.textContent=msg;}
          _importingCSV=false;
          loadPerformanceFromSupabase().then(function(){renderTab();});
          return;
        }
        if(statusEl)statusEl.textContent='Importiere… ('+(idx*CHUNK)+' / '+payload.length+')';
        sb.from('performance').upsert(chunks[idx],{onConflict:'employee_id,date'}).then(function(res){
          if(res.error){failedChunks.push('#'+(idx+1)+' ('+res.error.message+')');}
          else{imported+=chunks[idx].length;}
          importNextChunk(idx+1);
        }).catch(function(err){
          failedChunks.push('#'+(idx+1)+' ('+err.message+')');
          importNextChunk(idx+1);
        });
      }
      importNextChunk(0);
    }catch(ex){
      _importingCSV=false;
      if(statusEl){statusEl.style.color='#b91c1c';statusEl.textContent='Fehler beim Verarbeiten: '+ex.message;}
    }
  };
  reader.onerror=function(){
    _importingCSV=false;
    if(statusEl){statusEl.style.color='#b91c1c';statusEl.textContent='Datei konnte nicht gelesen werden.';}
  };
  reader.readAsArrayBuffer(file);
}
function saveFTP(){
  if(_savingFTP)return;
  var host=document.getElementById('ftpHost').value.trim();
  var port=document.getElementById('ftpPort').value.trim();
  var user=document.getElementById('ftpUser').value.trim();
  var file=document.getElementById('ftpFile').value.trim();
  settings.ftpHost=host;settings.ftpPort=port;settings.ftpUser=user;settings.ftpFile=file;
  _savingFTP=true;
  sb.from('settings').upsert([
    {key:'ftpHost',value:host},
    {key:'ftpPort',value:port},
    {key:'ftpUser',value:user},
    {key:'ftpFile',value:file}
  ],{onConflict:'key'}).then(function(res){
    _savingFTP=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    logActivity('settings','updated','FTP-Datensync-Verbindungsinfo aktualisiert');
    alert('Gespeichert.');
  });
}
