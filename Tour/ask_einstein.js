/* Ask Einstein — self-contained Q&A widget (additive, namespaced eeAsk_)
   Loads window.EE_PLAYBOOK_CORPUS, searches it, speaks the answer,
   and shows the source excerpts with a Menu › Submenu › Page breadcrumb. */
(function(){
  "use strict";
  if (window.__eeAskReady) return; window.__eeAskReady = true;

  /* ---------- Styles ---------- */
  var css = ''
    + '#eeAskBtn{position:fixed;right:16px;bottom:84px;z-index:99985;width:62px;height:62px;border-radius:50%;'
    +  'border:2px solid rgba(167,139,250,.6);background:#10162e center/cover no-repeat;cursor:pointer;'
    +  'box-shadow:0 8px 22px rgba(0,0,0,.45),0 0 0 4px rgba(34,211,238,.10);'
    +  'transition:transform .15s ease, box-shadow .25s ease;}'
    + '#eeAskBtn:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.5),0 0 0 5px rgba(34,211,238,.18);}'
    + '#eeAskBtn::after{content:"Ask Einstein";position:absolute;right:74px;bottom:18px;white-space:nowrap;'
    +  'background:#10162e;color:#e8eefc;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);'
    +  'font:600 11.5px/1 system-ui;opacity:0;transform:translateX(6px);transition:opacity .15s,transform .15s;pointer-events:none;}'
    + '#eeAskBtn:hover::after{opacity:1;transform:translateX(0);}'
    + '#eeAskBack{position:fixed;inset:0;z-index:99986;display:none;align-items:center;justify-content:center;'
    +  'padding:20px;background:rgba(5,8,20,.72);backdrop-filter:blur(5px);}'
    + '#eeAskBack.open{display:flex;}'
    + '#eeAskCard{width:640px;max-width:100%;max-height:88vh;display:flex;flex-direction:column;'
    +  'background:#0e1430;color:#e8eefc;border:1px solid rgba(139,92,246,.45);border-radius:18px;'
    +  'box-shadow:0 28px 70px rgba(0,0,0,.6);overflow:hidden;position:relative;'
    +  'font:14px/1.5 system-ui,Segoe UI,Roboto,sans-serif;}'
    + '#eeAskCard .ea-head{display:flex;align-items:center;gap:14px;padding:18px 20px 14px;'
    +  'border-bottom:1px solid rgba(255,255,255,.06);}'
    + '#eeAskCard .ea-portrait{width:54px;height:54px;border-radius:50%;background:#1b2547 center/cover no-repeat;'
    +  'border:1px solid rgba(167,139,250,.5);flex:0 0 auto;position:relative;}'
    + '#eeAskCard .ea-portrait.speaking{animation:eaPulse 1.2s ease-in-out infinite;}'
    + '@keyframes eaPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,211,238,.55);}50%{box-shadow:0 0 0 10px rgba(34,211,238,0);}}'
    + '#eeAskCard .ea-name{font:700 17px/1.2 Georgia,serif;background:linear-gradient(135deg,#22d3ee,#a78bfa);'
    +  '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}'
    + '#eeAskCard .ea-tag{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9fb0d6;margin-top:2px;}'
    + '#eeAskCard .ea-mute,#eeAskCard .ea-x{background:none;border:none;color:#9fb0d6;cursor:pointer;'
    +  'font-size:18px;line-height:1;padding:6px 8px;border-radius:6px;}'
    + '#eeAskCard .ea-mute:hover,#eeAskCard .ea-x:hover{background:rgba(255,255,255,.06);color:#e8eefc;}'
    + '#eeAskCard .ea-spacer{flex:1;}'
    + '#eeAskCard .ea-body{padding:16px 20px;overflow:auto;}'
    + '#eeAskCard .ea-row{display:flex;gap:8px;}'
    + '#eeAskInput{flex:1;background:#1b2547;color:#e8eefc;border:1px solid rgba(255,255,255,.08);'
    +  'border-radius:10px;padding:11px 12px;font:14px/1.3 system-ui;outline:none;}'
    + '#eeAskInput:focus{border-color:rgba(34,211,238,.55);}'
    + '#eeAskSend{padding:0 16px;border:none;border-radius:10px;cursor:pointer;font:700 13px/1 system-ui;'
    +  'color:#0a0e1a;background:linear-gradient(135deg,#22d3ee,#a78bfa);}'
    + '#eeAskSend:hover{filter:brightness(1.07);}'
    + '#eeAskCard .ea-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px;}'
    + '#eeAskCard .ea-chip{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);'
    +  'border-radius:999px;padding:5px 10px;font-size:11.5px;color:#cbd5f0;cursor:pointer;}'
    + '#eeAskCard .ea-chip:hover{background:rgba(34,211,238,.10);color:#e8eefc;border-color:rgba(34,211,238,.35);}'
    + '#eeAskCard .ea-answer{margin-top:16px;}'
    + '#eeAskCard .ea-crumb{font-size:11px;letter-spacing:.05em;color:#7e8db5;margin-bottom:6px;}'
    + '#eeAskCard .ea-crumb b{color:#a78bfa;font-weight:600;}'
    + '#eeAskCard .ea-title{font:700 18px/1.25 Georgia,serif;color:#e8eefc;margin:0 0 8px;}'
    + '#eeAskCard .ea-section{margin-top:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);'
    +  'border-radius:10px;padding:10px 12px;}'
    + '#eeAskCard .ea-section h5{margin:0 0 6px;font:700 11px/1 system-ui;letter-spacing:.16em;'
    +  'text-transform:uppercase;color:#22d3ee;}'
    + '#eeAskCard .ea-section p{margin:0;white-space:pre-wrap;color:#dbe4fb;font-size:13.5px;}'
    + '#eeAskCard .ea-related-h{margin-top:18px;font:700 11px/1 system-ui;letter-spacing:.16em;'
    +  'text-transform:uppercase;color:#a78bfa;}'
    + '#eeAskCard .ea-related{display:flex;flex-direction:column;gap:6px;margin-top:8px;}'
    + '#eeAskCard .ea-related .ea-rel{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);'
    +  'border-radius:10px;padding:9px 11px;cursor:pointer;}'
    + '#eeAskCard .ea-related .ea-rel:hover{border-color:rgba(34,211,238,.40);}'
    + '#eeAskCard .ea-related .ea-rel-c{font-size:11px;color:#7e8db5;}'
    + '#eeAskCard .ea-related .ea-rel-t{font:600 13px/1.25 Georgia,serif;color:#e8eefc;margin-top:1px;}'
    + '#eeAskCard .ea-empty{color:#9fb0d6;margin-top:14px;font-style:italic;font-size:13px;}'
    + '#eeAskCard .ea-foot{padding:10px 20px;border-top:1px solid rgba(255,255,255,.06);'
    +  'font-size:11px;color:#7e8db5;display:flex;justify-content:space-between;gap:10px;}'
    + '@media (max-width:560px){#eeAskCard{width:100%;}#eeAskBtn::after{display:none;}}';
  var st = document.createElement("style"); st.id = "eeAskStyle"; st.textContent = css; document.head.appendChild(st);

  /* ---------- DOM ---------- */
  var btn = document.createElement("button");
  btn.id = "eeAskBtn"; btn.setAttribute("aria-label","Ask Einstein");
  btn.style.backgroundImage = "url('Tour/einstein.png')";
  document.body.appendChild(btn);

  var back = document.createElement("div");
  back.id = "eeAskBack"; back.setAttribute("role","dialog"); back.setAttribute("aria-modal","true"); back.setAttribute("aria-label","Ask Einstein");
  back.innerHTML = ''
    + '<div id="eeAskCard">'
    +   '<div class="ea-head">'
    +     '<div class="ea-portrait" id="eeAskPortrait" style="background-image:url(Tour/einstein.png)"></div>'
    +     '<div>'
    +       '<div class="ea-name">Einstein</div>'
    +       '<div class="ea-tag">Your in-depth EE mentor</div>'
    +     '</div>'
    +     '<div class="ea-spacer"></div>'
    +     '<button class="ea-mute" id="eeAskMute" title="Toggle voice" aria-label="Toggle voice">&#128266;</button>'
    +     '<button class="ea-x" id="eeAskX" title="Close" aria-label="Close">&times;</button>'
    +   '</div>'
    +   '<div class="ea-body" id="eeAskBody">'
    +     '<div class="ea-row">'
    +       '<input id="eeAskInput" type="text" placeholder="Ask anything about any module..." autocomplete="off">'
    +       '<button id="eeAskSend">Ask</button>'
    +     '</div>'
    +     '<div class="ea-chips" id="eeAskChips"></div>'
    +     '<div id="eeAskAnswer"></div>'
    +   '</div>'
    +   '<div class="ea-foot">'
    +     '<span>Source: EE Cockpit Operational Playbook</span>'
    +     '<span id="eeAskCount"></span>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(back);

  /* ---------- Wiring ---------- */
  var $ = function(id){ return document.getElementById(id); };
  var input = $("eeAskInput"), answer = $("eeAskAnswer"), portrait = $("eeAskPortrait");
  var muted = false;

  var SUGGESTED = [
    "How does the billing cycle work?",
    "What is DCB and how to reconcile?",
    "When do I issue a Permit to Work?",
    "How to handle a fatal accident?",
    "What is the RTI workflow?",
    "How is SAIDI / SAIFI computed?"
  ];
  var chips = $("eeAskChips");
  SUGGESTED.forEach(function(q){
    var c = document.createElement("button"); c.className = "ea-chip"; c.textContent = q;
    c.addEventListener("click", function(){ input.value = q; ask(); });
    chips.appendChild(c);
  });

  function open(){ back.classList.add("open"); setTimeout(function(){ try{ input.focus(); }catch(e){} }, 40); }
  function close(){ back.classList.remove("open"); stopSpeaking(); }

  btn.addEventListener("click", open);
  $("eeAskX").addEventListener("click", close);
  back.addEventListener("click", function(e){ if(e.target===back) close(); });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && back.classList.contains("open")) close();
  });
  $("eeAskSend").addEventListener("click", ask);
  input.addEventListener("keydown", function(e){ if(e.key==="Enter") ask(); });
  $("eeAskMute").addEventListener("click", function(){
    muted = !muted; $("eeAskMute").innerHTML = muted ? "&#128263;" : "&#128266;";
    if (muted) stopSpeaking();
  });

  /* ---------- Search ---------- */
  var STOP = "a,an,the,is,are,was,were,be,been,of,for,in,on,to,and,or,with,by,it,its,this,that,these,those,as,at,from,about,what,how,when,where,who,why,which,do,does,did,can,should,must,have,has,had,you,your,my,me,we,our,us,they,them,their,i".split(",");
  var STOPSET = {}; STOP.forEach(function(s){ STOPSET[s]=true; });
  function tokens(s){
    return (s||"").toLowerCase().replace(/[^a-z0-9& ]+/g," ").split(/\s+/)
      .filter(function(w){ return w && w.length>1 && !STOPSET[w]; });
  }
  function buildIndex(corpus){
    corpus.forEach(function(e){
      e._tokens = tokens(e.blob);
      e._titleTokens = tokens(e.page + " " + e.menu + " " + e.submenu);
      e._counts = {}; e._tokens.forEach(function(t){ e._counts[t]=(e._counts[t]||0)+1; });
    });
  }
  function score(entry, qToks){
    var s = 0;
    qToks.forEach(function(t){
      if (entry._counts[t]) s += entry._counts[t];
      if (entry._titleTokens.indexOf(t) >= 0) s += 8;
      // partial substring match in title boosts a bit
      if ((entry.page+" "+entry.menu+" "+entry.submenu).toLowerCase().indexOf(t) >= 0) s += 2;
    });
    return s;
  }
  function search(query){
    var qt = tokens(query); if(!qt.length) return [];
    var ranked = [];
    (window.EE_PLAYBOOK_CORPUS && window.EE_PLAYBOOK_CORPUS.data || []).forEach(function(e){
      var s = score(e, qt); if (s>0) ranked.push({e:e, s:s});
    });
    ranked.sort(function(a,b){ return b.s - a.s; });
    return ranked.slice(0,4);
  }

  /* ---------- Render ---------- */
  function renderResults(query, results){
    answer.innerHTML = "";
    if (!results.length){
      answer.innerHTML = '<div class="ea-empty">I couldn\'t find that in the playbook. Try rephrasing, or use one of the suggested questions.</div>';
      speak("I could not find that in the playbook. Try rephrasing the question.");
      return;
    }
    var top = results[0].e;
    var ans = document.createElement("div"); ans.className = "ea-answer";
    var crumb = '<b>'+esc(top.menu)+'</b>' + (top.submenu ? ' › <b>'+esc(top.submenu)+'</b>' : '') + ' › '+esc(top.page);
    var html = '<div class="ea-crumb">'+crumb+'</div>'
             + '<h3 class="ea-title">'+esc(top.page)+'</h3>';
    var order = ["Objective","Purpose","When to Use","Step-by-Step Usage","Steps","Decision","Watch For","Common Mistakes","Evidence","Deadline","Inputs","Outputs","Overview"];
    var rendered = {};
    order.forEach(function(k){
      if (top.fields[k]){
        html += sectionHtml(k, top.fields[k]); rendered[k]=true;
      }
    });
    Object.keys(top.fields).forEach(function(k){ if(!rendered[k]) html += sectionHtml(k, top.fields[k]); });
    if (results.length > 1){
      html += '<div class="ea-related-h">Related sources</div><div class="ea-related">';
      results.slice(1).forEach(function(r){
        var c = '<b>'+esc(r.e.menu)+'</b>' + (r.e.submenu ? ' › <b>'+esc(r.e.submenu)+'</b>' : '');
        html += '<div class="ea-rel" data-id="'+esc(r.e.id)+'">'
              +   '<div class="ea-rel-c">'+c+'</div>'
              +   '<div class="ea-rel-t">'+esc(r.e.page)+'</div>'
              + '</div>';
      });
      html += '</div>';
    }
    ans.innerHTML = html; answer.appendChild(ans);
    // related click handlers
    ans.querySelectorAll('.ea-rel').forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.getAttribute('data-id');
        var e = (window.EE_PLAYBOOK_CORPUS.data||[]).find(function(x){return x.id===id;});
        if (e){ renderResults(query, [{e:e,s:1}].concat(results.filter(function(r){return r.e.id!==id;}))); ans.scrollIntoView({behavior:"smooth",block:"start"}); }
      });
    });
    $("eeAskCount").textContent = results.length + (results.length===1?" source":" sources") + " matched";
    // Speak a concise summary
    var summary = (top.fields["Objective"] || "").trim();
    if (!summary && top.fields["Purpose"]) summary = top.fields["Purpose"].trim();
    var head = "From " + top.menu + (top.submenu ? ", " + top.submenu : "") + ", " + top.page + ". ";
    speak(head + summary);
  }
  function sectionHtml(k, text){
    return '<div class="ea-section"><h5>'+esc(k)+'</h5><p>'+esc(text)+'</p></div>';
  }
  function esc(s){ return String(s||"").replace(/[&<>"]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  /* ---------- Speech ---------- */
  var preferredVoices = ["Daniel","Microsoft George","Google UK English Male","Microsoft Mark","Alex"];
  function pickVoice(){
    if (!window.speechSynthesis) return null;
    var voices = speechSynthesis.getVoices() || [];
    for (var i=0;i<preferredVoices.length;i++){
      var v = voices.find(function(x){ return x.name === preferredVoices[i]; });
      if (v) return v;
    }
    return voices.find(function(x){ return /en[-_]?(GB|US)/i.test(x.lang); }) || voices[0] || null;
  }
  function stopSpeaking(){ try{ window.speechSynthesis && speechSynthesis.cancel(); }catch(e){} portrait.classList.remove("speaking"); }
  function speak(text){
    if (muted || !window.speechSynthesis || !text) return;
    stopSpeaking();
    try{
      var u = new SpeechSynthesisUtterance(String(text).slice(0,1200));
      var v = pickVoice(); if (v) u.voice = v;
      u.rate = 0.95; u.pitch = 0.92;
      u.onstart = function(){ portrait.classList.add("speaking"); };
      u.onend = function(){ portrait.classList.remove("speaking"); };
      u.onerror = function(){ portrait.classList.remove("speaking"); };
      speechSynthesis.speak(u);
    }catch(e){}
  }
  // voices may load async
  if (window.speechSynthesis) {
    try { speechSynthesis.onvoiceschanged = function(){ /* noop, picked at speak time */ }; } catch(e){}
  }

  /* ---------- Ask flow ---------- */
  function ask(){
    var q = (input.value||"").trim();
    if (!q) { input.focus(); return; }
    var corpus = window.EE_PLAYBOOK_CORPUS && window.EE_PLAYBOOK_CORPUS.data;
    if (!corpus || !corpus.length){
      answer.innerHTML = '<div class="ea-empty">Playbook corpus is still loading. Try again in a moment.</div>'; return;
    }
    if (!corpus[0]._tokens) buildIndex(corpus);
    renderResults(q, search(q));
  }

  console.log("[Ask Einstein] ready — corpus:", (window.EE_PLAYBOOK_CORPUS && window.EE_PLAYBOOK_CORPUS.count) || 0, "entries");
})();
