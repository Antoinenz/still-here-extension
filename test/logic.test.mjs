import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Logic test: runs the built extension/main.js against stubbed DOM classes (npm run build first).
// Native-looking checks (toString, illegal receiver) need a real browser: see testpage/ section 8.
const src = readFileSync(fileURLToPath(new URL('../extension/main.js', import.meta.url)), 'utf8');
const token = /const TOKEN = '([0-9a-f]{16})'/.exec(src)[1];
const stub = `
class EventTarget { constructor(){this.l={}} addEventListener(t,f,c){this.l=this.l||{};(this.l[t]=this.l[t]||[]).push(f)} dispatchEvent(e){this.l=this.l||{};e.target=e.target||this;for(const f of this.l[e.type]||[]){if(e.stopped)break;f(e)} return true} }
class Event { constructor(t,o={}){this.type=t;this.isTrusted=false;this.bubbles=!!o.bubbles} stopImmediatePropagation(){this.stopped=true} }
class CustomEvent extends Event { constructor(t,o={}){super(t,o);this.detail=o.detail} }
class Node extends EventTarget {}
class Element extends Node { requestFullscreen(){ return Promise.resolve('REAL') } }
class Document extends Node {
  get hidden(){ return globalThis.__hidden } get visibilityState(){ return globalThis.__hidden?'hidden':'visible' }
  get webkitHidden(){return globalThis.__hidden} get webkitVisibilityState(){return 'hidden'}
  hasFocus(){ return !globalThis.__hidden }
  get fullscreenElement(){return null} get webkitFullscreenElement(){return null} get webkitCurrentFullScreenElement(){return null}
  get fullscreen(){return false} get webkitIsFullScreen(){return false} get fullscreenEnabled(){return false} get webkitFullscreenEnabled(){return false}
  exitFullscreen(){return Promise.resolve()} webkitExitFullscreen(){} webkitCancelFullScreen(){}
}
class HTMLInputElement extends Element {} class HTMLTextAreaElement extends Element {}
class Screen { get width(){return 1920} get height(){return 1080} get availWidth(){return 1900} get availHeight(){return 1000} get availLeft(){return 0} get availTop(){return 0} get isExtended(){return true} }
class MediaQueryList { constructor(m){this.m=m} get media(){return this.m} get matches(){return true} }
class VisualViewport extends EventTarget { get width(){return 800} get height(){return 600} get scale(){return 1} get offsetLeft(){return 0} get offsetTop(){return 0} get pageLeft(){return 0} get pageTop(){return 0} }
class IdleDetector { static requestPermission(){return Promise.resolve('granted')} start(){return Promise.resolve()} }
globalThis.window = globalThis; globalThis.EventTarget=EventTarget; globalThis.addEventListener=EventTarget.prototype.addEventListener; globalThis.dispatchEvent=EventTarget.prototype.dispatchEvent;
globalThis.document = new Document();
let iw=1000; globalThis.__iw=1000;
Object.defineProperty(globalThis,'innerWidth',{get(){return globalThis.__iw},set(v){},configurable:true,enumerable:true});
for (const [k,v] of Object.entries({innerHeight:700,outerWidth:1500,outerHeight:900,devicePixelRatio:2,screenX:10,screenY:20,screenLeft:10,screenTop:20}))
  Object.defineProperty(globalThis,k,{get(){return v},set(){},configurable:true,enumerable:true});
globalThis.getScreenDetails=function getScreenDetails(){return Promise.resolve('real')};
Object.assign(globalThis,{Event,CustomEvent,Node,Element,Document,HTMLInputElement,HTMLTextAreaElement,Screen,MediaQueryList,VisualViewport,IdleDetector,DOMException:class DOMException extends Error{constructor(m,n){super(m);this.name=n}}});
`;
const ctx = vm.createContext({ console, setInterval, Promise, queueMicrotask });
vm.runInContext(stub, ctx);
vm.runInContext(src, ctx, { filename: 'chrome-extension://abc/main.js' });
const T = (code) => vm.runInContext(code, ctx);
const out = [];
const check = (name, ok, info='') => { out.push(`${ok?'PASS':'FAIL'}  ${name} ${info}`); };

T('globalThis.__hidden = true');
check('hidden spoofed', T('document.hidden') === false);
check('visibilityState spoofed', T('document.visibilityState') === 'visible');
check('hasFocus spoofed', T('document.hasFocus()') === true);
check('toString of toString', T('Function.prototype.toString.toString()') === 'function toString() { [native code] }');
check('getter not constructible', T('(()=>{try{new (Object.getOwnPropertyDescriptor(Document.prototype,"hidden").get)();return false}catch{return true}})()'));
// trusted blur swallowed, synthetic passes
T('globalThis.__seen=0; window.addEventListener("blur",()=>__seen++)');
T('(()=>{const e=new Event("blur"); e.isTrusted=true; e.target=window; window.dispatchEvent(e)})()');
check('trusted blur swallowed', T('__seen') === 0);
T('window.dispatchEvent(new Event("blur"))');
check('synthetic blur passes', T('__seen') === 1);
// config: disable focus
const fire = (cfg) => T(`document.dispatchEvent(new CustomEvent("sh-${token}-cfg",{detail:${JSON.stringify(JSON.stringify(cfg))}}))`);
fire({ focus: false });
check('focus spoof off via config', T('document.hidden') === true);
fire({ focus: true });
// resize freeze
fire({ resize: 'freeze' });
T('globalThis.__iw=1000'); const a = T('innerWidth'); T('globalThis.__iw=500');
check('freeze holds innerWidth', a === 1000 && T('innerWidth') === 1000, `${a}/${T('innerWidth')}`);
fire({ resize: 'normalise' });
check('normalise outerWidth = real inner', T('outerWidth') === 500, T('outerWidth'));
check('normalise outerHeight = inner+85', T('outerHeight') === 785, T('outerHeight'));
fire({ resize: 'off' });
check('resize off passes through', T('outerWidth') === 1500 && T('innerWidth') === 500);
// fullscreen fake
fire({ fullscreen: 'fake' });
let r = T('(async()=>{const d=document.createElement?0:0; const el=new Element(); globalThis.__el=el; globalThis.__fsev=0; el.addEventListener("fullscreenchange",()=>__fsev++); await el.requestFullscreen(); await Promise.resolve(); return document.fullscreenElement===el})()');
check('fake fullscreen sets element', await r);
check('fake fullscreen fired event', T('__fsev') >= 1, T('__fsev'));
check('fullscreenEnabled true', T('document.fullscreenEnabled') === true);
await T('document.exitFullscreen()');
check('exit clears element', T('document.fullscreenElement') === null);
fire({ fullscreen: 'hide' });
check('hide: real request passes through', (await T('new Element().requestFullscreen()')) === 'REAL');
check('hide: matchMedia false', T('new MediaQueryList("(display-mode: fullscreen)").matches') === false);
fire({ fullscreen: 'off' });
check('off: matchMedia real', T('new MediaQueryList("(display-mode: fullscreen)").matches') === true);
// misc
check('isExtended false', T('new Screen().isExtended') === false);
check('IdleDetector denied', (await T('IdleDetector.requestPermission()')) === 'denied');
let rej = ''; try { await T('getScreenDetails()'); } catch (e) { rej = e.name; }
check('getScreenDetails rejects', rej === 'NotAllowedError', rej);
// master off
fire({ enabled: false });
check('master off passes everything', T('document.hidden') === true && T('new Screen().isExtended') === true);
// hits
await new Promise((r) => setTimeout(r, 900));
console.log(out.join('\n'));
process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
