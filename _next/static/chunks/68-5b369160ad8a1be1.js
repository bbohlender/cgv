"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[68],{2253:function(e,t,r){r.d(t,{J:function(){return x}});var n=r(7340),s=r(598),o=r(892),a=r(5900),i=r(6621),p=r(5770);function l(e){return t=>r=>r.pipe((0,p.PM)((([t,r])=>(0,n.of)(e(t,r))),(e=>e),t))}function u(e){return t=>r=>r.pipe((0,p.PM)((([t])=>(0,n.of)(e(t))),(e=>e),t))}const m=(0,s.U)((e=>(0,p.Au)(((e,t)=>Object.assign(Object.assign({},t),{value:e})),e))),c=(0,s.U)((({value:[e]})=>e));function y([e,t,r]){const s=t-e;let o=Math.random()*s+e;return null!=r&&(o=Math.floor(o/r)*r),(0,n.of)(o)}function f(e,t){const[r,n]=e,i=t.pipe((0,s.U)((e=>(0,p.a_)([e],p.JY))),(0,p.bS)([]),(0,o.d)({bufferSize:1,refCount:!0}));return(0,a.T)(i,i.pipe(c,r,(0,p.bS)([1])),i.pipe(c,n,(0,p.bS)([2]))).pipe((0,p.Jh)(),b(3),(0,s.U)((([e,t,r])=>function(e,t,r){return(0,p.wm)(((e,t,r,n)=>!Array.isArray(r)&&!Array.isArray(n)&&null!=r&&null!=n&&r.value<=e&&e<n.value?t:null),e,t,r)}(e,t,r))))}function b(e){return(0,i.h)((t=>null!=t&&e===t.reduce(((e,t)=>null!=t?e+1:e),0)))}function d(e,t){const r=e[0],n=t.pipe((0,s.U)((e=>(0,p.a_)([e],p.JY))),(0,p.bS)([]),(0,o.d)({bufferSize:1,refCount:!0})),i=n.pipe(c,r,(0,p.bS)([1]),(0,o.d)({bufferSize:1,refCount:!0}));return(0,a.T)(...new Array((e.length-1)/2).fill(null).map(((t,r)=>(0,a.T)(n,i,n.pipe(c,e[2*r+1],(0,p.bS)([2]))).pipe((0,p.Jh)(),b(3),(0,s.U)((([e,t,r])=>function(e,t,r){return(0,p.wm)(((e,t,r,n)=>Array.isArray(r)||Array.isArray(n)||null==r||null==n||r.value!==n.value?null:t),e,t,r)}(e,t,r))),e[2*r+2],(0,s.U)((e=>[{index:[r],type:p.u4.SET,value:e}])))))).pipe((0,p.Jh)())}function S(e,t){const r=e[0],[,n,i]=e,l=t.pipe((0,s.U)((e=>(0,p.a_)([e],p.JY))),(0,p.bS)([]),(0,o.d)({bufferSize:1,refCount:!0}));return(0,a.T)(l,l.pipe(c,r,(0,p.bS)([1]))).pipe((0,p.Jh)(),b(2),(0,p.Ud)([e=>e.pipe((0,s.U)((([e,t])=>h(e,t,!0))),n),e=>e.pipe((0,s.U)((([e,t])=>h(e,t,!1))),i)]))}function h(e,t,r){return(0,p.wm)(((e,t,n)=>Array.isArray(n)||null==n||n.value!==r?null:t),e,t)}const w=(0,s.U)((e=>(0,p.Au)(((e,t)=>Object.assign(Object.assign({},t),{terminated:!0})),e)));function O(e,t){return t.pipe((0,p.dF)((e=>{var t;const r=(0,p.L$)(e),o=e.reduce(((e,t)=>Object.assign(Object.assign({},e),t.parameters)),{}),[a,i]=e;return(null!==(t=a.parameters[i.value])&&void 0!==t?t:(0,n.of)(void 0)).pipe((0,s.U)((e=>({value:e,eventDepthMap:r,terminated:!1,parameters:o}))))}),(e=>e),e))}function v([e,t,r],n){return n}const x={"+":l(((e,t)=>e+t)),"-":l(((e,t)=>e-t)),"/":l(((e,t)=>e/t)),"*":l(((e,t)=>e*t)),"%":l(((e,t)=>e%t)),"!-":u((e=>-e)),"!":u((e=>!e)),"&&":l(((e,t)=>e&&t)),"||":l(((e,t)=>e||t)),"<":l(((e,t)=>e<t)),"<=":l(((e,t)=>e<=t)),"==":l(((e,t)=>e==t)),"!=":l(((e,t)=>e!=t)),if:e=>S.bind(null,e),switch:e=>d.bind(null,e),select:e=>f.bind(null,e),index:()=>m,return:()=>w,getVariable:e=>O.bind(null,[p.fT,...e]),setVariable:e=>v.bind(null,[p.fT,...e]),random:e=>t=>t.pipe((0,p.PM)(y,void 0,[...e]))}},5770:function(e,t,r){r.d(t,{u4:function(){return i},bS:function(){return z},Tr:function(){return G},Jh:function(){return N},a_:function(){return j},JY:function(){return M},Ii:function(){return te},Au:function(){return q},vj:function(){return V},PA:function(){return I},L$:function(){return X},Ud:function(){return P},wm:function(){return $},S9:function(){return A},dF:function(){return Q},PM:function(){return H},Qc:function(){return a},fX:function(){return _},fT:function(){return Y}});var n=r(7606),s=r(5454);const o=n.Grammar.fromCompiled(s.Z);function a(e){const t=new n.Parser(o);if(t.feed(e),0===t.results.length)throw new Error("unexpected end of input");return t.results[0]}var i,p=r(7506),l=r(3184),u=r(1556),m=r(3741),c=r(7340),y=r(598),f=r(2598),b=r(8167),d=r(892),S=r(5900),h=r(6728),w=r(4668),O=r(6431),v=r(4340),x=r(2384),g=r(1952);function _(e){return t=>t.pipe((0,p.v)(R,{connector:()=>new l.t(1)}),(0,u.z)((e=>e.pipe((0,m.w)((e=>e.type===i.UNSET?(0,c.of)(e):e.value.pipe((0,y.U)((t=>Object.assign(Object.assign({},e),{value:t}))))))))),J(e))}function A(e){return t=>{const r=new Map;return t.pipe(I(),(0,u.z)((t=>{const n=new Map;for(const s of t){const[t,o]=e(s.index),a=E(t);r.has(a)||r.set(a,t);let i=n.get(a);null==i&&(i={outer:t,changes:[]},n.set(a,i)),i.changes.push(Object.assign(Object.assign({},s),{index:o}))}return(0,c.of)(...Array.from(n.values()))})),(0,p.v)((({outer:e})=>E(e)),{connector:()=>new l.t(1/0,100)}),(0,y.U)((e=>{const t=r.get(e.key),n=e.pipe((0,f.R)(((e,{changes:t})=>C(e,t)),void 0));return{index:t,type:i.SET,value:n}})))}}function E(e){for(let t=e.length-1;t>=0;t--)if(0!==e[t])return e.slice(0,t+1).join(",");return""}function P(e){return t=>{if(0===e.length)return t.pipe((0,b.h)(void 0));const r=t.pipe((0,d.d)({refCount:!0,bufferSize:1}));return(0,S.T)(...e.map(((e,t)=>r.pipe(e,z([t]))))).pipe(N())}}function q(e,t){var r;return null!==(r=U(e,0,t))&&void 0!==r?r:void 0}function $(e,t,...r){var n;return null!==(n=U(e,0,t,...r))&&void 0!==n?n:void 0}function U(e,t,r,...n){if(Array.isArray(r)){const t=[];let s=0;for(let o=0;o<r.length;o++){const a=r[o],i=n.map((e=>Array.isArray(e)?e[o]:null)),p=U(e,o,a,...i);null!==p&&(void 0!==p&&++s,t.push(p))}return s>0?j(t,s):null}if(void 0!==r)return e(t,r,...n)}!function(e){e[e.SET=0]="SET",e[e.UNSET=1]="UNSET"}(i||(i={}));const T=[];function k(e,t,r=[]){if(null==t)return[{index:r,type:i.UNSET}];if(Array.isArray(t)){const n=Array.isArray(e)?e:T,s=Math.max(n.length,t.length);return new Array(s).fill(null).reduce(((e,s,o)=>[...e,...k(n[o],t[o],[...r,o])]),[])}return[{index:r,type:i.SET,value:t}]}function C(e,t){if(!Array.isArray(t))return B(e,t.index,t);for(const r of t)e=B(e,r.index,r);return e}function j(e,t){const r="number"===typeof t?t:e.reduce(((e,r)=>e+t(r)),0);return Object.assign(e,{size:r})}function M(e){return null==e?0:Array.isArray(e)?e.size:1}function B(e,t,r){if(0===t.length)return r.type===i.SET?r.value:void 0;const n=t[0],s=Array.isArray(e)?e:[],o=s[n],a=M(o),p=M(e),l=B(o,t.slice(1),r),u=p+M(l)-a;if(0===u)return;return j([...D(s.slice(0,n),n),l,...s.slice(n+1)],u)}function D(e,t){return e.length<t?e.concat(new Array(t-e.length)):e}function R(e){return E(e.index)}function I(){return e=>e.pipe((0,h.O)(void 0),(0,w.G)(),(0,y.U)((([e,t])=>k(e,t))))}function z(e){return(0,y.U)((t=>({index:e,type:i.SET,value:t})))}function N(){return(0,f.R)(((e,t)=>C(e,t)),void 0)}function G(){return e=>e.pipe((0,f.R)(((e,t)=>{let r;return Array.isArray(t)?r=t.map((t=>{const r=L(e[0],t.index,t,0);return e[0]=C(e[0],t),r})):(r=L(e[0],t.index,t,0),e[0]=C(e[0],t)),e[1]=r,e}),[void 0,[]]),(0,y.U)((([,e])=>e)))}function L(e,t,r,n){if(0===t.length||!Array.isArray(e))return Object.assign(Object.assign({},r),{deleteAmount:M(e),index:n});const s=t[0];for(let o=0;o<s;o++)n+=M(e[o]);return L(e[s],t.slice(1),r,n)}function J(e){return t=>{const r=new l.t(1);return t.pipe((0,O.b)((()=>r.next())),(0,v.f)(r.pipe((0,x.b)(e))),(0,g.x)((()=>r.complete())))}}function V(){return(0,y.U)(K)}function K(e){return Array.isArray(e)?e.reduce(((e,t)=>e.concat(K(t))),[]):null==e?[]:[e]}var F=r(8761);const W=new Map;function Y(e){return e}function Z(e){return[e.slice(1),[e[0]]]}function X(e){const t={};for(const r of e){const e=Object.entries(r.eventDepthMap);for(const r of e){const[e,n]=r;if(null==n)continue;const s=t[e];(null==s||n>s)&&(t[r[0]]=r[1])}}return t}function H(e,t,r,n=Z,s=0){return Q((t=>{const r=X(t),n=t.reduce(((e,t)=>Object.assign(Object.assign({},e),t.parameters)),{});return e(t.map((({value:e})=>e))).pipe((0,y.U)((e=>q(((e,t)=>({eventDepthMap:r,parameters:n,terminated:!1,value:t})),e))))}),null==t?void 0:e=>t(e.map((({value:e})=>e))),r,n,s)}function Q(e,t,r,n=Z,s=0){const o=null==t?t=>t.pipe((0,m.w)((t=>null==t?(0,c.of)(void 0):e(t)))):function(e,t){let r=W.get(t);null==r&&(r=[],W.set(t,r));const n=r;return r=>r.pipe((0,y.U)((r=>{if(null==r)return(0,c.of)(void 0);const s=e(r);let o=n.find((([e])=>function(e,t){if(e.length!=t.length)return!1;for(let r=0;r<e.length;r++)if(e[r]!=t[r])return!1;return!0}(e,s)));if(null==o){const e=t(r).pipe((0,d.d)({refCount:!1,bufferSize:1}));o=[s,e],n.push(o)}return o[1]})),(0,F.B)())}((e=>t(e)),(t=>null==t?(0,c.of)(void 0):e(t)));return e=>e.pipe(P(r),A(n),(0,y.U)((e=>Object.assign(Object.assign({},e),{value:e.value.pipe(V(),(0,y.U)((e=>r.length===e.length?e:void 0)),o)}))),_(s),N())}var ee=r(8482);function te(e,t){const r=Object.values(e);if(0===r.length)return e=>e;const n=new Map;return re(r[0],e,t,n)}function re(e,t,r,n){switch(e.type){case"operation":{const s=r[e.identifier];if(null==s)throw new Error(`unknown operation "${e.identifier}"`);return s(e.parameters.map((e=>re(e,t,r,n))))}case"parallel":return P(e.steps.map((e=>re(e,t,r,n))));case"raw":return t=>t.pipe((0,y.U)((t=>q(((t,r)=>Object.assign(Object.assign({},r),{value:e.value})),t))));case"sequential":return s=>{let o=s;const a=[];for(const i of e.steps){const e=o.pipe((0,d.d)({refCount:!0,bufferSize:1}));a.push(e.pipe(ne(!0))),o=e.pipe(ne(!1),re(i,t,r,n))}return(0,S.T)(...[o,...a].map(((e,t)=>e.pipe(z([t]))))).pipe(N())};case"this":return e=>e;case"symbol":{let s=n.get(e.identifier);if(null==s){const o=t[e.identifier];if(null==o)throw new Error(`unknown rule "${e.identifier}"`);s={ref:void 0},n.set(e.identifier,s),s.ref=re(o,t,r,n)}return e=>(0,ee.P)((()=>e.pipe(s.ref)))}}}function ne(e){return(0,y.U)((t=>q(((t,r)=>r.terminated===e?r:void 0),t)))}},5454:function(__unused_webpack_module,__webpack_exports__,__webpack_require__){var moo__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(985),moo__WEBPACK_IMPORTED_MODULE_0___default=__webpack_require__.n(moo__WEBPACK_IMPORTED_MODULE_0__);function id(e){return e[0]}const lexer=moo__WEBPACK_IMPORTED_MODULE_0___default().compile({returnSymbol:/return/,thisSymbol:/this/,ifSymbol:/if/,thenSymbol:/then/,elseSymbol:/else/,switchSymbol:/switch/,caseSymbol:/case/,arrow:/->/,openBracket:/\(/,closedBracket:/\)/,point:/\./,comma:/,/,colon:/:/,smallerEqual:/<=/,greaterEqual:/>=/,smaller:/</,greater:/>/,equal:/==/,unequal:/!=/,and:/&&/,or:/\|\|/,not:/!/,parallel:/\|/,int:/0[Xx][\da-fA-F]+|0[bB][01]+/,number:/-?\d+(?:\.\d+)?/,string:/"[^"]*"/,boolean:/true|false/,plus:/\+/,minus:/-/,multiply:/\*/,modulo:/%/,divide:/\//,identifier:/[a-zA-Z_$]+\w*/,ws:{match:/\s+/,lineBreaks:!0}}),grammar={Lexer:lexer,ParserRules:[{name:"GrammarDefinition",symbols:["ws","RuleDefinition","ws"],postprocess:([,[e,t]])=>({[e]:t})},{name:"GrammarDefinition",symbols:["ws","RuleDefinition",lexer.has("ws")?{type:"ws"}:ws,"GrammarDefinition"],postprocess:([,[e,t],,r])=>{if(e in r)throw new Error(`rule "${e}" is already defined`);return Object.assign({[e]:t},r)}},{name:"GrammarDefinition",symbols:["ws"],postprocess:()=>({})},{name:"RuleDefinition",symbols:[lexer.has("identifier")?{type:"identifier"}:identifier,"ws",lexer.has("arrow")?{type:"arrow"}:arrow,"ws","Steps"],postprocess:([{value:e},,,,t])=>[e,t]},{name:"Steps",symbols:["ParallelSteps"],postprocess:([e])=>e},{name:"EmptySteps",symbols:["ParallelSteps"],postprocess:([e])=>e},{name:"EmptySteps",symbols:[],postprocess:()=>({type:"raw",value:[]})},{name:"ParallelSteps$ebnf$1",symbols:["ParallelStep"]},{name:"ParallelSteps$ebnf$1",symbols:["ParallelSteps$ebnf$1","ParallelStep"],postprocess:e=>e[0].concat([e[1]])},{name:"ParallelSteps",symbols:["SequentialSteps","ParallelSteps$ebnf$1"],postprocess:([e,t])=>({type:"parallel",steps:[e,...t]})},{name:"ParallelSteps",symbols:["SequentialSteps"],postprocess:([e])=>e},{name:"ParallelStep",symbols:["ws",lexer.has("parallel")?{type:"parallel"}:parallel,"SequentialSteps"],postprocess:([,,e])=>e},{name:"SequentialSteps$ebnf$1",symbols:["SequentialStep"]},{name:"SequentialSteps$ebnf$1",symbols:["SequentialSteps$ebnf$1","SequentialStep"],postprocess:e=>e[0].concat([e[1]])},{name:"SequentialSteps",symbols:["PrimarySteps","SequentialSteps$ebnf$1"],postprocess:([e,t])=>({type:"sequential",steps:[e,...t]})},{name:"SequentialSteps",symbols:["PrimarySteps"],postprocess:([e])=>e},{name:"SequentialStep",symbols:[lexer.has("ws")?{type:"ws"}:ws,"PrimarySteps"],postprocess:([,e])=>e},{name:"PrimarySteps",symbols:["ws","BasicOperation"],postprocess:([,e])=>e},{name:"Step",symbols:["Operation"],postprocess:([e])=>e},{name:"Step",symbols:["Symbol"],postprocess:([e])=>e},{name:"Step",symbols:[lexer.has("thisSymbol")?{type:"thisSymbol"}:thisSymbol],postprocess:()=>({type:"this"})},{name:"Step",symbols:["GetVariable"],postprocess:([e])=>e},{name:"Step",symbols:["Constant"],postprocess:([e])=>({type:"raw",value:e})},{name:"Step",symbols:["ConditionalOperation"],postprocess:([e])=>e},{name:"Step",symbols:[lexer.has("returnSymbol")?{type:"returnSymbol"}:returnSymbol],postprocess:()=>({type:"operation",parameters:[],identifier:"return"})},{name:"Step",symbols:[lexer.has("openBracket")?{type:"openBracket"}:openBracket,"Steps","ws",lexer.has("closedBracket")?{type:"closedBracket"}:closedBracket],postprocess:([,e])=>e},{name:"Operation",symbols:[lexer.has("identifier")?{type:"identifier"}:identifier,lexer.has("openBracket")?{type:"openBracket"}:openBracket,"EmptyParameters","ws",lexer.has("closedBracket")?{type:"closedBracket"}:closedBracket],postprocess:([{value:e},,t])=>({type:"operation",parameters:t,identifier:e})},{name:"EmptyParameters",symbols:["Parameters"],postprocess:([e])=>e},{name:"EmptyParameters",symbols:[],postprocess:()=>[]},{name:"Parameters$ebnf$1",symbols:["Parameter"]},{name:"Parameters$ebnf$1",symbols:["Parameters$ebnf$1","Parameter"],postprocess:e=>e[0].concat([e[1]])},{name:"Parameters",symbols:["Steps","Parameters$ebnf$1"],postprocess:([e,t])=>[e,...t]},{name:"Parameters",symbols:["Steps"],postprocess:([e])=>[e]},{name:"Parameter",symbols:["ws",lexer.has("comma")?{type:"comma"}:comma,"Steps"],postprocess:([,,e])=>e},{name:"Symbol",symbols:[lexer.has("identifier")?{type:"identifier"}:identifier],postprocess:([{value:e}])=>({type:"symbol",identifier:e})},{name:"JS",symbols:[lexer.has("js")?{type:"js"}:js],postprocess:([{value:value}])=>eval(value.replace(/"([^"]+)"/,((e,t)=>t)))},{name:"ws",symbols:[lexer.has("ws")?{type:"ws"}:ws]},{name:"ws",symbols:[]},{name:"Constant",symbols:[lexer.has("boolean")?{type:"boolean"}:boolean],postprocess:([{value:e}])=>"true"===e},{name:"Constant",symbols:[lexer.has("string")?{type:"string"}:string],postprocess:([{value:e}])=>e.slice(1,-1)},{name:"Constant",symbols:[lexer.has("number")?{type:"number"}:number],postprocess:([{value:e}])=>Number.parseFloat(e)},{name:"Constant",symbols:[lexer.has("int")?{type:"int"}:int],postprocess:([{value:e}])=>Number.parseInt(e)},{name:"Variable",symbols:[lexer.has("thisSymbol")?{type:"thisSymbol"}:thisSymbol,lexer.has("point")?{type:"point"}:point,lexer.has("identifier")?{type:"identifier"}:identifier],postprocess:([,,e])=>({type:"raw",value:e})},{name:"GetVariable",symbols:["Variable"],postprocess:([e])=>({type:"operation",parameters:[e],identifier:"getVariable"})},{name:"SetVariable",symbols:["Variable","ws",lexer.has("equal")?{type:"equal"}:equal,"ws","Step"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"setVariable"})},{name:"ConditionalOperation",symbols:["IfThenElseOperation"],postprocess:([e])=>e},{name:"ConditionalOperation",symbols:["SwitchOperation"],postprocess:([e])=>e},{name:"IfThenElseOperation",symbols:[lexer.has("ifSymbol")?{type:"ifSymbol"}:ifSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step",lexer.has("ws")?{type:"ws"}:ws,lexer.has("thenSymbol")?{type:"thenSymbol"}:thenSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step",lexer.has("ws")?{type:"ws"}:ws,lexer.has("elseSymbol")?{type:"elseSymbol"}:elseSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step"],postprocess:([,,e,,,,t,,,,r])=>({type:"operation",parameters:[e,t,r],identifier:"if"})},{name:"SwitchOperation$ebnf$1",symbols:["SwitchCase"]},{name:"SwitchOperation$ebnf$1",symbols:["SwitchOperation$ebnf$1","SwitchCase"],postprocess:e=>e[0].concat([e[1]])},{name:"SwitchOperation",symbols:[lexer.has("switchSymbol")?{type:"switchSymbol"}:switchSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step","SwitchOperation$ebnf$1"],postprocess:([,,e,t])=>({type:"operation",parameters:[e,...t.reduce(((e,t)=>e.concat(t)))],identifier:"switch"})},{name:"SwitchCase",symbols:[lexer.has("ws")?{type:"ws"}:ws,lexer.has("caseSymbol")?{type:"caseSymbol"}:caseSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step",lexer.has("colon")?{type:"colon"}:colon,"ws","Step"],postprocess:([,,,e,,,t])=>[e,t]},{name:"BasicOperation",symbols:["BooleanOperation"],postprocess:([e])=>e},{name:"BooleanOperation",symbols:["OrOperation"],postprocess:([e])=>e},{name:"OrOperation",symbols:["OrOperation","ws",lexer.has("or")?{type:"or"}:or,"ws","AndOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"||"})},{name:"OrOperation",symbols:["AndOperation"],postprocess:([e])=>e},{name:"AndOperation",symbols:["AndOperation","ws",lexer.has("and")?{type:"and"}:and,"ws","NegateOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"&&"})},{name:"AndOperation",symbols:["NegateOperation"],postprocess:([e])=>e},{name:"NegateOperation",symbols:[lexer.has("not")?{type:"not"}:not,"ws","NegateOperation"],postprocess:([,,e])=>({type:"operation",parameters:[e],identifier:"!"})},{name:"NegateOperation",symbols:["ComparisonOperation"],postprocess:([e])=>e},{name:"ComparisonOperation",symbols:["EquityOperation"],postprocess:([e])=>e},{name:"EquityOperation",symbols:["EqualOperation"],postprocess:([e])=>e},{name:"EquityOperation",symbols:["UnequalOperation"],postprocess:([e])=>e},{name:"EquityOperation",symbols:["RelationalOperation"],postprocess:([e])=>e},{name:"EqualOperation",symbols:["EquityOperation","ws",lexer.has("equal")?{type:"equal"}:equal,"ws","RelationalOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"=="})},{name:"UnequalOperation",symbols:["EquityOperation","ws",lexer.has("unequal")?{type:"unequal"}:unequal,"ws","RelationalOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"!="})},{name:"RelationalOperation",symbols:["SmallerOperation"],postprocess:([e])=>e},{name:"RelationalOperation",symbols:["SmallerEqualOperation"],postprocess:([e])=>e},{name:"RelationalOperation",symbols:["GreaterOperation"],postprocess:([e])=>e},{name:"RelationalOperation",symbols:["GreaterEqualOperation"],postprocess:([e])=>e},{name:"RelationalOperation",symbols:["ArithmeticOperation"],postprocess:([e])=>e},{name:"SmallerOperation",symbols:["RelationalOperation","ws",lexer.has("smaller")?{type:"smaller"}:smaller,"ws","ArithmeticOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"<"})},{name:"SmallerEqualOperation",symbols:["RelationalOperation","ws",lexer.has("smallerEqual")?{type:"smallerEqual"}:smallerEqual,"ws","ArithmeticOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"<="})},{name:"GreaterOperation",symbols:["RelationalOperation","ws",lexer.has("greater")?{type:"greater"}:greater,"ws","ArithmeticOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[t,e],identifier:"<"})},{name:"GreaterEqualOperation",symbols:["RelationalOperation","ws",lexer.has("greaterEqual")?{type:"greaterEqual"}:greaterEqual,"ws","ArithmeticOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[t,e],identifier:"<="})},{name:"ArithmeticOperation",symbols:["LineOperation"],postprocess:([e])=>e},{name:"LineOperation",symbols:["AddOperation"],postprocess:([e])=>e},{name:"LineOperation",symbols:["SubtractOperation"],postprocess:([e])=>e},{name:"LineOperation",symbols:["PointOperation"],postprocess:([e])=>e},{name:"AddOperation",symbols:["LineOperation","ws",lexer.has("plus")?{type:"plus"}:plus,"ws","PointOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"+"})},{name:"SubtractOperation",symbols:["LineOperation","ws",lexer.has("minus")?{type:"minus"}:minus,"ws","PointOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"-"})},{name:"PointOperation",symbols:["MultiplyOperation"],postprocess:([e])=>e},{name:"PointOperation",symbols:["DivideOperation"],postprocess:([e])=>e},{name:"PointOperation",symbols:["ModuloOperation"],postprocess:([e])=>e},{name:"PointOperation",symbols:["InvertOperation"],postprocess:([e])=>e},{name:"DivideOperation",symbols:["PointOperation","ws",lexer.has("divide")?{type:"divide"}:divide,"ws","InvertOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"/"})},{name:"MultiplyOperation",symbols:["PointOperation","ws",lexer.has("multiply")?{type:"multiply"}:multiply,"ws","InvertOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"*"})},{name:"ModuloOperation",symbols:["PointOperation","ws",lexer.has("modulo")?{type:"modulo"}:modulo,"ws","InvertOperation"],postprocess:([e,,,,t])=>({type:"operation",parameters:[e,t],identifier:"%"})},{name:"InvertOperation",symbols:[lexer.has("minus")?{type:"minus"}:minus,"ws","InvertOperation"],postprocess:([,,e])=>({type:"operation",parameters:[e],identifier:"!-"})},{name:"InvertOperation",symbols:["Step"],postprocess:([e])=>e}],ParserStart:"GrammarDefinition"};__webpack_exports__.Z=grammar},3579:function(e,t,r){r.d(t,{H:function(){return s}});var n=r(5893);function s(e){var t=e.text,r=e.setText;return(0,n.jsx)("textarea",{style:{resize:"none",outline:0,tabSize:4},value:t,onKeyDown:o,spellCheck:!1,onChange:function(e){return r(e.target.value)},className:"overflow-auto p-3 flex-basis-0 h3 mb-0 text-light border-0 bg-dark flex-grow-1"})}function o(e){if("Tab"===e.code){e.preventDefault();var t=e.currentTarget.value,r=e.currentTarget.selectionStart,n=e.currentTarget.selectionEnd;return e.currentTarget.value=t.substring(0,r)+"\t"+t.substring(n),e.currentTarget.selectionStart=e.currentTarget.selectionEnd=r+1,!1}}}}]);