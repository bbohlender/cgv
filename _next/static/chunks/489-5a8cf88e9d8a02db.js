"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[489],{7032:function(e,t,r){r.d(t,{w:function(){return n}});var s=r(7340);const n={index:{execute:e=>{var t;const r=null!==(t=e.index[e.index.length-1])&&void 0!==t?t:0;return(0,s.of)([Object.assign(Object.assign({},e),{raw:r})])},includeThis:!1},select:{execute:e=>{var t;const r=null!==(t=e.index[e.index.length-1])&&void 0!==t?t:0,[n,a,o]=e.raw;return(0,s.of)(a<=r&&(null==o||r<o)?[Object.assign(Object.assign({},e),{raw:n})]:[])},includeThis:!0},random:{execute:(0,r(6195).QV)(((e,t)=>(0,s.of)([e+(t-e)*Math.random()]))),includeThis:!1}}},6260:function(e,t,r){r.d(t,{Ii:function(){return c.Ii},Qc:function(){return o},qC:function(){return i},QV:function(){return c.QV},qo:function(){return c.qo},Tn:function(){return c.Tn}});var s=r(7606),n=r(5454);const a=s.Grammar.fromCompiled(n.Z);function o(e){const t=new s.Parser(a);if(t.feed(e),0===t.results.length)throw new Error("unexpected end of input");return t.results[0]}new Map([["parallel"],["sequential"],["or"],["and"],["not"],["equal","unequal"],["smaller","smallerEqual","greater","greaterEqual"],["add","subtract"],["multiply","divide","modulo"],["invert"],["bracket","getVariable","setVariable","if","switch","symbol","operation","this","raw","return"]].reduce(((e,t,r)=>(t.forEach((t=>e.push([t,r]))),e)),[]));function i(e){return Object.entries(e).map((([e,t])=>`${e} -> ${l(t)}`)).join("\n")}function l(e){switch(e.type){case"operation":return`${(r=e).identifier}(${r.children.map((e=>l(e))).join(", ")})`;case"parallel":return e.children.map(l).join(" | ");case"raw":return p(e.value);case"sequential":return e.children.map(l).join(" ");case"symbol":return e.identifier;case"this":return"this";case"bracket":return function(e){return`(${l(e.children[0])})`}(e);case"invert":case"not":return function(e){const t=l(e.children[0]);switch(e.type){case"invert":return`-${t}`;case"not":return`!${t}`}}(e);case"add":case"and":case"divide":case"equal":case"greater":case"greaterEqual":case"modulo":case"multiply":case"or":case"smaller":case"smallerEqual":case"subtract":case"unequal":return function(e){const t=l(e.children[0]),r=l(e.children[1]);switch(e.type){case"add":return`${t} + ${r}`;case"and":return`${t} && ${r}`;case"divide":return`${t} / ${r}`;case"equal":return`${t} == ${r}`;case"greater":return`${t} > ${r}`;case"greaterEqual":return`${t} >= ${r}`;case"modulo":return`${t} % ${r}`;case"multiply":return`${t} * ${r}`;case"or":return`${t} || ${r}`;case"smaller":return`${t} < ${r}`;case"smallerEqual":return`${t} <= ${r}`;case"subtract":return`${t} - ${r}`;case"unequal":return`${t} != ${r}`}}(e);case"if":return function(e){return`if ${l(e.children[0])} then ${l(e.children[1])} else ${l(e.children[2])}`}(e);case"switch":return function(e){return`switch ${l(e.children[0])} ${e.cases.map(((t,r)=>`case ${p(t)}: ${l(e.children[r+1])}`)).join(" ")}`}(e);case"getVariable":return`this.${e.identifier}`;case"setVariable":return`this.${(t=e).identifier} = ${l(t.children[0])}`;case"return":return"return";case"random":return function(e){if(e.children.length!=e.probabilities.length)throw new Error("random step must have the same amount of childrens as the amount of probabilities");return`{ ${e.children.map(((t,r)=>`${function(e,t){const r=Math.pow(10,t);return(Math.round(e*r)/r).toString()}(100*e.probabilities[r],2)}%: ${l(t)}`)).join(" ")} }`}(e)}var t,r}function p(e){const t=typeof e;switch(t){case"string":return`"${e}"`;case"number":case"boolean":return e.toString();default:throw new Error(`constant "${e}" of unknown type "${t}"`)}}var c=r(6195)},6195:function(e,t,r){r.d(t,{u4:function(){return s},Ht:function(){return E},JY:function(){return _},Ii:function(){return C},QV:function(){return P},qo:function(){return I},M1:function(){return g},Tn:function(){return D}});var s,n=r(598),a=r(3184),o=r(5900),i=r(1026),l=r(6621),p=r(5491),c=r(4534),u=r(1556),m=r(7340),b=r(7506),y=r(5314),d=r(6431),h=r(5954),f=r(2598),w=r(4340),O=r(2384),S=r(1952),x=r(6562),v=r(8167);function g(e,t,r,i){return l=>{return l.pipe((e=>e.pipe((0,u.z)((e=>e.invalid.value?x.C:(0,o.T)((0,m.of)({index:e.index,type:s.SET,value:e}),e.invalid.observable.pipe((0,h.q)(1),(0,v.h)({index:e.index,type:s.UNSET}))))))),(p=0,e=>{const t=new a.t(1);return e.pipe((0,d.b)((()=>t.next())),(0,w.f)(t.pipe((0,O.b)(p))),(0,S.x)((()=>t.complete())))}),(0,f.R)((([e,s,n],a)=>{for(const o of a)e=$(e,s,n,o,t,r,i),n=E(n,o);return[e,s,n]}),[e(),[],void 0]),(0,n.U)((([e])=>e)));var p}}function $(e,t,r,n,a,o,i){const l=null==a?e:a(e),p=q(r,n.index),c=t[p];return null!=t[p]&&function(e,t){const r=Math.min(e.length,t.length);for(let s=0;s<r;s++)if(e[s]!=t[s])return!1;return!0}(c,n.index)&&(i(l,p),t.splice(p,1)),n.type===s.SET&&(o(l,n.value,p),t.splice(p,0,n.index)),l}function q(e,t){if(0===t.length)return 0;if(!Array.isArray(e))return 0;const r=t[0];let s=0;for(let n=0;n<r;n++)s+=_(e[n]);return s+q(e[r],t.slice(1))}function E(e,t,r=t.index){if(0===r.length)return t.type===s.SET?t.value:void 0;const n=r[0],a=Array.isArray(e)?e:[],o=E(a[n],t,r.slice(1)),i=[],l=Math.max(a.length,n+1);let p=0,c=0;for(let s=0;s<l;s++){const e=s===n?o:a[s];i[s]=e,void 0!==e&&(p+=_(e),c=s+1)}return 0!==p?(i.splice(c),Object.assign(i,{size:p})):void 0}function _(e){return null==e?0:Array.isArray(e)&&"size"in e?e.size:1}function P(e){return t=>e(...t.raw).pipe((0,n.U)((e=>0===e.length?[Object.assign(Object.assign({},t),{raw:e[0]})]:e.map(((e,r)=>Object.assign(Object.assign({},t),{raw:e,index:[...t.index,r]}))))))}function k(e){for(const t of e)if(t.value)return!0;return!1}function j(...e){return{observable:(0,o.T)(...e.map((({observable:e})=>e))).pipe((0,i.d)({refCount:!0,bufferSize:1})),value:k(e)}}function C(e,t,r,s=100){const n=Object.entries(e);if(0===n.length)return e=>e;const[a]=n[0],o={},i={grammar:e,compiledGrammar:o,operations:t,delay:r,maxSymbolDepth:s};for(const[l,p]of n)o[l]=B(p,i,(e=>e));return o[a]}function B(e,t,r){try{const s=function(e,t,r){switch(e.type){case"operation":return function(e,t,r){const s=e.children,n=t.operations[e.identifier];if(null==n)throw new Error(`unknown operation "${e.identifier}"`);const a=s.map((e=>B(e,t,(e=>e))));n.includeThis&&a.unshift((e=>e));return e=>e.pipe(M(...a),(0,u.z)((e=>n.execute(e).pipe((0,u.z)((e=>(0,o.T)(...e.map((e=>(0,m.of)(e).pipe(r))))))))))}(e,t,r);case"parallel":return function(e,t,r){return U(...e.children.map((e=>B(e,t,r))))}(e,t,r);case"raw":return function(e,t){return r=>r.pipe((0,n.U)((t=>Object.assign(Object.assign({},t),{raw:e.value}))),t)}(e,r);case"sequential":return function(e,t,r){return A(0,e.children,t,r)}(e,t,r);case"symbol":return function(e,t,r){if(!(e.identifier in t.grammar))throw new Error(`unknown symbol "${e.identifier}"`);return s=>{const a=s.pipe((0,i.d)({refCount:!0,bufferSize:1}));return a.pipe((0,h.q)(1),(0,u.z)((()=>a.pipe((0,n.U)((r=>{var s;const n=null!==(s=r.symbolDepth[e.identifier])&&void 0!==s?s:0;if(n>=t.maxSymbolDepth)throw new Error(`maximum symbol depth (${t.maxSymbolDepth}) reached for symbol "${e.identifier}"`);return Object.assign(Object.assign({},r),{symbolDepth:Object.assign(Object.assign({},r.symbolDepth),{[e.identifier]:n+1})})})),t.compiledGrammar[e.identifier],r))))}}(e,t,r);case"this":return r;case"bracket":return function(e,t,r){return B(e.children[0],t,r)}(e,t,r);case"invert":case"not":return function(e,t,r){const s=B(e.children[0],t,(e=>e));return t=>t.pipe(s,(0,n.U)((t=>Object.assign(Object.assign({},t),{raw:R[e.type](t.raw)}))),r)}(e,t,r);case"add":case"and":case"divide":case"equal":case"greater":case"greaterEqual":case"modulo":case"multiply":case"or":case"smaller":case"smallerEqual":case"subtract":case"unequal":return function(e,t,r){const s=e.children.map((e=>B(e,t,(e=>e))));return t=>t.pipe(M(...s),(0,n.U)((t=>Object.assign(Object.assign({},t),{raw:T[e.type](t.raw[0],t.raw[1])}))),r)}(e,t,r);case"if":return function(e,t,r){const s=B(e.children[0],t,(e=>e)),[a,o]=e.children.slice(1).map((e=>B(e,t,r)));return e=>e.pipe(M((e=>e),s),(0,b.v)((({raw:[,e]})=>e)),(0,u.z)((e=>e.pipe((0,n.U)((e=>Object.assign(Object.assign({},e),{raw:e.raw[0]}))),e.key?a:o))))}(e,t,r);case"switch":return function(e,t,r){const s=B(e.children[0],t,(e=>e)),a=e.children.slice(1).map((e=>B(e,t,r)));return t=>t.pipe(M((e=>e),s),(0,b.v)((({raw:[,e]})=>e)),(0,u.z)((t=>{const r=e.cases.findIndex((e=>e===t.key));return-1===r?y.E:t.pipe((0,n.U)((e=>Object.assign(Object.assign({},e),{raw:e.raw[0]}))),a[r])})))}(e,t,r);case"getVariable":return function(e,t){return(0,u.z)((r=>{var s;return(null!==(s=r.variables[e.identifier])&&void 0!==s?s:(0,m.of)(void 0)).pipe(D(r.invalid,r.index,r.variables),t)}))}(e,r);case"setVariable":return function(e,t,r){const s=B(e.children[0],t,(e=>e));return t=>{const a=t.pipe((0,i.d)({refCount:!0})),o=a.pipe(s);return a.pipe((0,n.U)((t=>Object.assign(Object.assign({},t),{variables:Object.assign(Object.assign({},t.variables),{[e.identifier]:o})}))),r)}}(e,t,r);case"return":return e=>e;case"random":return function(e,t,r){const s=e.children.map((e=>B(e,t,r)));return t=>t.pipe((0,b.v)((()=>{const t=Math.random();let r=0;for(let s=0;s<e.probabilities.length;s++)if(r+=e.probabilities[s],t<=r)return s;return e.probabilities.length-1})),(0,u.z)((e=>e.pipe(s[e.key]))))}(e,t,r)}}(e,t,r),a=(0,l.h)((({invalid:e})=>!e.value)),c=t.delay;return null==c?e=>e.pipe(s,a):e=>e.pipe(s,a,(0,p.g)(c))}catch(s){return()=>(0,c._)((()=>s))}}!function(e){e[e.SET=0]="SET",e[e.UNSET=1]="UNSET"}(s||(s={}));const R={invert:e=>-e,not:e=>!e};const T={add:(e,t)=>e+t,and:(e,t)=>e&&t,divide:(e,t)=>e/t,equal:(e,t)=>e==t,greater:(e,t)=>e>t,greaterEqual:(e,t)=>e>=t,modulo:(e,t)=>e%t,multiply:(e,t)=>e*t,or:(e,t)=>e||t,smaller:(e,t)=>e<t,smallerEqual:(e,t)=>e<=t,subtract:(e,t)=>e-t,unequal:(e,t)=>e!=t};function D(e,t=[],r={}){return s=>{let o;return s.pipe((0,n.U)((s=>(null!=o&&o.invalidate(),o=function(){const e=new a.t(1),t={invalidate:()=>{t.value=!0,e.next()},complete:()=>e.complete(),observable:e,value:!1};return t}(),{raw:s,index:t,invalid:null==e?o:j(o,e),variables:r,symbolDepth:{}}))),(0,d.b)({complete:()=>null===o||void 0===o?void 0:o.complete()}))}}function A(e,t,r,s){return e>=t.length?s:B(t[e],r,A(e+1,t,r,s))}function U(...e){return t=>{const r=t.pipe((0,i.d)({refCount:!0}));return(0,o.T)(...e.map(((e,t)=>r.pipe(e,(0,n.U)((e=>Object.assign(Object.assign({},e),{index:[t,...e.index]})))))))}}function M(...e){return t=>t.pipe(U((e=>e),...e),I(),(0,l.h)((t=>t.length===e.length+1)),(0,n.U)((e=>{const[t,...r]=e;return{variables:t.variables,index:t.index.slice(1),invalid:j(...e.map((({invalid:e})=>e))),raw:r.map((({raw:e})=>e)),symbolDepth:t.symbolDepth}})))}function I(){return g((()=>[]),(e=>[...e]),((e,t,r)=>e.splice(r,0,t)),((e,t)=>e.splice(t,1)))}},5454:function(__unused_webpack_module,__webpack_exports__,__webpack_require__){var moo__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(985),moo__WEBPACK_IMPORTED_MODULE_0___default=__webpack_require__.n(moo__WEBPACK_IMPORTED_MODULE_0__);function id(e){return e[0]}const lexer=moo__WEBPACK_IMPORTED_MODULE_0___default().compile({returnSymbol:/return/,thisSymbol:/this/,ifSymbol:/if/,thenSymbol:/then/,elseSymbol:/else/,switchSymbol:/switch/,caseSymbol:/case/,arrow:/->/,openBracket:/\(/,closedBracket:/\)/,openCurlyBracket:/{/,closedCurlyBracket:/}/,point:/\./,comma:/,/,colon:/:/,smallerEqual:/<=/,greaterEqual:/>=/,smaller:/</,greater:/>/,doubleEqual:/==/,equal:/=/,unequal:/!=/,and:/&&/,or:/\|\|/,not:/!/,parallel:/\|/,int:/0[Xx][\da-fA-F]+|0[bB][01]+/,number:/-?\d+(?:\.\d+)?/,string:/"[^"]*"/,boolean:/true|false/,plus:/\+/,minus:/-/,multiply:/\*/,percent:/%/,divide:/\//,identifier:/[a-zA-Z_$]+\w*/,ws:{match:/\s+/,lineBreaks:!0}}),grammar={Lexer:lexer,ParserRules:[{name:"GrammarDefinition",symbols:["ws","RuleDefinition","ws"],postprocess:([,[e,t]])=>({[e]:t})},{name:"GrammarDefinition",symbols:["ws","RuleDefinition",lexer.has("ws")?{type:"ws"}:ws,"GrammarDefinition"],postprocess:([,[e,t],,r])=>{if(e in r)throw new Error(`rule "${e}" is already defined`);return Object.assign({[e]:t},r)}},{name:"GrammarDefinition",symbols:["ws"],postprocess:()=>({})},{name:"RuleDefinition",symbols:[lexer.has("identifier")?{type:"identifier"}:identifier,"ws",lexer.has("arrow")?{type:"arrow"}:arrow,"ws","Steps"],postprocess:([{value:e},,,,t])=>[e,t]},{name:"Steps",symbols:["ParallelSteps"],postprocess:([e])=>e},{name:"ParallelSteps$ebnf$1",symbols:["ParallelStep"]},{name:"ParallelSteps$ebnf$1",symbols:["ParallelSteps$ebnf$1","ParallelStep"],postprocess:e=>e[0].concat([e[1]])},{name:"ParallelSteps",symbols:["SequentialSteps","ParallelSteps$ebnf$1"],postprocess:([e,t])=>({type:"parallel",children:[e,...t]})},{name:"ParallelSteps",symbols:["SequentialSteps"],postprocess:([e])=>e},{name:"ParallelStep",symbols:["ws",lexer.has("parallel")?{type:"parallel"}:parallel,"SequentialSteps"],postprocess:([,,e])=>e},{name:"SequentialSteps$ebnf$1",symbols:["SequentialStep"]},{name:"SequentialSteps$ebnf$1",symbols:["SequentialSteps$ebnf$1","SequentialStep"],postprocess:e=>e[0].concat([e[1]])},{name:"SequentialSteps",symbols:["PrimarySteps","SequentialSteps$ebnf$1"],postprocess:([e,t])=>({type:"sequential",children:[e,...t]})},{name:"SequentialSteps",symbols:["PrimarySteps"],postprocess:([e])=>e},{name:"SequentialStep",symbols:[lexer.has("ws")?{type:"ws"}:ws,"PrimarySteps"],postprocess:([,e])=>e},{name:"PrimarySteps",symbols:["ws","BasicOperation"],postprocess:([,e])=>e},{name:"BasicOperation",symbols:["BooleanOperation"],postprocess:([e])=>e},{name:"BooleanOperation",symbols:["OrOperation"],postprocess:([e])=>e},{name:"OrOperation",symbols:["OrOperation","ws",lexer.has("or")?{type:"or"}:or,"ws","AndOperation"],postprocess:([e,,,,t])=>({type:"or",children:[e,t]})},{name:"OrOperation",symbols:["AndOperation"],postprocess:([e])=>e},{name:"AndOperation",symbols:["AndOperation","ws",lexer.has("and")?{type:"and"}:and,"ws","NegateOperation"],postprocess:([e,,,,t])=>({type:"and",children:[e,t]})},{name:"AndOperation",symbols:["NegateOperation"],postprocess:([e])=>e},{name:"NegateOperation",symbols:[lexer.has("not")?{type:"not"}:not,"ws","NegateOperation"],postprocess:([,,e])=>({type:"not",children:[e]})},{name:"NegateOperation",symbols:["ComparisonOperation"],postprocess:([e])=>e},{name:"ComparisonOperation",symbols:["EquityOperation"],postprocess:([e])=>e},{name:"EquityOperation",symbols:["EqualOperation"],postprocess:([e])=>e},{name:"EquityOperation",symbols:["UnequalOperation"],postprocess:([e])=>e},{name:"EquityOperation",symbols:["RelationalOperation"],postprocess:([e])=>e},{name:"EqualOperation",symbols:["EquityOperation","ws",lexer.has("doubleEqual")?{type:"doubleEqual"}:doubleEqual,"ws","RelationalOperation"],postprocess:([e,,,,t])=>({type:"equal",children:[e,t]})},{name:"UnequalOperation",symbols:["EquityOperation","ws",lexer.has("unequal")?{type:"unequal"}:unequal,"ws","RelationalOperation"],postprocess:([e,,,,t])=>({type:"unequal",children:[e,t]})},{name:"RelationalOperation",symbols:["SmallerOperation"],postprocess:([e])=>e},{name:"RelationalOperation",symbols:["SmallerEqualOperation"],postprocess:([e])=>e},{name:"RelationalOperation",symbols:["GreaterOperation"],postprocess:([e])=>e},{name:"RelationalOperation",symbols:["GreaterEqualOperation"],postprocess:([e])=>e},{name:"RelationalOperation",symbols:["ArithmeticOperation"],postprocess:([e])=>e},{name:"SmallerOperation",symbols:["RelationalOperation","ws",lexer.has("smaller")?{type:"smaller"}:smaller,"ws","ArithmeticOperation"],postprocess:([e,,,,t])=>({type:"smaller",children:[e,t]})},{name:"SmallerEqualOperation",symbols:["RelationalOperation","ws",lexer.has("smallerEqual")?{type:"smallerEqual"}:smallerEqual,"ws","ArithmeticOperation"],postprocess:([e,,,,t])=>({type:"smallerEqual",children:[e,t]})},{name:"GreaterOperation",symbols:["RelationalOperation","ws",lexer.has("greater")?{type:"greater"}:greater,"ws","ArithmeticOperation"],postprocess:([e,,,,t])=>({type:"greater",children:[e,t]})},{name:"GreaterEqualOperation",symbols:["RelationalOperation","ws",lexer.has("greaterEqual")?{type:"greaterEqual"}:greaterEqual,"ws","ArithmeticOperation"],postprocess:([e,,,,t])=>({type:"greaterEqual",children:[e,t]})},{name:"ArithmeticOperation",symbols:["LineOperation"],postprocess:([e])=>e},{name:"LineOperation",symbols:["AddOperation"],postprocess:([e])=>e},{name:"LineOperation",symbols:["SubtractOperation"],postprocess:([e])=>e},{name:"LineOperation",symbols:["PointOperation"],postprocess:([e])=>e},{name:"AddOperation",symbols:["LineOperation","ws",lexer.has("plus")?{type:"plus"}:plus,"ws","PointOperation"],postprocess:([e,,,,t])=>({type:"add",children:[e,t]})},{name:"SubtractOperation",symbols:["LineOperation","ws",lexer.has("minus")?{type:"minus"}:minus,"ws","PointOperation"],postprocess:([e,,,,t])=>({type:"subtract",children:[e,t]})},{name:"PointOperation",symbols:["MultiplyOperation"],postprocess:([e])=>e},{name:"PointOperation",symbols:["DivideOperation"],postprocess:([e])=>e},{name:"PointOperation",symbols:["ModuloOperation"],postprocess:([e])=>e},{name:"PointOperation",symbols:["InvertOperation"],postprocess:([e])=>e},{name:"DivideOperation",symbols:["PointOperation","ws",lexer.has("divide")?{type:"divide"}:divide,"ws","InvertOperation"],postprocess:([e,,,,t])=>({type:"divide",children:[e,t]})},{name:"MultiplyOperation",symbols:["PointOperation","ws",lexer.has("multiply")?{type:"multiply"}:multiply,"ws","InvertOperation"],postprocess:([e,,,,t])=>({type:"multiply",children:[e,t]})},{name:"ModuloOperation",symbols:["PointOperation","ws",lexer.has("percent")?{type:"percent"}:percent,"ws","InvertOperation"],postprocess:([e,,,,t])=>({type:"modulo",children:[e,t]})},{name:"InvertOperation",symbols:[lexer.has("minus")?{type:"minus"}:minus,"ws","InvertOperation"],postprocess:([,,e])=>({type:"invert",children:[e]})},{name:"InvertOperation",symbols:["Step"],postprocess:([e])=>e},{name:"Step",symbols:["Operation"],postprocess:([e])=>e},{name:"Step",symbols:["Symbol"],postprocess:([e])=>e},{name:"Step",symbols:[lexer.has("thisSymbol")?{type:"thisSymbol"}:thisSymbol],postprocess:()=>({type:"this"})},{name:"Step",symbols:["GetVariable"],postprocess:([e])=>e},{name:"Step",symbols:["SetVariable"],postprocess:([e])=>e},{name:"Step",symbols:["Constant"],postprocess:([e])=>({type:"raw",value:e})},{name:"Step",symbols:["ConditionalOperation"],postprocess:([e])=>e},{name:"Step",symbols:[lexer.has("returnSymbol")?{type:"returnSymbol"}:returnSymbol],postprocess:()=>({type:"return"})},{name:"Step",symbols:[lexer.has("openBracket")?{type:"openBracket"}:openBracket,"Steps","ws",lexer.has("closedBracket")?{type:"closedBracket"}:closedBracket],postprocess:([,e])=>({type:"bracket",children:[e]})},{name:"Step",symbols:["RandomSteps"],postprocess:([e])=>e},{name:"RandomSteps$ebnf$1",symbols:["RandomStep"]},{name:"RandomSteps$ebnf$1",symbols:["RandomSteps$ebnf$1","RandomStep"],postprocess:e=>e[0].concat([e[1]])},{name:"RandomSteps",symbols:[lexer.has("openCurlyBracket")?{type:"openCurlyBracket"}:openCurlyBracket,"RandomSteps$ebnf$1","ws",lexer.has("closedCurlyBracket")?{type:"closedCurlyBracket"}:closedCurlyBracket],postprocess:([,e])=>({type:"random",probabilities:e.map((({probability:e})=>e)),children:e.map((({steps:e})=>e))})},{name:"RandomStep",symbols:["ws",lexer.has("number")?{type:"number"}:number,lexer.has("percent")?{type:"percent"}:percent,"ws",lexer.has("colon")?{type:"colon"}:colon,"ws","Steps"],postprocess:([,{value:e},,,,,t])=>({probability:Number.parseFloat(e)/100,steps:t})},{name:"Operation",symbols:[lexer.has("identifier")?{type:"identifier"}:identifier,lexer.has("openBracket")?{type:"openBracket"}:openBracket,"EmptyParameters","ws",lexer.has("closedBracket")?{type:"closedBracket"}:closedBracket],postprocess:([{value:e},,t])=>({type:"operation",children:t,identifier:e})},{name:"EmptyParameters",symbols:["Parameters"],postprocess:([e])=>e},{name:"EmptyParameters",symbols:[],postprocess:()=>[]},{name:"Parameters$ebnf$1",symbols:["Parameter"]},{name:"Parameters$ebnf$1",symbols:["Parameters$ebnf$1","Parameter"],postprocess:e=>e[0].concat([e[1]])},{name:"Parameters",symbols:["Steps","Parameters$ebnf$1"],postprocess:([e,t])=>[e,...t]},{name:"Parameters",symbols:["Steps"],postprocess:([e])=>[e]},{name:"Parameter",symbols:["ws",lexer.has("comma")?{type:"comma"}:comma,"Steps"],postprocess:([,,e])=>e},{name:"Symbol",symbols:[lexer.has("identifier")?{type:"identifier"}:identifier],postprocess:([{value:e}])=>({type:"symbol",identifier:e})},{name:"JS",symbols:[lexer.has("js")?{type:"js"}:js],postprocess:([{value:value}])=>eval(value.replace(/"([^"]+)"/,((e,t)=>t)))},{name:"ws",symbols:[lexer.has("ws")?{type:"ws"}:ws]},{name:"ws",symbols:[]},{name:"Constant",symbols:[lexer.has("boolean")?{type:"boolean"}:boolean],postprocess:([{value:e}])=>"true"===e},{name:"Constant",symbols:[lexer.has("string")?{type:"string"}:string],postprocess:([{value:e}])=>e.slice(1,-1)},{name:"Constant",symbols:[lexer.has("number")?{type:"number"}:number],postprocess:([{value:e}])=>Number.parseFloat(e)},{name:"Constant",symbols:[lexer.has("int")?{type:"int"}:int],postprocess:([{value:e}])=>Number.parseInt(e)},{name:"GetVariable",symbols:[lexer.has("thisSymbol")?{type:"thisSymbol"}:thisSymbol,lexer.has("point")?{type:"point"}:point,lexer.has("identifier")?{type:"identifier"}:identifier],postprocess:([,,{value:e}])=>({type:"getVariable",identifier:e})},{name:"SetVariable",symbols:[lexer.has("thisSymbol")?{type:"thisSymbol"}:thisSymbol,lexer.has("point")?{type:"point"}:point,lexer.has("identifier")?{type:"identifier"}:identifier,"ws",lexer.has("equal")?{type:"equal"}:equal,"ws","Step"],postprocess:([,,{value:e},,,,t])=>({type:"setVariable",identifier:e,children:[t]})},{name:"ConditionalOperation",symbols:["IfThenElseOperation"],postprocess:([e])=>e},{name:"ConditionalOperation",symbols:["SwitchOperation"],postprocess:([e])=>e},{name:"IfThenElseOperation",symbols:[lexer.has("ifSymbol")?{type:"ifSymbol"}:ifSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step",lexer.has("ws")?{type:"ws"}:ws,lexer.has("thenSymbol")?{type:"thenSymbol"}:thenSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step",lexer.has("ws")?{type:"ws"}:ws,lexer.has("elseSymbol")?{type:"elseSymbol"}:elseSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step"],postprocess:([,,e,,,,t,,,,r])=>({type:"if",children:[e,t,r]})},{name:"SwitchOperation$ebnf$1",symbols:["SwitchCase"]},{name:"SwitchOperation$ebnf$1",symbols:["SwitchOperation$ebnf$1","SwitchCase"],postprocess:e=>e[0].concat([e[1]])},{name:"SwitchOperation",symbols:[lexer.has("switchSymbol")?{type:"switchSymbol"}:switchSymbol,lexer.has("ws")?{type:"ws"}:ws,"Step","SwitchOperation$ebnf$1"],postprocess:([,,e,t])=>({type:"switch",cases:t.map((({caseValue:e})=>e)),children:[e,...t.map((({steps:e})=>e))]})},{name:"SwitchCase",symbols:[lexer.has("ws")?{type:"ws"}:ws,lexer.has("caseSymbol")?{type:"caseSymbol"}:caseSymbol,lexer.has("ws")?{type:"ws"}:ws,"Constant",lexer.has("colon")?{type:"colon"}:colon,"ws","Step"],postprocess:([,,,e,,,t])=>({caseValue:e,steps:t})}],ParserStart:"GrammarDefinition"};__webpack_exports__.Z=grammar},3579:function(e,t,r){r.d(t,{H:function(){return a}});var s=r(5893),n=r(6260);function a(e){var t=e.text,r=e.setText;return(0,s.jsxs)("div",{className:"flex-grow-1 d-flex position-relative",children:[(0,s.jsx)("textarea",{style:{resize:"none",outline:0,tabSize:4},value:t,onKeyDown:function(e){return function(e,t){if("Tab"===e.code){e.preventDefault();var r=e.currentTarget.value,s=e.currentTarget.selectionStart,n=e.currentTarget.selectionEnd;return t(r.substring(0,s)+"\t"+r.substring(n)),!1}}(e,r)},spellCheck:!1,onChange:function(e){return r(e.target.value)},className:"overflow-auto p-3 flex-basis-0 h3 mb-0 text-light border-0 bg-dark flex-grow-1"}),(0,s.jsx)("button",{className:"btn btn-secondary",style:{position:"absolute",right:"1rem",bottom:"1rem"},onClick:function(){return r((0,n.qC)((0,n.Qc)(t)))},children:"Format"})]})}}}]);