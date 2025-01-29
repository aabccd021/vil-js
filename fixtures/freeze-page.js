var h=(t,r,o)=>new Promise((i,n)=>{var s=e=>{try{c(o.next(e))}catch(a){n(a)}},d=e=>{try{c(o.throw(e))}catch(a){n(a)}},c=e=>e.done?i(e.value):Promise.resolve(e.value).then(s,d);c((o=o.apply(t,r)).next())});function p(){return{pathname:location.pathname,search:location.search}}function b(){var t;return JSON.parse((t=sessionStorage.getItem("freeze-cache"))!=null?t:"[]")}function g(t){let r=b();for(let o of r)if(o.cacheKey===t.pathname+t.search)return o}function w(t,r){for(let[o,i]of t)if(o===r)try{i()}catch(n){console.error(`Error in ${r} hook:`,n)}}function f(t,r){return h(this,null,function*(){if(r!==void 0){document.body.innerHTML=r.bodyHtml;for(let e of document.body.getAttributeNames())document.body.removeAttribute(e);for(let[e,a]of r.bodyAttributes)document.body.setAttribute(e,a);document.head.innerHTML=r.headHtml,window.setTimeout(()=>window.scrollTo(0,r.scroll),0),history.pushState("freeze","",t.pathname+t.search)}let o=Array.from(document.querySelectorAll("script")).filter(e=>e.type==="module").flatMap(e=>h(this,null,function*(){let a=yield import(e.src);return"hooks"in a&&Array.isArray(a.hooks)?a.hooks:[]})),i=yield Promise.allSettled(o);for(let e of i)e.status==="rejected"&&console.error(e.reason);let n=i.filter(e=>e.status==="fulfilled").flatMap(e=>e.value);w(n,"FreezePageLoad");let s=new AbortController,d=document.body.hasAttribute("data-freeze-page"),c=document.body.querySelectorAll("a");for(let e of Array.from(c))e.addEventListener("click",a=>h(this,null,function*(){let l=new URL(e.href),m={pathname:l.pathname,search:l.search},y=g(m);y!==void 0&&(a.preventDefault(),d&&u(t,s,n),yield f(m,y))}),{once:!0});d&&(window.addEventListener("pagehide",()=>u(t,s,n),{signal:s.signal}),window.addEventListener("popstate",e=>{if(u(t,s,n),e.state!=="freeze"){window.location.reload();return}let a=p(),l=g(a);l!==void 0&&f(a,l)},{signal:s.signal}))})}function u(t,r,o){var c;r.abort(),w(o,"FreezePageUnload");let i=Array.from(document.body.attributes).map(e=>[e.name,e.value]),n=b(),s=t.pathname+t.search;for(let e=0;e<n.length;e++)if(((c=n[e])==null?void 0:c.cacheKey)===s){n.splice(e,1);break}let d={bodyHtml:document.body.innerHTML,headHtml:document.head.innerHTML,scroll:window.scrollY,bodyAttributes:i,cacheKey:s};for(n.push(d);n.length>0;)try{sessionStorage.setItem("freeze-cache",JSON.stringify(n));break}catch(e){n.shift()}}window.addEventListener("pageshow",t=>{let r=p(),o=performance.getEntriesByType("navigation")[0];if(o===void 0||!("type"in o)||typeof o.type!="string")throw new Error(`Unknown performance entry: ${JSON.stringify(o)}`);if(!(!t.persisted&&o.type==="back_forward"||t.persisted&&o.type==="navigate")){f(r);return}let n=g(r);f(r,n)});
//# sourceMappingURL=freeze-page.es6.min.js.map
