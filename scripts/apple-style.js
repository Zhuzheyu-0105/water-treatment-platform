const fs = require('fs');

// Fix pump-selection.tsx
let c = fs.readFileSync('g:/Water system/projects/src/components/pump-selection.tsx','utf8');

c = c.replace(/space-y-6/g,'space-y-5');
c = c.replace(/text-2xl font-bold text-foreground/g,'text-lg font-semibold text-foreground');
c = c.replace(/text-muted-foreground mt-1/g,'text-sm text-muted-foreground');
c = c.replace(/rounded-xl border-2 cursor-pointer transition-all relative/g,'rounded-2xl border cursor-pointer transition-all relative');
c = c.replace(/border-water bg-water-muted shadow-md shadow-water\/10/g,'border-water bg-water-muted');
c = c.replace(/shadow-md shadow-data\/10/g,'');
c = c.replace(/p-4 rounded-xl/g,'p-5 rounded-2xl');
c = c.replace(/p-3 bg-water-muted rounded-lg/g,'p-4 bg-water-muted rounded-xl');
c = c.replace(/p-3 bg-data-muted rounded-xl/g,'p-4 bg-data-muted rounded-2xl');
c = c.replace(/p-3 bg-flow-muted rounded-lg/g,'p-4 bg-flow-muted rounded-xl');
c = c.replace(/text-base flex items-center gap-2/g,'text-lg font-semibold flex items-center gap-2');
c = c.replace(/grid-cols-2 gap-1\.5 text-xs/g,'grid-cols-2 gap-2 text-sm');
c = c.replace(/gap-1 text-xs/g,'gap-2 text-sm');
c = c.replace(/text-\[11px\]/g,'text-xs');

fs.writeFileSync('g:/Water system/projects/src/components/pump-selection.tsx',c,'utf8');
console.log('pump-selection done');

// Fix simulation-result.tsx
let s = fs.readFileSync('g:/Water system/projects/src/components/simulation-result.tsx','utf8');

s = s.replace(/space-y-6/g,'space-y-5');
s = s.replace(/text-2xl font-bold text-foreground/g,'text-lg font-semibold text-foreground');
s = s.replace(/text-muted-foreground mt-1/g,'text-sm text-muted-foreground');
s = s.replace(/bg-\w+-muted\/80 border-\w+\/15 hover:shadow-md/g,'bg-muted/50 border-border/60 hover:shadow-sm');
s = s.replace(/rounded-xl overflow-hidden/g,'rounded-2xl overflow-hidden');
s = s.replace(/rounded-xl bg-destructive\/10/g,'rounded-2xl bg-destructive\/10');
s = s.replace(/rounded-xl bg-success\/10/g,'rounded-2xl bg-success\/10');
s = s.replace(/rounded-xl bg-water\/10/g,'rounded-2xl bg-water\/10');
s = s.replace(/rounded-xl bg-tech\/10/g,'rounded-2xl bg-tech\/10');
s = s.replace(/rounded-xl bg-flow\/10/g,'rounded-2xl bg-flow\/10');
s = s.replace(/rounded-xl bg-ai\/10/g,'rounded-2xl bg-ai\/10');
s = s.replace(/rounded-2xl bg-muted\/50/g,'rounded-2xl bg-muted/50');
s = s.replace(/bg-gradient-to-r from-ai-muted\/50 to-tech-muted\/50 border-ai\/20/g,'bg-ai-muted/50 border-ai/20');
s = s.replace(/bg-muted\/30 border-dashed border-2/g,'bg-muted/50 border-dashed border rounded-2xl');
s = s.replace(/text-base flex items-center gap-2/g,'text-lg font-semibold flex items-center gap-2');
s = s.replace(/py-16 text-center/g,'py-20 text-center');
s = s.replace(/w-20 h-20 mx-auto mb-5 rounded-2xl/g,'w-16 h-16 mx-auto mb-4 rounded-2xl');
s = s.replace(/text-lg font-medium text-muted-foreground mb-2/g,'text-base font-medium text-muted-foreground mb-2');

fs.writeFileSync('g:/Water system/projects/src/components/simulation-result.tsx',s,'utf8');
console.log('simulation-result done');

// Fix design-summary.tsx
let d = fs.readFileSync('g:/Water system/projects/src/components/design-summary.tsx','utf8');

d = d.replace(/space-y-6/g,'space-y-5');
d = d.replace(/text-2xl font-bold text-foreground/g,'text-lg font-semibold text-foreground');
d = d.replace(/text-muted-foreground mt-1/g,'text-sm text-muted-foreground');
d = d.replace(/bg-\w+-muted\/80 border-\w+\/15 hover:shadow-md/g,'bg-muted/50 border-border/60 hover:shadow-sm');
d = d.replace(/text-base flex items-center gap-2/g,'text-lg font-semibold flex items-center gap-2');
d = d.replace(/p-3 bg-muted\/50 rounded-xl/g,'p-4 bg-muted/50 rounded-xl');
d = d.replace(/p-4 bg-\w+-muted rounded-lg/g,'p-5 bg-$1-muted rounded-xl');
d = d.replace(/p-4 bg-muted\/50 rounded-xl/g,'p-5 bg-muted/50 rounded-xl');
d = d.replace(/text-3xl font-bold/g,'text-2xl font-bold');

fs.writeFileSync('g:/Water system/projects/src/components/design-summary.tsx',d,'utf8');
console.log('design-summary done');

// Fix process-design.tsx - key Apple style changes
let p = fs.readFileSync('g:/Water system/projects/src/components/process-design.tsx','utf8');

p = p.replace(/space-y-3">/g,'space-y-4">');
p = p.replace(/text-xl font-bold text-foreground/g,'text-lg font-semibold text-foreground');
p = p.replace(/text-xs text-muted-foreground mt-0\.5/g,'text-sm text-muted-foreground');
p = p.replace(/border-2/g,'border');
p = p.replace(/rounded-xl/g,'rounded-2xl');
p = p.replace(/bg-gradient-to-br from-tech-muted to-data-muted/g,'bg-tech-muted');
p = p.replace(/shadow-md/g,'');
p = p.replace(/shadow-sm/g,'shadow-none');
p = p.replace(/pt-4 px-4/g,'pt-5 px-5');
p = p.replace(/px-4 pb-4/g,'px-5 pb-5');
p = p.replace(/pt-3 px-4/g,'pt-5 px-5');
p = p.replace(/pt-3 px-3/g,'pt-5 px-5');
p = p.replace(/px-3 pb-3/g,'px-5 pb-5');
p = p.replace(/text-sm">进水水质参数/g,'text-base font-medium">进水水质参数');
p = p.replace(/text-sm">出水水质参数/g,'text-base font-medium">出水水质参数');
p = p.replace(/text-sm">出水标准/g,'text-sm">出水标准');
p = p.replace(/text-xs py-2/g,'text-sm py-2');
p = p.replace(/h-8 text-sm/g,'h-10 text-sm');
p = p.replace(/h-9 text-sm/g,'h-10 text-sm');

fs.writeFileSync('g:/Water system/projects/src/components/process-design.tsx',p,'utf8');
console.log('process-design done');

console.log('All files updated!');
