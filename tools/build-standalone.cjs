/* Build a portable HTML containing styles, scripts and all offline recordings.
   Run: node tools/build-standalone.cjs [output.html]
   Keep index.html and the split assets as the editable source. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const output=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'HSK3-MiniApp.html');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'assets/js/audio-map.js'),'utf8'),context);
const manifest=vm.runInContext('VOCAB_AUDIO',context);
const embedded={};
for(const [text,relative] of Object.entries(manifest)){
  const buffer=fs.readFileSync(path.join(root,relative));
  assert.equal(buffer.toString('ascii',0,4),'RIFF');
  assert.equal(buffer.toString('ascii',8,12),'WAVE');
  embedded[text]='data:audio/wav;base64,'+buffer.toString('base64');
}
let styles=0,scripts=0;
html=html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g,(_,relative)=>{
  styles++;const css=fs.readFileSync(path.join(root,relative),'utf8');
  assert(!/@import|url\(\s*['"]?(?!data:|#)/i.test(css),'Unexpected external CSS resource');
  return '<style>\n'+css+'\n</style>';
});
html=html.replace(/<script\s+src="([^"]+)"\s*>\s*<\/script>/g,(_,relative)=>{
  scripts++;
  const code=relative==='assets/js/audio-map.js'
    ?'const VOCAB_AUDIO = '+JSON.stringify(embedded)+';'
    :fs.readFileSync(path.join(root,relative),'utf8');
  new vm.Script(code,{filename:relative});
  return '<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>';
});
assert.equal(styles,2);assert.equal(scripts,6);
assert(!/<(?:script|link)\b[^>]*(?:src|href)="assets\//i.test(html));
assert.equal((html.match(/data:audio\/wav;base64,/g)||[]).length,350);
// Check the actual serialized output, not only the source manifest.
const inlined=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
assert.equal(inlined.length,7);for(const code of inlined)new vm.Script(code);
const audioContext=vm.createContext({});vm.runInContext(inlined.find(s=>s.includes('const VOCAB_AUDIO =')),audioContext);
const roundTrip=vm.runInContext('VOCAB_AUDIO',audioContext);
for(const [text,relative] of Object.entries(manifest))assert(fs.readFileSync(path.join(root,relative)).equals(Buffer.from(roundTrip[text].split(',')[1],'base64')));
fs.writeFileSync(output,html,'utf8');
console.log(`Built and verified ${output}: ${fs.statSync(output).size.toLocaleString()} bytes, ${styles} stylesheets, ${scripts} scripts, ${Object.keys(embedded).length} embedded recordings.`);
