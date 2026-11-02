const assert=require('assert'),D=require('../dist/survival-data.js');
const s=D.fresh(),box={id:'s1',type:'storagebox',x:0,y:0,z:0,progress:1,lit:false,items:{}};s.structures.push(box);s.inventory={wood:3000,stone:8};
assert(D.knows(s,'storagebox'));assert.deepEqual(D.recipes.find(r=>r.id==='storagebox').cost,{wood:10,fiber:4});
assert.equal(D.storageTransfer(s,box,'wood',true,3000),1980);assert.equal(D.storageSlots(box.items).length,20);assert.equal(D.storageTransfer(s,box,'stone',true,8),0);assert.equal(s.inventory.stone,8);
assert.equal(D.storageTransfer(s,box,'wood',false,1),1);assert.equal(D.storageTransfer(s,box,'wood',true,99),1);assert.equal(D.storageTransfer(s,box,'wood',false,99),99);assert.equal(D.storageTransfer(s,box,'stone',true,8),8);
assert.equal(s.inventory.wood+box.items.wood,3000);assert.equal((s.inventory.stone||0)+(box.items.stone||0),8);box.storageName='石・鉱石';assert(D.validSave(s));assert(D.validSave(JSON.parse(JSON.stringify(s))));box.items.fiber=99;assert(!D.validSave(s));delete box.items.fiber;box.storageName='x'.repeat(21);assert(!D.validSave(s));delete box.storageName;assert(D.validSave(s));
assert(D.validSave(D.fresh()));assert.equal(D.storageTransfer(s,box,'bogus',true,1),0);assert.equal(D.storageTransfer(s,box,'wood',true,-1),0);console.log('Storage: capacity, merging, conservation, names and save compatibility passed');
