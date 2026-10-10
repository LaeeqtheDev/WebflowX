try{
var r=document.documentElement;
if(/^\/dashboard/.test(location.pathname)){
var D={light:0,snow:0,dark:1,ash:1,onyx:1,midnight:1,forest:1};
var p=localStorage.getItem("wfx-theme")||"system";
var id=p==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):(p in D?p:"light");
if(D[id])r.classList.add("dark");
r.setAttribute("data-theme",id);
var l=null;try{l=JSON.parse(localStorage.getItem("wfx-look")||"null")}catch(e){}
if(l&&typeof l==="object"){
if(/^[a-z]{3,10}$/.test(l.accent))r.setAttribute("data-accent",l.accent);
if(l.density==="compact")r.setAttribute("data-density","compact");
if(l.reducedMotion===true)r.setAttribute("data-motion","reduced");
if([90,112,125].indexOf(l.fontScale)>-1)r.style.fontSize=l.fontScale+"%";
}
}
}catch(e){}
